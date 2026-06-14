import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { verifyCsrf } from '@/lib/csrf'
import { RegisterSchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
  try {
    // CSRF Check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 })
    }

    // IP Rate Limit
    const ip = getClientIp(req)
    if (isRateLimited(`ip:register:${ip}`, { windowMs: 60 * 1000, max: 5 })) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await req.json()
    const parsed = RegisterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data
    const normalizedEmail = email.toLowerCase()

    // Email Rate Limit (5 registrations per IP/email window)
    if (isRateLimited(`email:register:${normalizedEmail}`, { windowMs: 15 * 60 * 1000, max: 2 })) {
      return NextResponse.json({ error: 'Too many registration attempts for this email.' }, { status: 429 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create the user in the database
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    const role = (normalizedEmail.endsWith('@forestbrew.com') || (adminEmail && normalizedEmail === adminEmail)) ? 'ADMIN' : 'USER'
    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        loyaltyPoints: 0, // start with 0 points
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      user: newUser,
    })
  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
