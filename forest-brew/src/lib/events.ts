import { EventEmitter } from 'events';
import { prisma } from './prisma';

class AppEventEmitter extends EventEmitter {
  private static instance: AppEventEmitter;

  constructor() {
    super();
    // Allow many active SSE listeners
    this.setMaxListeners(200);
  }

  public static getInstance(): AppEventEmitter {
    if (!AppEventEmitter.instance) {
      AppEventEmitter.instance = new AppEventEmitter();
    }
    return AppEventEmitter.instance;
  }
}

export const appEvents = AppEventEmitter.getInstance();

export async function createNotification(userId: string, title: string, message: string, type: string) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });
    appEvents.emit('notification_created', { userId, notification });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// ── Real-time popup event emitters ───────────────────────────
export function emitNewOrder(orderInfo: {
  orderId: string
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  customerImage?: string | null
  orderType: string
  totalAmount: number
  tableNumber?: string | null
  deliveryAddress?: string | null
  itemCount: number
  firstItemName: string
  paymentMethod: string
}) {
  appEvents.emit('new_order', orderInfo)
}

export function emitNewBooking(bookingInfo: {
  reservationId: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  customerImage?: string | null
  date: string
  guestCount: number
  advancePaid: number
}) {
  appEvents.emit('new_booking', bookingInfo)
}

export function emitNewDeliveryAssigned(deliveryInfo: {
  orderId: string
  workerId: string
  customerName?: string | null
  customerPhone?: string | null
  customerImage?: string | null
  deliveryAddress?: string | null
  totalAmount: number
  itemCount: number
  firstItemName: string
}) {
  appEvents.emit('new_delivery_assigned', deliveryInfo)
}
