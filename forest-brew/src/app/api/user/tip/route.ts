import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const { orderId, amountRupees } = body

    if (!orderId || !amountRupees || parseFloat(amountRupees) <= 0) {
      return NextResponse.json({ error: 'Invalid order ID or tip amount.' }, { status: 400 })
    }

    const tipAmountPaise = Math.round(parseFloat(amountRupees) * 100)

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        deliveryUserId: true,
        workerId: true,
        status: true,
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    if (order.userId !== userId) {
      return NextResponse.json({ error: 'You can only tip for your own orders.' }, { status: 403 })
    }

    // Determine target worker (delivery agent takes priority for delivery orders, else barista worker)
    const targetWorkerId = order.deliveryUserId || order.workerId

    if (!targetWorkerId) {
      return NextResponse.json({ error: 'No worker is currently assigned to this order to receive a tip.' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch customer details
      const customer = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true, name: true }
      })

      if (!customer) {
        throw new Error('Customer account not found.')
      }

      if (customer.walletBalance < tipAmountPaise) {
        throw new Error(`Insufficient wallet balance. You need ₹${(tipAmountPaise / 100).toFixed(2)} to pay this tip.`)
      }

      // 2. Deduct tip from customer wallet
      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { decrement: tipAmountPaise }
        }
      })

      // 3. Credit tip to worker wallet
      const updatedWorker = await tx.user.update({
        where: { id: targetWorkerId },
        data: {
          walletBalance: { increment: tipAmountPaise }
        }
      })

      // 4. Log customer wallet transaction (SPENT)
      await tx.walletTransaction.create({
        data: {
          userId,
          amount: -tipAmountPaise,
          type: 'SPENT',
          orderId,
          note: `Tip to staff for Order #${order.id.slice(-6).toUpperCase()}`
        }
      })

      // 5. Log worker wallet transaction (TOP_UP/CREDIT)
      await tx.walletTransaction.create({
        data: {
          userId: targetWorkerId,
          amount: tipAmountPaise,
          type: 'TOP_UP',
          orderId,
          note: `Received Customer Tip for Order #${order.id.slice(-6).toUpperCase()}`
        }
      })

      // 6. Notify worker
      await tx.notification.create({
        data: {
          userId: targetWorkerId,
          title: '🎉 Tip Received!',
          message: `A customer tipped you ₹${(tipAmountPaise / 100).toFixed(2)} for Order #${order.id.slice(-6).toUpperCase()}!`,
          type: 'SYSTEM'
        }
      })

      return { success: true, tipAmount: tipAmountPaise, workerName: updatedWorker.name }
    })

    return NextResponse.json(result, { status: 200 })
  } catch (err: any) {
    console.error('Tipping error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 400 })
  }
}
