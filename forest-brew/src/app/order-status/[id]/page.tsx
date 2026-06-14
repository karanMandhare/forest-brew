'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice } from '@/types'

export default function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params)
  const [order, setOrder] = useState<any>(null)
  const [status, setStatus] = useState<string>('PENDING')
  const [error, setError] = useState<string>('')
  const [connecting, setConnecting] = useState(true)
  const [notificationPermission, setNotificationPermission] = useState<string>('default')
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [etaProgress, setEtaProgress] = useState<number>(0)

  // Feedback states
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackComments, setFeedbackComments] = useState('')
  const [feedbackType, setFeedbackType] = useState<'ORDER' | 'COMPLAINT'>('ORDER')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  // Quick support states
  const [supportComments, setSupportComments] = useState('')
  const [supportSubmitted, setSupportSubmitted] = useState(false)
  const [supportLoading, setSupportLoading] = useState(false)

  // Cancellation states
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const handleCancelOrder = async () => {
    setCancelling(true)
    setCancelError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel order')
      }
      setStatus('CANCELLED')
      setShowCancelConfirm(false)
    } catch (err: any) {
      console.error(err)
      setCancelError(err.message || 'Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedbackLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          rating: feedbackRating,
          comments: feedbackComments,
          type: feedbackType
        })
      })
      if (res.ok) {
        setFeedbackSubmitted(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setFeedbackLoading(false)
    }
  }

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSupportLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          rating: 1,
          comments: supportComments,
          type: 'COMPLAINT'
        })
      })
      if (res.ok) {
        setSupportSubmitted(true)
        setSupportComments('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSupportLoading(false)
    }
  }

  const playChime = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, start)
        gain.gain.setValueAtTime(0.15, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
        osc.start(start)
        osc.stop(start + duration)
      }
      const now = audioContext.currentTime
      playTone(523.25, now, 0.4) // C5
      playTone(659.25, now + 0.15, 0.6) // E5
    } catch (e) {
      console.error('Audio play error:', e)
    }
  }

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
    }

    // Inject Leaflet CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    if ((window as any).L) {
      setLeafletLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!order || !order.estimatedTime) {
      setTimeLeft(null)
      return
    }
    if (status !== 'ASSIGNED' && status !== 'BREWING') {
      setTimeLeft(null)
      return
    }

    const startTimeStr = order.preparingAt || order.acceptedAt || order.assignedAt || order.createdAt
    if (!startTimeStr) return

    const startMs = new Date(startTimeStr).getTime()
    const targetMs = startMs + order.estimatedTime * 60 * 1000

    const updateTimer = () => {
      const now = Date.now()
      const diff = Math.max(0, Math.floor((targetMs - now) / 1000))
      setTimeLeft(diff)

      const totalDurationMs = order.estimatedTime * 60 * 1000
      const elapsedMs = now - startMs
      const progress = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)))
      setEtaProgress(progress)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [order, status])

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  const getSteps = () => {
    const isDelivery = order?.orderType === 'DELIVERY'
    return [
      { key: 'RECEIVED',  label: 'Approved',    emoji: '📝', desc: 'Order received and approved by barista', time: order?.acceptedAt },
      { key: 'ASSIGNED',  label: 'Assigned',    emoji: '👤', desc: isDelivery ? 'Delivery worker assigned' : 'Barista worker assigned', time: order?.assignedAt },
      { key: 'BREWING',   label: 'Brewing',     emoji: '☕', desc: 'Crafting your perfect cup', time: order?.preparingAt },
      { key: 'READY',     label: isDelivery ? 'Out for Delivery' : 'Ready',       emoji: isDelivery ? '🚗' : '✨', desc: isDelivery ? 'Out for delivery to your address' : 'Ready at the pick-up counter', time: order?.readyAt },
      { key: 'DELIVERED', label: isDelivery ? 'Delivered' : 'Completed',   emoji: isDelivery ? '🏡' : '🌿', desc: isDelivery ? 'Delivered to your doorstep' : 'Enjoy your forest morning!', time: order?.deliveredAt },
    ]
  }

  const steps = getSteps()

  const getStepIndex = (currentStatus: string) => {
    if (currentStatus === 'CANCELLED' || currentStatus === 'PENDING') return -1
    let statusKey = currentStatus
    if (statusKey === 'OUT_FOR_DELIVERY') statusKey = 'READY'
    return steps.findIndex(step => step.key === statusKey)
  }

  useEffect(() => {
    if (!order || order.orderType !== 'DELIVERY' || !leafletLoaded) return
    if (!order.latitude || !order.longitude) return

    const L = (window as any).L
    if (!L) return

    // Introduce a brief timeout to make sure map element is rendered in DOM
    const mapTimeout = setTimeout(() => {
      const mapContainer = document.getElementById('tracking-map')
      if (!mapContainer) return

      const map = L.map('tracking-map').setView([order.latitude, order.longitude], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      L.marker([order.latitude, order.longitude]).addTo(map)
        .bindPopup('Your Delivery Spot')
        .openPopup()

      return () => {
        map.remove()
      }
    }, 100)

    return () => clearTimeout(mapTimeout)
  }, [order, leafletLoaded])

  const triggerNotification = (newStatus: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      let title = 'Forest Brew Update'
      let body = 'Your order status has changed.'
      if (newStatus === 'BREWING') {
        title = '☕ Brewing started!'
        body = 'Our barista has started crafting your perfect cup.'
      } else if (newStatus === 'ASSIGNED') {
        title = '👤 Barista Assigned'
        body = order?.orderType === 'DELIVERY' ? 'A delivery agent has been assigned to your order.' : 'A barista is preparing your order.'
      } else if (newStatus === 'READY') {
        title = order?.orderType === 'DELIVERY' ? '🚗 Order is Out for Delivery!' : '✨ Order ready!'
        body = order?.orderType === 'DELIVERY' ? 'Your order is on the way to your doorstep!' : 'Your order is hot and ready at the pick-up counter!'
      } else if (newStatus === 'DELIVERED') {
        title = order?.orderType === 'DELIVERY' ? '🏡 Order Delivered!' : '🌿 Enjoy your coffee!'
        body = 'Order completed. Thank you for choosing Forest Brew.'
      } else if (newStatus === 'CANCELLED') {
        title = '❌ Order cancelled'
        body = 'Your order has been cancelled.'
      }
      try {
        new Notification(title, { body })
      } catch (err) {
        console.error('Error displaying notification:', err)
      }
    }
  }

  useEffect(() => {
    let eventSource: EventSource | null = null
    let active = true
    let retryTimeout: NodeJS.Timeout | null = null

    function connect() {
      if (!active) return
      setConnecting(true)
      
      eventSource = new EventSource(`/api/orders/${orderId}/status`, { withCredentials: true })

      eventSource.onmessage = (event) => {
        if (!active) return
        setConnecting(false)
        try {
          const data = JSON.parse(event.data)
          if (data.error) {
            setError(data.error)
            eventSource?.close()
            return
          }

          if (data.type === 'status') {
            setOrder(data.order)
            setStatus(data.order.status)
            if (data.order.status === 'READY') {
              setShowAlert(true)
            }
          } else if (data.type === 'status_update') {
            setStatus(data.status)
            if (data.order) {
              setOrder(data.order)
            }
            triggerNotification(data.status)
            if (data.status === 'READY') {
              setShowAlert(true)
              playChime()
            }
            if (data.status === 'DELIVERED' || data.status === 'CANCELLED') {
              eventSource?.close()
            }
          } else if (data.type === 'ping') {
            if (data.status === 'READY') {
              setShowAlert(false)
              setTimeout(() => setShowAlert(true), 50)
              playChime()
            }
          }
        } catch (err) {
          console.error('Failed to parse SSE data:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.warn('SSE connection closed or failed, attempting reconnect in 3s...')
        setConnecting(false)
        eventSource?.close()
        
        if (active) {
          retryTimeout = setTimeout(() => {
            connect()
          }, 3000)
        }
      }
    }

    connect()

    return () => {
      active = false
      if (eventSource) eventSource.close()
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const formatCustomization = (customization: any) => {
    if (!customization) return ''

    const hasFood = customization.foodWarming !== undefined || customization.foodSize !== undefined || customization.foodAddons !== undefined
    const hasDrink = customization.milk !== undefined || customization.syrups !== undefined || customization.temperature !== undefined || customization.size !== undefined

    if (hasFood && hasDrink) {
      const foodParts: string[] = []
      if (customization.foodSize) {
        foodParts.push(`Size: ${customization.foodSize === 'large' ? 'LARGE' : 'REGULAR'}`)
      }
      if (customization.foodWarming) {
        foodParts.push(customization.foodWarming === 'warmed' ? 'Warm & Toasted' : 'Served Cold')
      }
      if (customization.foodAddons && Array.isArray(customization.foodAddons) && customization.foodAddons.length > 0) {
        const addonLabels: Record<string, string> = {
          extra_cheese: 'Extra Cheese',
          gluten_free: 'Gluten-Free Bun',
        }
        const addons = customization.foodAddons.map((addon: string) => addonLabels[addon] || addon)
        foodParts.push(`Add-ons: ${addons.join(', ')}`)
      }

      const drinkParts: string[] = []
      if (customization.size) {
        drinkParts.push(`Size: ${String(customization.size).toUpperCase()}`)
      }
      if (customization.temperature) {
        drinkParts.push(`Temp: ${String(customization.temperature).toUpperCase()}`)
      }
      if (customization.milk) {
        drinkParts.push(`Milk: ${String(customization.milk).toUpperCase()}`)
      }
      if (customization.syrups && Array.isArray(customization.syrups)) {
        if (customization.syrups.length > 0) {
          drinkParts.push(`Syrups: ${customization.syrups.join(', ')}`)
        }
      } else if (customization.syrups && typeof customization.syrups === 'string') {
        drinkParts.push(`Syrup: ${customization.syrups}`)
      }

      return `Sandwich: [${foodParts.join(' · ')}] · Latte: [${drinkParts.join(' · ')}]`
    }

    const parts: string[] = []
    const isFood = hasFood

    if (isFood) {
      if (customization.foodSize) {
        parts.push(`Size: ${customization.foodSize === 'large' ? 'LARGE' : 'REGULAR'}`)
      }
      if (customization.foodWarming) {
        parts.push(customization.foodWarming === 'warmed' ? 'Warm & Toasted' : 'Served Cold')
      }
      if (customization.foodAddons && Array.isArray(customization.foodAddons) && customization.foodAddons.length > 0) {
        const addonLabels: Record<string, string> = {
          extra_cheese: 'Extra Cheese',
          gluten_free: 'Gluten-Free Bun',
        }
        const addons = customization.foodAddons.map((addon: string) => addonLabels[addon] || addon)
        parts.push(`Add-ons: ${addons.join(', ')}`)
      }
    } else {
      if (customization.size) {
        parts.push(`Size: ${String(customization.size).toUpperCase()}`)
      }
      if (customization.temperature) {
        parts.push(`Temp: ${String(customization.temperature).toUpperCase()}`)
      }
      if (customization.milk) {
        parts.push(`Milk: ${String(customization.milk).toUpperCase()}`)
      }
      if (customization.syrups && Array.isArray(customization.syrups)) {
        if (customization.syrups.length > 0) {
          parts.push(`Syrups: ${customization.syrups.join(', ')}`)
        }
      } else if (customization.syrups && typeof customization.syrups === 'string') {
        parts.push(`Syrup: ${customization.syrups}`)
      }
    }
    
    return parts.join(' · ')
  }

  const getEstimatedTime = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING':   return 'Awaiting payment confirmation...'
      case 'RECEIVED':  return 'Est. Wait Time: 8 - 12 mins'
      case 'ASSIGNED':  return order?.estimatedTime ? `Est. Wait Time: ${order.estimatedTime} mins` : 'Assigning worker...'
      case 'BREWING':   return order?.estimatedTime ? `Est. Wait Time: ${order.estimatedTime} mins` : 'Est. Wait Time: 3 - 5 mins'
      case 'READY':     return order?.orderType === 'DELIVERY' ? 'Out for Delivery!' : 'Ready at the Pick-up Counter!'
      case 'DELIVERED': return 'Order Completed · Enjoy your brew!'
      default:          return ''
    }
  }

  const currentStepIndex = getStepIndex(status)
  const isPending = status === 'PENDING'
  const isCancelled = status === 'CANCELLED'

  return (
    <div className="auth-page" style={{ padding: '120px 16px 60px 16px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Script tag to load Leaflet JS */}
      <Script 
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" 
        onLoad={() => setLeafletLoaded(true)}
        strategy="lazyOnload" 
      />

      <div style={{ maxWidth: 700, width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Real-time Ready Alert Banner */}
        <AnimatePresence>
          {showAlert && order && status === 'READY' && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              style={{
                background: 'rgba(27, 63, 39, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '2px solid var(--cream)',
                borderRadius: 16,
                padding: '20px 24px',
                color: 'var(--cream)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(27,63,39,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: '2.5rem', animation: 'bounce 1.5s infinite' }}>☕</span>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cream)' }}>
                    {order.orderType === 'DELIVERY' ? '🚗 Out for Delivery!' : '✨ Coffee is Ready!'}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
                    {order.orderType === 'DELIVERY' 
                      ? 'Your premium brew is out for delivery to your doorstep!' 
                      : `your coffee has been ready and pick up it from counter (Table ${order.tableNumber || 'Counter / Takeaway'})`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAlert(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 0,
                  color: '#fff',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                ✕
              </button>
              
              {/* Soft gold border pulse */}
              <div className="alert-pulse-effect" />
              
              <style>{`
                @keyframes bounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-8px); }
                }
                .alert-pulse-effect {
                  position: absolute;
                  top: 0; left: 0; right: 0; bottom: 0;
                  box-shadow: inset 0 0 20px rgba(247, 237, 225, 0.2);
                  pointer-events: none;
                  animation: pulseFrame 2s infinite;
                  border-radius: 14px;
                }
                @keyframes pulseFrame {
                  0% { opacity: 0.3; }
                  50% { opacity: 0.8; }
                  100% { opacity: 0.3; }
                }
              `}</style>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="auth-card"
          style={{ textAlign: 'center', padding: '32px 24px' }}
        >
          <span style={{ fontSize: '3.5rem', display: 'inline-block', marginBottom: 12 }}>
            {isCancelled ? '❌' : isPending ? '⏳' : (steps[currentStepIndex]?.emoji || '☕')}
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', fontSize: '2rem' }}>
            {isCancelled 
              ? 'Order Cancelled' 
              : isPending 
                ? (order?.paymentMethod === 'QR' ? '⏳ Awaiting Payment Verification' : 'Confirming Payment')
                : `Order ${steps[currentStepIndex]?.label}`}
          </h1>
          <p style={{ color: 'var(--text-soft)', marginTop: 8, fontSize: '0.95rem' }}>
            {isCancelled 
              ? 'This order has been cancelled.' 
              : isPending 
                ? (order?.paymentMethod === 'QR'
                  ? 'Please complete your UPI QR payment below. Once verified, this page will update and your order will begin brewing.'
                  : 'We are verifying your transaction with Razorpay. This page will update immediately upon receipt.')
                : steps[currentStepIndex]?.desc}
          </p>

          {!isCancelled && (
          <div style={{ marginTop: 14 }}>
            {isPending ? (
              <p style={{ color: 'var(--leaf)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner-border" /> {order?.paymentMethod === 'QR' ? 'Awaiting barista validation...' : 'Secure payment validation in progress...'}
                </span>
              </p>
            ) : (
              <div>
                {timeLeft !== null ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, margin: '12px 0', width: '100%', maxWidth: 320 }}>
                    <div style={{ 
                       fontSize: '2.2rem', 
                       fontWeight: 800, 
                       color: timeLeft > 60 ? 'var(--forest)' : '#d32f2f', 
                       fontFamily: 'monospace',
                       background: 'rgba(27, 63, 39, 0.05)',
                       padding: '4px 20px',
                       borderRadius: '12px',
                       border: '1px solid rgba(27, 63, 39, 0.1)',
                       display: 'inline-block',
                       letterSpacing: '1px'
                    }}>
                      {timeLeft > 0 ? formatTimeLeft(timeLeft) : '0:00'}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)', fontWeight: 600 }}>
                      {timeLeft > 0 ? 'Remaining estimated preparation time' : 'Wrapping up your order...'}
                    </span>
                    <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                      <motion.div
                        style={{ height: '100%', background: 'var(--leaf)', borderRadius: 3 }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${etaProgress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--leaf)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                    🕒 {getEstimatedTime(status)}
                  </p>
                )}
              </div>
            )}

            {/* Worker Details */}
            {order?.worker && (
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8, 
                background: 'rgba(74, 140, 63, 0.06)', 
                border: '1px solid rgba(74, 140, 63, 0.15)', 
                padding: '6px 14px', 
                borderRadius: 20, 
                marginTop: 10
              }}>
                <span style={{ fontSize: '0.95rem' }}>☕</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--forest)' }}>
                  Barista: <strong>{order.worker.name}</strong> is crafting your beverage
                </span>
              </div>
            )}

            {/* Delivery Agent Details */}
            {order?.deliveryUser && (
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8, 
                background: 'rgba(232, 168, 78, 0.06)', 
                border: '1px solid rgba(232, 168, 78, 0.15)', 
                padding: '6px 14px', 
                borderRadius: 20, 
                marginTop: 10
              }}>
                <span style={{ fontSize: '0.95rem' }}>🚗</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--amber)' }}>
                  Delivery Agent: <strong>{order.deliveryUser.name}</strong> ({order.deliveryUser.phone})
                </span>
              </div>
            )}

            {(status === 'PENDING' || status === 'RECEIVED') && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="btn-outline"
                  style={{
                    fontSize: '0.85rem',
                    padding: '8px 20px',
                    borderColor: 'rgba(211, 47, 47, 0.3)',
                    color: '#d32f2f',
                    width: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(211, 47, 47, 0.05)'
                    e.currentTarget.style.borderColor = '#d32f2f'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'rgba(211, 47, 47, 0.3)'
                  }}
                >
                  ❌ Cancel Order
                </button>
              </div>
            )}
          </div>
        )}

          {connecting && !isPending && (
            <div style={{ fontSize: '0.8rem', color: 'var(--leaf)', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="pulse-dot" /> Connecting to live barista feed...
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.25)', borderRadius: 'var(--radius-md)', padding: 10, marginTop: 16, fontSize: '0.82rem', color: '#c62828' }}>
              {error}
            </div>
          )}

          {/* Browser Notifications Option */}
          {mounted && 'Notification' in window && !isPending && !isCancelled && status !== 'DELIVERED' && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              {notificationPermission === 'default' && (
                <button
                  onClick={requestNotificationPermission}
                  className="btn-outline"
                  style={{ fontSize: '0.8rem', padding: '6px 14px', width: 'auto' }}
                >
                  🔔 Enable Browser Notifications
                </button>
              )}
              {notificationPermission === 'granted' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                  🔔 Notifications enabled! We will alert you when your order status updates.
                </span>
              )}
              {notificationPermission === 'denied' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                  🔇 Notifications blocked. Check your browser settings to receive alerts.
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Simulated Notification Alerts */}
        {order && !isPending && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              background: 'rgba(74, 140, 63, 0.05)',
              border: '1px solid rgba(74, 140, 63, 0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: '0.85rem',
              color: 'var(--forest)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <span>📢 Order Confirmed & Receipt Dispatched</span>
            </div>
            {order.customerEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-soft)' }}>
                <span>📧</span>
                <span>An invoice with order details was sent to <strong>{order.customerEmail}</strong></span>
              </div>
            )}
            {order.customerPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-soft)' }}>
                <span>📱</span>
                <span>An SMS billing notification was dispatched to <strong>{order.customerPhone}</strong></span>
              </div>
            )}
          </motion.div>
        )}

        {/* Live Progress Bar */}
        {!isCancelled && !isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="auth-card"
            style={{ padding: '32px 24px' }}
          >
            {/* Progress line */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ position: 'absolute', left: '4%', right: '4%', top: '50%', transform: 'translateY(-50%)', height: 4, background: 'rgba(0,0,0,0.06)', zIndex: 1, borderRadius: 2 }}>
                <motion.div
                  style={{ height: '100%', background: 'var(--leaf)', borderRadius: 2 }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
              </div>

              {steps.map((step, idx) => {
                const isActive = idx <= currentStepIndex
                const isCurrent = idx === currentStepIndex
                const stepTime = step.time ? new Date(step.time) : null

                return (
                  <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative', width: '20%' }}>
                    <motion.div
                      style={{
                        width: 40, height: 40,
                        borderRadius: '50%',
                        background: isCurrent ? 'var(--forest)' : (isActive ? 'var(--leaf)' : '#fff'),
                        border: '2px solid ' + (isActive ? 'transparent' : 'rgba(0,0,0,0.15)'),
                        color: isActive ? '#fff' : 'var(--text-soft)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem',
                        boxShadow: isCurrent ? '0 0 15px rgba(27,63,39,0.35)' : 'none',
                      }}
                      animate={isCurrent ? { scale: [1, 1.12, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {step.emoji}
                    </motion.div>
                    <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--forest)' : 'var(--text-soft)', marginTop: 8, textAlign: 'center' }}>
                      {step.label}
                    </span>
                    {stepTime && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--leaf)', marginTop: 4, fontWeight: 600 }}>
                        {stepTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Delivery Agent Profile Card */}
        {!isCancelled && !isPending && order?.deliveryUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="auth-card"
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(232,168,78,0.06) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(232, 168, 78, 0.25)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 50, height: 50,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1b3f27 0%, #0c1c11 100%)',
                  border: '2px solid var(--amber)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', color: 'var(--amber)', fontWeight: 700
                }}>
                  {order.deliveryUser.name[0].toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--forest)' }}>
                    {order.deliveryUser.name}
                  </h4>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <span style={{
                      background: 'rgba(232, 168, 78, 0.15)',
                      border: '1px solid rgba(232, 168, 78, 0.3)',
                      color: 'var(--amber)',
                      borderRadius: 100,
                      padding: '2px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      🛵 Delivery Partner
                    </span>
                    <span style={{
                      background: 'rgba(74, 140, 63, 0.12)',
                      border: '1px solid rgba(74, 140, 63, 0.25)',
                      color: 'var(--leaf)',
                      borderRadius: 100,
                      padding: '2px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 600
                    }}>
                      🟢 Active Duty
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem', color: 'var(--text-soft)', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 14 }}>
              {order.deliveryUser.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📧 Email:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{order.deliveryUser.email}</span>
                </div>
              )}
              {order.deliveryUser.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📞 Phone:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{order.deliveryUser.phone}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {order.deliveryUser.phone && (
                <>
                  <a
                    href={`tel:${order.deliveryUser.phone}`}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      textDecoration: 'none',
                      padding: '10px 16px',
                      fontSize: '0.85rem',
                      background: 'var(--forest)',
                      color: '#fff',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    📞 Call Partner
                  </a>
                  <a
                    href={`sms:${order.deliveryUser.phone}`}
                    className="btn-outline"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      textDecoration: 'none',
                      padding: '10px 16px',
                      fontSize: '0.85rem',
                      borderColor: 'rgba(27, 63, 39, 0.2)',
                      color: 'var(--forest)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    💬 Text SMS
                  </a>
                </>
              )}
              {order.deliveryUser.email && (
                <a
                  href={`mailto:${order.deliveryUser.email}?subject=Forest%20Brew%20Order%20%23${order.id.slice(-6).toUpperCase()}`}
                  className="btn-outline"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    textDecoration: 'none',
                    padding: '10px 16px',
                    fontSize: '0.85rem',
                    borderColor: 'rgba(27, 63, 39, 0.2)',
                    color: 'var(--forest)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  ✉️ Email Partner
                </a>
              )}
            </div>
          </motion.div>
        )}

        {/* Order Details & Receipt */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="auth-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 12, marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', margin: 0 }}>
                📋 Receipt · Order #{order.id.slice(-6).toUpperCase()}
              </h3>
              {!isPending && (
                <Link
                  href={`/order-status/${order.id}/invoice`}
                  target="_blank"
                  className="btn-outline"
                  style={{ fontSize: '0.78rem', padding: '6px 14px', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                >
                  📥 Download Invoice
                </Link>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: idx !== order.items.length - 1 ? '1px dashed rgba(0,0,0,0.06)' : 'none' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {item.product?.imageUrl && (
                      <img src={item.product.imageUrl} alt={item.product.name} style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                    )}
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--forest)', fontSize: '0.92rem' }}>
                        {item.product?.name} <span style={{ color: 'var(--text-soft)', fontWeight: 400 }}>× {item.quantity}</span>
                      </p>
                      {item.customizations && Object.keys(item.customizations).length > 0 && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                          {formatCustomization(item.customizations)}
                        </p>
                      )}
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatPrice(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '2px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '1.15rem', color: 'var(--forest)' }}>
              <span>{(order.paymentMethod === 'CASH' || order.paymentMethod === 'QR') ? 'Total Due' : 'Total Paid'}</span>
              <span>{formatPrice(order.totalAmount)}</span>
            </div>
          </motion.div>
        )}

        {/* QR Code / Cash Payment Details */}
        {order && isPending && !isCancelled && order.paymentMethod === 'QR' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="auth-card"
            style={{ textAlign: 'center', padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
          >
            <div style={{ background: 'rgba(232, 168, 78, 0.08)', border: '1px solid rgba(232, 168, 78, 0.25)', padding: '12px 20px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>📱</span>
              <span style={{ fontWeight: 700, color: 'var(--amber)', fontSize: '0.85rem' }}>Scan & Pay via UPI QR Code</span>
            </div>
            
            <p style={{ fontSize: '0.88rem', color: 'var(--text-soft)', margin: 0, maxWidth: 480 }}>
              Scan the QR code below using Google Pay, PhonePe, Paytm, or any banking app to instantly pay the total bill of <strong>{formatPrice(order.totalAmount)}</strong>.
            </p>

            <div style={{ 
              background: '#fff', 
              padding: 12, 
              borderRadius: 16, 
              display: 'inline-block', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.05)', 
              border: '1px solid rgba(0,0,0,0.08)',
              overflow: 'hidden',
              maxWidth: 240
            }}>
              <img 
                src="/images/payment_qr.jpg" 
                alt="UPI QR Code" 
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--forest)', fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '6px 16px', borderRadius: 'var(--radius-full)' }}>
                UPI ID: <span style={{ color: 'var(--mint)' }}>hshhh496@okhdfcbank</span>
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)', fontWeight: 500 }}>
                Please keep this page open. Once your payment is verified, your order status will automatically update.
              </span>
            </div>
          </motion.div>
        )}

        {order && !isPending && !isCancelled && order.paymentMethod === 'CASH' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="auth-card"
            style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}
          >
            <div style={{ fontSize: '2.5rem' }}>💵</div>
            <div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--forest)', fontSize: '1.1rem' }}>
                Cash Payment Confirmed
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-soft)', lineHeight: '1.4' }}>
                Your order is being prepared! Please pay <strong>{formatPrice(order.totalAmount)}</strong> in cash directly {order.orderType === 'DELIVERY' ? 'to the delivery executive upon arrival' : 'at the pick-up counter / table serving'}.
              </p>
            </div>
          </motion.div>
        )}

        {/* Map and Fulfillment Details Card */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="auth-card"
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ fontSize: '2.2rem' }}>
                {order.orderType === 'DELIVERY' ? '🚗' : '🪑'}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontWeight: 700, color: 'var(--forest)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                  {order.orderType === 'DELIVERY' ? 'Home Delivery Details' : 'Dine-In Fulfillment'}
                </h4>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)', marginTop: 2 }}>
                  {order.orderType === 'DELIVERY' 
                    ? `Ship to Address: ${order.deliveryAddress}` 
                    : `Serving Table: Table ${order.tableNumber || 'Counter / Takeaway'}`}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginTop: 4 }}>
                  {order.orderType === 'DELIVERY' 
                    ? `Contact Number: ${order.customerPhone || 'N/A'}` 
                    : 'Enjoy the vibe! Your brew will be served directly to your selected seat.'}
                </p>
              </div>
            </div>

            {order.orderType === 'DELIVERY' && order.latitude && order.longitude && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Coordinates: {order.latitude.toFixed(5)}, {order.longitude.toFixed(5)}</span>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: 'var(--leaf)', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    View on Google Maps
                  </a>
                </div>
                <div 
                  id="tracking-map" 
                  style={{ 
                    height: 300, 
                    borderRadius: 'var(--radius-md)', 
                    overflow: 'hidden', 
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                    zIndex: 0 
                  }} 
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Feedback & Complaint Form (Only when delivered) */}
        {order && status === 'DELIVERED' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="auth-card"
            style={{ padding: '28px 24px' }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', marginBottom: 16 }}>
              🌟 Rate Your Experience
            </h3>
            {feedbackSubmitted ? (
              <div style={{ background: 'rgba(74, 140, 63, 0.08)', border: '1px solid rgba(74, 140, 63, 0.25)', borderRadius: 'var(--radius-md)', padding: 16, color: 'var(--forest)', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>🌿</span>
                <p style={{ fontWeight: 600, margin: 0 }}>Thank you for your feedback! It helps us improve our brews.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Rating</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '1.8rem',
                          cursor: 'pointer',
                          color: star <= feedbackRating ? 'var(--amber)' : 'rgba(0,0,0,0.15)',
                          transition: 'color 0.1s'
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Category</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setFeedbackType('ORDER')}
                      style={{
                        background: feedbackType === 'ORDER' ? 'var(--forest)' : 'rgba(255,255,255,0.03)',
                        color: feedbackType === 'ORDER' ? '#fff' : 'var(--text-soft)',
                        border: '1px solid ' + (feedbackType === 'ORDER' ? 'var(--leaf)' : 'rgba(255,255,255,0.08)'),
                        padding: '10px 0',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ☕ Standard Review
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackType('COMPLAINT')}
                      style={{
                        background: feedbackType === 'COMPLAINT' ? '#d32f2f' : 'rgba(255,255,255,0.03)',
                        color: feedbackType === 'COMPLAINT' ? '#fff' : 'var(--text-soft)',
                        border: '1px solid ' + (feedbackType === 'COMPLAINT' ? '#e53935' : 'rgba(255,255,255,0.08)'),
                        padding: '10px 0',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ⚠️ Lodge Complaint
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Comments</label>
                  <textarea
                    className="form-field"
                    style={{ minHeight: 80, resize: 'vertical' }}
                    value={feedbackComments}
                    onChange={e => setFeedbackComments(e.target.value)}
                    placeholder="Tell us what you liked or how we can improve..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            )}
          </motion.div>
        )}

        {/* Customer Support Contact Card (Only when NOT completed/cancelled) */}
        {order && status !== 'DELIVERED' && status !== 'CANCELLED' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="auth-card"
            style={{ padding: '24px' }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', fontSize: '1.1rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              💬 Need Help? Contact Customer Support
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginBottom: 12 }}>
              Have an issue with your active order? Submit a quick complaint, and the admin panel will alert the barista immediately.
            </p>
            {supportSubmitted ? (
              <div style={{ background: 'rgba(74, 140, 63, 0.08)', border: '1px solid rgba(74, 140, 63, 0.25)', borderRadius: 'var(--radius-md)', padding: 12, color: 'var(--forest)', fontSize: '0.85rem' }}>
                ✅ Complaint logged. Our staff is on it and will notify you shortly.
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  className="form-field"
                  value={supportComments}
                  onChange={e => setSupportComments(e.target.value)}
                  placeholder="Describe your issue (e.g. order delayed, wrong address)..."
                  required
                  style={{ flex: 1, fontSize: '0.85rem' }}
                />
                <button
                  type="submit"
                  disabled={supportLoading}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0 18px', fontSize: '0.85rem' }}
                >
                  {supportLoading ? 'Sending...' : 'Lodge Issue'}
                </button>
              </form>
            )}
          </motion.div>
        )}

        {/* Back to Home CTA */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <Link
            href="/"
            className="btn-outline"
            style={{ padding: '12px 32px', display: 'inline-block', textDecoration: 'none' }}
          >
            🌿 Return to Cafe Home
          </Link>
        </div>

      </div>

      <style>{`
        .pulse-dot {
          width: 8px;
          height: 8px;
          background: var(--leaf);
          border-radius: 50%;
          display: inline-block;
          animation: ssePulse 1.5s infinite ease-in-out;
        }
        @keyframes ssePulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        .spinner-border {
          display: inline-block;
          width: 14px;
          height: 14px;
          vertical-align: text-bottom;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spinner-border .75s linear infinite;
        }
        @keyframes spinner-border {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(12, 28, 17, 0.65)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(27, 63, 39, 0.15)',
                borderRadius: 20,
                padding: '28px 24px',
                maxWidth: 420,
                width: '100%',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
                color: 'var(--text-dark)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}>⚠️</span>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--forest)' }}>
                Cancel Order?
              </h3>
              <p style={{ margin: '10px 0 20px 0', fontSize: '0.9rem', color: 'var(--text-soft)', lineHeight: '1.5' }}>
                Are you sure you want to cancel your order? 
                {order?.paymentMethod === 'WALLET' && ' Your paid amount will be instantly refunded to your cafe wallet.'}
                {order?.starsRedeemed > 0 && ' Your redeemed stars will be returned to your loyalty points.'}
                This action cannot be undone.
              </p>

              {cancelError && (
                <div style={{
                  background: 'rgba(211, 47, 47, 0.08)',
                  border: '1px solid rgba(211, 47, 47, 0.25)',
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 16,
                  fontSize: '0.8rem',
                  color: '#d32f2f'
                }}>
                  {cancelError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => {
                    setShowCancelConfirm(false)
                    setCancelError('')
                  }}
                  disabled={cancelling}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    border: '1px solid rgba(27, 63, 39, 0.2)',
                    background: 'transparent',
                    color: 'var(--forest)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  No, Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    border: 'none',
                    background: '#d32f2f',
                    color: '#fff',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  {cancelling ? (
                    <>
                      <span className="spinner-border" /> Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

