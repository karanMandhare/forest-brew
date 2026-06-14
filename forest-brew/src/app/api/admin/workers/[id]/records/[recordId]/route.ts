// ============================================================
//  DELETE /api/admin/workers/[id]/records/[recordId]
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { appEvents } from '@/lib/events'


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: workerId, recordId } = await params
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'attendance' or 'payment'

    if (!type || (type !== 'attendance' && type !== 'payment')) {
      return NextResponse.json({ error: 'Type query parameter is required (attendance or payment)' }, { status: 400 })
    }

    if (type === 'attendance') {
      const existing = await prisma.workerAttendance.findFirst({
        where: { id: recordId, workerId },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
      }
      await prisma.workerAttendance.delete({
        where: { id: recordId },
      })
    } else {
      const existing = await prisma.workerPayment.findFirst({
        where: { id: recordId, workerId },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
      }
      await prisma.workerPayment.delete({
        where: { id: recordId },
      })
    }

    // Emit real-time notification update for worker sync
    appEvents.emit('worker_record_updated', { workerId })

    return NextResponse.json({ success: true, message: 'Record deleted successfully' })
  } catch (err: any) {
    console.error('Delete worker record error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
