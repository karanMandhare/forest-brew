// ============================================================
//  GET /api/admin/export — Admin only CSV Export
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function csvEscape(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const type = url.searchParams.get('type') // orders | payments | reservations

    if (!type || !['orders', 'payments', 'reservations'].includes(type)) {
      return NextResponse.json({ error: 'Invalid export type. Must be orders, payments, or reservations.' }, { status: 400 })
    }

    let csvContent = ''
    const filename = `forest_brew_${type}_${new Date().toISOString().split('T')[0]}.csv`

    if (type === 'orders') {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: { select: { name: true } } },
          },
          user: { select: { email: true, name: true } },
        },
      })

      const headers = [
        'Order ID', 'Fulfillment Type', 'Customer Name', 'Customer Email', 'Customer Phone', 
        'Delivery Address', 'Latitude', 'Longitude', 'Table Number', 'Items', 'Total Amount (INR)', 
        'Status', 'Date Time', 'Payment ID', 'Notes'
      ]
      const rows = orders.map((order) => {
        const customerName = order.customerName || order.user?.name || 'Guest'
        const customerEmail = order.customerEmail || order.user?.email || 'N/A'
        const customerPhone = order.customerPhone || 'N/A'
        const deliveryAddress = order.deliveryAddress || 'N/A'
        const lat = order.latitude !== null && order.latitude !== undefined ? String(order.latitude) : 'N/A'
        const lng = order.longitude !== null && order.longitude !== undefined ? String(order.longitude) : 'N/A'
        const itemsStr = order.items.map(item => `${item.quantity}x ${item.product.name}`).join('; ')
        const totalINR = (order.totalAmount / 100).toFixed(2)
        const dateStr = new Date(order.createdAt).toLocaleString('en-IN')

        return [
          order.id.toUpperCase(),
          order.orderType === 'DELIVERY' ? 'DELIVERY' : 'DINE_IN',
          customerName,
          customerEmail,
          customerPhone,
          deliveryAddress,
          lat,
          lng,
          order.tableNumber || 'N/A',
          itemsStr,
          totalINR,
          order.status,
          dateStr,
          order.paymentId || 'N/A',
          order.notes || ''
        ]
      })

      csvContent = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\n')

    } else if (type === 'payments') {
      const orders = await prisma.order.findMany({
        where: {
          paymentId: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { email: true, name: true } },
        },
      })

      const headers = ['Payment ID', 'Order ID', 'Razorpay Order ID', 'Customer Name', 'Customer Email', 'Table Number', 'Amount (INR)', 'Order Status', 'Payment Date']
      const rows = orders.map((order) => {
        const customerName = order.customerName || order.user?.name || 'Guest'
        const customerEmail = order.customerEmail || order.user?.email || 'N/A'
        const amountINR = (order.totalAmount / 100).toFixed(2)
        const dateStr = new Date(order.updatedAt).toLocaleString('en-IN')

        return [
          order.paymentId || '',
          order.id.toUpperCase(),
          order.razorpayOrderId || '',
          customerName,
          customerEmail,
          order.tableNumber || 'N/A',
          amountINR,
          order.status,
          dateStr
        ]
      })

      csvContent = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\n')

    } else if (type === 'reservations') {
      const reservations = await prisma.reservation.findMany({
        orderBy: { date: 'desc' },
      })

      const headers = [
        'Reservation ID', 'Customer Name', 'Email', 'Phone', 'Booking Date', 
        'Guests', 'Special Notes', 'Confirmed', 'Advance Paid (INR)', 
        'Remaining Paid (INR)', 'Total Amount (INR)', 'Visited', 'Status', 'Created At'
      ]
      const rows = reservations.map((resv) => {
        const bookingDate = new Date(resv.date).toLocaleString('en-IN')
        const createdAt = new Date(resv.createdAt).toLocaleString('en-IN')
        const advanceINR = (resv.advancePaid / 100).toFixed(2)
        const remainingINR = (resv.remainingPaid / 100).toFixed(2)
        const totalINR = (resv.totalAmount / 100).toFixed(2)

        return [
          resv.id.toUpperCase(),
          resv.customerName,
          resv.email,
          resv.phone || 'N/A',
          bookingDate,
          resv.guestCount,
          resv.specialNotes || '',
          resv.confirmed ? 'YES' : 'NO',
          advanceINR,
          remainingINR,
          totalINR,
          resv.visited ? 'YES' : 'NO',
          resv.status,
          createdAt
        ]
      })

      csvContent = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\n')
    }

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err: any) {
    console.error('Export CSV error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
