// ============================================================
//  GET /api/admin/analytics — Admin only, full revenue analysis
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all orders that are paid (exclude PENDING and CANCELLED)
    const orders = await prisma.order.findMany({
      where: {
        status: { notIn: ['PENDING', 'CANCELLED'] }
      },
      select: {
        id: true,
        totalAmount: true,
        paymentMethod: true,
        customerName: true,
        customerEmail: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)
    
    // Start of week (Sunday)
    const startOfWeek = new Date(startOfToday.getTime() - now.getDay() * 24 * 60 * 60 * 1000)
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    let totalRevenue = 0
    let lastHour = 0
    let today = 0
    let yesterday = 0
    let thisWeek = 0
    let thisMonth = 0
    let lastMonth = 0
    let thisYear = 0

    const monthMap: Record<string, { revenue: number; count: number; sortKey: number }> = {}
    const dayMap: Record<string, { revenue: number; count: number }> = {}
    const hourMap: Record<number, { revenue: number; count: number }> = {}
    const dayOfWeekMap: Record<number, { revenue: number; count: number }> = {}

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    daysOfWeek.forEach((_, idx) => {
      dayOfWeekMap[idx] = { revenue: 0, count: 0 }
    })

    for (let h = 0; h < 24; h++) {
      hourMap[h] = { revenue: 0, count: 0 }
    }

    // Initialize past 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      monthMap[monthName] = { revenue: 0, count: 0, sortKey: d.getTime() }
    }

    // Initialize past 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(startOfToday.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      dayMap[dateStr] = { revenue: 0, count: 0 }
    }

    // Process all orders
    for (const order of orders) {
      const amount = order.totalAmount
      const date = new Date(order.createdAt)
      const time = date.getTime()

      totalRevenue += amount

      if (time >= oneHourAgo.getTime()) lastHour += amount
      if (time >= startOfToday.getTime()) today += amount
      else if (time >= startOfYesterday.getTime() && time < startOfToday.getTime()) yesterday += amount

      if (time >= startOfWeek.getTime()) thisWeek += amount
      if (time >= startOfMonth.getTime()) thisMonth += amount
      else if (time >= startOfLastMonth.getTime() && time < startOfMonth.getTime()) lastMonth += amount
      if (time >= startOfYear.getTime()) thisYear += amount

      // Group by Month
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (monthMap[monthName]) {
        monthMap[monthName].revenue += amount
        monthMap[monthName].count += 1
      } else {
        monthMap[monthName] = { 
          revenue: amount, 
          count: 1, 
          sortKey: new Date(date.getFullYear(), date.getMonth(), 1).getTime() 
        }
      }

      // Group by Day (past 30 days)
      const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      if (dayMap[dateStr]) {
        dayMap[dateStr].revenue += amount
        dayMap[dateStr].count += 1
      }

      // Group by Hour of day
      const hour = date.getHours()
      if (hourMap[hour]) {
        hourMap[hour].revenue += amount
        hourMap[hour].count += 1
      }

      // Group by Day of Week
      const dayIdx = date.getDay()
      if (dayOfWeekMap[dayIdx]) {
        dayOfWeekMap[dayIdx].revenue += amount
        dayOfWeekMap[dayIdx].count += 1
      }
    }

    // Format Lists
    const monthList = Object.entries(monthMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.sortKey - b.sortKey)

    const dayList = Object.entries(dayMap).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      count: data.count,
    }))

    const hourList = Object.entries(hourMap).map(([h, data]) => ({
      hour: parseInt(h),
      revenue: data.revenue,
      count: data.count,
    }))

    const dayOfWeekList = Object.entries(dayOfWeekMap).map(([idx, data]) => ({
      day: daysOfWeek[parseInt(idx)],
      revenue: data.revenue,
      count: data.count,
      index: parseInt(idx),
    }))

    // Calculate Best/Worst Month (only from months with actual data)
    const populatedMonths = monthList.filter(m => m.count > 0)
    let bestMonth = { month: 'N/A', revenue: 0 }
    let worstMonth = { month: 'N/A', revenue: 999999999 }

    if (populatedMonths.length > 0) {
      const sortedByRev = [...populatedMonths].sort((a, b) => b.revenue - a.revenue)
      bestMonth = { month: sortedByRev[0].month, revenue: sortedByRev[0].revenue }
      worstMonth = { month: sortedByRev[sortedByRev.length - 1].month, revenue: sortedByRev[sortedByRev.length - 1].revenue }
    } else {
      worstMonth = { month: 'N/A', revenue: 0 }
    }

    // Best day of week
    const sortedDays = [...dayOfWeekList].sort((a, b) => b.revenue - a.revenue)
    const bestDayOfWeek = sortedDays[0].revenue > 0 ? { day: sortedDays[0].day, revenue: sortedDays[0].revenue } : { day: 'N/A', revenue: 0 }

    // Busiest hour
    const sortedHours = [...hourList].sort((a, b) => b.revenue - a.revenue)
    const peakHour = sortedHours[0].revenue > 0 ? { hour: sortedHours[0].hour, revenue: sortedHours[0].revenue } : { hour: 0, revenue: 0 }

    // AOV
    const totalOrdersCount = orders.length
    const averageOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0

    // Recent 15 transactions
    const recentPayments = orders.slice(0, 15).map(o => ({
      id: o.id,
      customerName: o.customerName || 'Guest',
      customerEmail: o.customerEmail || 'N/A',
      totalAmount: o.totalAmount,
      paymentMethod: o.paymentMethod,
      status: o.status,
      createdAt: o.createdAt,
    }))

    return NextResponse.json({
      metrics: {
        totalRevenue,
        lastHour,
        today,
        yesterday,
        thisWeek,
        thisMonth,
        lastMonth,
        thisYear,
        averageOrderValue,
        totalOrdersCount,
      },
      analysis: {
        bestMonth,
        worstMonth,
        bestDayOfWeek,
        peakHour,
      },
      charts: {
        byMonth: monthList,
        byDay: dayList,
        byHour: hourList,
        byDayOfWeek: dayOfWeekList,
      },
      recentPayments,
    })
  } catch (err: any) {
    console.error('Fetch analytics error:', err)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
