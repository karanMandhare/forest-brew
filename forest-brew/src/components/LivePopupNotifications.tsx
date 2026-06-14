'use client'

// ============================================================
//  LivePopupNotification — Real-time popup for new orders,
//  bookings, and delivery assignments. Used in Admin & Worker
//  dashboards via SSE.
// ============================================================

import { useEffect, useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// ── Types ────────────────────────────────────────────────────

interface BasePopup {
  id: string // unique key for AnimatePresence
  kind: 'order' | 'booking' | 'delivery'
  at: number  // timestamp for auto-dismiss
}

interface OrderPopup extends BasePopup {
  kind: 'order'
  orderId: string
  customerName?: string | null
  customerPhone?: string | null
  customerImage?: string | null
  orderType: string
  totalAmount: number
  tableNumber?: string | null
  deliveryAddress?: string | null
  itemCount: number
  firstItemName: string
  paymentMethod: string
}

interface BookingPopup extends BasePopup {
  kind: 'booking'
  reservationId: string
  customerName: string
  customerPhone?: string | null
  customerImage?: string | null
  date: string
  guestCount: number
  advancePaid: number
}

interface DeliveryPopup extends BasePopup {
  kind: 'delivery'
  orderId: string
  customerName?: string | null
  customerPhone?: string | null
  customerImage?: string | null
  deliveryAddress?: string | null
  totalAmount: number
  itemCount: number
  firstItemName: string
}

type Popup = OrderPopup | BookingPopup | DeliveryPopup

// ── Helpers ──────────────────────────────────────────────────

const formatPrice = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100)

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const initials = (name?: string | null) => {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_COLORS = ['#1b3f27', '#2d6a4f', '#4a8c3f', '#74c69d', '#b7e4c7']
const avatarColor = (name?: string | null) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

// ── Avatar Component ─────────────────────────────────────────

function Avatar({ image, name, size = 48 }: { image?: string | null; name?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', flexShrink: 0,
      background: avatarColor(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff',
      border: '2px solid rgba(255,255,255,0.25)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    }}>
      {image && !imgError ? (
        <img src={image} alt={name || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)} />
      ) : initials(name)}
    </div>
  )
}

// ── Popup Card ────────────────────────────────────────────────

function PopupCard({ popup, onDismiss }: { popup: Popup; onDismiss: (id: string) => void }) {
  const DURATION_MS = 8000
  const [progress, setProgress] = useState(100)
  const timerRef = useRef<any>(null)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const remaining = Math.max(0, 100 - (elapsed / DURATION_MS) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        onDismiss(popup.id)
      } else {
        timerRef.current = requestAnimationFrame(tick)
      }
    }
    timerRef.current = requestAnimationFrame(tick)
    return () => { if (timerRef.current) cancelAnimationFrame(timerRef.current) }
  }, [popup.id, onDismiss])

  const isOrder = popup.kind === 'order'
  const isBooking = popup.kind === 'booking'
  const isDelivery = popup.kind === 'delivery'

  const accentColor = isBooking ? '#7c3aed' : isDelivery ? '#d97706' : '#1b3f27'
  const bgGradient = isBooking
    ? 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(139,92,246,0.04) 100%)'
    : isDelivery
    ? 'linear-gradient(135deg, rgba(217,119,6,0.08) 0%, rgba(245,158,11,0.04) 100%)'
    : 'linear-gradient(135deg, rgba(27,63,39,0.08) 0%, rgba(74,140,63,0.04) 100%)'

  const icon = isBooking ? '🗓️' : isDelivery ? '🛵' : (popup as OrderPopup).orderType === 'DELIVERY' ? '🚗' : '☕'
  const label = isBooking ? 'New Table Booking' : isDelivery ? 'New Delivery Assigned' : 
    ((popup as OrderPopup).orderType === 'DELIVERY' ? 'New Delivery Order' : 'New Order')

  const customerName = isBooking ? (popup as BookingPopup).customerName : (popup as OrderPopup | DeliveryPopup).customerName
  const customerPhone = isBooking ? (popup as BookingPopup).customerPhone : (popup as OrderPopup | DeliveryPopup).customerPhone
  const customerImage = isBooking ? (popup as BookingPopup).customerImage : (popup as OrderPopup | DeliveryPopup).customerImage

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 380, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 380, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        width: 340,
        background: 'rgba(15, 23, 18, 0.97)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${accentColor}33`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: `0 8px 40px rgba(0,0,0,0.45), 0 0 0 1px ${accentColor}22`,
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={() => onDismiss(popup.id)}
    >
      {/* Header bar */}
      <div style={{ background: bgGradient, padding: '12px 14px', borderBottom: `1px solid ${accentColor}22`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: accentColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(popup.id) }}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 14px 10px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar image={customerImage} name={customerName} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {customerName || 'Guest Customer'}
          </div>
          {customerPhone && (
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              📞 {customerPhone}
            </div>
          )}

          {/* Order details */}
          {isOrder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
                🧾 {(popup as OrderPopup).itemCount} item{(popup as OrderPopup).itemCount !== 1 ? 's' : ''} · {(popup as OrderPopup).firstItemName}{(popup as OrderPopup).itemCount > 1 ? ' +more' : ''}
              </div>
              {(popup as OrderPopup).tableNumber && (
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>🪑 Table {(popup as OrderPopup).tableNumber}</div>
              )}
              {(popup as OrderPopup).deliveryAddress && (
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📍 {(popup as OrderPopup).deliveryAddress}
                </div>
              )}
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: accentColor }}>
                  {formatPrice((popup as OrderPopup).totalAmount)}
                </span>
                <span style={{ fontSize: '0.7rem', background: `${accentColor}22`, color: accentColor, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                  {(popup as OrderPopup).paymentMethod}
                </span>
              </div>
            </div>
          )}

          {/* Booking details */}
          {isBooking && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
                🗓️ {formatDate((popup as BookingPopup).date)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
                👥 {(popup as BookingPopup).guestCount} guest{(popup as BookingPopup).guestCount !== 1 ? 's' : ''}
              </div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: accentColor }}>
                  ₹{(popup as BookingPopup).advancePaid / 100} advance paid
                </span>
                <span style={{ fontSize: '0.7rem', background: `${accentColor}22`, color: accentColor, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                  BOOKING
                </span>
              </div>
            </div>
          )}

          {/* Delivery details */}
          {isDelivery && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
                🧾 {(popup as DeliveryPopup).itemCount} item{(popup as DeliveryPopup).itemCount !== 1 ? 's' : ''} · {(popup as DeliveryPopup).firstItemName}
              </div>
              {(popup as DeliveryPopup).deliveryAddress && (
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📍 {(popup as DeliveryPopup).deliveryAddress}
                </div>
              )}
              <span style={{ marginTop: 6, fontWeight: 800, fontSize: '1rem', color: accentColor }}>
                {formatPrice((popup as DeliveryPopup).totalAmount)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: `${accentColor}22` }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: accentColor,
          transition: 'width 0.1s linear',
          borderRadius: '0 2px 2px 0',
        }} />
      </div>
    </motion.div>
  )
}

