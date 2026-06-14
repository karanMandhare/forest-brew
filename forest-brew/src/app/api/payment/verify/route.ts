// ============================================================
//  POST /api/payment/verify
//  Verifies Razorpay HMAC signature — marks order as paid
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { z } from 'zod'
import { sendOrderConfirmation } from '@/lib/mail'
import { appEvents, emitNewOrder } from '@/lib/events'
import type { CartCustomization } from '@/types'
import { autoAssignOrder } from '@/lib/delivery'

const bodySchema = z.object({
  razorpayOrderId:   z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  orderId:           z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = parsed.data

    const isDevMock = razorpaySignature === 'mock_signature' && 
      (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET.includes('your_razorpay_secret_key'))

    if (!isDevMock) {
      // ── HMAC verification ────────────────────────────────────────
      const secret = process.env.RAZORPAY_KEY_SECRET!
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex')

      if (expectedSignature !== razorpaySignature) {
        return NextResponse.json(
          { error: 'Payment signature verification failed' },
          { status: 403 }
        )
      }
    }

    // ── Verify the order in our DB ────────────────────────────────
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: 'Order ID mismatch' }, { status: 403 })
    }

    // ── Mark as paid & process stars / loyalty points ──────────────
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { paymentId: razorpayPaymentId, status: 'RECEIVED', paymentStatus: 'PAID', acceptedAt: new Date() },
      })

      if (order.userId) {
        // Double check to prevent duplicate reward processing
        const existingTx = await tx.loyaltyTransaction.findFirst({
          where: { orderId: order.id }
        })

        if (!existingTx) {
          // 1. Deduct redeemed stars if any
          if (order.starsRedeemed > 0) {
            await tx.user.update({
              where: { id: order.userId },
              data: { loyaltyPoints: { decrement: order.starsRedeemed } },
            })
            await tx.loyaltyTransaction.create({
              data: {
                userId: order.userId,
                points: -order.starsRedeemed,
                type: 'REDEEM',
                orderId: order.id,
                note: `Redeemed for order #${order.id.slice(-6).toUpperCase()}`,
              },
            })
          }

          // 2. Award loyalty points for paid amount (1pt per ₹1)
          const pointsEarned = Math.floor(order.totalAmount / 100)
          if (pointsEarned > 0) {
            await tx.user.update({
              where: { id: order.userId },
              data: { loyaltyPoints: { increment: pointsEarned } },
            })
            await tx.loyaltyTransaction.create({
              data: {
                userId: order.userId,
                points: pointsEarned,
                type: 'EARN',
                orderId: order.id,
                note: `Earned for order #${order.id.slice(-6).toUpperCase()}`,
              },
            })
          }
        }
      }
    })

    // Call autoAssignOrder (which handles only DELIVERY type and online workers availability)
    const assignedOrder = await autoAssignOrder(orderId)

    if (!assignedOrder) {
      // Emit SSE event if it was not auto-assigned (so it remains RECEIVED)
      appEvents.emit('order_updated', {
        orderId: orderId,
        status: 'RECEIVED',
        userId: order.userId || undefined,
        workerId: order.deliveryUserId || undefined
      })
    }

    // ── Popup notification for admin ─────────────────────────────
    emitNewOrder({
      orderId: order.id,
      customerName: order.customerName || order.user?.name || null,
      customerEmail: order.customerEmail || null,
      customerPhone: order.customerPhone || null,
      customerImage: (order.user as any)?.image || null,
      orderType: order.orderType,
      totalAmount: order.totalAmount,
      tableNumber: order.tableNumber || null,
      deliveryAddress: order.deliveryAddress || null,
      itemCount: order.items.reduce((s: number, i: any) => s + i.quantity, 0),
      firstItemName: order.items[0]?.product?.name || 'Coffee',
      paymentMethod: 'RAZORPAY',
    })

    // Send email confirmation in the background (non-blocking)
    if (order.customerEmail) {
      sendOrderConfirmation(
        order.customerEmail,
        order.customerName || order.user?.name || 'Customer',
        order.id,
        order.totalAmount,
        order.items.map(item => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          customizations: (item.customizations || undefined) as unknown as CartCustomization | undefined,
          product: {
            name: item.product.name
          }
        })),
        order.orderType,
        order.deliveryAddress,
        order.tableNumber
      ).catch(err => console.error('Error sending order confirmation email:', err))
    }

    return NextResponse.json({ success: true, orderId })
  } catch (err) {
    console.error('Verify payment error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
