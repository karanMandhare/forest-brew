// ============================================================
//  POST /api/admin/orders/[id]/refund — Admin processes order refund
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.paymentStatus === 'REFUNDED') {
      return NextResponse.json({ error: 'Order already refunded' }, { status: 400 })
    }

    const amountRefunded = order.totalAmount

    // Execute refund in database transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update order payment status and order status to CANCELLED/REFUNDED
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'REFUNDED',
          status: 'CANCELLED',
        },
      })

      // 2. Refund to user balance if order has associated userId
      if (order.userId) {
        await tx.user.update({
          where: { id: order.userId },
          data: {
            walletBalance: { increment: amountRefunded },
          },
        })

        // 3. Log a wallet transaction
        await tx.walletTransaction.create({
          data: {
            userId: order.userId,
            amount: amountRefunded,
            type: 'REFUND',
            orderId: order.id,
            note: `Refund for Order #${order.id.slice(-6).toUpperCase()}`,
          },
        })

        // 4. Send notification
        await tx.notification.create({
          data: {
            userId: order.userId,
            title: '💸 Refund Processed',
            message: `A refund of ₹${(amountRefunded / 100).toFixed(2)} has been credited to your Starbucks Card Wallet for Order #${order.id.slice(-6).toUpperCase()}.`,
            type: 'SYSTEM',
          },
        })
      }
    })

    return NextResponse.json({ success: true, message: 'Refund successfully completed' })
  } catch (err: any) {
    console.error('Error processing order refund:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
