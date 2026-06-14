// ============================================================
//  GET /api/worker/feedback — Fetch feedback rating & comments
//  left by customers on orders assigned to the logged-in worker.
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

    const userRole = session.user.role
    if (userRole !== 'DELIVERY' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const workerId = session.user.id as string

    const feedbacks = await prisma.feedback.findMany({
      where: {
        order: {
          OR: [
            { deliveryUserId: workerId },
            { workerId: workerId }
          ],
          status: 'DELIVERED'
        }
      },
      select: {
        id: true,
        rating: true,
        comments: true,
        type: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            customerName: true,
            orderType: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ feedbacks })
  } catch (err: any) {
    console.error('Fetch worker feedback error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
