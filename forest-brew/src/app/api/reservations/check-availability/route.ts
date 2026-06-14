import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date')

    if (!dateStr) {
      return NextResponse.json({ error: 'Date parameter is required.' }, { status: 400 })
    }

    const checkDate = new Date(dateStr)
    if (isNaN(checkDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format.' }, { status: 400 })
    }

    // Define a 2-hour reservation slot window
    const startTime = new Date(checkDate.getTime() - 2 * 60 * 60 * 1000)
    const endTime = new Date(checkDate.getTime() + 2 * 60 * 60 * 1000)

    const reservations = await prisma.reservation.findMany({
      where: {
        status: { notIn: ['CANCELLED'] },
        date: {
          gte: startTime,
          lte: endTime,
        },
        tableNumber: { not: null }
      },
      select: {
        tableNumber: true
      }
    })

    const occupiedTables = reservations
      .map(r => r.tableNumber)
      .filter((val): val is string => val !== null)

    // Return unique occupied table numbers
    return NextResponse.json({ occupied: Array.from(new Set(occupiedTables)) }, { status: 200 })
  } catch (err: any) {
    console.error('Check table availability error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
