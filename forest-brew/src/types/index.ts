// ============================================================
//  Forest Brew — Shared TypeScript Types
// ============================================================

// ── Product & Menu ───────────────────────────────────────────

export type ProductCategory = 'HOT' | 'COLD' | 'FOOD' | 'RESERVE' | 'SEASONAL'

export type ModifierType = 'MILK' | 'SYRUP' | 'TEMPERATURE' | 'SIZE'

export interface Modifier {
  id: string
  name: string
  type: ModifierType
  priceAdjustment: number // in paise
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  notes: string
  basePrice: number // in paise
  imageUrl: string
  badge?: string
  origin?: string
  category: ProductCategory
  isAvailable: boolean
  sortOrder?: number
  modifiers?: Modifier[]
  averageRating?: number
  totalReviews?: number
}

// ── Cart ─────────────────────────────────────────────────────

export interface CartCustomization {
  milk?: string      // e.g., "oat", "almond", "whole"
  syrups?: string[]  // e.g., ["vanilla", "caramel"]
  temperature?: 'hot' | 'iced' | 'blended'
  size?: 'tall' | 'grande' | 'venti'
  foodWarming?: 'warmed' | 'not_warmed'
  foodSize?: 'regular' | 'large'
  foodAddons?: string[]
  specialInstructions?: string
}

export interface CartItem {
  id: string          // unique cart item id (uuid)
  productId: string
  name: string
  basePrice: number   // in paise
  imageUrl: string
  quantity: number
  category?: ProductCategory
  customization: CartCustomization
  customizationPrice: number // sum of modifier price adjustments
  lineTotal: number   // (basePrice + customizationPrice) * quantity
}

// ── Orders ───────────────────────────────────────────────────

export type OrderStatus = 'RECEIVED' | 'BREWING' | 'READY' | 'DELIVERED' | 'CANCELLED'

export interface OrderItemPayload {
  productId: string
  quantity: number
  customization: CartCustomization
}

export interface CreateOrderPayload {
  items: OrderItemPayload[]
  customerName?: string
  customerEmail?: string
}

export interface OrderWithItems {
  id: string
  status: OrderStatus
  totalAmount: number
  customerName?: string
  createdAt: string
  items: Array<{
    id: string
    quantity: number
    unitPrice: number
    customizations: CartCustomization
    product: {
      name: string
      imageUrl: string
    }
  }>
}

// ── Auth ─────────────────────────────────────────────────────

export type UserRole = 'USER' | 'ADMIN' | 'DELIVERY'

export interface AuthUser {
  id: string
  email: string
  name?: string
  image?: string
  role: UserRole
  loyaltyPoints: number
}

// ── Payment ──────────────────────────────────────────────────

export interface RazorpayOrderResponse {
  razorpayOrderId: string
  amount: number
  currency: string
  orderId: string // Our internal order ID
}

export interface PaymentVerifyPayload {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
  orderId: string
}

// ── Admin ────────────────────────────────────────────────────

export interface RevenueStats {
  today: number
  thisWeek: number
  thisMonth: number
  totalOrders: number
}

// ── Loyalty ──────────────────────────────────────────────────

export interface LoyaltyTransaction {
  id: string
  points: number
  type: 'EARN' | 'REDEEM' | 'BONUS'
  note?: string
  createdAt: string
}

// ── Reservation ──────────────────────────────────────────────

export interface ReservationPayload {
  customerName: string
  email: string
  phone?: string
  date: string
  guestCount: number
  specialNotes?: string
}

// ── Utility ──────────────────────────────────────────────────

/** Convert paise to formatted INR string */
export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`
}

/** Convert rupees to paise */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

/** Convert paise to rupees */
export function toRupees(paise: number): number {
  return paise / 100
}
