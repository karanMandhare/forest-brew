// ============================================================
//  GET /api/orders/history — Fetch user order history
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const url = new URL(req.url)
    const guestIdsParam = url.searchParams.get('guestOrderIds')

    let guestOrderIds: string[] = []
    if (guestIdsParam) {
      guestOrderIds = guestIdsParam
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0)
    }

    // Prepare query filters
    const orConditions: any[] = []

    // 1. If user is logged in, fetch orders matching user email or ID
    if (session?.user) {
      orConditions.push({ userId: session.user.id })
      if (session.user.email) {
        orConditions.push({ customerEmail: session.user.email })
      }
    }

    // 2. Fetch guest orders if guestOrderIds are supplied
    if (guestOrderIds.length > 0) {
      orConditions.push({ id: { in: guestOrderIds } })
    }

    // If there are no search criteria, return empty list
    if (orConditions.length === 0) {
      return NextResponse.json([])
    }

    // Fetch orders (exclude PENDING unpaid orders)
    const orders = await prisma.order.findMany({
      where: {
        OR: orConditions,
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
                name: true,
                imageUrl: true,
                description: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(orders)
  } catch (err: any) {
    console.error('Fetch order history error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
