// ============================================================
//  GET /api/user/profile — Fetch authenticated user details, 
//  order history, wallet balance & transaction logs.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string

    // Fetch user details from database (ensuring fresh data)
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        loyaltyPoints: true,
        walletBalance: true,
        salary: true,
        subscriptionTier: true,
        subscriptionExpires: true,
        subscriptionStatus: true,
        unlockedBadges: true,
        createdAt: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch user's order history
    const orders = await prisma.order.findMany({
      where: {
        userId: userId,
        status: { not: 'PENDING' },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                basePrice: true,
                category: true,
              },
            },
          },
        },
      },
    })

    // Fetch wallet transaction history
    const walletTransactions = await prisma.walletTransaction.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Fetch loyalty transactions (rewards activity)
    const loyaltyTransactions = await prisma.loyaltyTransaction.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Fetch user's reservations
    const reservations = await prisma.reservation.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        feedbacks: {
          select: {
            id: true,
            rating: true,
            comments: true,
          },
        },
      },
    })

    return NextResponse.json({
      user: dbUser,
      orders,
      walletTransactions,
      loyaltyTransactions,
      reservations,
    })
  } catch (err: any) {
    console.error('Fetch user profile error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
