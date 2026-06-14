'use client'

import { useState, Suspense } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

function SetPasswordContent() {
  const { update } = useSession()
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get('callbackUrl') || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to set password.')
      }

      // Update session to let the middleware know they now have a password
      await update({ hasPassword: true })

      // Redirect to original page
      router.push(callbackUrl)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="auth-card"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--forest)', fontWeight: 700 }}>
          🌿 Forest Brew
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--forest)', marginTop: 16, marginBottom: 8 }}>
          Secure Your Account
        </h1>
        <p style={{ color: 'var(--text-soft)', fontSize: '0.88rem', lineHeight: '1.4' }}>
          Please set a password for your account. This is mandatory to complete your sign-up and secure your profile.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(229,57,53,0.08)',
            border: '1px solid rgba(229,57,53,0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: '0.85rem',
            color: '#c62828',
          }}
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          className="form-field"
          type="password"
          placeholder="New Password (min 6 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <input
          className="form-field"
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <motion.button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', marginTop: 8 }}
          disabled={loading}
          whileTap={{ scale: 0.97 }}
        >
          {loading ? '🌿 Saving Password...' : '☕ Save Password & Continue'}
        </motion.button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: 10 }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(74, 140, 63, 0.15)' }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(74, 140, 63, 0.15)' }} />
      </div>

      <motion.button
        type="button"
        onClick={() => signOut({ callbackUrl: '/auth/login' })}
        className="btn-outline"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: 'rgba(255, 255, 255, 0.2)',
          border: '1.5px solid rgba(229, 57, 53, 0.4)',
          borderRadius: 'var(--radius-full)',
          padding: '12px 24px',
          fontWeight: 700,
          fontSize: '0.85rem',
          color: '#c62828',
          cursor: 'pointer',
        }}
        whileTap={{ scale: 0.97 }}
      >
        Sign Out
      </motion.button>
    </motion.div>
  )
}

export default function SetPasswordPage() {
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
        <SetPasswordContent />
      </Suspense>
    </div>
  )
}
