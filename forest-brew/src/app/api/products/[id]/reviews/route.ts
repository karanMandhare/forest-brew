// ============================================================
//  /api/products/[id]/reviews — Product Reviews & Ratings API
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { verifyCsrf } from '@/lib/csrf'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const aggregate = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true }
    })

    return NextResponse.json({
      reviews,
      averageRating: aggregate._avg.rating || 0,
      totalReviews: aggregate._count.rating || 0
    })
  } catch (err: any) {
    console.error('Fetch reviews error:', err)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF Check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 })
    }

    // IP Rate Limit (10 reviews per minute)
    const ip = getClientIp(req)
    if (isRateLimited(`ip:review:${ip}`, { windowMs: 60 * 1000, max: 10 })) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: productId } = await params
    const body = await req.json()
    const parsed = reviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { rating, comment } = parsed.data
    const userId = session.user.id

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Upsert review (one review per user per product)
    const review = await prisma.review.upsert({
      where: {
        userId_productId: {
          userId,
          productId
        }
      },
      update: {
        rating,
        comment,
        createdAt: new Date()
      },
      create: {
        userId,
        productId,
        rating,
        comment
      }
    })

    return NextResponse.json({ success: true, review }, { status: 201 })
  } catch (err: any) {
    console.error('Submit review error:', err)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
