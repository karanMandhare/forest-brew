'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
}

interface TableMapItem {
  id: string
  name: string
  seats: number
  description: string
  zone: 'Greenhouse' | 'Sunken Garden' | 'Canopy Nest'
  cx: number
  cy: number
  r: number
  type: 'circle' | 'rect'
  width?: number
  height?: number
}

// 12 tables mapped on our 400x200 visual SVG cafe canvas
const CAFE_TABLES: TableMapItem[] = [
  // Greenhouse Zone (Left, near windows, botanical)
  { id: '1', name: 'Table 1', seats: 2, description: 'Window-side small table surrounded by ferns.', zone: 'Greenhouse', cx: 50, cy: 50, r: 16, type: 'circle' },
  { id: '2', name: 'Table 2', seats: 2, description: 'Window-side table next to orchid shelf.', zone: 'Greenhouse', cx: 50, cy: 110, r: 16, type: 'circle' },
  { id: '3', name: 'Table 3', seats: 4, description: 'Corner 4-seater dining booth under ivy hangings.', zone: 'Greenhouse', cx: 40, cy: 155, r: 0, type: 'rect', width: 44, height: 32 },
  
  // Sunken Garden Zone (Middle, centered around a moss pool / fireplace)
  { id: '5', name: 'Table 5', seats: 2, description: 'Couples table right next to the central moss garden.', zone: 'Sunken Garden', cx: 160, cy: 50, r: 16, type: 'circle' },
  { id: '6', name: 'Table 6', seats: 4, description: 'Fireside cozy round table with velvet armchairs.', zone: 'Sunken Garden', cx: 220, cy: 50, r: 20, type: 'circle' },
  { id: '7', name: 'Table 7', seats: 4, description: 'Garden-center wooden dining table near stream path.', zone: 'Sunken Garden', cx: 160, cy: 110, r: 0, type: 'rect', width: 40, height: 30 },
  { id: '8', name: 'Table 8', seats: 6, description: 'Family sizing table underneath the giant bonsai.', zone: 'Sunken Garden', cx: 200, cy: 160, r: 0, type: 'rect', width: 56, height: 32 },

  // Canopy Nest Zone (Right, quiet study desks / high bar tables)
  { id: '9', name: 'Table 9', seats: 2, description: 'Quiet alcove study desk with private reading lamp.', zone: 'Canopy Nest', cx: 330, cy: 50, r: 16, type: 'circle' },
  { id: '10', name: 'Table 10', seats: 2, description: 'Workstation desk equipped with dual USB sockets.', zone: 'Canopy Nest', cx: 330, cy: 110, r: 16, type: 'circle' },
  { id: '11', name: 'Table 11', seats: 4, description: 'High-top collaboration table with tall barstools.', zone: 'Canopy Nest', cx: 310, cy: 155, r: 0, type: 'rect', width: 48, height: 30 }
]

