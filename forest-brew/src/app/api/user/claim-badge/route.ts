import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to claim rewards.' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const { badgeId } = body

    if (!badgeId || typeof badgeId !== 'string') {
      return NextResponse.json({ error: 'Invalid badge ID.' }, { status: 400 })
    }

    // Determine badge parameters
    let pointsReward = 50
    let badgeName = 'Brew Scholar'
    if (badgeId === 'brew-master') {
      pointsReward = 50
      badgeName = 'Brew Master'
    } else if (badgeId === 'sourcing-scholar') {
      pointsReward = 50
      badgeName = 'Sourcing Explorer'
    } else if (badgeId === 'connoisseur') {
      pointsReward = 100
      badgeName = 'Single-Origin Connoisseur'
    } else {
      return NextResponse.json({ error: 'Unknown quest badge.' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current user data
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { unlockedBadges: true, loyaltyPoints: true }
      })

      if (!user) {
        throw new Error('User account not found.')
      }

      const badges = user.unlockedBadges ? user.unlockedBadges.split(',') : []
      if (badges.includes(badgeId)) {
        throw new Error('Badge already claimed.')
      }

      // 2. Add badge and update loyalty points
      badges.push(badgeId)
      const updatedBadges = badges.join(',')

      await tx.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: { increment: pointsReward },
          unlockedBadges: updatedBadges
        }
      })

      // 3. Create LoyaltyTransaction entry
      await tx.loyaltyTransaction.create({
        data: {
          userId,
          points: pointsReward,
          type: 'BONUS',
          note: `Quest Badge Unlocked: ${badgeName} (+${pointsReward} Stars)`,
        }
      })

      return { success: true, points: pointsReward }
    })

    return NextResponse.json(result, { status: 200 })
  } catch (err: any) {
    console.error('Badge claiming error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 400 })
  }
}
