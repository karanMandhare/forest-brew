// ============================================================
//  PATCH /api/worker/orders/[id]/status — Update assigned order status
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { appEvents } from '@/lib/events'
import { autoAssignOrder } from '@/lib/delivery'

const bodySchema = z.object({
  status: z.enum(['READY', 'OUT_FOR_DELIVERY', 'DELIVERED']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== 'DELIVERY' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const workerId = session.user.id as string

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const targetStatus = parsed.data.status

    // Fetch the order to verify details
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify ownership/assignment (unless admin)
    if (userRole !== 'ADMIN' && existingOrder.deliveryUserId !== workerId) {
      return NextResponse.json({ error: 'Forbidden: This order is not assigned to you' }, { status: 403 })
    }

    // Validate valid transitions:
    // - READY requires status to be BREWING
    // - OUT_FOR_DELIVERY requires status to be READY
    // - DELIVERED requires status to be OUT_FOR_DELIVERY or READY
    if (targetStatus === 'READY' && existingOrder.status !== 'BREWING' && existingOrder.status !== 'ASSIGNED') {
      return NextResponse.json({ error: 'Invalid status transition: Order is not being prepared' }, { status: 400 })
    }

    if (targetStatus === 'OUT_FOR_DELIVERY' && existingOrder.status !== 'READY') {
      return NextResponse.json({ error: 'Invalid status transition: Order is not ready' }, { status: 400 })
    }

    if (targetStatus === 'DELIVERED' && existingOrder.status !== 'OUT_FOR_DELIVERY' && existingOrder.status !== 'READY') {
      return NextResponse.json({ error: 'Invalid status transition: Order is not ready or out for delivery' }, { status: 400 })
    }

    // Update order status and set appropriate timestamps
    const updateData: any = { status: targetStatus }
    if (targetStatus === 'READY') {
      updateData.readyAt = new Date()
    } else if (targetStatus === 'DELIVERED') {
      updateData.deliveredAt = new Date()
    }
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        status: true,
        deliveryUserId: true,
        updatedAt: true,
        userId: true,
        orderType: true,
        tableNumber: true,
      },
    })

    // Trigger auto-assignment if status is READY, it is a DELIVERY order and no delivery agent is assigned
    let finalOrder = updatedOrder
    let autoAssigned = null
    if (
      updatedOrder.orderType === 'DELIVERY' &&
      targetStatus === 'READY' &&
      !updatedOrder.deliveryUserId
    ) {
      autoAssigned = await autoAssignOrder(id)
      if (autoAssigned) {
        finalOrder = { ...updatedOrder, ...autoAssigned }
      }
    }

    if (!autoAssigned) {
      // Emit SSE event if it wasn't already handled by autoAssignOrder
      appEvents.emit('order_updated', {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        userId: updatedOrder.userId || undefined,
        workerId: updatedOrder.deliveryUserId || undefined
      })
    }

    // Send notifications to user if they are logged in
    if (updatedOrder.userId) {
      let title = 'Forest Brew Update'
      let message = 'Your order status has changed.'

      if (targetStatus === 'READY') {
        title = updatedOrder.orderType === 'DELIVERY' ? '🚗 Order Ready!' : '✨ Order Ready for Pickup!'
        message = updatedOrder.orderType === 'DELIVERY'
          ? 'Your order is ready. It will be dispatched for delivery shortly.'
          : `Your coffee is hot and ready at the counter! Table/Seat: ${updatedOrder.tableNumber || 'Counter / Takeaway'}.`
      } else if (targetStatus === 'OUT_FOR_DELIVERY') {
        title = '🚚 Out for Delivery!'
        message = 'Your order is on the way to your doorstep!'
      } else if (targetStatus === 'DELIVERED') {
        title = '🏡 Order Completed!'
        message = 'Your order has been marked as delivered/completed. Enjoy your forest brew!'
      }

      await prisma.notification.create({
        data: {
          userId: updatedOrder.userId,
          title,
          message,
          type: 'ORDER_STATUS',
        },
      })
    }

    return NextResponse.json(updatedOrder)
  } catch (err: any) {
    console.error('Update worker order status error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
