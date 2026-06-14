// ============================================================
//  POST /api/user/wallet/verify-topup
//  Verifies wallet reload Razorpay payment and increments balance.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { z } from 'zod'

const verifySchema = z.object({
  razorpayOrderId:   z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  amount:            z.number().int().min(10000), // in paise
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = verifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = parsed.data
    const userId = session.user.id as string

    const isDevMock = razorpaySignature === 'mock_signature' && 
      (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET.includes('your_razorpay_secret_key'))

    if (!isDevMock) {
      // HMAC Verification
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

    // Verify wallet loading and credit user balance
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Increment user's walletBalance
      const user = await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: amount } },
      })

      // 2. Log Wallet transaction
      await tx.walletTransaction.create({
        data: {
          userId,
          amount,
          type: 'TOP_UP',
          note: `Card loaded via Razorpay (Ref: ${razorpayPaymentId.slice(-8)})`,
        },
      })

      // 3. Optional: award bonus stars for reloading wallet (Starbucks loyalty style!)
      // Let's give 1 Star per ₹10 loaded (10% back in stars as a bonus!)
      const bonusStars = Math.floor(amount / 1000) // 1pt per ₹10
      if (bonusStars > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: bonusStars } },
        })
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            points: bonusStars,
            type: 'BONUS',
            note: `Bonus Stars for topping up wallet: +${bonusStars}`,
          },
        })
      }

      return user
    })

    return NextResponse.json({
      success: true,
      walletBalance: updatedUser.walletBalance,
      loyaltyPoints: updatedUser.loyaltyPoints,
    })
  } catch (err: any) {
    console.error('Verify wallet topup error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
