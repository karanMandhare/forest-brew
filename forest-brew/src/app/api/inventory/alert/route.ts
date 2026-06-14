// ============================================================
//  POST /api/inventory/alert — Worker triggers inventory alert
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const alertSchema = z.object({
  itemName: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'DELIVERY' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const workerName = session.user.name || 'A worker'

    const body = await req.json()
    const parsed = alertSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { itemName } = parsed.data

    // Find the item in our inventory
    const item = await prisma.inventory.findUnique({
      where: { name: itemName },
    })

    // If item exists, let's make sure it is marked as below its threshold (e.g. set it to threshold - 1)
    if (item) {
      await prisma.inventory.update({
        where: { id: item.id },
        data: {
          quantity: Math.min(item.quantity, Math.max(0, item.threshold - 1)),
        },
      })
    }

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    })

    const message = `🚨 Worker Alert: ${workerName} reported that "${itemName}" is running very low! Please verify and replenish.`

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: '🚨 Worker Low Stock Alert',
          message,
          type: 'INVENTORY_ALERT',
        },
      })
    }

    return NextResponse.json({ success: true, message: 'Admins notified successfully' })
  } catch (err: any) {
    console.error('Error reporting inventory alert:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
