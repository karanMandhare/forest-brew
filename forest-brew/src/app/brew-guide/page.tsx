'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'

interface BrewMethod {
  id: string
  name: string
  icon: string
  defaultRatio: number
  recommendedRatio: string
  grindSize: string
  temp: string
  totalTime: number // in seconds
  description: string
  steps: Array<{
    name: string
    duration: number // in seconds
    instructions: string
    waterWeightRatio: number // proportion of total water at this stage
  }>
}

const BREW_METHODS: BrewMethod[] = [
  {
    id: 'pour-over',
    name: 'Pour-Over (V60)',
    icon: '☕',
    defaultRatio: 16, // 1:16
    recommendedRatio: '1:16 (Balanced)',
    grindSize: 'Medium-Coarse (Sea salt consistency)',
    temp: '93°C / 200°F',
    totalTime: 180,
    description: 'Brings out bright, floral, and clean notes. Best for Kenya AA or Canopy Pour-Over.',
    steps: [
      { name: 'Bloom Phase', duration: 45, instructions: 'Pour 3x coffee weight in water. Let the gas release (blooming).', waterWeightRatio: 0.15 },
      { name: 'First Pour', duration: 45, instructions: 'Pour slowly in circles from center outwards, wet all grounds.', waterWeightRatio: 0.55 },
      { name: 'Second Pour', duration: 45, instructions: 'Gently add the remaining water. Keep the filter bed level.', waterWeightRatio: 1.0 },
      { name: 'Final Drawdown', duration: 45, instructions: 'Let the water filter completely. Swirl once at the end.', waterWeightRatio: 1.0 }
    ]
  },
  {
    id: 'french-press',
    name: 'French Press',
    icon: '🥛',
    defaultRatio: 15, // 1:15
    recommendedRatio: '1:15 (Rich & Heavy)',
    grindSize: 'Coarse (Rock salt consistency)',
    temp: '95°C / 203°F',
    totalTime: 240,
    description: 'Creates a rich, full-bodied, and robust cup with natural oils preserved. Great for Forest Espresso beans.',
    steps: [
      { name: 'Wet & Stir', duration: 30, instructions: 'Pour half of the hot water. Stir gently for 5 seconds to wet all grounds.', waterWeightRatio: 0.5 },
      { name: 'The Steep', duration: 150, instructions: 'Pour remaining water, put plunger lid on (do not plunge!), and let steep.', waterWeightRatio: 1.0 },
      { name: 'The Crust Break', duration: 20, instructions: 'Remove lid, stir the top crust of grounds, and skim off foam.', waterWeightRatio: 1.0 },
      { name: 'Plunge & Pour', duration: 40, instructions: 'Put plunger back. Press down slowly with even weight. Pour immediately.', waterWeightRatio: 1.0 }
    ]
  },
  {
    id: 'aeropress',
    name: 'Aeropress',
    icon: '💉',
    defaultRatio: 12, // 1:12
    recommendedRatio: '1:12 (Syrupy & Bold)',
    grindSize: 'Medium-Fine (Table salt consistency)',
    temp: '88°C / 190°F',
    totalTime: 120,
    description: 'An extremely versatile brewer producing a clean, full-bodied cup with low acidity. Super customizable.',
    steps: [
      { name: 'The Wetting', duration: 20, instructions: 'Pour all water. Stir thoroughly for 10 seconds to saturate.', waterWeightRatio: 1.0 },
      { name: 'Steep Time', duration: 60, instructions: 'Insert the rubber plunger slightly to create a vacuum seal. Let sit.', waterWeightRatio: 1.0 },
      { name: 'The Swirl', duration: 10, instructions: 'Remove seal, swirl brewer gently in small circles.', waterWeightRatio: 1.0 },
      { name: 'The Press', duration: 30, instructions: 'Press down slowly with steady pressure until you hear a soft hiss.', waterWeightRatio: 1.0 }
    ]
  },
  {
    id: 'cold-brew',
    name: 'Cold Brew',
    icon: '🧊',
    defaultRatio: 8, // 1:8 (concentrate)
    recommendedRatio: '1:8 (Concentrate)',
    grindSize: 'Extra-Coarse (Breadcrumbs consistency)',
    temp: 'Cold Water (Room Temp)',
    totalTime: 300, // Speed run timer for simulator
    description: 'Smooth, sweet, and low-acid concentrate steeped over 18-24 hours. Best for Wildflower Cold Brew.',
    steps: [
      { name: 'Mix Coffee & Water', duration: 90, instructions: 'Saturate coffee with cold water. Stir key parts ensuring no dry spots.', waterWeightRatio: 1.0 },
      { name: 'Steeping Phase', duration: 120, instructions: 'For this timer we simulate the 18-hour steep in double-time. Keep at room temperature.', waterWeightRatio: 1.0 },
      { name: 'Filtration', duration: 90, instructions: 'Pour through a paper filter or mesh sleeve. Discard sediment. Bottle concentrate.', waterWeightRatio: 1.0 }
    ]
  }
]

