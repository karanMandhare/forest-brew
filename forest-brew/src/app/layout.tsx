// ============================================================
//  Forest Brew — Root Layout
// ============================================================

import type { Metadata } from 'next'
import { Playfair_Display, Nunito } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Navbar } from '@/components/layout/Navbar'
import { CartPanel } from '@/components/layout/CartPanel'
import { SupportChat } from '@/components/ui/SupportChat'


const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Forest Brew — Where Every Sip Feels Like a Forest Morning',
  description:
    'Sustainably sourced, lovingly roasted coffee in a lush forest ecosystem. Order online, customize your drink, and experience nature in every cup.',
  keywords: ['coffee', 'forest brew', 'sustainable coffee', 'Pune cafe', 'artisan coffee'],
  openGraph: {
    title: 'Forest Brew | Coffee & Nature',
    description: 'Sustainably sourced, lovingly roasted coffee in a lush forest ecosystem.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${nunito.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <div className="grain" aria-hidden="true" />
          <Navbar />
          <CartPanel />
          <main>{children}</main>
          <SupportChat />
        </Providers>
      </body>
    </html>
  )
}
