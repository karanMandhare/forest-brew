// ============================================================
//  GET /api/admin/products — Fetch all products (admin only)
//  POST /api/admin/products — Create a new menu product (admin only)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  notes: z.string(),
  basePrice: z.number().int().min(0), // in paise
  imageUrl: z.string().url().or(z.string().length(0)),
  badge: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  category: z.enum(['HOT', 'COLD', 'FOOD', 'RESERVE', 'SEASONAL']),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

const CATEGORY_ORDER = ['HOT', 'COLD', 'FOOD', 'RESERVE', 'SEASONAL']

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const products = await prisma.product.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    const sortedProducts = [...products].sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a.category)
      const idxB = CATEGORY_ORDER.indexOf(b.category)
      if (idxA !== idxB) {
        return idxA - idxB
      }
      return (a.sortOrder || 0) - (b.sortOrder || 0)
    })

    return NextResponse.json(sortedProducts)
  } catch (err: any) {
    console.error('Fetch admin products error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = productSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid product data', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    // Check if slug is unique
    const existing = await prisma.product.findUnique({
      where: { slug: data.slug },
    })
    if (existing) {
      return NextResponse.json({ error: 'A product with this slug already exists.' }, { status: 422 })
    }

    // Default image if empty
    const imageUrl = data.imageUrl || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=75'

    const product = await prisma.$transaction(async (tx) => {
      // 1. Create product
      const prod = await tx.product.create({
        data: {
          ...data,
          imageUrl,
        },
      })

      // 2. Link all existing modifiers to this product
      const modifiers = await tx.modifier.findMany({ select: { id: true } })
      if (modifiers.length > 0) {
        await tx.productModifier.createMany({
          data: modifiers.map(mod => ({
            productId: prod.id,
            modifierId: mod.id,
          })),
        })
      }

      return prod
    })

    return NextResponse.json(product)
  } catch (err: any) {
    console.error('Create product error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
