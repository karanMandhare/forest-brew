// ============================================================
//  PATCH /api/worker/orders/[id]/accept — Accept/reject order assignment
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { appEvents } from '@/lib/events'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  action: z.enum(['accept', 'reject']),
  estimatedTime: z.number().int().min(1).optional(), // in minutes
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    if (role !== 'DELIVERY' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const workerId = session.user.id
    const workerName = session.user.name || 'Worker'

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const { action, estimatedTime } = parsed.data

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify order is assigned to this worker
    if (existingOrder.deliveryUserId !== workerId) {
      return NextResponse.json({ error: 'Forbidden: This order is not assigned to you' }, { status: 403 })
    }

    let updatedOrder

    if (action === 'accept') {
      // Transition to BREWING (Preparing) and set estimated time
      updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'BREWING',
          estimatedTime: estimatedTime || 15, // default 15 minutes
          acceptedAt: new Date(),
          preparingAt: new Date(),
          workerId: workerId,
        },
      })

      // Notify customer (if logged in)
      if (existingOrder.userId) {
        await prisma.notification.create({
          data: {
            userId: existingOrder.userId,
            title: '☕ Preparing your brew!',
            message: `Your order is now being prepared by ${workerName}. Estimated preparation time is ${estimatedTime || 15} minutes.`,
            type: 'ORDER_STATUS',
          },
        })
      }

      // Emit SSE event
      appEvents.emit('order_updated', {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        userId: existingOrder.userId || undefined,
        workerId: updatedOrder.deliveryUserId || undefined
      })
    } else {
      // Rejecting assignment: unassign worker and reset status back to RECEIVED (Approved)
      updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryUserId: null,
          workerId: null,
          status: 'RECEIVED',
        },
      })

      // Notify admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      })

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: '⚠️ Assignment Rejected',
            message: `${workerName} rejected the assignment for Order #${orderId.slice(-6).toUpperCase()}. Please reassign a worker.`,
            type: 'SYSTEM',
          },
        })
      }

      // Emit SSE event
      appEvents.emit('order_updated', {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        userId: existingOrder.userId || undefined,
        workerId: null
      })
    }

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (err: any) {
    console.error('Error handling order assignment:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
