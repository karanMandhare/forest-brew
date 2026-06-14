// ============================================================
//  POST /api/orders/[id]/cancel — Cancel an active order
//  Handles wallet and star refunds inside a transaction
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { appEvents } from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const session = await auth()

    // 1. Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 2. Authorization check if order belongs to a registered user
    if (order.userId) {
      const isOwner = session?.user?.id === order.userId
      const isAdmin = session?.user?.role === 'ADMIN'
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Unauthorized to cancel this order' }, { status: 403 })
      }
    }

    // 3. Status check: Only allow cancellation if status is PENDING or RECEIVED
    if (order.status !== 'PENDING' && order.status !== 'RECEIVED') {
      return NextResponse.json(
        { error: 'Cannot cancel order once preparation has started' },
        { status: 400 }
      )
    }

    // 4. Perform database updates in a transaction
    await prisma.$transaction(async (tx) => {
      // Update order status to CANCELLED
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          paymentStatus: order.paymentMethod === 'WALLET' ? 'REFUNDED' : order.paymentStatus,
        },
      })

      // Handle wallet refund
      if (order.paymentMethod === 'WALLET' && order.userId) {
        // Increment wallet balance
        await tx.user.update({
          where: { id: order.userId },
          data: {
            walletBalance: {
              increment: order.totalAmount,
            },
          },
        })

        // Create wallet transaction record
        await tx.walletTransaction.create({
          data: {
            userId: order.userId,
            amount: order.totalAmount, // positive for refund
            type: 'REFUND',
            orderId: order.id,
            note: `Refund for cancelled order #${order.id.slice(-6).toUpperCase()}`,
          },
        })
      }

      // Handle stars refund
      if (order.starsRedeemed > 0 && order.userId) {
        // Increment loyalty points
        await tx.user.update({
          where: { id: order.userId },
          data: {
            loyaltyPoints: {
              increment: order.starsRedeemed,
            },
          },
        })

        // Create loyalty transaction record
        await tx.loyaltyTransaction.create({
          data: {
            userId: order.userId,
            points: order.starsRedeemed, // positive for earn/refund
            type: 'EARN',
            orderId: order.id,
            note: `Refund of redeemed stars for cancelled order #${order.id.slice(-6).toUpperCase()}`,
          },
        })
      }
    })

    // 5. Emit real-time SSE events
    appEvents.emit('order_updated', {
      orderId: order.id,
      status: 'CANCELLED',
      userId: order.userId || undefined,
      workerId: order.workerId || undefined,
    })

    if (order.deliveryUserId || order.workerId) {
      appEvents.emit('worker_record_updated', {
        workerId: order.deliveryUserId || order.workerId!,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error cancelling order:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
