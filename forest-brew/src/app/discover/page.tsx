'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface OriginPin {
  id: string
  name: string
  latCode: string
  variety: string
  elevation: string
  process: string
  directTradePremium: string
  carbonFootprint: string
  farmerName: string
  flavorNotes: string
  x: number
  y: number
  acidity: number
  body: number
  sweetness: number
}

const ORIGINS: OriginPin[] = [
  {
    id: 'ethiopia',
    name: 'Ethiopia (Yirgacheffe)',
    latCode: '6.1622° N, 38.2058° E',
    variety: 'Heirloom Typica',
    elevation: '1,900m - 2,200m',
    process: 'Washed / Wet Processed',
    directTradePremium: '+95% above market price',
    carbonFootprint: '0.12 kg CO2e / cup (Offset)',
    farmerName: 'Faysel A. Yonis & smallholders',
    flavorNotes: 'Bergamot · Jasmine blossom · Lemon zest · Black tea finish',
    x: 400,
    y: 160,
    acidity: 90,
    body: 40,
    sweetness: 75
  },
  {
    id: 'colombia',
    name: 'Colombia (Huila)',
    latCode: '2.5359° N, 75.5277° W',
    variety: 'Caturra, Castillo',
    elevation: '1,650m - 1,800m',
    process: 'Honey Processed',
    directTradePremium: '+82% above market price',
    carbonFootprint: '0.15 kg CO2e / cup (Offset)',
    farmerName: 'Alvaro Muñoz (Finca Primavera)',
    flavorNotes: 'Matcha cream · Milk chocolate · Caramel · Red apple crisp',
    x: 230,
    y: 175,
    acidity: 70,
    body: 65,
    sweetness: 85
  },
  {
    id: 'kenya',
    name: 'Kenya (Nyeri)',
    latCode: '0.4204° S, 36.9476° E',
    variety: 'SL28 & SL34',
    elevation: '1,800m - 2,100m',
    process: 'Double Washed',
    directTradePremium: '+110% above market price',
    carbonFootprint: '0.11 kg CO2e / cup (Offset)',
    farmerName: 'Othaya Farmers Co-op',
    flavorNotes: 'Black currant · Grapefruit zest · Hibiscus syrup · Cola finish',
    x: 405,
    y: 185,
    acidity: 95,
    body: 50,
    sweetness: 70
  },
  {
    id: 'guatemala',
    name: 'Guatemala (Antigua)',
    latCode: '14.5611° N, 90.7344° W',
    variety: 'Bourbon, Catuai',
    elevation: '1,500m - 1,700m',
    process: 'Natural / Sun-Dried',
    directTradePremium: '+75% above market price',
    carbonFootprint: '0.18 kg CO2e / cup (Offset)',
    farmerName: 'Zelaya Family (Hacienda Carmona)',
    flavorNotes: 'Wildberry pie · Dark cacao butter · Spiced amber · Brown sugar',
    x: 185,
    y: 155,
    acidity: 65,
    body: 75,
    sweetness: 80
  },
  {
    id: 'brazil',
    name: 'Brazil (Cerrado)',
    latCode: '18.4831° S, 47.1294° W',
    variety: 'Mundo Novo, Acaia',
    elevation: '950m - 1,150m',
    process: 'Pulped Natural',
    directTradePremium: '+65% above market price',
    carbonFootprint: '0.19 kg CO2e / cup (Offset)',
    farmerName: 'Dutra Brothers (Finca Dutra)',
    flavorNotes: 'Toasted hazelnut · Toffee crunch · Low acidity · Cocoa finish',
    x: 260,
    y: 210,
    acidity: 45,
    body: 80,
    sweetness: 90
  }
]

