// ============================================================
//  PATCH /api/admin/reservations/[id] — Update reservation (e.g. confirm/cancel)
//  DELETE /api/admin/reservations/[id] — Cancel/Delete reservation
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendBookingConfirmation, sendBookingCancellation, sendBookingThankYou } from '@/lib/mail'

const patchSchema = z.object({
  confirmed: z.boolean().optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'PENDING', 'COMPLETED']).optional(),
  cancellationReason: z.string().max(500).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    // Retrieve the existing reservation details
    const existing = await prisma.reservation.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const targetStatus = parsed.data.status || 
      (parsed.data.confirmed === true ? 'CONFIRMED' : parsed.data.confirmed === false ? 'CANCELLED' : existing.status)

    let updated

    if (targetStatus === 'COMPLETED') {
      if (existing.status === 'COMPLETED' || existing.visited) {
        return NextResponse.json({ error: 'Reservation is already marked as completed/visited' }, { status: 400 })
      }

      const remainingAmount = 45000 // ₹450 in paise

      updated = await prisma.reservation.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          visited: true,
          remainingPaid: remainingAmount,
        },
      })

      // Send thank you email (non-blocking)
      sendBookingThankYou(
        updated.email,
        updated.customerName,
        updated.date.toISOString(),
        updated.totalAmount
      ).catch(err => console.error('Error sending thank you email:', err))

    } else if (targetStatus === 'CONFIRMED') {
      // 1. Confirm reservation
      updated = await prisma.reservation.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmed: true,
          cancellationReason: null,
        },
      })

      // Send confirmation email (non-blocking)
      sendBookingConfirmation(
        updated.email,
        updated.customerName,
        updated.date.toISOString(),
        updated.guestCount,
        updated.specialNotes || undefined
      ).catch(err => console.error('Error sending confirmation email:', err))

    } else if (targetStatus === 'CANCELLED') {
      // Prevent double refund if already cancelled
      if (existing.status === 'CANCELLED') {
        return NextResponse.json({ error: 'Reservation is already cancelled' }, { status: 400 })
      }

      const reason = parsed.data.cancellationReason || 'Table capacity reached / private event scheduling'

      // 2. Process refund and cancellation in a transaction
      updated = await prisma.$transaction(async (tx) => {
        // If there was an advance paid and user is linked, perform refund
        if (existing.advancePaid > 0 && existing.userId) {
          // Increment wallet balance
          await tx.user.update({
            where: { id: existing.userId },
            data: {
              walletBalance: {
                increment: existing.advancePaid,
              },
            },
          })

          // Create Refund Transaction log
          await tx.walletTransaction.create({
            data: {
              userId: existing.userId,
              amount: existing.advancePaid,
              type: 'REFUND',
              orderId: null,
              note: `Refund: Table Booking Cancelled - Ref: ${id.slice(-6).toUpperCase()}`,
            },
          })
        }

        // Update reservation to cancelled
        return await tx.reservation.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            confirmed: false,
            cancellationReason: reason,
          },
        })
      })

      // Send cancellation email (non-blocking)
      sendBookingCancellation(
        updated.email,
        updated.customerName,
        updated.date.toISOString(),
        updated.guestCount,
        reason,
        existing.advancePaid
      ).catch(err => console.error('Error sending cancellation email:', err))

    } else {
      // Handle reverting status to PENDING if explicitly set
      updated = await prisma.reservation.update({
        where: { id },
        data: {
          status: 'PENDING',
          confirmed: false,
        },
      })
    }

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('Update reservation error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch before delete to check if we need to refund
    const existing = await prisma.reservation.findUnique({
      where: { id },
    })

    if (existing && existing.status !== 'CANCELLED' && existing.advancePaid > 0 && existing.userId) {
      // If deleted directly without refunding, refund first to be safe
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.userId! },
          data: {
            walletBalance: {
              increment: existing.advancePaid,
            },
          },
        })

        await tx.walletTransaction.create({
          data: {
            userId: existing.userId!,
            amount: existing.advancePaid,
            type: 'REFUND',
            note: `Refund: Table Booking Deleted - Ref: ${id.slice(-6).toUpperCase()}`,
          },
        })
      })
    }

    await prisma.reservation.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Reservation deleted and refunded if applicable' })
  } catch (err: any) {
    console.error('Delete reservation error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
