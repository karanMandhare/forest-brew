'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SubscriptionPlan {
  id: string
  name: string
  price: number // in rupees
  tagline: string
  icon: string
  color: string
  shadow: string
  features: string[]
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'SEEDLING',
    name: 'The Seedling Pass',
    price: 399,
    tagline: 'Ideal for weekend coffee lovers.',
    icon: '🌱',
    color: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
    shadow: 'rgba(46, 125, 50, 0.25)',
    features: [
      '10% off all beverages & foods',
      '1 free customizations per order',
      'Double stars earned on wallet loads',
      'Cancel anytime'
    ]
  },
  {
    id: 'CANOPY',
    name: 'The Canopy Pass',
    price: 999,
    tagline: 'Best for daily coffee commuters.',
    icon: '🌳',
    color: 'linear-gradient(135deg, #0d5c3a 0%, #10b981 100%)',
    shadow: 'rgba(16, 185, 129, 0.3)',
    features: [
      '20% off all beverages & foods',
      '3 free signature drinks monthly',
      'Free customizations (milks, syrups)',
      'Priority table bookings reservation',
      'Cancel anytime'
    ]
  },
  {
    id: 'REDWOOD',
    name: 'The Redwood Club',
    price: 1999,
    tagline: 'The ultimate luxury coworking & coffee.',
    icon: '🌲',
    color: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
    shadow: 'rgba(245, 158, 11, 0.3)',
    features: [
      '1 free barista drink every single day',
      '20% off all foods & pastries',
      'Free high-speed workspace access',
      'Access to visual booking VIP tables',
      'Exclusive single-origin reserve invitations',
      'Cancel anytime'
    ]
  }
]