// ── Sound ─────────────────────────────────────────────────────

function playPopupSound(kind: 'order' | 'booking' | 'delivery') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const freqs = kind === 'booking' ? [523, 659, 784] : kind === 'delivery' ? [440, 554, 659] : [659, 784, 988]
    let t = ctx.currentTime
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = f
      gain.gain.setValueAtTime(0, t + i * 0.1)
      gain.gain.linearRampToValueAtTime(0.07, t + i * 0.1 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25)
      osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.3)
    })
  } catch { /* silent */ }
}

// ── Main Hook & Provider ──────────────────────────────────────

export function useLivePopups() {
  const [popups, setPopups] = useState<Popup[]>([])

  const dismiss = useCallback((id: string) => {
    setPopups(prev => prev.filter(p => p.id !== id))
  }, [])

  const push = useCallback((popup: Popup) => {
    playPopupSound(popup.kind)
    setPopups(prev => {
      // Cap at 4 popups max
      const next = [...prev, popup]
      return next.slice(-4)
    })
    // Auto dismiss after 8s
    setTimeout(() => dismiss(popup.id), 8200)
  }, [dismiss])

  return { popups, push, dismiss }
}

// ── SSE-connected component ───────────────────────────────────

interface LivePopupProps {
  role: 'ADMIN' | 'DELIVERY'
}

export default function LivePopupNotifications({ role }: LivePopupProps) {
  const { popups, push, dismiss } = useLivePopups()
  const pushRef = useRef(push)
  useEffect(() => { pushRef.current = push }, [push])

  useEffect(() => {
    // SSE is already connected by the parent page, we listen on a shared event bus via BroadcastChannel
    // Instead, we re-use a global window event approach so admin/worker page can forward SSE events here
    const handler = (e: Event) => {
      const ev = e as CustomEvent
      const data = ev.detail
      if (!data) return

      if (data.type === 'new_order' && (role === 'ADMIN')) {
        const o = data.order
        pushRef.current({
          id: `order-${o.orderId}-${Date.now()}`,
          kind: 'order',
          at: Date.now(),
          orderId: o.orderId,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          customerImage: o.customerImage,
          orderType: o.orderType,
          totalAmount: o.totalAmount,
          tableNumber: o.tableNumber,
          deliveryAddress: o.deliveryAddress,
          itemCount: o.itemCount,
          firstItemName: o.firstItemName,
          paymentMethod: o.paymentMethod,
        })
      } else if (data.type === 'new_booking' && role === 'ADMIN') {
        const b = data.booking
        pushRef.current({
          id: `booking-${b.reservationId}-${Date.now()}`,
          kind: 'booking',
          at: Date.now(),
          reservationId: b.reservationId,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          customerImage: b.customerImage,
          date: b.date,
          guestCount: b.guestCount,
          advancePaid: b.advancePaid,
        })
      } else if (data.type === 'new_delivery_assigned') {
        const d = data.delivery
        pushRef.current({
          id: `delivery-${d.orderId}-${Date.now()}`,
          kind: 'delivery',
          at: Date.now(),
          orderId: d.orderId,
          customerName: d.customerName,
          customerPhone: d.customerPhone,
          customerImage: d.customerImage,
          deliveryAddress: d.deliveryAddress,
          totalAmount: d.totalAmount,
          itemCount: d.itemCount,
          firstItemName: d.firstItemName,
        })
      }
    }

    window.addEventListener('forest_brew_sse', handler)
    return () => window.removeEventListener('forest_brew_sse', handler)
  }, [role])

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: 12,
      alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      <AnimatePresence mode="popLayout">
        {popups.map(popup => (
          <div key={popup.id} style={{ pointerEvents: 'all' }}>
            <PopupCard popup={popup} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
