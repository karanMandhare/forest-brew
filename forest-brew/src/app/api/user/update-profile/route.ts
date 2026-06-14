// ============================================================
//  PATCH /api/user/update-profile
//  Update authenticated user's name, email, and avatar image
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, image, phone } = await req.json()
    const userId = session.user.id as string

    const updateData: Record<string, any> = {}

    if (name && typeof name === 'string') {
      updateData.name = name.trim()
    }

    if (email && typeof email === 'string') {
      const emailLower = email.toLowerCase().trim()
      // Check email not taken by another user
      const existing = await prisma.user.findUnique({ where: { email: emailLower } })
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: 'That email is already in use by another account.' }, { status: 409 })
      }
      updateData.email = emailLower
    }

    if (typeof image === 'string') {
      updateData.image = image.trim()
    }

    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, image: true, phone: true },
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (err: any) {
    console.error('Update profile error:', err)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