export function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', phone: '', date: '', time: '', guests: '', tableNumber: ''
  })

  // Dynamic Occupancy State
  const [occupiedTables, setOccupiedTables] = useState<string[]>([])
  const [checkingOccupied, setCheckingOccupied] = useState(false)

  // Set form defaults when session details are available
  useEffect(() => {
    if (!session?.user) return
    setForm(f => ({
      ...f,
      name: session.user?.name || '',
      email: session.user?.email || '',
    }))
  }, [session])

  // Fetch wallet balance when modal is open
  useEffect(() => {
    if (!isOpen || sessionStatus !== 'authenticated') return

    setLoadingBalance(true)
    setErrorMessage('')
    fetch('/api/user/profile')
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve profile balance')
        return res.json()
      })
      .then(data => {
        if (data && data.user) {
          setWalletBalance(data.user.walletBalance)
        }
      })
      .catch(err => {
        console.error(err)
        setErrorMessage('Could not load wallet balance. Please refresh.')
      })
      .finally(() => {
        setLoadingBalance(false)
      })
  }, [isOpen, sessionStatus])

  // Fetch occupied tables when date & time changes
  useEffect(() => {
    if (!form.date || !form.time) {
      setOccupiedTables([])
      return
    }

    setCheckingOccupied(true)
    const datetime = `${form.date}T${form.time}:00.000Z`
    
    fetch(`/api/reservations/check-availability?date=${encodeURIComponent(datetime)}`)
      .then(res => {
        if (res.ok) return res.json()
        throw new Error('Failed check')
      })
      .then(data => {
        setOccupiedTables(data.occupied || [])
        // Reset table selection if it becomes occupied
        if (form.tableNumber && data.occupied.includes(form.tableNumber)) {
          setForm(f => ({ ...f, tableNumber: '' }))
        }
      })
      .catch(err => {
        console.error('Error fetching table occupancy:', err)
      })
      .finally(() => {
        setCheckingOccupied(false)
      })
  }, [form.date, form.time])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionStatus !== 'authenticated') {
      setErrorMessage('Please log in first.')
      return
    }

    if (!form.tableNumber) {
      setErrorMessage('Please select a table on the floor plan map.')
      return
    }

    // Verify guest count fits table capacity
    const selectedTableObj = CAFE_TABLES.find(t => t.id === form.tableNumber)
    const currentGuests = parseInt(form.guests)
    if (selectedTableObj && currentGuests > selectedTableObj.seats) {
      setErrorMessage(`Table ${selectedTableObj.name} only fits up to ${selectedTableObj.seats} people. Please select a larger table.`)
      return
    }

    if (walletBalance === null || walletBalance < 30000) {
      setErrorMessage('Insufficient wallet balance (₹300.00 required).')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name,
          email: form.email,
          phone: form.phone,
          date: `${form.date}T${form.time}:00.000Z`,
          guestCount: currentGuests,
          tableNumber: form.tableNumber,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit booking')
      }

      setStatus('success')
      setTimeout(() => {
        onClose()
        setStatus('idle')
        setForm({ name: '', email: '', phone: '', date: '', time: '', guests: '', tableNumber: '' })
      }, 3000)
    } catch (err: any) {
      setStatus('idle')
      setErrorMessage(err.message || 'Something went wrong. Please try again.')
    }
  }

  const hasInsufficientBalance = walletBalance !== null && walletBalance < 30000
  const selectedTableDetails = CAFE_TABLES.find(t => t.id === form.tableNumber)

  return (
    <motion.div
      className="booking-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16
      }}
    >
      <motion.div
        className="booking-modal"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        style={{
          background: 'rgba(15, 34, 18, 0.95)',
          border: '1px solid rgba(168, 197, 160, 0.25)',
          borderRadius: 'var(--radius-xl)',
          padding: 28,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: 'var(--cream)',
          position: 'relative',
          maxWidth: 720,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', color: 'var(--sage)',
            fontSize: '1.2rem', cursor: 'pointer', outline: 'none'
          }}
        >
          ✕
        </button>

        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '40px 0' }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🌿</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--mint)', marginBottom: 12 }}>Booking Request Sent!</h3>
            <p style={{ color: 'var(--sage)', maxWidth: 450, margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Your table selection <strong>{selectedTableDetails?.name}</strong> has been submitted. The ₹300.00 advance has been held. Check your email for validation shortly!
            </p>
          </motion.div>
        ) : sessionStatus === 'loading' ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)', fontSize: '1.1rem' }}>
            ⏳ Loading authorization...
          </div>
        ) : sessionStatus !== 'authenticated' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔒</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#fff', marginBottom: 12 }}>Sign In Required</h3>
            <p style={{ color: 'var(--sage)', marginBottom: 24, fontSize: '0.9rem', lineHeight: 1.5 }}>
              To book a visual table under the canopy, please sign in. A refundable advance booking payment of ₹300.00 is required (Total price ₹750.00).
            </p>
            <button
              className="btn-primary"
              onClick={() => {
                onClose()
                router.push('/auth/login')
              }}
              style={{ width: '100%', maxWidth: 280 }}
            >
              Sign In / Register
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#fff', marginBottom: 4 }}>Visual Table Reservation</h3>
            <p style={{ color: 'var(--sage)', fontSize: '0.85rem', marginBottom: 20 }}>Select date, time, and click on an available table in the floor plan.</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Form Grid Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24 }} className="checkout-layout">
                
                {/* Inputs Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(168,197,160,0.15)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none' }}
                    type="text"
                    placeholder="Your Name"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                  <input
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(168,197,160,0.15)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none' }}
                    type="email"
                    placeholder="Email Address"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                  <input
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(168,197,160,0.15)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none' }}
                    type="tel"
                    placeholder="Phone Number"
                    required
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(168,197,160,0.15)', borderRadius: 'var(--radius-md)', padding: '10px 10px', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
                      type="date"
                      required
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <input
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(168,197,160,0.15)', borderRadius: 'var(--radius-md)', padding: '10px 10px', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
                      type="time"
                      required
                      value={form.time}
                      onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    />
                  </div>
                  <select
                    style={{ background: 'rgba(15, 34, 18, 0.95)', border: '1px solid rgba(168,197,160,0.15)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none' }}
                    required
                    value={form.guests}
                    onChange={e => setForm(f => ({ ...f, guests: e.target.value }))}
                  >
                    <option value="">Select Guest Count</option>
                    <option value="1">1 Person</option>
                    <option value="2">2 People</option>
                    <option value="3">3 People</option>
                    <option value="4">4 People</option>
                    <option value="5">5+ People</option>
                  </select>

                  {/* Wallet Info Box */}
                  <div style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, fontSize: '0.78rem', color: 'var(--sage)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span>Advance Required:</span>
                      <strong style={{ color: '#fff' }}>₹300.00</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span>Wallet Balance:</span>
                      {loadingBalance ? (
                        <span>Loading...</span>
                      ) : walletBalance !== null ? (
                        <span style={{ fontWeight: 700, color: hasInsufficientBalance ? '#ef5350' : '#7bc47f' }}>
                          ₹{(walletBalance / 100).toFixed(2)}
                        </span>
                      ) : (
                        <span>Offline</span>
                      )}
                    </div>
                    {hasInsufficientBalance && (
                      <span style={{ color: '#ef5350', fontSize: '0.72rem', display: 'block', marginTop: 4 }}>
                        ⚠️ Low balance. Reload wallet first.
                      </span>
                    )}
                  </div>
                </div>

                {/* SVG Seating Map Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--mint)', fontWeight: 700 }}>Interactive Seating Map</span>
                    {checkingOccupied && <span style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>Checking vacancies...</span>}
                  </div>

                  {/* Floor Plan Container */}
                  <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: '1.5px solid rgba(168,197,160,0.15)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 8,
                    position: 'relative'
                  }}>
                    {/* SVG Seating Layout */}
                    <svg viewBox="0 0 380 200" width="100%" height="100%" style={{ overflow: 'visible' }}>
                      {/* Map Boundaries / Zones */}
                      {/* Greenhouse Zone */}
                      <rect x="5" y="5" width="110" height="190" fill="rgba(123,196,127,0.02)" stroke="rgba(123,196,127,0.06)" strokeWidth="1" rx="8" />
                      <text x="60" y="20" fill="rgba(123,196,127,0.4)" fontSize="8" textAnchor="middle" fontWeight="bold">GREENHOUSE</text>
                      
                      {/* Sunken Garden Zone */}
                      <rect x="125" y="5" width="130" height="190" fill="rgba(74,140,63,0.02)" stroke="rgba(74,140,63,0.06)" strokeWidth="1" rx="8" />
                      <text x="190" y="20" fill="rgba(74,140,63,0.4)" fontSize="8" textAnchor="middle" fontWeight="bold">SUNKEN GARDEN</text>
                      
                      {/* Canopy Nest Zone */}
                      <rect x="265" y="5" width="110" height="190" fill="rgba(255,183,77,0.02)" stroke="rgba(255,183,77,0.06)" strokeWidth="1" rx="8" />
                      <text x="320" y="20" fill="rgba(255,183,77,0.4)" fontSize="8" textAnchor="middle" fontWeight="bold">CANOPY ALCOVE</text>

                      {/* Map elements */}
                      {CAFE_TABLES.map((table) => {
                        const isOccupied = occupiedTables.includes(table.id)
                        const isSelected = form.tableNumber === table.id
                        
                        // Select color scheme
                        let baseColor = 'rgba(168,197,160,0.15)' // Default available
                        let strokeColor = 'rgba(168,197,160,0.4)'
                        if (table.zone === 'Greenhouse') {
                          baseColor = isSelected ? 'var(--mint)' : isOccupied ? 'rgba(239,83,80,0.05)' : 'rgba(123,196,127,0.15)'
                          strokeColor = isSelected ? '#fff' : isOccupied ? 'rgba(239,83,80,0.3)' : 'rgba(123,196,127,0.5)'
                        } else if (table.zone === 'Sunken Garden') {
                          baseColor = isSelected ? 'var(--mint)' : isOccupied ? 'rgba(239,83,80,0.05)' : 'rgba(74,140,63,0.15)'
                          strokeColor = isSelected ? '#fff' : isOccupied ? 'rgba(239,83,80,0.3)' : 'rgba(74,140,63,0.5)'
                        } else if (table.zone === 'Canopy Nest') {
                          baseColor = isSelected ? 'var(--mint)' : isOccupied ? 'rgba(239,83,80,0.05)' : 'rgba(255,183,77,0.1)'
                          strokeColor = isSelected ? '#fff' : isOccupied ? 'rgba(239,83,80,0.3)' : 'rgba(255,183,77,0.4)'
                        }

                        if (isOccupied && !isSelected) {
                          baseColor = 'rgba(50,20,20,0.3)'
                          strokeColor = 'rgba(239,83,80,0.35)'
                        }

                        const handleClick = () => {
                          if (isOccupied) return
                          setForm(f => ({ ...f, tableNumber: table.id }))
                          setErrorMessage('')
                        }

                        return (
                          <g key={table.id} onClick={handleClick} style={{ cursor: isOccupied ? 'not-allowed' : 'pointer' }}>
                            {table.type === 'circle' ? (
                              <circle
                                cx={table.cx}
                                cy={table.cy}
                                r={table.r}
                                fill={baseColor}
                                stroke={strokeColor}
                                strokeWidth={isSelected ? 2 : 1}
                                style={{ transition: 'all 0.25s' }}
                              />
                            ) : (
                              <rect
                                x={table.cx}
                                y={table.cy}
                                width={table.width || 30}
                                height={table.height || 30}
                                rx="4"
                                fill={baseColor}
                                stroke={strokeColor}
                                strokeWidth={isSelected ? 2 : 1}
                                style={{ transition: 'all 0.25s' }}
                              />
                            )}
                            
                            {/* Table Label */}
                            <text
                              x={table.type === 'circle' ? table.cx : table.cx + (table.width || 30) / 2}
                              y={table.type === 'circle' ? table.cy + 3 : table.cy + (table.height || 30) / 2 + 3}
                              fill={isSelected ? '#0f2212' : isOccupied ? 'rgba(255,255,255,0.18)' : '#fff'}
                              fontSize="8"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              T{table.id}
                            </text>
                            
                            {/* Visual Cross over occupied */}
                            {isOccupied && (
                              <line
                                x1={table.type === 'circle' ? table.cx - table.r : table.cx}
                                y1={table.type === 'circle' ? table.cy - table.r : table.cy}
                                x2={table.type === 'circle' ? table.cx + table.r : table.cx + (table.width || 30)}
                                y2={table.type === 'circle' ? table.cy + table.r : table.cy + (table.height || 30)}
                                stroke="rgba(239,83,80,0.5)"
                                strokeWidth="1.5"
                              />
                            )}
                          </g>
                        )
                      })}
                    </svg>

                    {/* Zone legends */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-soft)', marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgba(123,196,127,0.6)' }} />
                        Greenhouse
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgba(74,140,63,0.6)' }} />
                        Garden
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,183,77,0.6)' }} />
                        Alcove
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgba(239,83,80,0.6)' }} />
                        Occupied
                      </span>
                    </div>
                  </div>

                  {/* Chosen Table Details card */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    fontSize: '0.78rem',
                    minHeight: 52,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 2
                  }}>
                    {selectedTableDetails ? (
                      <>
                        <div style={{ color: 'var(--mint)', fontWeight: 700 }}>
                          {selectedTableDetails.name} Selected ({selectedTableDetails.zone} Zone)
                        </div>
                        <div style={{ color: 'var(--cream)', fontSize: '0.72rem' }}>
                          Fits {selectedTableDetails.seats} people max · {selectedTableDetails.description}
                        </div>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>
                        Click a numbered table above to select it...
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {errorMessage && (
                <div style={{ color: '#ef5350', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              {hasInsufficientBalance ? (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', background: '#c53030', border: '1px solid #e53e3e', color: '#fff' }}
                  onClick={() => {
                    onClose()
                    router.push('/profile?tab=wallet')
                  }}
                >
                  💳 Top Up Wallet
                </button>
              ) : (
                <motion.button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%' }}
                  disabled={status === 'loading' || loadingBalance || walletBalance === null || !form.tableNumber}
                  whileTap={{ scale: 0.98 }}
                >
                  {status === 'loading' ? '⏳ Requesting Table...' : '🌸 Pay ₹300 & Confirm Reservation'}
                </motion.button>
              )}

            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
