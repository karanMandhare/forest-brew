// ============================================================
//  Forest Brew — NextAuth Configuration (v5 Beta)
// ============================================================

import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authConfig } from '@/auth.config'

const customAdapter = PrismaAdapter(prisma)
const originalCreateUser = customAdapter.createUser
if (originalCreateUser) {
  customAdapter.createUser = async (user) => {
    if (user.email) {
      const emailLower = user.email.toLowerCase().trim()
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
      if (emailLower.endsWith('@forestbrew.com') || (adminEmail && emailLower === adminEmail)) {
        user.role = 'ADMIN'
      }
    }
    return originalCreateUser(user)
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: customAdapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
    }),

    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const emailLower = (credentials.email as string).toLowerCase().trim()
        const user = await prisma.user.findUnique({
          where: { email: emailLower },
        })

        if (!user || !user.passwordHash) {
          throw new Error('Invalid email or password')
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          loyaltyPoints: user.loyaltyPoints,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.loyaltyPoints = user.loyaltyPoints
        
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { passwordHash: true }
        })
        token.hasPassword = !!dbUser?.passwordHash
      }
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { passwordHash: true }
        })
        token.hasPassword = !!dbUser?.passwordHash
      }
      return token
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const emailLower = user.email.toLowerCase().trim()
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
        if (emailLower.endsWith('@forestbrew.com') || (adminEmail && emailLower === adminEmail)) {
          const dbUser = await prisma.user.findUnique({
            where: { email: emailLower },
          })
          if (dbUser && dbUser.role !== 'ADMIN') {
            await prisma.user.update({
              where: { email: emailLower },
              data: { role: 'ADMIN' },
            })
            user.role = 'ADMIN'
          }
        }
      }
      return true
    },
  },
})
