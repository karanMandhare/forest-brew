import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const user = req.auth?.user

  // Explicit bypass for APIs, Next.js assets, and static files
  const isBypass = nextUrl.pathname.startsWith('/api') ||
                   nextUrl.pathname.startsWith('/_next') ||
                   nextUrl.pathname.startsWith('/images') ||
                   nextUrl.pathname.startsWith('/assets') ||
                   nextUrl.pathname === '/favicon.ico'

  if (isBypass) {
    return NextResponse.next()
  }

  // If logged in but doesn't have a password
  if (isLoggedIn && user && !user.hasPassword) {
    // Prevent redirection loop if already on set-password
    if (nextUrl.pathname !== '/auth/set-password') {
      const setPasswordUrl = new URL('/auth/set-password', nextUrl)
      const callbackUrl = nextUrl.searchParams.get('callbackUrl') || nextUrl.pathname + nextUrl.search
      setPasswordUrl.searchParams.set('callbackUrl', callbackUrl)
      return NextResponse.redirect(setPasswordUrl)
    }
    return NextResponse.next()
  }

  // If they are on set-password but they already have a password, redirect to home
  if (isLoggedIn && user?.hasPassword && nextUrl.pathname === '/auth/set-password') {
    return NextResponse.redirect(new URL('/', nextUrl))
  }

  // Strict Role-Based Route Separation
  if (isLoggedIn && user) {
    const isAuthPage = nextUrl.pathname.startsWith('/auth')
    const userRole = user.role
    
    if (userRole === 'ADMIN') {
      if (nextUrl.pathname.startsWith('/worker')) {
        return NextResponse.redirect(new URL('/admin', nextUrl))
      }
    } else if (userRole === 'DELIVERY') {
      if (!nextUrl.pathname.startsWith('/worker') && !isAuthPage && (nextUrl.pathname.startsWith('/admin') || nextUrl.pathname.startsWith('/checkout') || nextUrl.pathname.startsWith('/profile'))) {
        return NextResponse.redirect(new URL('/worker', nextUrl))
      }
    } else if (userRole === 'USER') {
      if (nextUrl.pathname.startsWith('/admin') || nextUrl.pathname.startsWith('/worker')) {
        return NextResponse.redirect(new URL('/', nextUrl))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     * - assets (public assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets).*)',
  ],
}


