import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { appEvents } from '@/lib/events'

const workerCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().nullable(),
  salary: z.number().min(0, 'Salary must be a positive number'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().nullable(),
})

// GET /api/admin/workers — Fetch all delivery staff with their statistics
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch all users with role DELIVERY
    const workers = await prisma.user.findMany({
      where: { role: 'DELIVERY' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        salary: true,
        isAvailable: true,
        createdAt: true,
        deliveries: {
          select: {
            id: true,
            status: true,
            assignedAt: true,
            deliveredAt: true,
            feedbacks: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate dynamic stats for each worker
    const workersWithStats = workers.map((worker) => {
      const deliveredOrders = worker.deliveries.filter((o) => o.status === 'DELIVERED')
      const ordersServed = deliveredOrders.length

      const activeDeliveries = worker.deliveries.filter((o) =>
        ['ASSIGNED', 'BREWING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)
      ).length

      // Calculate average feedback rating
      let totalRating = 0
      let feedbackCount = 0
      worker.deliveries.forEach((o) => {
        o.feedbacks.forEach((f) => {
          totalRating += f.rating
          feedbackCount++
        })
      })
      const avgRating = feedbackCount > 0 ? parseFloat((totalRating / feedbackCount).toFixed(1)) : 0

      // Calculate average preparation/delivery speed in minutes (assignedAt to deliveredAt)
      let totalTimeMs = 0
      let speedCount = 0
      deliveredOrders.forEach((o) => {
        if (o.assignedAt && o.deliveredAt) {
          const duration = new Date(o.deliveredAt).getTime() - new Date(o.assignedAt).getTime()
          if (duration > 0) {
            totalTimeMs += duration
            speedCount++
          }
        }
      })
      const avgPrepSpeed = speedCount > 0 ? Math.round(totalTimeMs / (speedCount * 60 * 1000)) : 0

      return {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        salary: worker.salary,
        isAvailable: worker.isAvailable,
        createdAt: worker.createdAt,
        ordersServed,
        activeDeliveries,
        avgRating,
        avgPrepSpeed,
      }
    })

    return NextResponse.json(workersWithStats)
  } catch (err: any) {
    console.error('Fetch workers error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/workers — Register a new delivery staff member
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = workerCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, email, phone, salary, password } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password || 'forestbrew123', 12)

    const newWorker = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone: phone || null,
        salary: salary,
        passwordHash,
        role: 'DELIVERY',
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        salary: true,
        createdAt: true,
      },
    })

    // Emit real-time notification update for workers roster sync
    appEvents.emit('worker_record_updated', { workerId: newWorker.id })

    return NextResponse.json({
      success: true,
      message: 'Worker registered successfully!',
      worker: {
        ...newWorker,
        ordersServed: 0,
        activeDeliveries: 0,
        avgRating: 0,
        avgPrepSpeed: 0,
      },
    })
  } catch (err: any) {
    console.error('Create worker error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}