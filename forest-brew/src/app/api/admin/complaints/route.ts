// ============================================================
//  POST /api/admin/complaints — Resolve complaints and issue wallet refunds
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  feedbackId: z.string(),
  action: z.enum(['RESOLVE', 'REFUND']),
  refundAmount: z.number().int().nonnegative().optional(), // In paise
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const { feedbackId, action, refundAmount } = parsed.data

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: { user: true, order: true },
    })

    if (!feedback) {
      return NextResponse.json({ error: 'Complaint feedback not found' }, { status: 404 })
    }

    if (feedback.type !== 'COMPLAINT') {
      return NextResponse.json({ error: 'Feedback is not of type COMPLAINT' }, { status: 400 })
    }

    if (feedback.status !== 'PENDING') {
      return NextResponse.json({ error: 'Complaint is already resolved or refunded' }, { status: 400 })
    }

    if (action === 'REFUND') {
      if (!feedback.userId) {
        return NextResponse.json({ error: 'Cannot issue wallet refund: general/guest feedback has no associated user account' }, { status: 400 })
      }
      
      const refundVal = refundAmount || feedback.order?.totalAmount || 0
      if (refundVal <= 0) {
        return NextResponse.json({ error: 'Invalid refund amount' }, { status: 400 })
      }

      // Execute transaction to update wallet and feedback state
      const result = await prisma.$transaction(async (tx) => {
        // Update user balance
        const updatedUser = await tx.user.update({
          where: { id: feedback.userId as string },
          data: {
            walletBalance: {
              increment: refundVal
            }
          }
        })

        // Create wallet transaction log
        const walletTx = await tx.walletTransaction.create({
          data: {
            userId: feedback.userId as string,
            amount: refundVal,
            type: 'REFUND',
            orderId: feedback.orderId,
            note: `Refund for order #${feedback.orderId?.slice(-6).toUpperCase() || 'unknown'} (Complaint Resolution)`,
          }
        })

        // Update feedback
        const updatedFeedback = await tx.feedback.update({
          where: { id: feedbackId },
          data: {
            status: 'REFUNDED',
            resolvedAt: new Date(),
            refundAmount: refundVal
          }
        })

        // Also update order status if linked
        if (feedback.orderId) {
          await tx.order.update({
            where: { id: feedback.orderId },
            data: {
              paymentStatus: 'REFUNDED'
            }
          })
        }

        // Create notification for the user
        await tx.notification.create({
          data: {
            userId: feedback.userId as string,
            title: '💸 Wallet Refund Issued',
            message: `A refund of ₹${(refundVal / 100).toFixed(2)} has been credited to your wallet for Order #${feedback.orderId?.slice(-6).toUpperCase() || 'unknown'}.`,
            type: 'SYSTEM'
          }
        })

        return { updatedFeedback, updatedUser, walletTx }
      })

      return NextResponse.json({ success: true, message: 'Wallet refund issued successfully', ...result })
    } else {
      // Just resolve the complaint without refund
      const updatedFeedback = await prisma.feedback.update({
        where: { id: feedbackId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        }
      })

      // Create notification for the user if user is linked
      if (feedback.userId) {
        await prisma.notification.create({
          data: {
            userId: feedback.userId,
            title: '✅ Complaint Resolved',
            message: `Your complaint for Order #${feedback.orderId?.slice(-6).toUpperCase() || 'unknown'} has been marked as resolved by support. Thank you for your feedback!`,
            type: 'SYSTEM'
          }
        })
      }

      return NextResponse.json({ success: true, message: 'Complaint resolved successfully', feedback: updatedFeedback })
    }

  } catch (err: any) {
    console.error('Error resolving complaint:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
