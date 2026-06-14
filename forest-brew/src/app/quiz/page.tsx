'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import Link from 'next/link'

interface QuizQuestion {
  id: number
  text: string
  options: Array<{
    text: string
    scores: {
      acidity: number
      body: number
      sweetness: number
      roast: number
      complexity: number
    }
  }>
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: 'How do you prefer the temperature and vibe of your cup?',
    options: [
      {
        text: '🧊 Iced, crisp, and refreshing',
        scores: { acidity: 30, body: 10, sweetness: 20, roast: 10, complexity: 20 }
      },
      {
        text: '☕ Warm, soothing, and cozy',
        scores: { acidity: 10, body: 25, sweetness: 25, roast: 20, complexity: 10 }
      }
    ]
  },
  {
    id: 2,
    text: 'What is your stance on milk or cream?',
    options: [
      {
        text: '🥛 Creamy Oat Milk (Smooth & Silky)',
        scores: { acidity: 5, body: 35, sweetness: 20, roast: 5, complexity: 10 }
      },
      {
        text: '🥜 Nutty Almond Milk (Nutty & Crisp)',
        scores: { acidity: 15, body: 20, sweetness: 15, roast: 10, complexity: 20 }
      },
      {
        text: '🐄 Classic Whole Milk (Rich & Velvety)',
        scores: { acidity: 5, body: 30, sweetness: 20, roast: 10, complexity: 5 }
      },
      {
        text: '🌿 Pure Black (Clean, transparent, and direct)',
        scores: { acidity: 25, body: 10, sweetness: 5, roast: 25, complexity: 35 }
      }
    ]
  },
  {
    id: 3,
    text: 'Which tasting notes sound like your dream escape?',
    options: [
      {
        text: '🌸 Citrus blossoms, fresh berries, and light honey',
        scores: { acidity: 35, body: 5, sweetness: 20, roast: 5, complexity: 35 }
      },
      {
        text: '🍫 Warm milk chocolate, roasted hazelnuts, and brown sugar',
        scores: { acidity: 5, body: 25, sweetness: 30, roast: 20, complexity: 15 }
      },
      {
        text: '🔥 Dark cacao, cedarwood smoke, and toasted malt',
        scores: { acidity: 10, body: 30, sweetness: 10, roast: 35, complexity: 20 }
      }
    ]
  },
  {
    id: 4,
    text: 'How intense do you like your coffee experience?',
    options: [
      {
        text: '🍃 Smooth & Delicate (Gentle morning breeze)',
        scores: { acidity: 15, body: 10, sweetness: 30, roast: 5, complexity: 25 }
      },
      {
        text: '🌳 Balanced & Grounded (Structured and steady)',
        scores: { acidity: 20, body: 20, sweetness: 20, roast: 20, complexity: 20 }
      },
      {
        text: '🌋 Commanding & Full-Bodied (Deep forest soil, bold kick)',
        scores: { acidity: 25, body: 35, sweetness: 10, roast: 30, complexity: 15 }
      }
    ]
  }
]

interface ProductRecommend {
  id: string
  name: string
  description: string
  imageUrl: string
  price: number
  badge: string
  matchReason: string
}

const RECOMMENDED_PRODUCTS: ProductRecommend[] = [
  {
    id: 'prod-canopy-pourover',
    name: 'Canopy Pour-Over',
    description: 'Bright and clean Kenyan AA, slow-brewed to reveal hints of citrus zest and black currant.',
    imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=75',
    price: 44000,
    badge: '🍃 Reserve Single-Origin',
    matchReason: 'Recommended for your love of bright, fruity, and highly complex black coffee.'
  },
  {
    id: 'prod-mossy-latte',
    name: 'Mossy Latte',
    description: 'Silky espresso combined with matching matcha, oat cream, and warming cinnamon.',
    imageUrl: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=600&q=75',
    price: 38000,
    badge: '💚 Bestseller Specialty',
    matchReason: 'Perfect for your preference for smooth, velvety textures, moderate sweetness, and milk.'
  },
  {
    id: 'prod-forest-espresso',
    name: 'Forest Espresso',
    description: 'A dark, commanding double shot from Ethiopian highlands. Rich notes of dark cacao and smoke.',
    imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&q=75',
    price: 32000,
    badge: '🌿 Signature Bold',
    matchReason: 'Chosen for your desire for deep intensity, full body, and commanding roasted notes.'
  },
  {
    id: 'prod-wildflower-coldbrew',
    name: 'Wildflower Cold Brew',
    description: 'Slow-steeped Guatemalan cold brew infused with hibiscus and cooling elderflower sweetness.',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=75',
    price: 36000,
    badge: '🌺 Iced Seasonal',
    matchReason: 'Suits your craving for crisp, chilled refreshing acidity with floral complexity.'
  }
]

