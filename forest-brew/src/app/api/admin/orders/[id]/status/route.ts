// ============================================================
//  PATCH /api/admin/orders/[id]/status — Update order status
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendOrderConfirmation } from '@/lib/mail'
import { appEvents } from '@/lib/events'
import { autoAssignOrder } from '@/lib/delivery'

const bodySchema = z.object({
  status: z.enum(['RECEIVED', 'ASSIGNED', 'BREWING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
  deliveryUserId: z.string().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const existingOrder = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  })

  if (!existingOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const isQrTransition = existingOrder.status === 'PENDING' && parsed.data.status === 'RECEIVED'

  let updatedOrder
  if (isQrTransition) {
    updatedOrder = await prisma.$transaction(async (tx) => {
      // Award loyalty points if logged in and not already awarded
      if (existingOrder.userId) {
        const pointsEarned = Math.floor(existingOrder.totalAmount / 100)
        if (pointsEarned > 0) {
          const existingTx = await tx.loyaltyTransaction.findUnique({
            where: { orderId: existingOrder.id },
          })
          if (!existingTx) {
            await tx.user.update({
              where: { id: existingOrder.userId },
              data: { loyaltyPoints: { increment: pointsEarned } },
            })
            await tx.loyaltyTransaction.create({
              data: {
                userId: existingOrder.userId,
                points: pointsEarned,
                type: 'EARN',
                orderId: existingOrder.id,
                note: `Earned for order #${existingOrder.id.slice(-6).toUpperCase()}`,
              },
            })
          }
        }
      }

      // Update order status and paymentId if QR
      return await tx.order.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          paymentId: existingOrder.paymentMethod === 'QR' ? `qr_verified_${Date.now()}` : existingOrder.paymentId,
        },
        select: { id: true, status: true, deliveryUserId: true },
      })
    })

    // Send confirmation email
    if (existingOrder.customerEmail) {
      const formattedItems = existingOrder.items.map(item => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        customizations: item.customizations as any,
        product: {
          name: item.product.name,
        },
      }))
      sendOrderConfirmation(
        existingOrder.customerEmail,
        existingOrder.customerName || 'Customer',
        existingOrder.id,
        existingOrder.totalAmount,
        formattedItems,
        existingOrder.orderType,
        existingOrder.deliveryAddress || undefined,
        existingOrder.tableNumber || undefined
      ).catch(err => console.error('Error sending order confirmation email:', err))
    }
  } else {
    const updateData: any = { status: parsed.data.status }
    if (parsed.data.deliveryUserId !== undefined) {
      updateData.deliveryUserId = parsed.data.deliveryUserId
      updateData.workerId = parsed.data.deliveryUserId
      if (parsed.data.deliveryUserId) {
        updateData.assignedAt = new Date()
      }
    }
    if (parsed.data.status === 'ASSIGNED') {
      updateData.assignedAt = new Date()
    } else if (parsed.data.status === 'BREWING') {
      updateData.preparingAt = new Date()
    } else if (parsed.data.status === 'READY') {
      updateData.readyAt = new Date()
    } else if (parsed.data.status === 'DELIVERED') {
      updateData.deliveredAt = new Date()
    } else if (parsed.data.status === 'CANCELLED') {
      updateData.cancelledAt = new Date()
    }
    updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, deliveryUserId: true },
    })
  }

  // Trigger auto-assignment if status is RECEIVED or READY and no worker is assigned for a DELIVERY order
  const currentOrder = await prisma.order.findUnique({
    where: { id },
    select: { status: true, orderType: true, deliveryUserId: true }
  })

  let finalOrder = updatedOrder
  if (
    currentOrder &&
    currentOrder.orderType === 'DELIVERY' &&
    ['RECEIVED', 'READY'].includes(currentOrder.status) &&
    !currentOrder.deliveryUserId
  ) {
    const autoAssigned = await autoAssignOrder(id)
    if (autoAssigned) {
      finalOrder = autoAssigned
    }
  }

  // Emit SSE event if it wasn't already handled by autoAssignOrder
  if (finalOrder === updatedOrder) {
    appEvents.emit('order_updated', {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      userId: existingOrder.userId || undefined,
      workerId: updatedOrder.deliveryUserId || existingOrder.deliveryUserId || undefined
    })

    // Notify workers whose record/load changed
    if (parsed.data.deliveryUserId) {
      appEvents.emit('worker_record_updated', { workerId: parsed.data.deliveryUserId })
    }
    if (existingOrder.deliveryUserId && existingOrder.deliveryUserId !== parsed.data.deliveryUserId) {
      appEvents.emit('worker_record_updated', { workerId: existingOrder.deliveryUserId })
    }
  }

  return NextResponse.json(finalOrder)
}
