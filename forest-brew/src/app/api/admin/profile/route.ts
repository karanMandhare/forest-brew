// ============================================================
//  GET /api/admin/profile
//  Admin's private account stats and aggregate data
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const adminId = session.user.id as string

    // Fetch admin user details
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true, image: true, phone: true, role: true, createdAt: true, passwordHash: true },
    })

    if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 })

    // Aggregate stats
    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      totalReservations,
      confirmedReservations,
      cancelledReservations,
      totalUsers,
      totalProducts,
      totalMenuItems,
    ] = await Promise.all([
      prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { totalAmount: true } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
      prisma.reservation.count({ where: { status: 'CANCELLED' } }),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.product.count(),
      prisma.product.count({ where: { isAvailable: true } }),
    ])

    return NextResponse.json({
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        image: admin.image,
        role: admin.role,
        createdAt: admin.createdAt,
        hasPassword: !!admin.passwordHash,
      },
      stats: {
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        pendingOrders,
        totalReservations,
        confirmedReservations,
        cancelledReservations,
        totalUsers,
        totalProducts,
        availableProducts: totalMenuItems,
      },
    })
  } catch (err: any) {
    console.error('Admin profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
