'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  let errorMessage = 'An unexpected error occurred during authentication.'
  if (error === 'Configuration') {
    errorMessage = 'There is a configuration issue with the server. Please check your environment variables.'
  } else if (error === 'AccessDenied') {
    errorMessage = 'Access was denied. Make sure you have authorized the application to access your profile.'
  } else if (error === 'Verification') {
    errorMessage = 'The verification link has expired or has already been used.'
  }

  return (
    <motion.div
      className="auth-card"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ textAlign: 'center' }}
    >
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--forest)', marginBottom: 12 }}>
          Authentication Error
        </h1>
        <p style={{ color: '#c62828', fontSize: '0.9rem', lineHeight: '1.5', background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.2)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
          {errorMessage}
        </p>
        {error && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: 8 }}>
            Error code: <code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: '4px' }}>{error}</code>
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link href="/auth/login" style={{ textDecoration: 'none' }}>
          <motion.button
            className="btn-primary"
            style={{ width: '100%' }}
            whileTap={{ scale: 0.97 }}
          >
            ☕ Try Signing In Again
          </motion.button>
        </Link>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <motion.button
            className="btn-outline"
            style={{ width: '100%', borderColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.97 }}
          >
            🏡 Return to Homepage
          </motion.button>
        </Link>
      </div>
    </motion.div>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="auth-page">
      {/* Floating leaves background */}
      {['🍃','🌿','🍂','🌱'].map((leaf, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute',
          fontSize: `${2 + i}rem`,
          opacity: 0.08,
          top: `${15 + i * 20}%`,
          left: i % 2 === 0 ? `${5 + i * 8}%` : undefined,
          right: i % 2 === 1 ? `${5 + i * 6}%` : undefined,
          animation: `floatUp ${5 + i}s ease-in-out infinite`,
          animationDelay: `${i * 0.5}s`,
          pointerEvents: 'none',
        }}>
          {leaf}
        </div>
      ))}

      <Suspense fallback={
        <div className="auth-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 250 }}>
          <div className="coffee-steam" style={{ transform: 'scale(1.5)' }}>
            <span/><span/><span/>
          </div>
        </div>
      }>
        <ErrorContent />
      </Suspense>
    </div>
  )
}
