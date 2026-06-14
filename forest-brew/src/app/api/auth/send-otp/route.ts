// ============================================================
//  POST /api/auth/send-otp — Generate & email a 6-digit OTP
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOTPEmail } from '@/lib/mail'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { verifyCsrf } from '@/lib/csrf'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // CSRF Check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 })
    }

    // IP Rate Limit
    const ip = getClientIp(req)
    if (isRateLimited(`ip:send-otp:${ip}`, { windowMs: 60 * 1000, max: 5 })) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const emailLower = email.toLowerCase().trim()

    // Email Rate Limit (3 requests per 5 minutes)
    if (isRateLimited(`email:send-otp:${emailLower}`, { windowMs: 5 * 60 * 1000, max: 3 })) {
      return NextResponse.json({ error: 'Too many OTP requests for this email. Please wait 5 minutes.' }, { status: 429 })
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { email: emailLower } })
    if (!user) {
      // Return success anyway to avoid email enumeration
      return NextResponse.json({ success: true, message: 'If that email exists, an OTP has been sent.' })
    }

    // Invalidate any existing unused OTPs for this email
    await prisma.oTPToken.updateMany({
      where: { email: emailLower, used: false },
      data: { used: true },
    })

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    const hashedOtp = await bcrypt.hash(otp, 10)

    await prisma.oTPToken.create({
      data: { email: emailLower, code: hashedOtp, expiresAt },
    })

    // Send email
    await sendOTPEmail(emailLower, otp, user.name ?? undefined)

    return NextResponse.json({ success: true, message: 'OTP sent to your email.' })
  } catch (err: any) {
    console.error('Send OTP error:', err)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
