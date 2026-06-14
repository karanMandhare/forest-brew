// ============================================================
//  POST /api/auth/verify-otp — Verify OTP code for email
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
    if (isRateLimited(`ip:verify-otp:${ip}`, { windowMs: 60 * 1000, max: 5 })) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { email, otp } = await req.json()

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    const emailLower = email.toLowerCase().trim()

    // Find all active, unverified, unused OTP tokens for this email that haven't expired
    const tokens = await prisma.oTPToken.findMany({
      where: {
        email: emailLower,
        used: false,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    let matchedToken = null
    for (const token of tokens) {
      const isMatch = await bcrypt.compare(otp.trim(), token.code)
      if (isMatch) {
        matchedToken = token
        break
      }
    }

    if (!matchedToken) {
      return NextResponse.json({ error: 'Invalid or expired OTP. Please request a new one.' }, { status: 400 })
    }

    // Mark token as verified so it can be used for password reset in the next step
    await prisma.oTPToken.update({ 
      where: { id: matchedToken.id }, 
      data: { verified: true } 
    })

    return NextResponse.json({ success: true, verified: true })
  } catch (err: any) {
    console.error('Verify OTP error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
