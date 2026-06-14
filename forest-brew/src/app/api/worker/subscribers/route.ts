import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/worker/subscribers - Search or list active subscribers
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const userRole = session?.user?.role
    if (!session?.user || (userRole !== 'DELIVERY' && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Staff access only.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')?.trim()

    if (email) {
      // Find specific user
      const subscriber = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          subscriptionTier: true,
          subscriptionExpires: true,
          subscriptionStatus: true,
        }
      })

      if (!subscriber || subscriber.subscriptionStatus !== 'ACTIVE') {
        return NextResponse.json({ error: 'No active subscription found for this email.' }, { status: 404 })
      }

      return NextResponse.json({ subscriber }, { status: 200 })
    }

    // List recent active subscribers
    const subscribers = await prisma.user.findMany({
      where: { subscriptionStatus: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        subscriptionExpires: true,
      },
      orderBy: { subscriptionExpires: 'asc' },
      take: 20
    })

    return NextResponse.json({ subscribers }, { status: 200 })
  } catch (err: any) {
    console.error('Fetch worker subscribers error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// POST /api/worker/subscribers/redeem - Log daily beverage redemption
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userRole = session?.user?.role
    if (!session?.user || (userRole !== 'DELIVERY' && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Staff access only.' }, { status: 401 })
    }

    const body = await req.json()
    const { subscriberEmail, drinkName } = body

    if (!subscriberEmail || !drinkName) {
      return NextResponse.json({ error: 'Subscriber email and beverage name are required.' }, { status: 400 })
    }

    const subscriber = await prisma.user.findUnique({
      where: { email: subscriberEmail }
    })

    if (!subscriber || subscriber.subscriptionStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'Subscriber account not active.' }, { status: 400 })
    }

    // Create a zero-points LoyaltyTransaction as a ledger note for redemption
    await prisma.loyaltyTransaction.create({
      data: {
        userId: subscriber.id,
        points: 0,
        type: 'REDEEM',
        note: `Redeemed: Daily Free ${drinkName} (${subscriber.subscriptionTier} Club)`,
      }
    })

    // Create a Notification for the user to confirm their redemption
    await prisma.notification.create({
      data: {
        userId: subscriber.id,
        title: '🍹 Drink Redeemed!',
        message: `Your daily free drink (${drinkName}) was successfully verified and claimed at the counter.`,
        type: 'ORDER_STATUS'
      }
    })

    return NextResponse.json({ success: true, message: `Successfully redeemed daily drink for ${subscriber.name || subscriber.email}!` })
  } catch (err: any) {
    console.error('Redeem subscriber drink error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
