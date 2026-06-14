// ============================================================
//  Forest Brew — Delivery Auto-Assignment Engine
// ============================================================

import { prisma } from './prisma'
import { appEvents, emitNewDeliveryAssigned } from './events'

/**
 * Automatically assigns a delivery order to the online delivery worker
 * with the lowest active load.
 * 
 * Active load is defined as orders assigned to them with statuses:
 * ASSIGNED, BREWING, READY, OUT_FOR_DELIVERY
 */
export async function autoAssignOrder(orderId: string) {
  try {
    // 1. Fetch order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: { select: { name: true } } },
          take: 1,
        },
      },
    })

    if (!order) {
      console.log(`[AutoAssign] Order ${orderId} not found.`)
      return null
    }

    // Only assign DELIVERY type orders
    if (order.orderType !== 'DELIVERY') {
      return null
    }

    // If order is already completed or cancelled, do not assign
    if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
      return null
    }

    // 2. Fetch all online delivery workers
    const onlineWorkers = await prisma.user.findMany({
      where: {
        role: 'DELIVERY',
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        deliveries: {
          where: {
            status: { in: ['ASSIGNED', 'BREWING', 'READY', 'OUT_FOR_DELIVERY'] },
          },
          select: {
            id: true,
          },
        },
      },
    })

    if (onlineWorkers.length === 0) {
      console.log(`[AutoAssign] No online delivery workers available for Order ${orderId}.`)
      return null
    }

    // 3. Find worker with the lowest active load
    // Sort by deliveries count ascending, then by ID to resolve ties deterministically
    const sortedWorkers = [...onlineWorkers].sort((a, b) => {
      if (a.deliveries.length !== b.deliveries.length) {
        return a.deliveries.length - b.deliveries.length
      }
      return a.id.localeCompare(b.id)
    })

    const selectedWorker = sortedWorkers[0]

    // 4. Determine next status transition
    // If the order was just received, set status to ASSIGNED
    const nextStatus = order.status === 'RECEIVED' ? 'ASSIGNED' : order.status

    // 5. Update order details
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryUserId: selectedWorker.id,
        workerId: selectedWorker.id,
        status: nextStatus,
        assignedAt: order.assignedAt || new Date(),
      },
    })

    console.log(`[AutoAssign] Assigned Order ${orderId} to worker ${selectedWorker.name} (${selectedWorker.id}) with active load count of ${selectedWorker.deliveries.length}`)

    // 6. Emit unified SSE events to notify admin/worker consoles
    appEvents.emit('order_updated', {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      userId: order.userId || undefined,
      workerId: selectedWorker.id,
    })

    appEvents.emit('worker_record_updated', {
      workerId: selectedWorker.id,
    })

    // 7. Popup notification for the assigned worker (and admin)
    const totalItems = order.items.reduce((s: number, i: any) => s + i.quantity, 0)
    emitNewDeliveryAssigned({
      orderId: order.id,
      workerId: selectedWorker.id,
      customerName: order.customerName || null,
      customerPhone: order.customerPhone || null,
      customerImage: null, // worker doesn't need customer image
      deliveryAddress: order.deliveryAddress || null,
      totalAmount: order.totalAmount,
      itemCount: totalItems,
      firstItemName: order.items[0]?.product?.name || 'Coffee',
    })

    return updatedOrder
  } catch (err) {
    console.error(`[AutoAssign] Error auto-assigning Order ${orderId}:`, err)
    return null
  }
}
