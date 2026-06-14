// ============================================================
//  POST /api/auth/reset-password-otp
//  Reset password using a verified OTP token
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { verifyCsrf } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // CSRF Check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 })
    }

    // IP Rate Limit
    const ip = getClientIp(req)
    if (isRateLimited(`ip:reset-password-otp:${ip}`, { windowMs: 60 * 1000, max: 5 })) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { email, newPassword } = await req.json()

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 })
    }

    const emailLower = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({ where: { email: emailLower } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for a recently verified, unused OTP token
    const token = await prisma.oTPToken.findFirst({
      where: {
        email: emailLower,
        verified: true,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Please verify your OTP code first.' }, { status: 401 })
    }

    // Mark the token as used so it cannot be reused
    await prisma.oTPToken.update({
      where: { id: token.id },
      data: { used: true },
    })

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { email: emailLower },
      data: { passwordHash },
    })

    return NextResponse.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' })
  } catch (err: any) {
    console.error('Reset password OTP error:', err)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
