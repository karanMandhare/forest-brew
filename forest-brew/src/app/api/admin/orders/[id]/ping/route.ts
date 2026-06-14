// ============================================================
//  POST /api/admin/orders/[id]/ping — Ping counter call
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Touch the order by updating its updatedAt field to current time
    const order = await prisma.order.update({
      where: { id },
      data: { updatedAt: new Date() },
      select: { id: true, status: true, updatedAt: true },
    })

    return NextResponse.json({ success: true, order })
  } catch (err: any) {
    console.error('Ping order error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
