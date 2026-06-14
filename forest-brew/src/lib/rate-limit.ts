// ============================================================
//  Forest Brew — In-Memory Rate Limiter
// ============================================================

import { NextRequest } from 'next/server'

interface RateLimitOptions {
  windowMs: number
  max: number
}

const limiters = new Map<string, { count: number; resetTime: number }>()

/**
 * Checks if a key has exceeded the rate limit.
 * Returns true if rate limited, false otherwise.
 */
export function isRateLimited(key: string, options: RateLimitOptions): boolean {
  const now = Date.now()
  const limitKey = `${key}:${options.windowMs}`
  const entry = limiters.get(limitKey)

  if (!entry || now > entry.resetTime) {
    limiters.set(limitKey, {
      count: 1,
      resetTime: now + options.windowMs,
    })
    return false
  }

  entry.count++
  if (entry.count > options.max) {
    return true
  }

  return false
}

/**
 * Extract client IP address from request headers
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return (req as any).ip || '127.0.0.1'
}
