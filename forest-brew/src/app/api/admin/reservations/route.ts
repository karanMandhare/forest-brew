// ============================================================
//  GET /api/admin/reservations — Admin only reservation list
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const reservations = await prisma.reservation.findMany({
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(reservations)
  } catch (err: any) {
    console.error('Fetch reservations error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
