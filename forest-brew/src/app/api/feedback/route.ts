// ============================================================
//  /api/feedback/route.ts — User ratings, complaints and support API
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  orderId: z.string().optional().nullable(),
  reservationId: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  comments: z.string().optional().nullable(),
  type: z.enum(['ORDER', 'COMPLAINT', 'RESERVATION', 'GENERAL']).default('ORDER'),
})

import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { verifyCsrf } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  try {
    // CSRF Check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 })
    }

    // IP Rate Limit (10 feedback requests per minute)
    const ip = getClientIp(req)
    if (isRateLimited(`ip:feedback:${ip}`, { windowMs: 60 * 1000, max: 10 })) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const { orderId, reservationId, rating, comments, type } = parsed.data
    const userId = session.user.id

    // Verify order ownership if orderId is provided
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      })
      if (!order || order.userId !== userId) {
        return NextResponse.json({ error: 'Forbidden. You do not own this order.' }, { status: 403 })
      }
    }

    // Verify reservation ownership if reservationId is provided
    if (reservationId) {
      const resv = await prisma.reservation.findUnique({
        where: { id: reservationId },
        select: { userId: true },
      })
      if (!resv || resv.userId !== userId) {
        return NextResponse.json({ error: 'Forbidden. You do not own this reservation.' }, { status: 403 })
      }
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        orderId,
        reservationId,
        rating,
        comments,
        type,
      },
    })

    // If it's a complaint, notify all administrators
    if (type === 'COMPLAINT') {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      })

      const complaintMessage = `New complaint received for Order #${orderId ? orderId.slice(-6).toUpperCase() : 'General'}. Rating: ${rating}/5. comments: "${comments || 'No comment'}"`

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: '⚠️ New Customer Complaint',
            message: complaintMessage,
            type: 'COMPLAINT',
          },
        })
      }
    }

    return NextResponse.json({ success: true, feedback })
  } catch (err: any) {
    console.error('Error creating feedback:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const feedbacks = await prisma.feedback.findMany({
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { id: true, totalAmount: true, createdAt: true } },
        reservation: { select: { id: true, customerName: true, date: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(feedbacks)
  } catch (err: any) {
    console.error('Error fetching feedback:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
