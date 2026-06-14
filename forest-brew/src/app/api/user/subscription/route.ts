import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const TIER_PRICES: Record<string, { name: string; price: number }> = {
  SEEDLING: { name: 'The Seedling Pass', price: 39900 }, // ₹399 in paise
  CANOPY:   { name: 'The Canopy Pass', price: 99900 },   // ₹999 in paise
  REDWOOD:  { name: 'The Redwood Club', price: 199900 }  // ₹1,999 in paise
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole === 'ADMIN' || userRole === 'DELIVERY') {
      return NextResponse.json({ error: 'Store administrators and staff are not permitted to purchase subscription passes.' }, { status: 403 })
    }

    const userId = session.user.id
    const body = await req.json()
    const { tier } = body

    if (!tier || !TIER_PRICES[tier]) {
      return NextResponse.json({ error: 'Invalid subscription tier selected.' }, { status: 400 })
    }

    const selectedTier = TIER_PRICES[tier]

    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Fetch user's current wallet balance
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true }
      })

      if (!user) {
        throw new Error('User account not found.')
      }

      if (user.walletBalance < selectedTier.price) {
        throw new Error(`Insufficient wallet balance. ₹${(selectedTier.price / 100).toFixed(2)} is required to purchase this pass.`)
      }

      // 2. Deduct amount from wallet
      const dbUser = await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { decrement: selectedTier.price },
          subscriptionTier: tier,
          subscriptionStatus: 'ACTIVE',
          subscriptionExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 Days
        }
      })

      // 3. Create WalletTransaction log
      await tx.walletTransaction.create({
        data: {
          userId,
          amount: -selectedTier.price,
          type: 'SPENT',
          orderId: null,
          note: `Purchase: ${selectedTier.name} Membership`,
        }
      })

      return dbUser
    })

    return NextResponse.json({ success: true, user: updatedUser }, { status: 200 })
  } catch (err: any) {
    console.error('Subscription purchase error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 400 })
  }
}