export default function FlavorQuizPage() {
  const { addItem, openCart } = useCartStore()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [scores, setScores] = useState({ acidity: 30, body: 30, sweetness: 30, roast: 30, complexity: 30 })
  const [quizFinished, setQuizFinished] = useState(false)
  const [addedStatus, setAddedStatus] = useState<Record<string, boolean>>({})

  const handleAnswer = (answerScores: QuizQuestion['options'][0]['scores']) => {
    setScores((prev) => ({
      acidity: Math.min(100, Math.max(20, prev.acidity + answerScores.acidity)),
      body: Math.min(100, Math.max(20, prev.body + answerScores.body)),
      sweetness: Math.min(100, Math.max(20, prev.sweetness + answerScores.sweetness)),
      roast: Math.min(100, Math.max(20, prev.roast + answerScores.roast)),
      complexity: Math.min(100, Math.max(20, prev.complexity + answerScores.complexity))
    }))

    if (currentIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentIdx((idx) => idx + 1)
    } else {
      setQuizFinished(true)
    }
  }

  const resetQuiz = () => {
    setCurrentIdx(0)
    setScores({ acidity: 30, body: 30, sweetness: 30, roast: 30, complexity: 30 })
    setQuizFinished(false)
    setAddedStatus({})
  }

  // Determine recommendation based on scores
  const getRecommendation = (): ProductRecommend => {
    const { acidity, body, sweetness, roast, complexity } = scores
    
    // 1. High acidity + complexity + low body -> Pour-over
    if (acidity > 55 && complexity > 55 && body < 55) {
      return RECOMMENDED_PRODUCTS[0]
    }
    // 2. High body + sweetness -> Mossy Latte
    if (body > 55 && sweetness > 50) {
      return RECOMMENDED_PRODUCTS[1]
    }
    // 3. High roast + body -> Forest Espresso
    if (roast > 55 && body > 50) {
      return RECOMMENDED_PRODUCTS[2]
    }
    // 4. Fallback (or high acidity + iced) -> Wildflower Cold Brew
    return RECOMMENDED_PRODUCTS[3]
  }

  // Calculate SVG Radar points
  const getRadarPoints = () => {
    const axes = [scores.acidity, scores.body, scores.sweetness, scores.roast, scores.complexity]
    const points: string[] = []
    
    axes.forEach((val, i) => {
      const angle = -Math.PI / 2 + i * (2 * Math.PI / 5)
      const x = 110 + (val / 100) * 80 * Math.cos(angle)
      const y = 110 + (val / 100) * 80 * Math.sin(angle)
      points.push(`${x},${y}`)
    })

    return points.join(' ')
  }

  const getGridPoints = (scale: number) => {
    const points: string[] = []
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + i * (2 * Math.PI / 5)
      const x = 110 + scale * 80 * Math.cos(angle)
      const y = 110 + scale * 80 * Math.sin(angle)
      points.push(`${x},${y}`)
    }
    return points.join(' ')
  }

  const handleQuickAdd = (product: ProductRecommend) => {
    addItem({
      id: product.id,
      name: product.name,
      basePrice: product.price,
      imageUrl: product.imageUrl,
    })
    setAddedStatus(prev => ({ ...prev, [product.id]: true }))
    setTimeout(() => {
      setAddedStatus(prev => ({ ...prev, [product.id]: false }))
    }, 1500)
    openCart()
  }

  const matchedProduct = getRecommendation()

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)', padding: '120px 24px 80px', color: 'var(--cream)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        <AnimatePresence mode="wait">
          {!quizFinished ? (
            <motion.div
              key="quiz-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              style={{
                background: 'rgba(20,45,23,0.3)',
                border: '1px solid rgba(168,197,160,0.15)',
                borderRadius: 'var(--radius-xl)',
                padding: 40,
                backdropFilter: 'var(--glass-blur)',
                boxShadow: '0 20px 45px rgba(0,0,0,0.4)',
                textAlign: 'center'
              }}
            >
              {/* Question progress */}
              <div style={{ color: 'var(--mint)', fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800, marginBottom: 12 }}>
                Flavor Profiler · Question {QUIZ_QUESTIONS[currentIdx].id} of {QUIZ_QUESTIONS.length}
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 32, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--mint)', width: `${((currentIdx) / QUIZ_QUESTIONS.length) * 100}%`, transition: 'width 0.4s ease' }} />
              </div>

              {/* Question Text */}
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#fff', marginBottom: 32, lineHeight: 1.3 }}>
                {QUIZ_QUESTIONS[currentIdx].text}
              </h2>

              {/* Options Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {QUIZ_QUESTIONS[currentIdx].options.map((opt, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => handleAnswer(opt.scores)}
                    whileHover={{ scale: 1.015, background: 'rgba(255,255,255,0.06)', borderColor: 'var(--mint)' }}
                    whileTap={{ scale: 0.99 }}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(168,197,160,0.12)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '20px 24px',
                      color: 'var(--cream)',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border 0.2s, background 0.2s',
                    }}
                  >
                    {opt.text}
                  </motion.button>
                ))}
              </div>

            </motion.div>
          ) : (
            <motion.div
              key="quiz-results"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}
              className="checkout-layout"
            >
              
              {/* Left Column: Sensory Radar Chart */}
              <div style={{
                background: 'rgba(20,45,23,0.3)',
                border: '1px solid rgba(168,197,160,0.15)',
                borderRadius: 'var(--radius-xl)',
                padding: 32,
                backdropFilter: 'var(--glass-blur)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 45px rgba(0,0,0,0.4)',
              }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#fff', marginBottom: 8, textAlign: 'center' }}>
                  Your Flavor Signature
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
                  Taste Radar Map
                </span>

                {/* Radar SVG */}
                <div style={{ width: 230, height: 230, position: 'relative' }}>
                  <svg width="230" height="230" viewBox="0 0 220 220" style={{ overflow: 'visible' }}>
                    {/* Concentric rings */}
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, i) => (
                      <polygon
                        key={i}
                        points={getGridPoints(scale)}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Radial axis lines */}
                    {Array.from({ length: 5 }).map((_, i) => {
                      const angle = -Math.PI / 2 + i * (2 * Math.PI / 5)
                      const x2 = 110 + 80 * Math.cos(angle)
                      const y2 = 110 + 80 * Math.sin(angle)
                      return (
                        <line
                          key={i}
                          x1="110"
                          y1="110"
                          x2={x2}
                          y2={y2}
                          stroke="rgba(168,197,160,0.15)"
                          strokeWidth="1"
                          strokeDasharray="2, 2"
                        />
                      )
                    })}

                    {/* Polygon data fill */}
                    <motion.polygon
                      points={getRadarPoints()}
                      fill="rgba(123,196,127,0.18)"
                      stroke="var(--mint)"
                      strokeWidth="2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />

                    {/* Axis Labels */}
                    {['Acid', 'Body', 'Sweet', 'Roast', 'Comp'].map((label, i) => {
                      const angle = -Math.PI / 2 + i * (2 * Math.PI / 5)
                      const x = 110 + 96 * Math.cos(angle)
                      const y = 110 + 96 * Math.sin(angle)
                      return (
                        <text
                          key={i}
                          x={x}
                          y={y + 3}
                          fill="var(--sage)"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {label}
                        </text>
                      )
                    })}
                  </svg>
                </div>

                <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, fontSize: '0.78rem', color: 'var(--sage)', textAlign: 'center' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Acidity</span>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{scores.acidity}%</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Body</span>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{scores.body}%</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Sweetness</span>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{scores.sweetness}%</strong>
                  </div>
                </div>

              </div>

              {/* Right Column: Matched Recommendation */}
              <div style={{
                background: 'rgba(20,45,23,0.3)',
                border: '1px solid rgba(168,197,160,0.15)',
                borderRadius: 'var(--radius-xl)',
                padding: 32,
                backdropFilter: 'var(--glass-blur)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 20px 45px rgba(0,0,0,0.4)',
              }}>
                <div>
                  <span style={{ color: 'var(--mint)', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: 8 }}>
                    Quiz Recommendation
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#fff', margin: '0 0 12px 0' }}>
                    {matchedProduct.name}
                  </h3>
                  <span style={{ display: 'inline-block', background: 'rgba(123,196,127,0.15)', color: 'var(--mint)', border: '1px solid rgba(123,196,127,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>
                    {matchedProduct.badge}
                  </span>
                  
                  {/* Product card illustration */}
                  <div style={{ width: '100%', height: 160, borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <img
                      src={matchedProduct.imageUrl}
                      alt={matchedProduct.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--cream)', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                    {matchedProduct.description}
                  </p>
                  
                  <div style={{ fontSize: '0.82rem', color: 'var(--mint)', background: 'rgba(123,196,127,0.05)', borderLeft: '3px solid var(--mint)', padding: '8px 12px', borderRadius: 4 }}>
                    {matchedProduct.matchReason}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button
                    onClick={() => handleQuickAdd(matchedProduct)}
                    className="btn-primary"
                    style={{ flex: 1, padding: '14px' }}
                  >
                    {addedStatus[matchedProduct.id] ? '✓ Added!' : '🛒 Add to Cart'}
                  </button>
                  <button
                    onClick={resetQuiz}
                    className="btn-outline"
                    style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'var(--cream)', padding: '14px 20px', background: 'transparent' }}
                  >
                    🔄 Retake Quiz
                  </button>
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
