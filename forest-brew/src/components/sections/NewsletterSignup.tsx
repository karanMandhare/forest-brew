'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setMsg('Please enter your email address.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    setMsg('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMsg(data.message || 'Subscribed successfully!')
        setEmail('')
      } else {
        setMsg(data.error || 'Failed to subscribe. Please try again.')
        setStatus('error')
      }
    } catch (err) {
      setMsg('A connection error occurred. Please try again later.')
      setStatus('error')
    }
  }

  return (
    <section style={{
      padding: '80px 24px',
      background: 'linear-gradient(180deg, #0d2012 0%, #071208 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Forest Branch Blur */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(123,196,127,0.06) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{
            background: 'linear-gradient(135deg, rgba(20,45,26,0.6), rgba(10,24,14,0.4))',
            border: '1px solid rgba(123,196,127,0.2)',
            borderRadius: '30px',
            padding: '50px 40px',
            backdropFilter: 'blur(10px)',
            textAlign: 'center',
            boxShadow: '0 15px 35px rgba(0,0,0,0.3)'
          }}
        >
          {/* Animated Coffee Cup Icon */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            style={{ fontSize: '3rem', marginBottom: '20px' }}
          >
            ✉️
          </motion.div>

          <h2 style={{
            fontFamily: 'var(--font-playfair), serif',
            fontSize: '2.5rem',
            fontWeight: 700,
            marginBottom: '12px',
            color: '#fff'
          }}>
            Join The Forest Club Newsletter
          </h2>

          <p style={{
            color: 'var(--sage)',
            maxWidth: '550px',
            margin: '0 auto 30px auto',
            lineHeight: 1.6,
            fontSize: '1rem'
          }}>
            Subscribe to receive stories of our direct-trade coffee farmers, brewing techniques, secret recipes, and exclusive seasonal codes.
          </p>

          <form onSubmit={handleSubscribe} style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            maxWidth: '550px',
            margin: '0 auto',
            justifyContent: 'center'
          }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              style={{
                flexGrow: 1,
                padding: '16px 20px',
                borderRadius: '30px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(123,196,127,0.25)',
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none',
                minWidth: '260px',
                transition: 'all 0.3s'
              }}
              className="input-focus-ring"
            />
            
            <button
              type="submit"
              disabled={status === 'submitting'}
              style={{
                padding: '16px 32px',
                borderRadius: '30px',
                background: 'var(--mint)',
                color: '#071208',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: status === 'submitting' ? 'default' : 'pointer',
                boxShadow: '0 4px 15px rgba(123,196,127,0.3)',
                transition: 'all 0.2s'
              }}
              className="btn-hover-scale"
            >
              {status === 'submitting' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>

          {/* Messages */}
          <AnimatePresence mode="wait">
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ color: 'var(--mint)', marginTop: '16px', fontSize: '0.9rem', fontWeight: 600 }}
              >
                ✓ {msg}
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ color: '#feb2b2', marginTop: '16px', fontSize: '0.9rem' }}
              >
                ⚠️ {msg}
              </motion.div>
            )}
          </AnimatePresence>

          <span style={{
            display: 'block',
            marginTop: '24px',
            fontSize: '0.75rem',
            color: 'var(--text-soft)'
          }}>
            🌿 Join 2,000+ coffee lovers. Unsubscribe anytime.
          </span>
        </motion.div>
      </div>
    </section>
  )
}
