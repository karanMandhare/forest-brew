'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { BookingModal } from '@/components/ui/BookingModal'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const { data: session } = useSession()
  const { totalItems, toggleCart } = useCartStore()
  const prevCount = useRef(0)
  const [badgeBump, setBadgeBump] = useState(false)
  const [mounted, setMounted] = useState(false)

  const count = totalItems()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Badge bump animation on count change
  useEffect(() => {
    if (mounted && count > prevCount.current) {
      setBadgeBump(true)
      setTimeout(() => setBadgeBump(false), 400)
    }
    prevCount.current = count
  }, [count, mounted])

  // Scroll listener
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close mobile on resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth > 900) setMobileOpen(false) }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const navLinks = [
    { href: '/#menu',       label: 'Menu' },
    { href: '/discover',    label: 'Origin Map' },
    { href: '/brew-guide',  label: 'Brew Academy' },
    { href: '/quiz',        label: 'Sensory Quiz' },
    { href: '/subscription',label: 'Forest Club' },
    { href: '/wishlist',    label: 'Wishlist' },
    { href: '/contact',     label: 'Contact Us' },
  ]

  return (
    <>
      <motion.nav
        className={`nav ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <Link href="/" className="nav-logo">
          🌿 Forest Brew
        </Link>

        {/* Desktop Links */}
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center' }}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}

          {mounted && (
            session ? (
              <Link href={session.user.role === 'ADMIN' ? '/admin' : session.user.role === 'DELIVERY' ? '/worker' : '/profile'}>
                {session.user.role === 'ADMIN' ? 'Admin Panel' : session.user.role === 'DELIVERY' ? 'Worker Dashboard' : 'Wallet & Rewards'}
              </Link>
            ) : (
              <Link href="/orders">
                My Orders
              </Link>
            )
          )}

          {/* Cart */}
          {(!session || (session.user.role !== 'ADMIN' && session.user.role !== 'DELIVERY')) && (
            <motion.button
              className="nav-cart"
              onClick={toggleCart}
              whileTap={{ scale: 0.95 }}
              aria-label={mounted ? `Cart with ${count} items` : 'Cart'}
            >
              🛒
              <span className={`cart-badge ${badgeBump ? 'bump' : ''}`}>
                {mounted ? count : 0}
              </span>
            </motion.button>
          )}

          {/* Auth */}
          {mounted && (
            session ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="btn-outline"
                  style={{ padding: '8px 18px', fontSize: '0.72rem' }}
                  onClick={() => signOut()}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="btn-outline"
                style={{ padding: '8px 18px', fontSize: '0.72rem', display: 'inline-block', textDecoration: 'none' }}
              >
                Sign In
              </Link>
            )
          )}

          {mounted && <ThemeToggle />}

          {/* Book a table CTA */}
          {(!session || (session.user.role !== 'ADMIN' && session.user.role !== 'DELIVERY')) && (
            <motion.button
              className="nav-cta"
              onClick={() => setBookingOpen(true)}
              whileTap={{ scale: 0.96 }}
            >
              ☕ Book a Table
            </motion.button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-toggle"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          style={{ display: 'none' }}
          id="hamburger-btn"
        >
          <motion.span
            animate={{ rotate: mobileOpen ? 45 : 0, y: mobileOpen ? 7 : 0 }}
            style={{ display: 'block', width: 24, height: 2, background: 'var(--forest)', borderRadius: 2 }}
          />
          <motion.span
            animate={{ opacity: mobileOpen ? 0 : 1 }}
            style={{ display: 'block', width: 24, height: 2, background: 'var(--forest)', borderRadius: 2 }}
          />
          <motion.span
            animate={{ rotate: mobileOpen ? -45 : 0, y: mobileOpen ? -7 : 0 }}
            style={{ display: 'block', width: 24, height: 2, background: 'var(--forest)', borderRadius: 2 }}
          />
        </button>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="nav-mobile"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{ fontSize: '0.9rem', color: 'var(--text-mid)', fontWeight: 600 }}
              >
                {link.label}
              </Link>
            ))}
            {mounted && (
              session ? (
                <Link
                  href={session.user.role === 'ADMIN' ? '/admin' : session.user.role === 'DELIVERY' ? '/worker' : '/profile'}
                  onClick={() => setMobileOpen(false)}
                  style={{ fontSize: '0.9rem', color: 'var(--text-mid)', fontWeight: 600 }}
                >
                  {session.user.role === 'ADMIN' ? 'Admin Panel' : session.user.role === 'DELIVERY' ? 'Worker Dashboard' : 'Wallet & Rewards'}
                </Link>
              ) : (
                <Link
                  href="/orders"
                  onClick={() => setMobileOpen(false)}
                  style={{ fontSize: '0.9rem', color: 'var(--text-mid)', fontWeight: 600 }}
                >
                  My Orders
                </Link>
              )
            )}
            {(!session || (session.user.role !== 'ADMIN' && session.user.role !== 'DELIVERY')) && (
              <button
                className="nav-cart"
                onClick={() => { setMobileOpen(false); toggleCart() }}
                style={{ justifyContent: 'flex-start' }}
              >
                🛒 Cart <span className="cart-badge">{mounted ? count : 0}</span>
              </button>
            )}
            {(!session || (session.user.role !== 'ADMIN' && session.user.role !== 'DELIVERY')) && (
              <button className="btn-primary" onClick={() => { setMobileOpen(false); setBookingOpen(true) }}>
                ☕ Book a Table
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive hamburger CSS fix */}
      <style>{`
        @media (max-width: 900px) {
          #hamburger-btn { display: flex !important; }
          .nav-links { display: none !important; }
        }
      `}</style>

      {/* Booking Modal */}
      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  )
}
