// ============================================================
//  Forest Brew — Razorpay Instance
// ============================================================

import Razorpay from 'razorpay'

export function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are not configured in environment variables')
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

export const razorpay = typeof Proxy !== 'undefined' ? new Proxy({} as Razorpay, {
  get(target, prop) {
    const instance = getRazorpay()
    const val = (instance as any)[prop]
    if (typeof val === 'function') {
      return val.bind(instance)
    }
    return val
  }
}) : null as any

export default razorpay
