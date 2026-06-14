// ============================================================
//  Forest Brew — Zod Validation Schemas
// ============================================================

import { z } from 'zod'

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
})

export const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
})

export const ReservationSchema = z.object({
  customerName: z.string().min(2, 'Name is too short').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  phone: z.string().regex(/^\+?[0-9\s\-()]{10,20}$/, 'Invalid phone number').optional().nullable(),
  date: z.string().datetime({ message: 'Invalid ISO date string' }),
  guestCount: z.number().int().min(1, 'At least 1 guest required').max(20, 'For large parties, please contact us directly'),
  specialNotes: z.string().max(500, 'Notes must be less than 500 characters').optional().nullable(),
})

export const OrderItemCustomizationSchema = z.object({
  milk: z.string().optional(),
  syrups: z.array(z.string()).optional(),
  temperature: z.enum(['hot', 'iced', 'blended']).optional(),
  size: z.enum(['tall', 'grande', 'venti']).optional(),
  foodWarming: z.enum(['warmed', 'not_warmed']).optional(),
  foodSize: z.enum(['regular', 'large']).optional(),
  foodAddons: z.array(z.string()).optional(),
  specialInstructions: z.string().max(250).optional().nullable(),
})

export const OrderItemSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20, 'Quantity limit per item exceeded'),
  customization: OrderItemCustomizationSchema.optional().default({}),
})

export const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1, 'Order must contain at least one item'),
  orderType: z.enum(['DINE_IN', 'DELIVERY']).default('DINE_IN'),
  paymentMethod: z.enum(['RAZORPAY', 'WALLET']).default('RAZORPAY'),
  customerName: z.string().min(2, 'Name is too short').trim().optional().nullable(),
  customerEmail: z.string().email('Invalid email address').trim().toLowerCase().optional().nullable(),
  customerPhone: z.string().regex(/^\+?[0-9\s\-()]{10,20}$/, 'Invalid phone number').optional().nullable(),
  deliveryAddress: z.string().min(10, 'Address is too short').trim().optional().nullable(),
  tableNumber: z.string().optional().nullable(),
  notes: z.string().max(250).optional().nullable(),
})
