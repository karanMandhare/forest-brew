'use client'

import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Lazy-load R3F canvas so it never blocks SSR
const ForestCanvas = dynamic(() => import('@/components/three/ForestCanvas'), { ssr: false })

gsap.registerPlugin()

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.18, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
}

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null)
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const isSupported = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      )
      setWebglAvailable(isSupported)
    } catch (e) {
      setWebglAvailable(false)
    }
  }, [])

  // GSAP parallax on scroll
  useGSAP(() => {
    const hero = heroRef.current
    if (!hero) return
    const onScroll = () => {
      const scrolled = window.scrollY
      if (scrolled < window.innerHeight) {
        gsap.set('.hero-sky', { y: scrolled * 0.2 })
        gsap.set('.sun-wrap', { y: scrolled * 0.15 })
        gsap.set('.cloud', { y: scrolled * 0.08 })
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, { scope: heroRef })

  return (
    <section id="hero" ref={heroRef}>
      {/* Sky gradient */}
      <div className="hero-sky" />

      {/* R3F WebGL Floating Leaves Overlay */}
      {webglAvailable && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 9,
          pointerEvents: 'none',
        }}>
          <ErrorBoundary fallback={null}>
            <ForestCanvas />
          </ErrorBoundary>
        </div>
      )}

      {/* Sun */}
      <div className="sun-wrap">
        <div className="sun">
          <div className="sun-ring sun-ring-1" />
          <div className="sun-ring sun-ring-2" />
        </div>
      </div>

      {/* Clouds */}
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" />

      {/* Far background trees SVG */}
      <svg
        className="trees-far"
        height="320"
        viewBox="0 0 1400 320"
        preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none', zIndex: 1 }}
      >
        <g opacity="0.22">
          <polygon points="60,15 105,180 15,180"  fill="#4a7c28"/>
          <polygon points="60,65 115,230 5,230"   fill="#558b2f"/>
          <rect x="53" y="228" width="14" height="92" fill="#5c3d1e"/>
          <polygon points="200,25 245,195 155,195" fill="#4a7c28"/>
          <rect x="193" y="193" width="14" height="127" fill="#5c3d1e"/>
          <polygon points="380,10 430,195 330,195" fill="#3d6b22"/>
          <rect x="373" y="193" width="14" height="127" fill="#5c3d1e"/>
          <polygon points="1020,18 1065,185 975,185" fill="#4a7c28"/>
          <rect x="1013" y="183" width="14" height="137" fill="#5c3d1e"/>
          <polygon points="1180,25 1230,200 1130,200" fill="#3d6b22"/>
          <rect x="1173" y="198" width="14" height="122" fill="#5c3d1e"/>
          <polygon points="1340,12 1385,190 1295,190" fill="#4a7c28"/>
          <rect x="1333" y="188" width="14" height="132" fill="#5c3d1e"/>
        </g>
      </svg>

      {/* Mid trees */}
      <svg
        className="trees-mid trees-mid-l"
        width="200" height="380" viewBox="0 0 200 380"
        style={{ position: 'absolute', bottom: 0, left: 30, zIndex: 2, pointerEvents: 'none', opacity: 0.55 }}
      >
        <polygon points="100,12 160,200 40,200"  fill="#558b2f"/>
        <polygon points="100,75 170,265 30,265"  fill="#689f38"/>
        <rect x="90" y="263" width="20" height="117" fill="#3d2510"/>
        <circle cx="72" cy="155" r="12" fill="#7bc47f" opacity="0.65"/>
        <circle cx="130" cy="142" r="9"  fill="#a8c5a0" opacity="0.6"/>
        <circle cx="95"  cy="120" r="7"  fill="#7bc47f" opacity="0.5"/>
        <ellipse cx="50" cy="320" rx="45" ry="20" fill="#7cb342" opacity="0.8"/>
      </svg>
      <svg
        className="trees-mid trees-mid-r"
        width="200" height="380" viewBox="0 0 200 380"
        style={{ position: 'absolute', bottom: 0, right: 20, zIndex: 2, pointerEvents: 'none', opacity: 0.55 }}
      >
        <polygon points="100,12 160,200 40,200"  fill="#558b2f"/>
        <polygon points="100,75 170,265 30,265"  fill="#689f38"/>
        <rect x="90" y="263" width="20" height="117" fill="#3d2510"/>
        <circle cx="60"  cy="145" r="11" fill="#a8c5a0" opacity="0.6"/>
        <circle cx="130" cy="160" r="9"  fill="#7bc47f" opacity="0.5"/>
      </svg>

      {/* Ground */}
      <div className="ground-back" />
      <div className="ground-front" />

      {/* Ground plants */}
      <div className="ground-plants">
        {[
          { w: 44, h: 54, vb: '0 0 44 54', delay: '0s' },
          { w: 38, h: 46, vb: '0 0 38 46', delay: '0.4s' },
          { w: 50, h: 58, vb: '0 0 50 58', delay: '0.8s' },
          { w: 36, h: 44, vb: '0 0 36 44', delay: '1.1s' },
          { w: 42, h: 50, vb: '0 0 42 50', delay: '0.6s' },
        ].map((p, i) => (
          <svg key={i} className="ground-plant" width={p.w} height={p.h} viewBox={p.vb} style={{ animationDelay: p.delay }}>
            <rect x={p.w/2-3} y={p.h*0.55} width="5" height={p.h*0.4} fill="#5c3d1e" rx="2"/>
            <ellipse cx={p.w/2} cy={p.h*0.42} rx={p.w*0.38} ry={p.h*0.28} fill="#7bc47f"/>
            <ellipse cx={p.w*0.28} cy={p.h*0.55} rx={p.w*0.22} ry={p.h*0.18} fill="#558b2f"/>
            <ellipse cx={p.w*0.72} cy={p.h*0.53} rx={p.w*0.22} ry={p.h*0.18} fill="#4a8c3f"/>
          </svg>
        ))}
      </div>

      {/* Ground flowers */}
      <div className="ground-flowers">
        <span className="gflower gf1">🌸</span>
        <span className="gflower gf2">🌼</span>
        <span className="gflower gf3">🌺</span>
        <span className="gflower gf4">🌻</span>
        <span className="gflower gf1" style={{ animationDelay: '0.5s' }}>🌷</span>
      </div>

      {/* Falling leaves */}
      {['🍃','🍂','🍃','🍂','🌿','🍃','🍂'].map((leaf, i) => (
        <div key={i} className={`falling-leaf fl${i+1}`}>{leaf}</div>
      ))}

      {/* Butterfly & Bird */}
      <div className="butterfly">🦋</div>
      <div className="bird">🐦</div>

      {/* ── Hero Content ── */}
      <div className="hero-inner">
        <div className="hero-text">
          <motion.div
            className="hero-eyebrow"
            custom={0} variants={fadeUp} initial="hidden" animate="show"
          >
            <div className="hero-eyebrow-line" />
            <span>Rooted in Nature · Brewed with Love</span>
          </motion.div>

          <motion.h1
            className="hero-h1"
            custom={1} variants={fadeUp} initial="hidden" animate="show"
          >
            Where Every Sip<br/>
            Feels Like a<br/>
            <em>Forest Morning</em>
          </motion.h1>

          <motion.p
            className="hero-sub"
            custom={2} variants={fadeUp} initial="hidden" animate="show"
          >
            Nestled beneath the canopy, our coffee is as pure as morning dew
            — grown sustainably on shade farms, roasted with reverence, and
            served with warmth in every cup.
          </motion.p>

          <motion.div
            className="hero-btns"
            custom={3} variants={fadeUp} initial="hidden" animate="show"
          >
            <motion.a
              href="#menu"
              className="btn-primary"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              🌿 Explore the Menu
            </motion.a>
            <motion.a
              href="#about"
              className="btn-outline"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Our Story
            </motion.a>
          </motion.div>
        </div>

        {/* Floating badge */}
        <motion.div
          className="hero-badge"
          custom={4} variants={fadeUp} initial="hidden" animate="show"
        >
          <div className="hero-badge-emoji">🌱</div>
          <div className="hero-badge-n">100%</div>
          <div className="hero-badge-l">Shade Grown</div>
        </motion.div>
      </div>

      {/* ── Couple Scene ── */}
      <div className="couple-scene">
        {/* Hearts */}
        <div className="hearts-wrap">
          <div className="heart ht1">💚</div>
          <div className="heart ht2">💛</div>
          <div className="heart ht3">🌸</div>
          <div className="heart ht4">🍃</div>
        </div>

        {/* Woman */}
        <div className="person woman">
          <div className="w-scale">
            <div className="w-head">
              <div className="w-hair"/>
              <span className="w-hair-flower">🌺</span>
              <div className="w-eye w-eye-l"/>
              <div className="w-eye w-eye-r"/>
              <div className="w-cheek w-cheek-l"/>
              <div className="w-cheek w-cheek-r"/>
              <div className="w-nose"/>
              <div className="w-mouth"/>
            </div>
            <div className="w-body">
              <div className="w-collar"/>
              <div className="w-arm-r"><div className="w-hand-r"/></div>
            </div>
            <div className="w-skirt"/>
          </div>
        </div>

        {/* Table */}
        <div className="cafe-table-wrap">
          <div className="t-scale" style={{ position: 'relative' }}>
            <div className="cups-on-table">
              {[0,1].map(i => (
                <div key={i} className="cup-set">
                  <div className="cup-steam">
                    <span/><span/>{i===0 && <span/>}
                  </div>
                  <div className="cup-body">
                    <div className="cup-handle"/>
                    <div className="cup-coffee"><div className="cup-coffee-swirl"/></div>
                  </div>
                  <div className="cup-saucer"/>
                </div>
              ))}
            </div>
            <div className="table-flower">🌼</div>
            <div className="table-candle">🕯️</div>
            <div className="table-top-surface"/>
          </div>
          <div className="table-leg"/>
          <div className="table-foot"/>
        </div>

        {/* Man */}
        <div className="person man">
          <div className="m-scale">
            <div className="m-head">
              <div className="m-hair"/>
              <div className="m-ear-l"/><div className="m-ear-r"/>
              <div className="m-brow m-brow-l"/><div className="m-brow m-brow-r"/>
              <div className="m-eye m-eye-l"/><div className="m-eye m-eye-r"/>
              <div className="m-cheek m-cheek-l"/><div className="m-cheek m-cheek-r"/>
              <div className="m-mouth"/>
            </div>
            <div className="m-body">
              <div className="m-collar-l"/><div className="m-collar-r"/>
              <div className="m-tie"/>
              <div className="m-btn m-btn-1"/><div className="m-btn m-btn-2"/><div className="m-btn m-btn-3"/>
              <div className="m-pocket"/>
              <div className="m-arm-l"><div className="m-hand-l"/></div>
              <div className="m-arm-r-idle"/>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute', bottom: 230, left: '50%',
        transform: 'translateX(-50%)', zIndex: 12,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, pointerEvents: 'none',
      }}>
        <span style={{ fontSize: '0.6rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-mid)', opacity: 0.7 }}>
          Scroll
        </span>
        <motion.div
          style={{ width: 1, height: 40, background: 'linear-gradient(180deg,var(--leaf),transparent)' }}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </section>
  )
}
