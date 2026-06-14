// ============================================================
//  GET & POST /api/admin/workers/[id]/records
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { appEvents } from '@/lib/events'


const attendanceSchema = z.object({
  date: z.string(),
  status: z.enum(['PRESENT', 'HALF_DAY', 'SICK_LEAVE', 'ABSENT']),
  notes: z.string().optional().nullable(),
})

const paymentSchema = z.object({
  month: z.string().min(3),
  amount: z.number().min(0), // in paise
  bonus: z.number().min(0).default(0), // in paise
  status: z.enum(['PAID', 'PENDING']),
  paymentDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify worker exists and is indeed a worker
    const worker = await prisma.user.findFirst({
      where: { id: workerId, role: 'DELIVERY' },
    })
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const attendances = await prisma.workerAttendance.findMany({
      where: { workerId },
      orderBy: { date: 'desc' },
    })

    const payments = await prisma.workerPayment.findMany({
      where: { workerId },
      orderBy: { month: 'desc' },
    })

    return NextResponse.json({
      worker,
      attendances,
      payments,
    })
  } catch (err: any) {
    console.error('Fetch worker records admin error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workerId } = await params
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const worker = await prisma.user.findFirst({
      where: { id: workerId, role: 'DELIVERY' },
    })
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const body = await req.json()
    const { type } = body

    if (type === 'attendance') {
      const parsed = attendanceSchema.safeParse(body.payload)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      }

      const { date, status, notes } = parsed.data
      
      // Normalize date to midnight UTC
      const originalDate = new Date(date)
      const normalizedDate = new Date(Date.UTC(
        originalDate.getUTCFullYear(),
        originalDate.getUTCMonth(),
        originalDate.getUTCDate(),
        0, 0, 0, 0
      ))

      const record = await prisma.workerAttendance.upsert({
        where: {
          workerId_date: {
            workerId,
            date: normalizedDate,
          },
        },
        update: {
          status,
          notes: notes || null,
        },
        create: {
          workerId,
          date: normalizedDate,
          status,
          notes: notes || null,
        },
      })

      // Emit real-time notification update for worker sync
      appEvents.emit('worker_record_updated', { workerId })

      return NextResponse.json({ success: true, message: 'Attendance logged successfully', record })

    } else if (type === 'payment') {
      const parsed = paymentSchema.safeParse(body.payload)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      }

      const { month, amount, bonus, status, paymentDate, notes } = parsed.data

      const record = await prisma.workerPayment.upsert({
        where: {
          workerId_month: {
            workerId,
            month,
          },
        },
        update: {
          amount,
          bonus,
          status,
          paymentDate: paymentDate ? new Date(paymentDate) : null,
          notes: notes || null,
        },
        create: {
          workerId,
          month,
          amount,
          bonus,
          status,
          paymentDate: paymentDate ? new Date(paymentDate) : null,
          notes: notes || null,
        },
      })

      // Emit real-time notification update for worker sync
      appEvents.emit('worker_record_updated', { workerId })

      return NextResponse.json({ success: true, message: 'Payment record saved successfully', record })

    } else {
      return NextResponse.json({ error: 'Invalid record type' }, { status: 400 })
    }

  } catch (err: any) {
    console.error('Save worker record admin error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
