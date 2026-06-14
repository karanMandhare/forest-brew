// ============================================================
//  GET /api/worker/records — Fetch logged-in worker's HR records
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

    // Fetch attendances
    const attendances = await prisma.workerAttendance.findMany({
      where: { workerId },
      orderBy: { date: 'desc' },
    })

    // Fetch payments
    const payments = await prisma.workerPayment.findMany({
      where: { workerId },
      orderBy: { month: 'desc' },
    })

    // Compute stats
    const stats = {
      present: attendances.filter((a: any) => a.status === 'PRESENT').length,
      halfDay: attendances.filter((a: any) => a.status === 'HALF_DAY').length,
      sickLeave: attendances.filter((a: any) => a.status === 'SICK_LEAVE').length,
      absent: attendances.filter((a: any) => a.status === 'ABSENT').length,
      totalBonus: payments.filter((p: any) => p.status === 'PAID').reduce((acc: number, curr: any) => acc + curr.bonus, 0),
      totalPaid: payments.filter((p: any) => p.status === 'PAID').reduce((acc: number, curr: any) => acc + curr.amount + curr.bonus, 0),
    }

    return NextResponse.json({
      success: true,
      attendances,
      payments,
      stats,
    })
  } catch (err: any) {
    console.error('Fetch worker records error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
