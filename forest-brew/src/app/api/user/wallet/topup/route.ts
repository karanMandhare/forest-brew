// ============================================================
//  POST /api/user/wallet/topup
//  Initiates a Razorpay order to load/top-up digital wallet
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const topupSchema = z.object({
  amount: z.number().int().min(10000).max(500000), // ₹100 to ₹5000 in paise
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = topupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid top-up amount (Min ₹100, Max ₹5000)' }, { status: 400 })
    }

    const { amount } = parsed.data
    const userId = session.user.id as string

    let razorpayOrderId: string | null = null
    try {
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        const Razorpay = (await import('razorpay')).default
        const rzp = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        })
        const rzpOrder = await (rzp.orders as any).create({
          amount, // already in paise
          currency: 'INR',
          receipt: `topup_${userId.slice(-6)}_${Date.now()}`,
          notes: { userId, purpose: 'wallet_topup' },
        })
        razorpayOrderId = rzpOrder.id
      }
    } catch (rzpErr) {
      console.error('Razorpay topup creation error (non-fatal in dev):', rzpErr)
    }

    return NextResponse.json({
      success: true,
      amount,
      currency: 'INR',
      razorpayOrderId,
    })
  } catch (err: any) {
    console.error('Wallet top-up order creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
