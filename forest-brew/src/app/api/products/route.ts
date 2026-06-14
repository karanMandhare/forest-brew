// ============================================================
//  GET /api/products — Public endpoint to fetch active menu products
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const CATEGORY_ORDER = ['HOT', 'COLD', 'FOOD', 'RESERVE', 'SEASONAL']

export async function GET(_req: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      where: {
        isAvailable: true
      },
      include: {
        reviews: {
          select: {
            rating: true
          }
        }
      },
      orderBy: {
        sortOrder: 'asc'
      }
    })

    const processed = products.map(p => {
      const totalReviews = p.reviews.length
      const averageRating = totalReviews > 0
        ? p.reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews
        : 0

      // Remove the raw reviews array to keep payload clean
      const { reviews, ...rest } = p
      return {
        ...rest,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews
      }
    })
    
    const sortedProducts = [...processed].sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a.category)
      const idxB = CATEGORY_ORDER.indexOf(b.category)
      if (idxA !== idxB) {
        return idxA - idxB
      }
      return (a.sortOrder || 0) - (b.sortOrder || 0)
    })

    return NextResponse.json(sortedProducts)
  } catch (err: any) {
    console.error('Fetch public products error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
