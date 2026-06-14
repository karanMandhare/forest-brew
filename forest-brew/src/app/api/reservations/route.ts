// ============================================================
//  POST /api/reservations
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { emitNewBooking } from '@/lib/events'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { verifyCsrf } from '@/lib/csrf'

const bodySchema = z.object({
  customerName: z.string().min(2).max(80),
  email:        z.string().email(),
  phone:        z.string().optional(),
  date:         z.string().datetime(),
  guestCount:   z.number().int().min(1).max(20),
  specialNotes: z.string().max(500).optional(),
  tableNumber:  z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // CSRF Check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 })
    }

    // IP Rate Limit (5 reservation bookings per minute)
    const ip = getClientIp(req)
    if (isRateLimited(`ip:reserve-table:${ip}`, { windowMs: 60 * 1000, max: 5 })) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to reserve a table.' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole === 'ADMIN' || userRole === 'DELIVERY') {
      return NextResponse.json({ error: 'Reservations are restricted for staff accounts.' }, { status: 403 })
    }

    const userId = session.user.id
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const advanceAmount = 30000 // ₹300 in paise
    const totalAmount = 75000   // ₹750 in paise

    // Execute reservation and wallet deduction in a transaction
    const reservation = await prisma.$transaction(async (tx) => {
      // 1. Fetch user's wallet balance
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true },
      })

      if (!user) {
        throw new Error('User account not found')
      }

      if (user.walletBalance < advanceAmount) {
        throw new Error('Insufficient wallet balance. ₹300.00 advance required.')
      }

      // 1.5 Check if table is already booked for this slot (within a 2-hour window)
      if (parsed.data.tableNumber) {
        const checkDate = new Date(parsed.data.date)
        const startTime = new Date(checkDate.getTime() - 2 * 60 * 60 * 1000)
        const endTime = new Date(checkDate.getTime() + 2 * 60 * 60 * 1000)

        const existingBooking = await tx.reservation.findFirst({
          where: {
            tableNumber: parsed.data.tableNumber,
            status: { notIn: ['CANCELLED'] },
            date: {
              gte: startTime,
              lte: endTime,
            }
          }
        })

        if (existingBooking) {
          throw new Error(`Table ${parsed.data.tableNumber} is already reserved for a slot near this time. Please pick another table.`)
        }
      }

      // 2. Deduct advance amount from user's wallet
      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            decrement: advanceAmount,
          },
        },
      })

      // 3. Create the Reservation record
      const newReservation = await tx.reservation.create({
        data: {
          userId,
          customerName: parsed.data.customerName,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          date: new Date(parsed.data.date),
          guestCount: parsed.data.guestCount,
          specialNotes: parsed.data.specialNotes || null,
          status: 'PENDING',
          confirmed: false,
          advancePaid: advanceAmount,
          remainingPaid: 0,
          totalAmount: totalAmount,
          visited: false,
          tableNumber: parsed.data.tableNumber || null,
        },
      })

      // 4. Create the WalletTransaction record
      await tx.walletTransaction.create({
        data: {
          userId,
          amount: -advanceAmount,
          type: 'SPENT',
          orderId: null,
          note: `Table Reservation Advance - Ref: ${newReservation.id.slice(-6).toUpperCase()}`,
        },
      })

      return newReservation
    })

    // Fetch user image for popup avatar
    const userForPopup = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    })

    // ── Popup notification for admin ─────────────────────────────
    emitNewBooking({
      reservationId: reservation.id,
      customerName: reservation.customerName,
      customerEmail: reservation.email,
      customerPhone: reservation.phone || null,
      customerImage: userForPopup?.image || null,
      date: reservation.date.toISOString(),
      guestCount: reservation.guestCount,
      advancePaid: reservation.advancePaid,
    })

    return NextResponse.json({ success: true, id: reservation.id }, { status: 201 })
  } catch (err: any) {
    console.error('Reservation booking error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 400 })
  }
}
