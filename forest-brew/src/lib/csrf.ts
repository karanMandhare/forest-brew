// ============================================================
//  Forest Brew — CSRF Protection Utility
// ============================================================

import { NextRequest } from 'next/server'

/**
 * Validates request Origin/Referer against allowed host.
 * Returns true if valid, false if CSRF check fails.
 */
export function verifyCsrf(req: NextRequest): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return true
  }

  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const host = req.headers.get('host')
  const xForwardedHost = req.headers.get('x-forwarded-host')
  const currentHost = xForwardedHost || host

  try {
    const allowedHosts: string[] = []
    if (currentHost) {
      allowedHosts.push(currentHost)
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        const appHost = new URL(process.env.NEXT_PUBLIC_APP_URL).host
        if (appHost && !allowedHosts.includes(appHost)) {
          allowedHosts.push(appHost)
        }
      } catch {}
    }

    if (allowedHosts.length === 0) return false

    if (origin) {
      const originHost = new URL(origin).host
      return allowedHosts.includes(originHost)
    }

    if (referer) {
      const refererHost = new URL(referer).host
      return allowedHosts.includes(refererHost)
    }
  } catch (e) {
    return false
  }

  // Block in production if both origin and referer headers are missing
  if (process.env.NODE_ENV === 'production') {
    return false
  }
  
  return true
}
