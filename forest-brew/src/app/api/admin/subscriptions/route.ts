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

    // Fetch all users that have or had a subscription
    const subscribers = await prisma.user.findMany({
      where: {
        subscriptionTier: { not: null }
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionExpires: true,
        createdAt: true,
      },
      orderBy: {
        subscriptionExpires: 'desc'
      }
    })

    return NextResponse.json({ subscribers }, { status: 200 })
  } catch (err: any) {
    console.error('Fetch admin subscriptions error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