export default function SourcingMapPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [profile, setProfile] = useState<any>(null)
  const [selectedOrigin, setSelectedOrigin] = useState<OriginPin | null>(null)
  const [exploredList, setExploredList] = useState<string[]>([])
  
  // Badge claiming state
  const [claimingBadge, setClaimingBadge] = useState<string | null>(null)
  const [claimStatusMsg, setClaimStatusMsg] = useState<Record<string, string>>({})

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchProfile()
    }
  }, [sessionStatus])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    } catch (err) {
      console.error('Profile fetch error in discover:', err)
    }
  }

  const handleOriginClick = (origin: OriginPin) => {
    setSelectedOrigin(origin)
    if (!exploredList.includes(origin.id)) {
      setExploredList(prev => [...prev, origin.id])
    }
  }

  const handleClaimQuest = async (badgeId: string) => {
    if (sessionStatus !== 'authenticated') return
    setClaimingBadge(badgeId)
    setClaimStatusMsg(prev => ({ ...prev, [badgeId]: '' }))

    try {
      const res = await fetch('/api/user/claim-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId })
      })

      const data = await res.json()
      if (res.ok) {
        setClaimStatusMsg(prev => ({ ...prev, [badgeId]: `🎉 Claimed! +${data.points} Stars added.` }))
        fetchProfile() // refresh user badges and stars
      } else {
        setClaimStatusMsg(prev => ({ ...prev, [badgeId]: data.error || 'Claim failed.' }))
      }
    } catch {
      setClaimStatusMsg(prev => ({ ...prev, [badgeId]: 'Network connection error.' }))
    } finally {
      setClaimingBadge(null)
    }
  }

  // Check which badges are already unlocked
  const unlockedBadges = profile?.user?.unlockedBadges
    ? profile.user.unlockedBadges.split(',')
    : []

  // Check if eligible for single-origin connoisseur quest:
  // User must have ordered products from at least 3 distinct single origins
  // Single origins in seed: 'ethiopia' (Yirgacheffe/Espresso), 'colombia' (Huila/Latte), 'kenya' (Kenya AA/Pour-over), 'guatemala' (Antigua/Cold brew), 'brazil' (Cerrado/Cortado)
  const orderedOrigins = new Set<string>()
  if (profile?.orders) {
    profile.orders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        const origin = item.product?.origin
        if (origin) {
          if (origin.toLowerCase().includes('ethiopia')) orderedOrigins.add('ethiopia')
          if (origin.toLowerCase().includes('colombia')) orderedOrigins.add('colombia')
          if (origin.toLowerCase().includes('kenya')) orderedOrigins.add('kenya')
          if (origin.toLowerCase().includes('guatemala')) orderedOrigins.add('guatemala')
          if (origin.toLowerCase().includes('brazil')) orderedOrigins.add('brazil')
        }
      })
    })
  }

  const isEligibleConnoisseur = orderedOrigins.size >= 3
  const isEligibleScholar = exploredList.length >= 5
  const isEligibleBrewMaster = unlockedBadges.includes('brew-master')

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)', padding: '120px 24px 80px', color: 'var(--cream)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <span style={{ color: 'var(--mint)', fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 800 }}>
            Botanical Sourcing
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: '#fff', marginTop: 8 }}>
            Origin Explorer & Quests
          </h1>
          <p style={{ color: 'var(--sage)', maxWidth: 600, margin: '12px auto 0', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Trace your coffee back to the soil. Click glowing nodes on our world map to explore farm sourcing metrics, direct-trade pricing, and unlock badge rewards.
          </p>
        </div>

        {/* World Map & Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, marginBottom: 54 }} className="checkout-layout">
          
          {/* World Map Card */}
          <div style={{
            background: 'rgba(20,45,23,0.3)',
            border: '1px solid rgba(168,197,160,0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: 24,
            backdropFilter: 'var(--glass-blur)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            height: 'fit-content'
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: '1.2rem', margin: 0 }}>
              🌍 Interactive Sourcing Map
            </h3>
            
            {/* SVG Map Container */}
            <div style={{ position: 'relative', width: '100%', paddingBottom: '55%', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
              <svg viewBox="0 0 540 300" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                
                {/* Outlines of continents drawn abstractly using bezier curves */}
                {/* North America */}
                <path d="M40 50 C 60 40, 110 50, 130 90 C 120 120, 90 130, 70 145 C 50 135, 40 100, 40 50 Z" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                
                {/* South America */}
                <path d="M160 160 C 190 150, 240 190, 250 220 C 220 270, 200 280, 190 290 C 170 280, 160 210, 160 160 Z" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                
                {/* Africa */}
                <path d="M300 120 C 330 110, 390 120, 400 150 C 420 180, 390 220, 375 250 C 365 240, 345 220, 330 200 C 310 180, 290 150, 300 120 Z" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                
                {/* Europe & Asia */}
                <path d="M260 40 C 300 20, 420 30, 480 50 C 500 80, 490 130, 470 150 C 440 140, 380 120, 340 110 C 320 80, 280 60, 260 40 Z" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                {/* Ocean Path Lines representing trade paths to cafe in India (Pune, approx x:370 y:150) */}
                {ORIGINS.map((pin) => (
                  <path
                    key={`path-${pin.id}`}
                    d={`M${pin.x} ${pin.y} Q ${ (pin.x + 360) / 2 } ${ (pin.y + 160) / 2 - 30 }, 360 160`}
                    fill="none"
                    stroke="var(--mint)"
                    strokeWidth="1"
                    strokeDasharray="4, 4"
                    opacity={selectedOrigin?.id === pin.id ? 0.6 : 0.15}
                    style={{ transition: 'opacity 0.3s' }}
                  />
                ))}

                {/* Cafe Node - Pune India */}
                <circle cx="360" cy="160" r="4" fill="#fff" stroke="var(--mint)" strokeWidth="1.5" />
                <text x="360" y="150" fill="#fff" fontSize="7" fontWeight="bold" textAnchor="middle">🌿 Cafe</text>

                {/* Origin Pin Nodes */}
                {ORIGINS.map((pin) => {
                  const isSelected = selectedOrigin?.id === pin.id
                  const isExplored = exploredList.includes(pin.id)
                  return (
                    <g key={pin.id} onClick={() => handleOriginClick(pin)} style={{ cursor: 'pointer' }}>
                      {/* Pulse circle */}
                      <circle
                        cx={pin.x}
                        cy={pin.y}
                        r={isSelected ? 10 : 6}
                        fill="rgba(123,196,127,0.2)"
                        stroke="var(--mint)"
                        strokeWidth="1.5"
                        style={{ transition: 'all 0.3s' }}
                      />
                      <circle
                        cx={pin.x}
                        cy={pin.y}
                        r={isSelected ? 4 : 2.5}
                        fill={isExplored ? 'var(--mint)' : '#fff'}
                        style={{ transition: 'all 0.3s' }}
                      />
                      {/* Label */}
                      <text
                        x={pin.x}
                        y={pin.y - 10}
                        fill={isSelected ? '#fff' : 'var(--sage)'}
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        style={{ transition: 'fill 0.3s' }}
                      >
                        {pin.name.split(' ')[0]}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {/* Explored count label */}
              <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.68rem', color: 'var(--sage)' }}>
                Explored: {exploredList.length} of 5 regions
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--sage)', fontStyle: 'italic', textAlign: 'center' }}>
              Click any blinking node pin above to inspect its estate, direct trade, and carbon statistics.
            </div>
          </div>

          {/* Details & Sourcing metrics Column */}
          <div style={{
            background: 'rgba(20,45,23,0.3)',
            border: '1px solid rgba(168,197,160,0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            backdropFilter: 'var(--glass-blur)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.4)',
            minHeight: 400,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <AnimatePresence mode="wait">
              {selectedOrigin ? (
                <motion.div
                  key={selectedOrigin.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--mint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 2 }}>
                      Single-Origin Estate
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#fff', margin: 0 }}>
                      {selectedOrigin.name}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>📍 {selectedOrigin.latCode}</span>
                  </div>

                  {/* Estate metrics grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Farmer / Estate</span>
                      <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginTop: 2 }}>{selectedOrigin.farmerName}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Varietal</span>
                      <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginTop: 2 }}>{selectedOrigin.variety}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Elevation</span>
                      <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginTop: 2 }}>{selectedOrigin.elevation}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Processing Method</span>
                      <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginTop: 2 }}>{selectedOrigin.process}</strong>
                    </div>
                  </div>

                  {/* Sourcing values card */}
                  <div style={{ borderLeft: '3px solid var(--mint)', paddingLeft: 12 }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Direct Trade Pricing Premium</span>
                      <div style={{ color: 'var(--mint)', fontWeight: 700, fontSize: '0.9rem', marginTop: 2 }}>{selectedOrigin.directTradePremium}</div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Carbon Impact</span>
                      <div style={{ color: 'var(--cream)', fontWeight: 700, fontSize: '0.9rem', marginTop: 2 }}>{selectedOrigin.carbonFootprint}</div>
                    </div>
                  </div>

                  {/* Flavor profile wheel list */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--mint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Tasting Signature:</span>
                    <p style={{ fontSize: '0.88rem', color: '#fff', margin: '0 0 10px 0', fontStyle: 'italic' }}>
                      "{selectedOrigin.flavorNotes}"
                    </p>
                    {/* Render minor sliders showing attributes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.72rem', color: 'var(--sage)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 60 }}>Acidity</span>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: 4, borderRadius: 2 }}>
                          <div style={{ background: 'var(--mint)', height: '100%', width: `${selectedOrigin.acidity}%` }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 60 }}>Body</span>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: 4, borderRadius: 2 }}>
                          <div style={{ background: 'var(--mint)', height: '100%', width: `${selectedOrigin.body}%` }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 60 }}>Sweetness</span>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: 4, borderRadius: 2 }}>
                          <div style={{ background: 'var(--mint)', height: '100%', width: `${selectedOrigin.sweetness}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--sage)' }}>
                  <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: 12 }}>🗺️</span>
                  <h4 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: '1.2rem', margin: '0 0 8px 0' }}>Estates Details Panel</h4>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.5, maxWidth: 300, margin: '0 auto' }}>
                    Select any single-origin pin on the map to display farm specifications, tasting parameters, and direct trade metrics.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Quest Badge Center */}
        <div style={{
          background: 'rgba(20,45,23,0.35)',
          border: '1px solid rgba(168,197,160,0.15)',
          borderRadius: 'var(--radius-2xl)',
          padding: 40,
          boxShadow: '0 20px 45px rgba(0,0,0,0.4)',
          backdropFilter: 'var(--glass-blur)'
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#fff', marginBottom: 8, textAlign: 'center' }}>
            🏆 Forest Quest Claiming Center
          </h3>
          <p style={{ color: 'var(--sage)', fontSize: '0.85rem', textAlign: 'center', marginBottom: 36, maxWidth: 500, margin: '0 auto 36px' }}>
            Complete real-world quests (exploring, brewing, or tasting single-origins) to unlock badges and claim bonus stars!
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            
            {/* Quest 1: Sourcing Scholar */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}>🎓</span>
                <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>Sourcing Explorer</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                  Explore all 5 single-origin nodes on the world map. Currently unlocked: {exploredList.length}/5.
                </p>
              </div>

              {unlockedBadges.includes('sourcing-scholar') ? (
                <span style={{ color: 'var(--mint)', fontWeight: 700, fontSize: '0.85rem' }}>✓ Quest Complete & Claimed</span>
              ) : claimStatusMsg['sourcing-scholar'] ? (
                <span style={{ color: 'var(--mint)', fontSize: '0.82rem', fontWeight: 700 }}>{claimStatusMsg['sourcing-scholar']}</span>
              ) : (
                <button
                  onClick={() => handleClaimQuest('sourcing-scholar')}
                  disabled={!isEligibleScholar || claimingBadge === 'sourcing-scholar' || sessionStatus !== 'authenticated'}
                  className="btn-primary"
                  style={{
                    padding: '8px 20px', fontSize: '0.78rem',
                    background: isEligibleScholar ? 'var(--mint)' : 'rgba(255,255,255,0.05)',
                    color: isEligibleScholar ? '#0f2212' : 'var(--text-soft)',
                    cursor: isEligibleScholar ? 'pointer' : 'default',
                    border: 'none', minWidth: 120
                  }}
                >
                  {claimingBadge === 'sourcing-scholar' ? 'Claiming...' : 'Claim 50 Stars'}
                </button>
              )}
            </div>

            {/* Quest 2: Brew Master */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}>⏱️</span>
                <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>Brew Master</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                  Master coffee ratios. Run the visual brew timer in the Brew Academy to unlock this badge.
                </p>
              </div>

              {unlockedBadges.includes('brew-master') ? (
                <span style={{ color: 'var(--mint)', fontWeight: 700, fontSize: '0.85rem' }}>✓ Quest Complete & Claimed</span>
              ) : (
                <Link
                  href="/brew-guide"
                  className="btn-outline"
                  style={{ padding: '8px 20px', fontSize: '0.78rem', textDecoration: 'none', color: 'var(--mint)', borderColor: 'rgba(123,196,127,0.3)' }}
                >
                  Go to Brew Academy
                </Link>
              )}
            </div>

            {/* Quest 3: Single-Origin Connoisseur */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}>👑</span>
                <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>Origin Connoisseur</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                  Order coffee from 3 different single-origins (Ethiopia, Colombia, Kenya, Brazil, Guatemala) from our menu. Ordered: {orderedOrigins.size}/3.
                </p>
              </div>

              {unlockedBadges.includes('connoisseur') ? (
                <span style={{ color: 'var(--mint)', fontWeight: 700, fontSize: '0.85rem' }}>✓ Quest Complete & Claimed</span>
              ) : claimStatusMsg['connoisseur'] ? (
                <span style={{ color: 'var(--mint)', fontSize: '0.82rem', fontWeight: 700 }}>{claimStatusMsg['connoisseur']}</span>
              ) : (
                <button
                  onClick={() => handleClaimQuest('connoisseur')}
                  disabled={!isEligibleConnoisseur || claimingBadge === 'connoisseur' || sessionStatus !== 'authenticated'}
                  className="btn-primary"
                  style={{
                    padding: '8px 20px', fontSize: '0.78rem',
                    background: isEligibleConnoisseur ? 'var(--mint)' : 'rgba(255,255,255,0.05)',
                    color: isEligibleConnoisseur ? '#0f2212' : 'var(--text-soft)',
                    cursor: isEligibleConnoisseur ? 'pointer' : 'default',
                    border: 'none', minWidth: 120
                  }}
                >
                  {claimingBadge === 'connoisseur' ? 'Claiming...' : 'Claim 100 Stars'}
                </button>
              )}
            </div>

          </div>
          
          {sessionStatus !== 'authenticated' && (
            <div style={{ textAlign: 'center', marginTop: 32, fontSize: '0.8rem', color: 'var(--text-soft)' }}>
              ⚠️ You must be logged in to claim completed quest rewards.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
