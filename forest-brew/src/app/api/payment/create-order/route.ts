// ============================================================
//  POST /api/payment/create-order
//  CRITICAL: Server-side price recalculation — never trusts client
//  Added: Wallet Payment and Stars Loyalty points discount
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { sendOrderConfirmation } from '@/lib/mail'
import { appEvents, emitNewOrder } from '@/lib/events'
import { autoAssignOrder } from '@/lib/delivery'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { verifyCsrf } from '@/lib/csrf'

const itemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(20),
  customization: z.object({
    milk: z.string().optional(),
    syrups: z.array(z.string()).optional(),
    temperature: z.enum(['hot', 'iced', 'blended']).optional(),
    size: z.enum(['tall', 'grande', 'venti']).optional(),
    foodWarming: z.enum(['warmed', 'not_warmed']).optional(),
    foodSize: z.enum(['regular', 'large']).optional(),
    foodAddons: z.array(z.string()).optional(),
    specialInstructions: z.string().optional(),
  }).optional(),
})

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  orderType: z.enum(['DINE_IN', 'DELIVERY']).default('DINE_IN'),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  tableNumber: z.string().optional(),
  paymentMethod: z.enum(['WALLET', 'RAZORPAY', 'CASH', 'QR']).default('RAZORPAY'),
  starsToRedeem: z.number().int().min(0).default(0),
  notes: z.string().optional(),
}).refine(data => {
  if (data.orderType === 'DELIVERY') {
    return !!data.customerPhone && !!data.deliveryAddress
  }
  return true
}, {
  message: 'Phone number and delivery address are required for home delivery',
  path: ['deliveryAddress']
})

// Server-side customization price calculator (mirrors the DB modifier prices)
function serverCalcCustomizationPrice(
  customization: {
    milk?: string
    syrups?: string[]
    temperature?: string
    size?: string
    foodWarming?: string
    foodSize?: string
    foodAddons?: string[]
  },
  category?: string,
  productName?: string
): number {
  let extra = 0
  const isFoodOnly = category === 'FOOD'
  const isCombo = category === 'RESERVE' && productName && productName.toLowerCase().includes('sandwich') && productName.toLowerCase().includes('latte')

  // Calculate food extra if category is FOOD or it is a combo
  if (isFoodOnly || isCombo) {
    const FOOD_SIZE_PRICES: Record<string, number> = {
      regular: 0,
      large: 5000, // ₹50
    }
    const FOOD_ADDON_PRICES: Record<string, number> = {
      extra_cheese: 3000, // ₹30
      gluten_free: 4000,  // ₹40
    }
    if (customization.foodSize) {
      extra += FOOD_SIZE_PRICES[customization.foodSize] ?? 0
    }
    if (customization.foodAddons) {
      customization.foodAddons.forEach((addon) => {
        extra += FOOD_ADDON_PRICES[addon] ?? 0
      })
    }
  }

  // Calculate drink extra if category is NOT FOOD or it is a combo
  if (!isFoodOnly || isCombo) {
    const MILK_PRICES: Record<string, number> = {
      oat: 4000, almond: 5000, soy: 4000, coconut: 5000, whole: 0, skimmed: 0,
    }
    const SYRUP_PRICE = 3000
    const SIZE_PRICES: Record<string, number> = {
      tall: 0, grande: 5000, venti: 10000,
    }
    const TEMP_PRICES: Record<string, number> = {
      hot: 0, iced: 0, blended: 2000,
    }

    if (customization.milk) extra += MILK_PRICES[customization.milk] ?? 0
    if (customization.syrups) extra += customization.syrups.length * SYRUP_PRICE
    if (customization.size) extra += SIZE_PRICES[customization.size] ?? 0
    if (customization.temperature) extra += TEMP_PRICES[customization.temperature] ?? 0
  }

  return extra
}

