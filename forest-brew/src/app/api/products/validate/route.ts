// ============================================================
//  POST /api/products/validate
//  Validates a list of productIds against the current DB.
//  Returns which products are valid (available) and which are not.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bodySchema = z.object({
  productIds: z.array(z.string()).min(1).max(50),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { productIds } = parsed.data

    const availableProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, isAvailable: true },
      select: { id: true, name: true, isAvailable: true },
    })

    const availableIds = new Set(availableProducts.map(p => p.id))
    const invalidIds = productIds.filter(id => !availableIds.has(id))

    return NextResponse.json({
      valid: productIds.filter(id => availableIds.has(id)),
      invalid: invalidIds,
      allValid: invalidIds.length === 0,
    })
  } catch (err: any) {
    console.error('Validate products error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
