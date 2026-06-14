// ============================================================
//  GET /api/orders/[id]/status
//  Server-Sent Events (SSE) for real-time order tracking
// ============================================================

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { appEvents } from '@/lib/events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params

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
        appEvents.off('order_updated', onOrderUpdate)
        try {
          controller.close()
        } catch (_e) {}
      }

      // Query complete order information
      const getFullOrder = async () => {
        return await prisma.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            orderType: true,
            deliveryAddress: true,
            customerPhone: true,
            customerEmail: true,
            customerName: true,
            latitude: true,
            longitude: true,
            tableNumber: true,
            updatedAt: true,
            paymentMethod: true,
            estimatedTime: true,
            workerId: true,
            deliveryUserId: true,
            acceptedAt: true,
            assignedAt: true,
            preparingAt: true,
            readyAt: true,
            deliveredAt: true,
            cancelledAt: true,
            deliveryUser: {
              select: {
                name: true,
                phone: true,
              },
            },
            worker: {
              select: {
                name: true,
              },
            },
            items: {
              select: {
                quantity: true,
                unitPrice: true,
                customizations: true,
                product: { select: { name: true, imageUrl: true } },
              },
            },
          },
        })
      }

      // Handler for order update events
      const onOrderUpdate = async (data: { orderId: string; status?: string }) => {
        if (data.orderId !== orderId) return

        try {
          const fullOrder = await getFullOrder()
          if (!fullOrder) {
            send({ error: 'Order not found' })
            cleanup()
            return
          }

          send({
            type: 'status_update',
            status: fullOrder.status,
            order: fullOrder,
          })

          if (fullOrder.status === 'DELIVERED' || fullOrder.status === 'CANCELLED') {
            cleanup()
          }
        } catch (err) {
          console.error('SSE order update fetch error:', err)
          cleanup()
        }
      }

      // Send current status immediately
      try {
        const order = await getFullOrder()

        if (!order) {
          send({ error: 'Order not found' })
          controller.close()
          return
        }

        send({ type: 'status', order })

        // Listen for order updates
        appEvents.on('order_updated', onOrderUpdate)

        // Heartbeat every 15 seconds to keep the connection alive
        heartbeatInterval = setInterval(() => {
          send({ type: 'heartbeat' })
        }, 15000)

        // Clean up on client disconnect
        req.signal.addEventListener('abort', () => {
          cleanup()
        })
      } catch (_err) {
        send({ error: 'Failed to fetch order' })
        cleanup()
      }
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
