// ============================================================
//  PATCH /api/worker/status — Toggle worker availability shift
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { appEvents } from '@/lib/events'
import { autoAssignOrder } from '@/lib/delivery'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  isAvailable: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workerId = session.user.id

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { isAvailable } = parsed.data

    // If worker goes online, log attendance for today if not already present
    if (isAvailable) {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      const existingAttendance = await prisma.workerAttendance.findUnique({
        where: {
          workerId_date: {
            workerId,
            date: today,
          },
        },
      })

      if (!existingAttendance) {
        await prisma.workerAttendance.create({
          data: {
            workerId,
            date: today,
            status: 'PRESENT',
            notes: 'Shift started online',
          },
        })
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: workerId },
      data: { isAvailable },
      select: { id: true, name: true, email: true, isAvailable: true },
    })

    // Notify listeners that this worker's record changed
    appEvents.emit('worker_record_updated', { workerId })

    // If worker went online, try to auto-assign any pending/unassigned delivery orders
    if (isAvailable) {
      const unassignedOrders = await prisma.order.findMany({
        where: {
          orderType: 'DELIVERY',
          status: { in: ['RECEIVED', 'READY'] },
          deliveryUserId: null,
        },
        select: { id: true },
      })

      for (const order of unassignedOrders) {
        await autoAssignOrder(order.id)
      }
    }

    return NextResponse.json({ success: true, worker: updatedUser })
  } catch (err: any) {
    console.error('Error toggling worker availability status:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
