// ============================================================
//  POST /api/contact — Contact Us Form Submissions
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { verifyCsrf } from '@/lib/csrf'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(80),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(3, 'Subject must be at least 3 characters long').max(150),
  message: z.string().min(10, 'Message must be at least 10 characters long').max(1000),
})

export async function POST(req: NextRequest) {
  try {
    // CSRF Check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 })
    }

    // IP Rate Limit (5 requests per hour)
    const ip = getClientIp(req)
    if (isRateLimited(`ip:contact:${ip}`, { windowMs: 60 * 60 * 1000, max: 5 })) {
      return NextResponse.json({ 
        error: 'Too many contact form submissions. Please try again later.' 
      }, { status: 429 })
    }

    const body = await req.json()
    const parsed = contactSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, email, subject, message } = parsed.data

    const contactMsg = await prisma.contactMessage.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        subject,
        message,
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Your message has been sent successfully. We will get back to you soon!',
      id: contactMsg.id 
    }, { status: 201 })
  } catch (err: any) {
    console.error('Contact API error:', err)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
