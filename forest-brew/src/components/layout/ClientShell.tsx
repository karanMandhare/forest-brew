'use client'

/**
 * ClientShell — thin Client Component that owns all layout pieces
 * that rely on localStorage (Zustand persist) or client-only session
 * state. Using dynamic({ ssr: false }) here (inside a Client Component)
 * is valid; it would throw if placed in a Server Component like layout.tsx.
 */

import dynamic from 'next/dynamic'

const CartPanel = dynamic(
  () => import('@/components/layout/CartPanel').then(m => m.CartPanel),
  { ssr: false }
)

const SupportChat = dynamic(
  () => import('@/components/ui/SupportChat').then(m => m.SupportChat),
  { ssr: false }
)

export function ClientShell() {
  return (
    <>
      <CartPanel />
      <SupportChat />
    </>
  )
}
