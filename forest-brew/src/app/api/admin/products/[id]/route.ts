// ============================================================
//  PUT /api/admin/products/[id] — Update product (admin only)
//  DELETE /api/admin/products/[id] — Delete product (admin only)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const productUpdateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  notes: z.string(),
  basePrice: z.number().int().min(0),
  imageUrl: z.string().url().or(z.string().length(0)),
  badge: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  category: z.enum(['HOT', 'COLD', 'FOOD', 'RESERVE', 'SEASONAL']),
  isAvailable: z.boolean(),
  sortOrder: z.number().int(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = productUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid product data', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    // Check if another product has the same slug
    const duplicate = await prisma.product.findFirst({
      where: {
        slug: data.slug,
        id: { not: id },
      },
    })
    if (duplicate) {
      return NextResponse.json({ error: 'Another product is already using this slug.' }, { status: 422 })
    }

    const imageUrl = data.imageUrl || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=75'

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        imageUrl,
      },
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('Update product error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Delete product. ProductModifier relations will cascade due to onDelete: Cascade
    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Product deleted successfully.' })
  } catch (err: any) {
    console.error('Delete product error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
