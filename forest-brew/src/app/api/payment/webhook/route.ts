// ============================================================
//  POST /api/payment/webhook — Razorpay Webhook handler
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { appEvents } from '@/lib/events'
import { autoAssignOrder } from '@/lib/delivery'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (process.env.NODE_ENV === 'production' && !secret) {
      console.error('CRITICAL: RAZORPAY_WEBHOOK_SECRET is not configured in production!')
      return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 })
    }

    // ── Webhook Signature Verification ──────────────────────────
    if (secret) {
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
      }
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')

      if (expectedSignature !== signature) {
        console.error('Webhook signature verification failed')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    } else {
      console.warn('RAZORPAY_WEBHOOK_SECRET not set. Proceeding without signature verification (Dev Mode only).')
    }

    // ── Process Event Payload ───────────────────────────────────
    const body = JSON.parse(rawBody)
    const event = body.event

    if (event !== 'payment.captured' && event !== 'payment.failed') {
      // Return 200 to acknowledge other events we don't care about
      return NextResponse.json({ success: true, message: 'Event ignored' })
    }

    const paymentEntity = body.payload?.payment?.entity
    if (!paymentEntity) {
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 })
    }

    const razorpayOrderId = paymentEntity.order_id
    const razorpayPaymentId = paymentEntity.id

    if (!razorpayOrderId) {
      return NextResponse.json({ error: 'Missing order_id in event payment entity' }, { status: 400 })
    }

    // ── Find Order in DB ────────────────────────────────────────
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId },
      include: { user: true },
    })

    if (!order) {
      console.error(`Order with Razorpay order ID ${razorpayOrderId} not found`)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (event === 'payment.failed') {
      console.warn(`Payment failed for order ${order.id}: ${paymentEntity.error_description || 'unknown error'}`)
      // Optionally we could mark the order status as CANCELLED or custom FAILED
      // For now, let's keep it or mark it as CANCELLED
      return NextResponse.json({ success: true, message: 'Failure acknowledged' })
    }

    // ── Check if Order is Already Processed (Idempotency) ───────
    // If order has a status other than RECEIVED (or initial payment awaiting status, e.g. default/other)
    // and paymentId is already set, it's already verified.
    if (order.status !== 'RECEIVED' && order.paymentId) {
      // Already processed (could be in BREWING, READY, etc. or already RECEIVED)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    if (order.status === 'RECEIVED' && order.paymentId) {
      // Already processed and marked RECEIVED
      return NextResponse.json({ success: true, message: 'Already processed and received' })
    }

    // ── Update Order and Award Loyalty Points ───────────────────
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { paymentId: razorpayPaymentId, status: 'RECEIVED', acceptedAt: new Date() },
      })

      // Award loyalty points if user is logged in
      if (order.userId) {
        const pointsEarned = Math.floor(order.totalAmount / 100) // 1pt per rupee
        
        // Double check if transaction already exists for this order
        const existingTx = await tx.loyaltyTransaction.findUnique({
          where: { orderId: order.id }
        })

        if (!existingTx) {
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
    })

    // Call autoAssignOrder (which handles only DELIVERY type and online workers availability)
    const assignedOrder = await autoAssignOrder(order.id)

    if (!assignedOrder) {
      // Emit SSE event if it was not auto-assigned (so it remains RECEIVED)
      appEvents.emit('order_updated', {
        orderId: order.id,
        status: 'RECEIVED',
        userId: order.userId || undefined,
        workerId: order.deliveryUserId || undefined
      })
    }

    console.log(`Successfully processed webhook payment for order ${order.id}`)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
