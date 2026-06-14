// ============================================================
//  /api/support/chat/route.ts — Customer Support Chat API
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { appEvents } from '@/lib/events'

export const dynamic = 'force-dynamic'

// GET: Load chat history or thread list
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = session.user.role || 'USER'
    const url = new URL(req.url)

    if (userRole === 'ADMIN') {
      const targetUserId = url.searchParams.get('userId')
      
      // If admin requests a specific user's chat thread
      if (targetUserId) {
        const messages = await prisma.chatMessage.findMany({
          where: { userId: targetUserId },
          orderBy: { createdAt: 'asc' },
        })
        return NextResponse.json(messages)
      }

      // Otherwise, return a list of users who have chat threads, sorted by recent activity
      const recentMessages = await prisma.chatMessage.findMany({
        orderBy: { createdAt: 'desc' },
        distinct: ['userId'],
        select: {
          userId: true,
          message: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
      return NextResponse.json(recentMessages)
    }

    // Normal user: fetch their own thread
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(messages)
  } catch (err: any) {
    console.error('Error in GET /api/support/chat:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}

// POST: Send a support message
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { message, targetUserId } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const senderId = session.user.id
    const senderRole = session.user.role || 'USER'

    // Determine whose chat thread this belongs to
    // If admin is replying, the thread belongs to the customer (targetUserId)
    // If normal user is writing, the thread belongs to themselves (senderId)
    const threadUserId = senderRole === 'ADMIN' ? targetUserId : senderId

    if (!threadUserId) {
      return NextResponse.json({ error: 'Target user ID is required for admin replies' }, { status: 400 })
    }

    // Double check target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: threadUserId },
      select: { id: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User thread not found' }, { status: 404 })
    }

    // Save message to database
    const chatMessage = await prisma.chatMessage.create({
      data: {
        userId: threadUserId,
        senderId,
        senderRole,
        message: message.trim(),
      },
    })

    // Emit event for real-time SSE stream
    appEvents.emit('support_chat', {
      userId: threadUserId,
      chatMessage,
    })

    return NextResponse.json(chatMessage)
  } catch (err: any) {
    console.error('Error in POST /api/support/chat:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
