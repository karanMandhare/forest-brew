import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const setPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = setPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { password } = parsed.data

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12)

    // Save password to database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash },
    })

    return NextResponse.json({
      success: true,
      message: 'Password set successfully!',
    })
  } catch (error) {
    console.error('Set Password API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while setting your password. Please try again.' },
      { status: 500 }
    )
  }
}
