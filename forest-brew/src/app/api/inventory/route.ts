// ============================================================
//  /api/inventory/route.ts — Inventory stock tracking API
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  unit: z.string().min(1),
  threshold: z.number().int().nonnegative(),
  category: z.string().optional().nullable(),
})

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    if (role !== 'ADMIN' && role !== 'DELIVERY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const inventory = await prisma.inventory.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(inventory)
  } catch (err: any) {
    console.error('Error fetching inventory:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const { id, name, quantity, unit, threshold, category } = parsed.data

    let item
    if (id) {
      item = await prisma.inventory.update({
        where: { id },
        data: { name, quantity, unit, threshold, category },
      })
    } else {
      item = await prisma.inventory.upsert({
        where: { name },
        update: { quantity, unit, threshold, category },
        create: { name, quantity, unit, threshold, category },
      })
    }

    // Check if item is now below threshold and send notifications if so
    if (item.quantity <= item.threshold) {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      })

      for (const admin of admins) {
        // Only create if not already notified or just notify directly
        const recentNotif = await prisma.notification.findFirst({
          where: {
            userId: admin.id,
            type: 'INVENTORY_ALERT',
            message: { contains: item.name },
            createdAt: { gte: new Date(Date.now() - 3600 * 1000) } // past 1 hour
          }
        })

        if (!recentNotif) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: '🚨 Low Inventory Alert',
              message: `The item "${item.name}" is low on stock (${item.quantity} ${item.unit} remaining, threshold: ${item.threshold}).`,
              type: 'INVENTORY_ALERT',
            },
          })
        }
      }
    }

    return NextResponse.json(item)
  } catch (err: any) {
    console.error('Error saving inventory item:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