export async function POST(req: NextRequest) {
  try {
    // CSRF Check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 })
    }

    // IP Rate Limit (10 order creation requests per minute)
    const ip = getClientIp(req)
    if (isRateLimited(`ip:create-order:${ip}`, { windowMs: 60 * 1000, max: 10 })) {
      return NextResponse.json({ error: 'Too many order requests. Please try again later.' }, { status: 429 })
    }

    const session = await auth()
    if (session?.user) {
      const userRole = session.user.role
      if (userRole === 'ADMIN' || userRole === 'DELIVERY') {
        return NextResponse.json(
          { error: 'Store administrators and staff are not permitted to place orders.' },
          { status: 403 }
        )
      }
    }
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { items, customerName, customerEmail, paymentMethod, starsToRedeem, notes } = parsed.data

    // ── STRICT: Fetch all product prices from the DATABASE ──────
    const productIds = [...new Set(items.map(i => i.productId))] // deduplicate
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isAvailable: true },
      select: { id: true, name: true, basePrice: true, category: true },
    })

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map(p => p.id))
      const missingIds = productIds.filter(id => !foundIds.has(id))
      return NextResponse.json(
        { error: `One or more items in your cart are unavailable or no longer exist. Please refresh the page and try again. (IDs: ${missingIds.join(', ')})` },
        { status: 422 }
      )
    }

    const productMap = new Map(products.map(p => [p.id, p]))

    // ── Recalculate total on the server — never trust the client ─
    let serverTotal = 0
    const orderItems: Array<{
      productId: string
      quantity: number
      unitPrice: number
      customizations: object
    }> = []

    for (const item of items) {
      const product = productMap.get(item.productId)!
      const customizationPrice = serverCalcCustomizationPrice(item.customization ?? {}, product.category, product.name)
      const unitPrice = product.basePrice + customizationPrice
      serverTotal += unitPrice * item.quantity
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        customizations: item.customization ?? {},
      })
    }

    // ── Fetch active subscription discount ──────────────────────────
    let subscriptionDiscount = 0
    let isSubscribed = false
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id as string },
        select: { subscriptionTier: true, subscriptionStatus: true, subscriptionExpires: true }
      })
      if (user && user.subscriptionStatus === 'ACTIVE' && user.subscriptionExpires && new Date(user.subscriptionExpires) > new Date()) {
        isSubscribed = true
        const rate = user.subscriptionTier === 'SEEDLING' ? 0.10 : 0.20
        subscriptionDiscount = Math.round(serverTotal * rate)
      }
    }

    const totalAfterSubscription = Math.max(0, serverTotal - subscriptionDiscount)

    // ── Check Loyalty Points / Stars ──────────────────────────────
    let discountAmount = 0
    let finalStarsToRedeem = 0

    if (starsToRedeem > 0) {
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'You must be logged in to redeem Stars.' }, { status: 401 })
      }
      const sessionUserId = session.user.id as string

      const user = await prisma.user.findUnique({ where: { id: sessionUserId } })
      if (!user || user.loyaltyPoints < starsToRedeem) {
        return NextResponse.json({ error: 'Insufficient Stars balance.' }, { status: 400 })
      }

      // 1 Star = ₹1 discount (100 paise)
      discountAmount = starsToRedeem * 100
      // Discount cannot exceed subtotal after subscription discount
      if (discountAmount > totalAfterSubscription) {
        discountAmount = totalAfterSubscription
        finalStarsToRedeem = Math.ceil(totalAfterSubscription / 100)
      } else {
        finalStarsToRedeem = starsToRedeem
      }
    }

    const finalTotal = Math.max(0, totalAfterSubscription - discountAmount)
    const { orderType, customerPhone, deliveryAddress, latitude, longitude, tableNumber } = parsed.data

    // ── Fetch session user image for popup avatar ─────────────────
    let customerImage: string | null = null
    if (session?.user?.id) {
      const userRecord = await prisma.user.findUnique({
        where: { id: session.user.id as string },
        select: { image: true },
      })
      customerImage = userRecord?.image || null
    }

    // Helper: fire the admin popup event after order is confirmed
    const fireOrderPopup = (orderId: string, method: string) => {
      const firstItem = productMap.get(orderItems[0]?.productId)
      emitNewOrder({
        orderId,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        customerImage,
        orderType,
        totalAmount: finalTotal,
        tableNumber: tableNumber || null,
        deliveryAddress: deliveryAddress || null,
        itemCount: orderItems.reduce((s, i) => s + i.quantity, 0),
        firstItemName: firstItem?.name || 'Coffee',
        paymentMethod: method,
      })
    }

    // ── CASE 1: Order is fully paid by Stars ─────────────────────────
    if (finalTotal === 0 && finalStarsToRedeem > 0) {
      const order = await prisma.$transaction(async (tx) => {
        // Create Order as RECEIVED immediately
        const ord = await tx.order.create({
          data: {
            userId: session?.user?.id || null,
            totalAmount: serverTotal,
            starsRedeemed: finalStarsToRedeem,
            paymentMethod: 'WALLET',
            paymentId: `stars_full_${Date.now()}`,
            customerName,
            customerEmail,
            customerPhone,
            deliveryAddress,
            latitude,
            longitude,
            orderType,
            tableNumber,
            status: 'RECEIVED',
            paymentStatus: 'PAID',
            acceptedAt: new Date(),
            notes,
            items: { create: orderItems },
          },
        })

        // Deduct points
        await tx.user.update({
          where: { id: session!.user!.id as string },
          data: { loyaltyPoints: { decrement: finalStarsToRedeem } },
        })

        await tx.loyaltyTransaction.create({
          data: {
            userId: session!.user!.id as string,
            points: -finalStarsToRedeem,
            type: 'REDEEM',
            orderId: ord.id,
            note: `Redeemed for order #${ord.id.slice(-6).toUpperCase()}`,
          },
        })

        return ord
      })

      // Call autoAssignOrder (which handles only DELIVERY type and online workers availability)
      const assignedOrder = await autoAssignOrder(order.id)
      if (!assignedOrder) {
        // Emit SSE event
        appEvents.emit('order_updated', {
          orderId: order.id,
          status: 'RECEIVED',
          userId: session?.user?.id || undefined,
        })
      }

      // ── Popup notification for admin ─────────────────────────────
      fireOrderPopup(order.id, 'STARS')

      if (customerEmail) {
        const formattedItems = orderItems.map(item => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          customizations: item.customizations,
          product: {
            name: productMap.get(item.productId)?.name || 'Coffee Item',
          },
        }))
        sendOrderConfirmation(
          customerEmail,
          customerName || session?.user?.name || 'Customer',
          order.id,
          serverTotal,
          formattedItems,
          orderType,
          deliveryAddress,
          tableNumber
        ).catch(err => console.error('Error sending order confirmation email:', err))
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        paidViaWallet: true,
        amount: 0,
      })
    }

    // ── CASE 2: Pay via Starbucks Card / Digital Wallet ──────────────
    if (paymentMethod === 'WALLET') {
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'You must be logged in to pay with Starbucks Card.' }, { status: 401 })
      }
      const sessionUserId = session.user.id as string

      const user = await prisma.user.findUnique({ where: { id: sessionUserId } })
      if (!user) {
        return NextResponse.json({ error: 'User account not found.' }, { status: 404 })
      }

      if (user.walletBalance < finalTotal) {
        return NextResponse.json({ error: 'Insufficient Wallet balance.' }, { status: 400 })
      }

      // Deduct balance and create order in a transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create order as RECEIVED immediately
        const ord = await tx.order.create({
          data: {
            userId: sessionUserId,
            totalAmount: finalTotal,
            starsRedeemed: finalStarsToRedeem,
            paymentMethod: 'WALLET',
            paymentId: `wallet_spent_${Date.now()}`,
            customerName,
            customerEmail,
            customerPhone,
            deliveryAddress,
            latitude,
            longitude,
            orderType,
            tableNumber,
            status: 'RECEIVED',
            paymentStatus: 'PAID',
            acceptedAt: new Date(),
            notes,
            items: { create: orderItems },
          },
        })

        // Deduct from wallet balance
        await tx.user.update({
          where: { id: sessionUserId },
          data: { walletBalance: { decrement: finalTotal } },
        })

        // Log wallet transaction
        await tx.walletTransaction.create({
          data: {
            userId: sessionUserId,
            amount: -finalTotal,
            type: 'SPENT',
            orderId: ord.id,
            note: `Paid for order #${ord.id.slice(-6).toUpperCase()}`,
          },
        })

        // Deduct redeemed stars (if any)
        if (finalStarsToRedeem > 0) {
          await tx.user.update({
            where: { id: sessionUserId },
            data: { loyaltyPoints: { decrement: finalStarsToRedeem } },
          })
          await tx.loyaltyTransaction.create({
            data: {
              userId: sessionUserId,
              points: -finalStarsToRedeem,
              type: 'REDEEM',
              orderId: ord.id,
              note: `Redeemed for order #${ord.id.slice(-6).toUpperCase()}`,
            },
          })
        }

        // Earn loyalty stars for the remaining amount paid (1 star per ₹1 spent)
        const pointsEarned = Math.floor(finalTotal / 100)
        if (pointsEarned > 0) {
          await tx.user.update({
            where: { id: sessionUserId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          })
          await tx.loyaltyTransaction.create({
            data: {
              userId: sessionUserId,
              points: pointsEarned,
              type: 'EARN',
              orderId: ord.id,
              note: `Earned for order #${ord.id.slice(-6).toUpperCase()}`,
            },
          })
        }

        return ord
      })

      // Call autoAssignOrder (which handles only DELIVERY type and online workers availability)
      const assignedOrder = await autoAssignOrder(order.id)
      if (!assignedOrder) {
        // Emit SSE event
        appEvents.emit('order_updated', {
          orderId: order.id,
          status: 'RECEIVED',
          userId: sessionUserId,
        })
      }

      // ── Popup notification for admin ─────────────────────────────
      fireOrderPopup(order.id, 'WALLET')

      // Send email confirmation in the background (non-blocking)
      if (customerEmail) {
        const formattedItems = orderItems.map(item => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          customizations: item.customizations,
          product: {
            name: productMap.get(item.productId)?.name || 'Coffee Item',
          },
        }))
        sendOrderConfirmation(
          customerEmail,
          customerName || session?.user?.name || 'Customer',
          order.id,
          finalTotal,
          formattedItems,
          orderType,
          deliveryAddress,
          tableNumber
        ).catch(err => console.error('Error sending order confirmation email:', err))
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        paidViaWallet: true,
        amount: finalTotal,
      })
    }

    // ── CASE 4: Cash or QR Code Payment ──────────────────────────────
    if (paymentMethod === 'CASH' || paymentMethod === 'QR') {
      const order = await prisma.$transaction(async (tx) => {
        const ord = await tx.order.create({
          data: {
            userId: session?.user?.id || null,
            totalAmount: finalTotal,
            starsRedeemed: finalStarsToRedeem,
            paymentMethod,
            paymentId: `${paymentMethod.toLowerCase()}_pending_${Date.now()}`,
            customerName,
            customerEmail,
            customerPhone,
            deliveryAddress,
            latitude,
            longitude,
            orderType,
            tableNumber,
            status: paymentMethod === 'QR' ? 'PENDING' : 'RECEIVED',
            paymentStatus: 'PENDING',
            acceptedAt: paymentMethod === 'QR' ? null : new Date(),
            notes,
            items: { create: orderItems },
          },
        })

        // Deduct redeemed stars (if any)
        if (session?.user?.id && finalStarsToRedeem > 0) {
          await tx.user.update({
            where: { id: session.user.id as string },
            data: { loyaltyPoints: { decrement: finalStarsToRedeem } },
          })
          await tx.loyaltyTransaction.create({
            data: {
              userId: session.user.id as string,
              points: -finalStarsToRedeem,
              type: 'REDEEM',
              orderId: ord.id,
              note: `Redeemed for order #${ord.id.slice(-6).toUpperCase()}`,
            },
          })
        }

        return ord
      })

      let assignedOrder = null
      if (order.status === 'RECEIVED') {
        assignedOrder = await autoAssignOrder(order.id)
      }
      if (!assignedOrder) {
        // Emit SSE event
        appEvents.emit('order_updated', {
          orderId: order.id,
          status: order.status,
          userId: session?.user?.id || undefined,
        })
      }

      // ── Popup notification for admin ─────────────────────────────
      fireOrderPopup(order.id, paymentMethod)

      // Send email confirmation in the background (non-blocking) ONLY for CASH orders.
      // QR orders will send confirmation only after payment verification by admin.
      if (paymentMethod === 'CASH' && customerEmail) {
        const formattedItems = orderItems.map(item => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          customizations: item.customizations,
          product: {
            name: productMap.get(item.productId)?.name || 'Coffee Item',
          },
        }))
        sendOrderConfirmation(
          customerEmail,
          customerName || session?.user?.name || 'Customer',
          order.id,
          finalTotal,
          formattedItems,
          orderType,
          deliveryAddress,
          tableNumber
        ).catch(err => console.error('Error sending order confirmation email:', err))
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        paidViaWallet: true, // Tells frontend to skip Razorpay and redirect directly
        amount: finalTotal,
      })
    }

    // ── CASE 3: Razorpay Payment ─────────────────────────────────────
    // Create order as PENDING. Stars are deducted and points earned in verify route
    const order = await prisma.order.create({
      data: {
        userId: session?.user?.id || null,
        totalAmount: finalTotal,
        starsRedeemed: finalStarsToRedeem,
        paymentMethod: 'RAZORPAY',
        customerName,
        customerEmail,
        customerPhone,
        deliveryAddress,
        latitude,
        longitude,
        orderType,
        tableNumber,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        notes,
        items: { create: orderItems },
      },
    })

    let razorpayOrderId: string | null = null
    try {
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        const Razorpay = (await import('razorpay')).default
        const rzp = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        })
        const rzpOrder = await (rzp.orders as any).create({
          amount: finalTotal, // already in paise
          currency: 'INR',
          receipt: order.id,
          notes: { orderId: order.id },
        })
        razorpayOrderId = rzpOrder.id

        // Save Razorpay order ID
        await prisma.order.update({
          where: { id: order.id },
          data: { razorpayOrderId },
        })
      }
    } catch (rzpErr) {
      console.error('Razorpay error (non-fatal in dev):', rzpErr)
    }

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId,
      amount: finalTotal,
      currency: 'INR',
    })
  } catch (err) {
    console.error('Create order error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
