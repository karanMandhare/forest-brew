// ============================================================
//  GET & POST /api/mcp — HTTP SSE Model Context Protocol Server
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Map of sessionId -> stream controller
const sessions = new Map<string, ReadableStreamDefaultController>()

export const dynamic = 'force-dynamic'

// Safe JSON stringify that handles BigInt
function safeJsonStringify(obj: any): string {
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }
      return value
    }
  )
}

export async function GET(request: NextRequest) {
  const sessionId = crypto.randomUUID()

  const stream = new ReadableStream({
    start(controller) {
      sessions.set(sessionId, controller)

      // Send the endpoint event to notify client where to POST requests
      const endpointData = `event: endpoint\ndata: /api/mcp?session=${sessionId}\n\n`
      controller.enqueue(new TextEncoder().encode(endpointData))

      // Periodically send ping comments to keep connection alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(':\n\n'))
        } catch {
          clearInterval(interval)
          sessions.delete(sessionId)
        }
      }, 15000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        sessions.delete(sessionId)
      })
    },
    cancel() {
      sessions.delete(sessionId)
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 })
  }

  const controller = sessions.get(sessionId)
  if (!controller) {
    return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 })
  }

  let body: any
  try {
    body = await request.json()
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { jsonrpc, id, method, params } = body

  if (jsonrpc !== '2.0') {
    return NextResponse.json({ error: 'Invalid JSON-RPC version' }, { status: 400 })
  }

  // Handle requests asynchronously and stream responses back over SSE channel
  handleJsonRpcRequest(id, method, params, controller).catch((err) => {
    console.error('Error handling JSON-RPC request:', err)
    sendSseError(id, -32603, err.message || 'Internal error', controller)
  })

  return new NextResponse('Accepted', { status: 202 })
}

function sendSseMessage(id: any, result: any, controller: ReadableStreamDefaultController) {
  const payload = {
    jsonrpc: '2.0',
    id,
    result,
  }
  const event = `event: message\ndata: ${safeJsonStringify(payload)}\n\n`
  try {
    controller.enqueue(new TextEncoder().encode(event))
  } catch (err) {
    console.error('Failed to write SSE message to controller:', err)
  }
}

function sendSseError(id: any, code: number, message: string, controller: ReadableStreamDefaultController) {
  const payload = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  }
  const event = `event: message\ndata: ${JSON.stringify(payload)}\n\n`
  try {
    controller.enqueue(new TextEncoder().encode(event))
  } catch (err) {
    console.error('Failed to write SSE error to controller:', err)
  }
}

async function handleJsonRpcRequest(
  id: any,
  method: string,
  params: any,
  controller: ReadableStreamDefaultController
) {
  switch (method) {
    case 'initialize': {
      sendSseMessage(
        id,
        {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'forest-brew-mcp',
            version: '1.0.0',
          },
        },
        controller
      )
      break
    }
    case 'notifications/initialized': {
      // Initialized notifications do not require a response
      break
    }
    case 'tools/list': {
      const tools = [
        {
          name: 'list_products',
          description: 'Get a list of all products in the store, their categories, prices, and availability.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_users',
          description: 'Get a list of all users, their emails, names, roles, and loyalty points.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_orders',
          description: 'Get a list of recent orders with status, total amount, and customer details.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of orders to retrieve (default: 10)' },
            },
          },
        },
        {
          name: 'get_inventory',
          description: 'Get the current stock levels of inventory items.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'update_order_status',
          description: 'Update the status of an order.',
          inputSchema: {
            type: 'object',
            properties: {
              orderId: { type: 'string', description: 'The unique ID of the order' },
              status: {
                type: 'string',
                enum: [
                  'PENDING',
                  'RECEIVED',
                  'ASSIGNED',
                  'BREWING',
                  'READY',
                  'OUT_FOR_DELIVERY',
                  'DELIVERED',
                  'CANCELLED',
                ],
                description: 'The new status of the order',
              },
            },
            required: ['orderId', 'status'],
          },
        },
        {
          name: 'update_inventory',
          description: 'Update the stock quantity of a specific inventory item.',
          inputSchema: {
            type: 'object',
            properties: {
              itemId: { type: 'string', description: 'The unique ID of the inventory item' },
              quantity: { type: 'number', description: 'The new stock quantity' },
            },
            required: ['itemId', 'quantity'],
          },
        },
        {
          name: 'run_sql_query',
          description: 'Execute a raw SQL query on the PostgreSQL database (for dev/debugging). Use with caution.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The raw SQL SELECT query to execute' },
            },
            required: ['query'],
          },
        },
      ]

      sendSseMessage(id, { tools }, controller)
      break
    }
    case 'tools/call': {
      const { name, arguments: args } = params || {}
      const result = await handleToolCall(name, args)
      sendSseMessage(id, result, controller)
      break
    }
    default: {
      sendSseError(id, -32601, `Method not found: ${method}`, controller)
    }
  }
}

async function handleToolCall(name: string, args: any) {
  try {
    switch (name) {
      case 'list_products': {
        const products = await prisma.product.findMany({
          orderBy: { sortOrder: 'asc' },
        })
        return {
          content: [
            {
              type: 'text',
              text: safeJsonStringify(products),
            },
          ],
        }
      }
      case 'list_users': {
        const users = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            loyaltyPoints: true,
            walletBalance: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
        return {
          content: [
            {
              type: 'text',
              text: safeJsonStringify(users),
            },
          ],
        }
      }
      case 'list_orders': {
        const limit = args?.limit || 10
        const orders = await prisma.order.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        })
        return {
          content: [
            {
              type: 'text',
              text: safeJsonStringify(orders),
            },
          ],
        }
      }
      case 'get_inventory': {
        const inventory = await prisma.inventory.findMany({
          orderBy: { name: 'asc' },
        })
        return {
          content: [
            {
              type: 'text',
              text: safeJsonStringify(inventory),
            },
          ],
        }
      }
      case 'update_order_status': {
        const { orderId, status } = args || {}
        if (!orderId || !status) {
          throw new Error('Missing orderId or status')
        }
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status },
        })
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated order ${orderId} status to ${status}:\n\n${safeJsonStringify(updatedOrder)}`,
            },
          ],
        }
      }
      case 'update_inventory': {
        const { itemId, quantity } = args || {}
        if (!itemId || quantity === undefined) {
          throw new Error('Missing itemId or quantity')
        }
        const updatedItem = await prisma.inventory.update({
          where: { id: itemId },
          data: { quantity },
        })
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated inventory item ${itemId} stock to ${quantity}:\n\n${safeJsonStringify(updatedItem)}`,
            },
          ],
        }
      }
      case 'run_sql_query': {
        const { query } = args || {}
        if (!query) {
          throw new Error('Missing query')
        }
        const queryLower = query.trim().toLowerCase()
        if (!queryLower.startsWith('select')) {
          throw new Error('Only SELECT queries are allowed for safety.')
        }
        const result = await prisma.$queryRawUnsafe(query)
        return {
          content: [
            {
              type: 'text',
              text: safeJsonStringify(result),
            },
          ],
        }
      }
      default:
        throw new Error(`Tool not found: ${name}`)
    }
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${err.message}`,
        },
      ],
    }
  }
}
