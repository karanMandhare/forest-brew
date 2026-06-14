// ============================================================
//  Forest Brew — NextAuth Configuration (Edge Compatible)
//  Defined separately to avoid importing Prisma/native DB in middleware
// ============================================================

import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.loyaltyPoints = user.loyaltyPoints
        token.hasPassword = !!user.passwordHash
      }
      if (trigger === 'update' && session?.hasPassword !== undefined) {
        token.hasPassword = session.hasPassword
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.loyaltyPoints = token.loyaltyPoints as number
        session.user.hasPassword = !!token.hasPassword
      }
      return session
    },
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  providers: [], // Empty here, populated in lib/auth.ts
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
}
