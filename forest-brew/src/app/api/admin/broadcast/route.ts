// ============================================================
//  POST /api/admin/broadcast — Dispatch a store-wide message to staff
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { appEvents } from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { message, target } = await req.json()

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const cleanMessage = message.trim()
    const targetType = target === 'all' ? 'all' : 'online'

    // Query target workers (role is DELIVERY or ADMIN? The task requested delivery staff, but let's query all staff/delivery workers)
    // Task description says: "dispatch urgent message announcements ... directly to all online workers."
    // Let's query users with role === 'DELIVERY'
    const whereClause: any = { role: 'DELIVERY' }
    if (targetType === 'online') {
      whereClause.isAvailable = true
    }

    const workers = await prisma.user.findMany({
      where: whereClause,
      select: { id: true }
    })

    if (workers.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No active workers found matching filters' })
    }

    // Record Notification records in a batch/transaction and dispatch SSE events
    const notifications = await prisma.$transaction(
      workers.map((worker) =>
        prisma.notification.create({
          data: {
            userId: worker.id,
            title: '📢 Store Broadcast',
            message: cleanMessage,
            type: 'SYSTEM',
            isRead: false
          }
        })
      )
    )

    // Emit event notifications
    notifications.forEach((notif) => {
      appEvents.emit('notification_created', {
        userId: notif.userId,
        notification: notif
      })
    })

    return NextResponse.json({
      success: true,
      count: workers.length,
      message: `Announcement successfully broadcasted to ${workers.length} worker(s).`
    })
  } catch (err: any) {
    console.error('Admin broadcast error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
