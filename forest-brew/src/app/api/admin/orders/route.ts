// ============================================================
//  GET /api/admin/orders — Admin only, full order list
//  POST /api/admin/orders/[id]/status — Update order status
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const statusFilter = url.searchParams.get('status')
  const searchFilter = url.searchParams.get('search')
  const limit = parseInt(url.searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const whereClause: any = {}

  if (statusFilter && statusFilter !== 'ALL') {
    whereClause.status = statusFilter
  } else {
    whereClause.status = { not: 'PENDING' }
  }

  if (searchFilter) {
    whereClause.OR = [
      { id: { contains: searchFilter } },
      { customerName: { contains: searchFilter } },
      { customerEmail: { contains: searchFilter } },
      { user: { name: { contains: searchFilter } } },
      { user: { email: { contains: searchFilter } } },
    ]
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
        user: { select: { email: true, name: true } },
        deliveryUser: { select: { id: true, name: true, email: true, phone: true } },
      },
    }),
    prisma.order.count({ where: whereClause }),
  ])

  // Revenue aggregations
  const now = new Date()
  
  const startOfDay = new Date(now)
  startOfDay.setHours(0,0,0,0)
  
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0,0,0,0)
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [todayRev, weekRev, monthRev] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfDay }, status: { notIn: ['CANCELLED', 'PENDING'] } },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfWeek }, status: { notIn: ['CANCELLED', 'PENDING'] } },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfMonth }, status: { notIn: ['CANCELLED', 'PENDING'] } },
      _sum: { totalAmount: true },
    }),
  ])

  return NextResponse.json({
    orders,
    total,
    pages: Math.ceil(total / limit),
    revenue: {
      today:     todayRev._sum.totalAmount ?? 0,
      thisWeek:  weekRev._sum.totalAmount ?? 0,
      thisMonth: monthRev._sum.totalAmount ?? 0,
    },
  })
}
