// ============================================================
//  GET /api/admin/modifiers — Fetch all customization modifiers (admin only)
//  PUT /api/admin/modifiers — Update modifier price/availability (admin only)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const modifierSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  priceAdjustment: z.number().int(),
  isAvailable: z.boolean(),
})

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const modifiers = await prisma.modifier.findMany({
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' },
      ],
    })

    return NextResponse.json(modifiers)
  } catch (err: any) {
    console.error('Fetch modifiers error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = modifierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid modifier data', details: parsed.error.flatten() }, { status: 400 })
    }

    const { id, name, priceAdjustment, isAvailable } = parsed.data

    const updated = await prisma.modifier.update({
      where: { id },
      data: {
        name,
        priceAdjustment,
        isAvailable,
      },
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('Update modifier error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
