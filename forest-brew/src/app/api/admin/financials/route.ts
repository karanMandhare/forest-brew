import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const userRole = session?.user?.role
    if (!session?.user || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access only.' }, { status: 401 })
    }

    // 1. Orders Revenue: Sum of totalAmount for paid orders (exclude PENDING, CANCELLED)
    const ordersAgg = await prisma.order.aggregate({
      where: {
        status: { notIn: ['PENDING', 'CANCELLED'] }
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    })
    const ordersRevenue = ordersAgg._sum.totalAmount || 0
    const ordersCount = ordersAgg._count.id || 0

    // 2. Table Bookings Revenue: Sum of advancePaid + remainingPaid for confirmed/completed reservations
    const reservations = await prisma.reservation.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      },
      select: {
        advancePaid: true,
        remainingPaid: true
      }
    })
    const bookingsRevenue = reservations.reduce((sum, resv) => sum + resv.advancePaid + resv.remainingPaid, 0)
    const bookingsCount = reservations.length

    // 3. Subscriptions Revenue: Sum of WalletTransactions that correspond to membership purchases
    const subscriptionTrans = await prisma.walletTransaction.findMany({
      where: {
        type: 'SPENT',
        note: { contains: 'Membership' }
      },
      select: {
        amount: true
      }
    })
    const subscriptionsRevenue = subscriptionTrans.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const subscriptionsCount = subscriptionTrans.length

    // 4. Combined calculations
    const totalRevenue = ordersRevenue + bookingsRevenue + subscriptionsRevenue

    return NextResponse.json({
      ordersRevenue,
      ordersCount,
      bookingsRevenue,
      bookingsCount,
      subscriptionsRevenue,
      subscriptionsCount,
      totalRevenue
    }, { status: 200 })
  } catch (err: any) {
    console.error('Fetch financials error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
