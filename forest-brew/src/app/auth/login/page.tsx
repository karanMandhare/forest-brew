'use client'

import { useState, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

function LoginContent() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get('callbackUrl') || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email, password,
      redirect: false,
      callbackUrl,
    })

    if (res?.error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    } else {
      const session = await getSession()
      if (session?.user?.role === 'ADMIN') {
        router.push('/admin')
      } else if (session?.user?.role === 'DELIVERY') {
        router.push('/worker')
      } else {
        router.push(callbackUrl)
      }
    }
  }

  return (
    <motion.div
      className="auth-card"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--forest)', fontWeight: 700 }}>
          🌿 Forest Brew
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--forest)', marginTop: 16, marginBottom: 8 }}>
          Welcome back
        </h1>
        <p style={{ color: 'var(--text-soft)', fontSize: '0.88rem' }}>
          Sign in to your account
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
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          className="form-field"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <motion.button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', marginTop: 8 }}
          disabled={loading}
          whileTap={{ scale: 0.97 }}
        >
          {loading ? '🌿 Signing in...' : '☕ Sign In'}
        </motion.button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: 10 }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(74, 140, 63, 0.15)' }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or continue with</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(74, 140, 63, 0.15)' }} />
      </div>

      <motion.button
        type="button"
        onClick={() => signIn('google', { callbackUrl })}
        className="btn-outline"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: 'rgba(255, 255, 255, 0.4)',
          border: '1.5px solid var(--sage)',
          borderRadius: 'var(--radius-full)',
          padding: '12px 24px',
          fontWeight: 700,
          fontSize: '0.85rem',
          color: 'var(--forest)',
          cursor: 'pointer',
        }}
        whileTap={{ scale: 0.97 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
        </svg>
        Sign in with Google
      </motion.button>

      <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--text-soft)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" style={{ color: 'var(--leaf)', fontWeight: 700 }}>
          Create one
        </Link>
      </div>

      <div style={{
        marginTop: 20, padding: '12px 16px',
        background: 'rgba(74,140,63,0.06)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.75rem',
        color: 'var(--text-soft)',
      }}>
        <strong>Demo:</strong> demo@forestbrew.in / user@forestbrew<br/>
        <strong>Admin:</strong> admin@forestbrew.in / admin@forestbrew
      </div>
    </motion.div>
  )
}

export default function LoginPage() {
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
        <LoginContent />
      </Suspense>
    </div>
  )
}