export default function BrewAcademyPage() {
  const { data: session } = useSession()
  const [selectedMethod, setSelectedMethod] = useState<BrewMethod>(BREW_METHODS[0])
  const [coffeeWeight, setCoffeeWeight] = useState<number>(20) // grams
  const [ratio, setRatio] = useState<number>(selectedMethod.defaultRatio)
  
  // Timer States
  const [timerRunning, setTimerRunning] = useState(false)
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [timeLeftInStep, setTimeLeftInStep] = useState(selectedMethod.steps[0].duration)
  const [totalElapsedTime, setTotalElapsedTime] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const currentStep = selectedMethod.steps[currentStepIdx]
  const totalWater = coffeeWeight * ratio
  const currentWaterTarget = Math.round(totalWater * currentStep.waterWeightRatio)
  const totalDuration = selectedMethod.steps.reduce((sum, s) => sum + s.duration, 0)

  // Reset timer whenever brew method or weights change
  useEffect(() => {
    resetTimer()
    setRatio(selectedMethod.defaultRatio)
  }, [selectedMethod])

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeftInStep((prev) => {
          if (prev <= 1) {
            // Move to next step
            if (currentStepIdx < selectedMethod.steps.length - 1) {
              playChime()
              setCurrentStepIdx((idx) => idx + 1)
              setTotalElapsedTime((time) => time + 1)
              return selectedMethod.steps[currentStepIdx + 1].duration
            } else {
              // Timer Finished
              playCompletionChime()
              setTimerRunning(false)
              setCompleted(true)
              clearInterval(timerRef.current!)
              return 0
            }
          }
          setTotalElapsedTime((time) => time + 1)
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timerRunning, currentStepIdx, selectedMethod])

  const toggleTimer = () => {
    if (completed) {
      resetTimer()
    }
    setTimerRunning(!timerRunning)
  }

  const resetTimer = () => {
    setTimerRunning(false)
    setCurrentStepIdx(0)
    setTimeLeftInStep(selectedMethod.steps[0].duration)
    setTotalElapsedTime(0)
    setCompleted(false)
    setClaimSuccess(null)
  }

  // Web Audio API Synthesizer Chimes
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime) // E5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12) // A5
      
      gain.gain.setValueAtTime(0.0, audioCtx.currentTime)
      gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5)
      
      osc.start()
      osc.stop(audioCtx.currentTime + 0.5)
    } catch (e) {
      console.warn('Audio synthesis failed:', e)
    }
  }

  const playCompletionChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime) // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15) // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3) // G5
      osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.45) // C6
      
      gain.gain.setValueAtTime(0.0, audioCtx.currentTime)
      gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9)
      
      osc.start()
      osc.stop(audioCtx.currentTime + 0.9)
    } catch (e) {
      console.warn('Audio synthesis failed:', e)
    }
  }

  // Claim Quest rewards badge
  const handleClaimBadge = async () => {
    if (!session?.user) return
    setClaiming(true)
    setClaimSuccess(null)
    try {
      const res = await fetch('/api/user/claim-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId: 'brew-master' })
      })
      const data = await res.json()
      if (res.ok) {
        setClaimSuccess(`🎉 Badge Claimed! +${data.points} Stars added to your account.`)
      } else {
        setClaimSuccess(data.error || 'Failed to claim badge.')
      }
    } catch {
      setClaimSuccess('Network connection error.')
    } finally {
      setClaiming(false)
    }
  }

  // Progress metrics
  const stepProgress = ((currentStep.duration - timeLeftInStep) / currentStep.duration) * 100
  const overallProgress = (totalElapsedTime / totalDuration) * 100

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)', padding: '120px 24px 80px', color: 'var(--cream)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ color: 'var(--mint)', fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 800 }}>
            Coffee Academy
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: '#fff', marginTop: 8 }}>
            Brewing Guide & Academy
          </h1>
          <p style={{ color: 'var(--sage)', maxWidth: 600, margin: '12px auto 0', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Master the art of handcrafted single-origins. Calculate golden ratios, configure parameters, and run our step-by-step visual brewing timer.
          </p>
        </div>

        {/* Method Select Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
          {BREW_METHODS.map((method) => {
            const isSelected = selectedMethod.id === method.id
            return (
              <motion.button
                key={method.id}
                onClick={() => setSelectedMethod(method)}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: isSelected ? 'var(--forest)' : 'rgba(255,255,255,0.03)',
                  border: isSelected ? '1px solid var(--mint)' : '1px solid rgba(168,197,160,0.12)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px 16px',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: isSelected ? '0 12px 24px rgba(27,63,39,0.3)' : 'none',
                  transition: 'background 0.3s, border 0.3s'
                }}
              >
                <span style={{ fontSize: '2.5rem' }}>{method.icon}</span>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>{method.name}</h4>
                  <span style={{ fontSize: '0.72rem', color: isSelected ? 'var(--mint)' : 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {method.recommendedRatio}
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Main Interface Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 32 }} className="checkout-layout">
          
          {/* Ratio Calculator Column */}
          <div style={{
            background: 'rgba(20,45,23,0.3)',
            border: '1px solid rgba(168,197,160,0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            backdropFilter: 'var(--glass-blur)',
            display: 'flex',
            flexDirection: 'column',
            gap: 28
          }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--mint)', fontSize: '1.4rem', margin: '0 0 8px 0' }}>
                🧮 Ratio Calculator
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--sage)', margin: 0, lineHeight: 1.4 }}>
                {selectedMethod.description}
              </p>
            </div>

            {/* Coffee Weight Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sage)' }}>Coffee Grounds</span>
                <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{coffeeWeight}g</strong>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                value={coffeeWeight}
                onChange={(e) => setCoffeeWeight(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--mint)',
                  background: 'rgba(255,255,255,0.06)',
                  height: 6,
                  borderRadius: 3,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-soft)', marginTop: 4 }}>
                <span>10g (Single cup)</span>
                <span>80g (Large pot)</span>
              </div>
            </div>

            {/* Ratio Selection Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sage)' }}>Water Ratio</span>
                <strong style={{ fontSize: '1.2rem', color: '#fff' }}>1 : {ratio}</strong>
              </div>
              <input
                type="range"
                min="10"
                max="20"
                value={ratio}
                onChange={(e) => setRatio(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--mint)',
                  background: 'rgba(255,255,255,0.06)',
                  height: 6,
                  borderRadius: 3,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-soft)', marginTop: 4 }}>
                <span>1:10 (Strong/Conc)</span>
                <span>1:20 (Delicate/Light)</span>
              </div>
            </div>

            {/* Output Panel */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', marginBottom: 2 }}>Target Water</span>
                <strong style={{ fontSize: '1.3rem', color: 'var(--mint)' }}>{totalWater.toFixed(0)}g / ml</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', marginBottom: 2 }}>Yield Output</span>
                <strong style={{ fontSize: '1.3rem', color: 'var(--cream)' }}>
                  ~{Math.round(totalWater * 0.88)} ml ({(totalWater * 0.88 / 240).toFixed(1)} Cups)
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', marginBottom: 2 }}>Grind Setting</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', display: 'block', marginTop: 2 }}>{selectedMethod.grindSize}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', marginBottom: 2 }}>Water Temp</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', display: 'block', marginTop: 2 }}>{selectedMethod.temp}</span>
              </div>
            </div>

            {/* Brewing Tips */}
            <div style={{ fontSize: '0.8rem', color: 'var(--sage)', lineHeight: 1.4, borderLeft: '2px solid var(--mint)', paddingLeft: 12 }}>
              <strong>💡 Pro Tip:</strong> Pre-rinse your paper filters with hot water to wash away paper residue and pre-heat your mug/vessel.
            </div>
          </div>

          {/* Active Brew Timer Column */}
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
            position: 'relative',
            overflow: 'hidden'
          }}>
            
            {/* Background glowing circle */}
            <div style={{
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: timerRunning ? 'radial-gradient(circle, rgba(74,140,63,0.15) 0%, transparent 70%)' : 'none',
              zIndex: 1,
              pointerEvents: 'none'
            }} />

            <div style={{ zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ color: 'var(--mint)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 24 }}>
                Active Brew Session
              </span>

              {/* Circular Timer Display */}
              <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Background Track */}
                  <circle cx="110" cy="110" r="95" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  {/* Step Progress Track */}
                  <motion.circle
                    cx="110" cy="110" r="95" fill="none" stroke="var(--mint)" strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 95}
                    animate={{ strokeDashoffset: (2 * Math.PI * 95) * (1 - stepProgress / 100) }}
                    transition={{ ease: 'linear', duration: 0.5 }}
                  />
                  {/* Overall Session Track */}
                  <circle cx="110" cy="110" r="102" fill="none" stroke="rgba(168,197,160,0.15)" strokeWidth="2" strokeDasharray="3, 3" />
                </svg>

                {/* Numeric Clock Inside */}
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1, color: '#fff' }}>
                    {Math.floor(timeLeftInStep / 60)}:{String(timeLeftInStep % 60).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
                    Step {currentStepIdx + 1} of {selectedMethod.steps.length}
                  </div>
                </div>
              </div>

              {/* Current Step Description Card */}
              <div style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 'var(--radius-lg)',
                padding: 20,
                textAlign: 'center',
                marginBottom: 28,
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 8
              }}>
                <h4 style={{ color: 'var(--mint)', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  {currentStep.name}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--cream)', margin: 0, lineHeight: 1.5 }}>
                  {currentStep.instructions}
                </p>
                <div style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>
                  Target scale reading: <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{currentWaterTarget}g</strong> water
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: 16 }}>
                <button
                  onClick={toggleTimer}
                  style={{
                    background: timerRunning ? '#f44336' : 'var(--mint)',
                    color: timerRunning ? '#fff' : '#071208',
                    border: 'none',
                    borderRadius: '30px',
                    padding: '14px 32px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    minWidth: 140,
                    transition: 'all 0.2s',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                  }}
                >
                  {completed ? '🔄 Restart' : timerRunning ? '⏸️ Pause' : '▶️ Start Brewing'}
                </button>
                <button
                  onClick={resetTimer}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--cream)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '30px',
                    padding: '14px 24px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ⏮️ Reset
                </button>
              </div>

              {/* Overall Progress Bar */}
              <div style={{ width: '100%', marginTop: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-soft)', marginBottom: 6 }}>
                  <span>Total Progress</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    style={{ background: 'var(--mint)', height: '100%', width: 0 }}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Completion Reward Quest Card */}
              <AnimatePresence>
                {completed && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    style={{
                      marginTop: 28,
                      width: '100%',
                      background: 'linear-gradient(135deg, rgba(27,63,39,0.9), rgba(13,148,136,0.9))',
                      border: '1px solid var(--mint)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 20,
                      textAlign: 'center',
                      boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: 8 }}>🏆</span>
                    <h5 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#fff', margin: '0 0 6px 0', fontWeight: 700 }}>
                      Brew Session Complete!
                    </h5>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                      Congratulations on completing the brew process. Claim your "Brew Master" badge and reward stars!
                    </p>

                    {session?.user ? (
                      claimSuccess ? (
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--mint)' }}>{claimSuccess}</div>
                      ) : (
                        <button
                          onClick={handleClaimBadge}
                          disabled={claiming}
                          className="btn-primary"
                          style={{
                            background: '#fff',
                            color: 'var(--forest)',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '30px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {claiming ? 'Claiming...' : 'Claim 50 Bonus Stars'}
                        </button>
                      )
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                        Sign in to claim points & badge rewards for your profile.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
