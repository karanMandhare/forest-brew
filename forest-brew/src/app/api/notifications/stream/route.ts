// ============================================================
//  GET /api/notifications/stream
//  Server-Sent Events (SSE) for unified real-time application events
// ============================================================

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { appEvents } from '@/lib/events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id
  const userRole = session.user.role || 'USER'

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let heartbeatInterval: any = null

      const send = (data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        } catch (_err) {
          cleanup()
        }
      }

      const cleanup = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        appEvents.off('notification_created', onNotificationCreated)
        appEvents.off('order_updated', onOrderUpdated)
        appEvents.off('inventory_low', onInventoryLow)
        appEvents.off('support_chat', onSupportChat)
        appEvents.off('worker_record_updated', onWorkerRecordUpdated)
        appEvents.off('new_order', onNewOrder)
        appEvents.off('new_booking', onNewBooking)
        appEvents.off('new_delivery_assigned', onNewDeliveryAssigned)
        try {
          controller.close()
        } catch (_e) {}
      }

      // Handlers
      const onNotificationCreated = (data: { userId: string; notification: any }) => {
        if (data.userId === userId) {
          send({ type: 'notification', notification: data.notification })
        }
      }

      const onOrderUpdated = (data: { orderId: string; status?: string; workerId?: string; deliveryUserId?: string; userId?: string }) => {
        // Admin and delivery/workers get ALL order updates for dashboard sync
        if (userRole === 'ADMIN' || userRole === 'DELIVERY') {
          send({ type: 'order_update', orderId: data.orderId, status: data.status, workerId: data.workerId })
        } else if (data.userId === userId) {
          send({ type: 'order_update', orderId: data.orderId, status: data.status })
        }
      }

      const onInventoryLow = (data: { inventoryName: string; quantity: number; threshold: number }) => {
        if (userRole === 'ADMIN' || userRole === 'DELIVERY') {
          send({ type: 'inventory_low', inventoryName: data.inventoryName, quantity: data.quantity, threshold: data.threshold })
        }
      }

      const onSupportChat = (data: { userId: string; chatMessage: any }) => {
        if (userRole === 'ADMIN' || data.userId === userId) {
          send({ type: 'support_chat', userId: data.userId, message: data.chatMessage })
        }
      }

      const onWorkerRecordUpdated = (data: { workerId: string }) => {
        if (userRole === 'ADMIN' || userId === data.workerId) {
          send({ type: 'worker_record_updated', workerId: data.workerId })
        }
      }

      // ── New popup event handlers ──────────────────────────────

      const onNewOrder = (data: any) => {
        // Only admins see new order popups
        if (userRole === 'ADMIN') {
          send({ type: 'new_order', order: data })
        }
      }

      const onNewBooking = (data: any) => {
        // Only admins see new booking popups
        if (userRole === 'ADMIN') {
          send({ type: 'new_booking', booking: data })
        }
      }

      const onNewDeliveryAssigned = (data: any) => {
        // Workers only see their own assigned deliveries
        if (userRole === 'DELIVERY' && data.workerId === userId) {
          send({ type: 'new_delivery_assigned', delivery: data })
        }
        // Admins also see all delivery assignments
        if (userRole === 'ADMIN') {
          send({ type: 'new_delivery_assigned', delivery: data })
        }
      }

      // Send initial success ping
      send({ type: 'connected', role: userRole })

      // Register listeners
      appEvents.on('notification_created', onNotificationCreated)
      appEvents.on('order_updated', onOrderUpdated)
      appEvents.on('inventory_low', onInventoryLow)
      appEvents.on('support_chat', onSupportChat)
      appEvents.on('worker_record_updated', onWorkerRecordUpdated)
      appEvents.on('new_order', onNewOrder)
      appEvents.on('new_booking', onNewBooking)
      appEvents.on('new_delivery_assigned', onNewDeliveryAssigned)

      // Heartbeat every 15 seconds
      heartbeatInterval = setInterval(() => {
        send({ type: 'heartbeat' })
      }, 15000)

      // Clean up on client disconnect
      req.signal.addEventListener('abort', () => {
        cleanup()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