export default function SubscriptionPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [buying, setBuying] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchProfile()
    }
  }, [sessionStatus])

  const fetchProfile = async () => {
    setLoadingProfile(true)
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleSubscribeClick = (plan: SubscriptionPlan) => {
    if (sessionStatus !== 'authenticated') {
      router.push('/auth/login')
      return
    }
    if (session?.user && (session.user.role === 'ADMIN' || session.user.role === 'DELIVERY')) {
      alert('Access restricted: Store administrators and workers cannot purchase subscription passes.')
      return
    }
    setSelectedPlan(plan)
    setMessage(null)
  }

  const handleConfirmPurchase = async () => {
    if (!selectedPlan) return
    setBuying(true)
    setMessage(null)

    try {
      const res = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedPlan.id })
      })

      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: `🎉 Welcome to the Club! You are now subscribed to ${selectedPlan.name}.` })
        fetchProfile()
        setTimeout(() => {
          setSelectedPlan(null)
          router.push('/profile')
        }, 2500)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to process purchase.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network connection error.' })
    } finally {
      setBuying(false)
    }
  }

  const userBalance = profile?.user?.walletBalance || 0
  const hasInsufficientBalance = selectedPlan && userBalance < selectedPlan.price * 100

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)', padding: '120px 24px 80px', color: 'var(--cream)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 54 }}>
          <span style={{ color: 'var(--mint)', fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 800 }}>
            Forest Brew Club
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: '#fff', marginTop: 8 }}>
            Prepaid Subscription Passes
          </h1>
          <p style={{ color: 'var(--sage)', maxWidth: 600, margin: '12px auto 0', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Join our exclusive inner canopy. Unlock continuous discount pricing, free daily drinks, priority tables, and co-working passes paid directly from your wallet balance.
          </p>
        </div>

        {/* Current Active Plan Status Bar */}
        {profile?.user?.subscriptionTier && (
          <div style={{
            background: 'rgba(74, 140, 63, 0.12)',
            border: '1.5px solid rgba(74, 140, 63, 0.4)',
            borderRadius: 'var(--radius-xl)',
            padding: '20px 28px',
            marginBottom: 44,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            backdropFilter: 'blur(8px)'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--mint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Active Membership</span>
              <h3 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: '1.4rem', margin: '4px 0 0 0' }}>
                {profile.user.subscriptionTier === 'SEEDLING' ? '🌱 The Seedling Pass' : profile.user.subscriptionTier === 'CANOPY' ? '🌳 The Canopy Pass' : '🌲 The Redwood Club'}
              </h3>
              <p style={{ color: 'var(--sage)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                Valid through {new Date(profile.user.subscriptionExpires).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </p>
            </div>
            <Link href="/profile" className="btn-outline" style={{ borderColor: 'rgba(123,196,127,0.3)', color: 'var(--mint)', padding: '10px 20px', borderRadius: 'var(--radius-full)' }}>
              Manage Subscription →
            </Link>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, alignItems: 'stretch' }}>
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isUserTier = profile?.user?.subscriptionTier === plan.id
            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -10 }}
                style={{
                  background: 'rgba(20,45,23,0.35)',
                  border: isUserTier ? '2px solid var(--mint)' : '1px solid rgba(168,197,160,0.18)',
                  borderRadius: 'var(--radius-2xl)',
                  padding: 36,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: `0 15px 35px ${plan.shadow}`,
                  backdropFilter: 'var(--glass-blur)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Active Tag */}
                {isUserTier && (
                  <span style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'var(--mint)', color: '#0f2212',
                    fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
                    padding: '4px 10px', borderRadius: 'var(--radius-full)'
                  }}>
                    Active Plan
                  </span>
                )}

                <div>
                  {/* Top section */}
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>{plan.icon}</span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#fff', margin: 0 }}>
                    {plan.name}
                  </h3>
                  <p style={{ color: 'var(--sage)', fontSize: '0.82rem', marginTop: 4, marginBottom: 24 }}>
                    {plan.tagline}
                  </p>
                  
                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 28 }}>
                    <span style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#fff' }}>
                      ₹{plan.price}
                    </span>
                    <span style={{ color: 'var(--text-soft)', fontSize: '0.9rem', marginLeft: 6 }}>/ month</span>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 28 }} />

                  {/* Features List */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.88rem', color: 'var(--cream)' }}>
                    {plan.features.map((feat, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ color: 'var(--mint)', fontWeight: 'bold' }}>✓</span>
                        <span style={{ lineHeight: 1.3 }}>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: 40 }}>
                  <button
                    onClick={() => handleSubscribeClick(plan)}
                    disabled={isUserTier}
                    style={{
                      width: '100%',
                      background: isUserTier ? 'rgba(255,255,255,0.05)' : plan.color,
                      border: 'none',
                      borderRadius: 'var(--radius-full)',
                      padding: '14px 0',
                      color: isUserTier ? 'var(--text-soft)' : '#fff',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      cursor: isUserTier ? 'default' : 'pointer',
                      transition: 'transform 0.2s',
                      boxShadow: isUserTier ? 'none' : '0 10px 20px rgba(0,0,0,0.2)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isUserTier) e.currentTarget.style.transform = 'scale(1.02)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isUserTier) e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    {isUserTier ? 'Current Active Plan' : `Subscribe for ₹${plan.price}/mo`}
                  </button>
                </div>

              </motion.div>
            )
          })}
        </div>

      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{
                background: 'rgba(15, 34, 18, 0.98)',
                border: '1px solid rgba(168,197,160,0.25)',
                borderRadius: 'var(--radius-xl)',
                padding: 32,
                maxWidth: 450,
                width: '100%',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                color: 'var(--cream)',
                position: 'relative'
              }}
            >
              <button
                onClick={() => setSelectedPlan(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--sage)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>

              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#fff', marginBottom: 12 }}>
                Confirm Membership
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--sage)', marginBottom: 24, lineHeight: 1.4 }}>
                You are purchasing <strong>{selectedPlan.name}</strong>. The membership fee of <strong>₹{selectedPlan.price}.00</strong> will be deducted from your digital wallet.
              </p>

              {/* Wallet Info */}
              <div style={{
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}>
                  <span>Your Wallet Balance:</span>
                  <strong style={{ color: hasInsufficientBalance ? '#ef5350' : 'var(--mint)' }}>
                    ₹{(userBalance / 100).toFixed(2)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}>
                  <span>Plan Cost (30 Days):</span>
                  <strong style={{ color: '#fff' }}>-₹{selectedPlan.price}.00</strong>
                </div>
                {hasInsufficientBalance && (
                  <div style={{ color: '#ef5350', fontSize: '0.78rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 4, lineHeight: 1.3 }}>
                    ⚠️ Your wallet balance is insufficient. Please load funds into your account before purchasing this membership.
                  </div>
                )}
              </div>

              {message && (
                <div style={{
                  color: message.type === 'success' ? 'var(--mint)' : '#ef5350',
                  fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', marginBottom: 16
                }}>
                  {message.text}
                </div>
              )}

              {/* Actions */}
              {hasInsufficientBalance ? (
                <button
                  onClick={() => {
                    setSelectedPlan(null)
                    router.push('/profile?tab=wallet')
                  }}
                  className="btn-primary"
                  style={{ width: '100%', background: '#c53030' }}
                >
                  💳 Top Up Wallet
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handleConfirmPurchase}
                    disabled={buying}
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px 0' }}
                  >
                    {buying ? 'Processing...' : 'Confirm & Buy'}
                  </button>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    disabled={buying}
                    className="btn-outline"
                    style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'var(--cream)', padding: '12px 20px', background: 'transparent' }}
                  >
                    Cancel
                  </button>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
