// ============================================================
//  POST /api/newsletter — Newsletter Subscription API
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { verifyCsrf } from '@/lib/csrf'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const newsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(req: NextRequest) {
  try {
    // CSRF Check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 })
    }

    // IP Rate Limit (5 requests per hour)
    const ip = getClientIp(req)
    if (isRateLimited(`ip:newsletter:${ip}`, { windowMs: 60 * 60 * 1000, max: 5 })) {
      return NextResponse.json({ 
        error: 'Too many signup attempts from this IP. Please try again later.' 
      }, { status: 429 })
    }

    const body = await req.json()
    const parsed = newsletterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { email } = parsed.data
    const emailLower = email.toLowerCase().trim()

    // Email rate limit (2 attempts per 15 mins)
    if (isRateLimited(`email:newsletter:${emailLower}`, { windowMs: 15 * 60 * 1000, max: 2 })) {
      return NextResponse.json({ 
        error: 'Too many subscription attempts for this email address.' 
      }, { status: 429 })
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: emailLower },
    })

    if (existing) {
      if (!existing.active) {
        // Reactivate
        await prisma.newsletterSubscriber.update({
          where: { email: emailLower },
          data: { active: true },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Welcome back! Your subscription has been reactivated.' 
        })
      }
      return NextResponse.json({ 
        success: true, 
        message: 'You are already subscribed to our newsletter!' 
      })
    }

    await prisma.newsletterSubscriber.create({
      data: { email: emailLower },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Thank you for subscribing! Welcome to the Forest Brew newsletter.' 
    }, { status: 201 })
  } catch (err: any) {
    console.error('Newsletter API error:', err)
    return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 })
  }
}
