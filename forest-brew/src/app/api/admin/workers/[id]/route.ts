import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { appEvents } from '@/lib/events'


const workerUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().nullable(),
  salary: z.number().min(0, 'Salary must be a positive number').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = workerUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const existingWorker = await prisma.user.findFirst({
      where: { id, role: 'DELIVERY' },
    })

    if (!existingWorker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const { name, email, phone, salary, password } = parsed.data
    const updateData: any = {}

    if (name) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (salary !== undefined) updateData.salary = salary

    if (email) {
      const normalizedEmail = email.toLowerCase().trim()
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
      }
      updateData.email = normalizedEmail
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12)
    }

    const updatedWorker = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        salary: true,
        createdAt: true,
      },
    })

    // Fetch fresh statistics
    const ordersServed = await prisma.order.count({
      where: {
        deliveryUserId: id,
        status: 'DELIVERED',
      },
    })
    const activeDeliveries = await prisma.order.count({
      where: {
        deliveryUserId: id,
        status: 'OUT_FOR_DELIVERY',
      },
    })

    // Emit real-time notification update for workers sync
    appEvents.emit('worker_record_updated', { workerId: id })

    return NextResponse.json({

      success: true,
      message: 'Worker updated successfully!',
      worker: {
        ...updatedWorker,
        ordersServed,
        activeDeliveries,
      },
    })
  } catch (err: any) {
    console.error('Update worker error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const existingWorker = await prisma.user.findFirst({
      where: { id, role: 'DELIVERY' },
    })

    if (!existingWorker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Safety: set deliveryUserId to null on all orders they are associated with
    await prisma.$transaction([
      prisma.order.updateMany({
        where: { deliveryUserId: id },
        data: { deliveryUserId: null },
      }),
      prisma.user.delete({
        where: { id },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Worker deleted successfully!',
    })
  } catch (err: any) {
    console.error('Delete worker error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
