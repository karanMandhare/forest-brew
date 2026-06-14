'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import Script from 'next/script'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/types'

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

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, removeItem } = useCartStore()
  const { data: session } = useSession()
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [cartWarning, setCartWarning] = useState('')
  const [validatingCart, setValidatingCart] = useState(false)

  // Starbucks rewards & wallet states
  const [profile, setProfile] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'WALLET' | 'CASH' | 'QR'>('RAZORPAY')
  const [starsToRedeem, setStarsToRedeem] = useState<number>(0)

  const subtotal = totalPrice()
  const maxStarsPossible = profile?.user?.loyaltyPoints 
    ? Math.min(profile.user.loyaltyPoints, Math.floor(subtotal / 100))
    : 0
  const discountAmount = starsToRedeem * 100
  const finalTotal = Math.max(0, subtotal - discountAmount)

  // Delivery & Map States
  const [orderType, setOrderType] = useState<'DINE_IN' | 'DELIVERY'>('DINE_IN')
  const [tableNumber, setTableNumber] = useState<string>('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [markerInstance, setMarkerInstance] = useState<any>(null)

  useEffect(() => {
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
    if (orderType !== 'DELIVERY' || !leafletLoaded) return

    const L = (window as any).L
    if (!L) return

    const defaultLat = 18.5204
    const defaultLng = 73.8567

    const map = L.map('map-picker').setView([defaultLat, defaultLng], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map)
    setMapInstance(map)
    setMarkerInstance(marker)

    const updateCoords = async (lat: number, lng: number) => {
      setLatitude(lat)
      setLongitude(lng)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        if (res.ok) {
          const data = await res.json()
          if (data.display_name) {
            setAddress(data.display_name)
          }
        }
      } catch (err) {
        console.error('Reverse geocoding error:', err)
      }
    }

    marker.on('dragend', (e: any) => {
      const position = e.target.getLatLng()
      updateCoords(position.lat, position.lng)
    })

    map.on('click', (e: any) => {
      marker.setLatLng(e.latlng)
      updateCoords(e.latlng.lat, e.latlng.lng)
    })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude
          const userLng = position.coords.longitude
          map.setView([userLat, userLng], 15)
          marker.setLatLng([userLat, userLng])
          updateCoords(userLat, userLng)
        },
        (error) => {
          console.warn('Geolocation error:', error)
        }
      )
    }

    return () => {
      map.remove()
      setMapInstance(null)
      setMarkerInstance(null)
    }
  }, [orderType, leafletLoaded])

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const table = params.get('table')
      if (table) {
        setOrderType('DINE_IN')
        setTableNumber(table)
      }
    }
  }, [])

  // ── Cart Validation: Remove stale/unavailable items on mount ───────
  useEffect(() => {
    if (items.length === 0) return
    const productIds = items.map(i => i.productId)
    setValidatingCart(true)
    fetch('/api/products/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return
        if (!data.allValid && data.invalid?.length > 0) {
          // Remove invalid items from cart
          const invalidSet = new Set(data.invalid as string[])
          const removedNames: string[] = []
          items.forEach(item => {
            if (invalidSet.has(item.productId)) {
              removedNames.push(item.name)
              removeItem(item.id)
            }
          })
          setCartWarning(
            `⚠️ Some items were removed from your cart because they are no longer available: ${removedNames.join(', ')}. Please review your order.`
          )
        }
      })
      .catch(() => {/* silent — checkout will still catch any issues */})
      .finally(() => setValidatingCart(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // Prefill session info and fetch rewards profile if logged in
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '')
      setEmail(session.user.email || '')

      fetch('/api/user/profile')
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Failed to load profile')
        })
        .then(data => {
          setProfile(data)
          // Default payment method to WALLET if they have enough balance
          const totalAmountPaise = totalPrice()
          if (data.user?.walletBalance >= totalAmountPaise) {
            setPaymentMethod('WALLET')
          }
        })
        .catch(err => console.error('Error fetching user profile:', err))
    }
  }, [session, totalPrice])

  // Redirect to menu if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      const timer = setTimeout(() => {
        router.push('/')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [items, router])

  if (!mounted) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <span style={{ fontSize: '3rem' }}>🌿</span>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', marginTop: 16 }}>
            Loading your order...
          </h1>
        </div>
      </div>
    )
  }

  if (mounted && session?.user && (session.user.role === 'ADMIN' || session.user.role === 'DELIVERY')) {
    return (
      <div className="auth-page" style={{ padding: '100px 16px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 480 }}>
          <span style={{ fontSize: '3.5rem' }}>🚫</span>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', marginTop: 16, fontSize: '1.8rem' }}>
            Access Restricted
          </h1>
          <p style={{ color: 'var(--text-soft)', marginTop: 12, fontSize: '0.92rem', lineHeight: 1.5 }}>
            Store administrators and workers are not permitted to place orders or checkout items.
          </p>
          <Link
            href={session.user.role === 'ADMIN' ? '/admin' : '/worker'}
            className="btn-primary"
            style={{ display: 'inline-block', marginTop: 24, padding: '10px 24px', textDecoration: 'none', borderRadius: 'var(--radius-full)' }}
          >
            Go to {session.user.role === 'ADMIN' ? 'Admin Panel' : 'Worker Console'} 🌿
          </Link>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <span style={{ fontSize: '3rem' }}>🛒</span>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', marginTop: 16 }}>
            Your cart is empty
          </h1>
          <p style={{ color: 'var(--text-soft)', marginTop: 8 }}>
            Redirecting you to the home page...
          </p>
          <Link href="/" style={{ color: 'var(--leaf)', fontWeight: 700, display: 'inline-block', marginTop: 20 }}>
            🌿 Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Create order on the server (server-side price recalculation)
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            customization: item.customization,
          })),
          customerName: name,
          customerEmail: email,
          orderType,
          customerPhone: orderType === 'DELIVERY' ? phone : undefined,
          deliveryAddress: orderType === 'DELIVERY' ? address : undefined,
          latitude: orderType === 'DELIVERY' ? (latitude || undefined) : undefined,
          longitude: orderType === 'DELIVERY' ? (longitude || undefined) : undefined,
          tableNumber: orderType === 'DINE_IN' ? tableNumber : undefined,
          paymentMethod,
          starsToRedeem,
          notes,
        }),
      })

      const orderData = await res.json()

      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to initiate order.')
      }

      if (orderData.paidViaWallet) {
        // Direct payment successful (Wallet or 100% Stars)
        try {
          const localOrders = JSON.parse(localStorage.getItem('forest_brew_recent_orders') || '[]')
          if (!localOrders.includes(orderData.orderId)) {
            localOrders.push(orderData.orderId)
            localStorage.setItem('forest_brew_recent_orders', JSON.stringify(localOrders))
          }
        } catch (e) {
          console.error('Error saving order to localStorage:', e)
        }

        clearCart()
        router.push(`/order-status/${orderData.orderId}`)
        return
      }

      const isRazorpayConfigured =
        orderData.razorpayOrderId &&
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
        !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.includes('xxxxxxxx')

      if (isRazorpayConfigured) {
        // 2. Razorpay Live Payment
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Forest Brew',
          description: 'Premium organic coffee from the forest floor.',
          order_id: orderData.razorpayOrderId,
          handler: async function (response: any) {
            setLoading(true)
            try {
              const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  orderId: orderData.orderId,
                }),
              })

              const verifyData = await verifyRes.json()

              if (verifyRes.ok && verifyData.success) {
                // Save order ID to localStorage for history fallback
                try {
                  const localOrders = JSON.parse(localStorage.getItem('forest_brew_recent_orders') || '[]')
                  if (!localOrders.includes(orderData.orderId)) {
                    localOrders.push(orderData.orderId)
                    localStorage.setItem('forest_brew_recent_orders', JSON.stringify(localOrders))
                  }
                } catch (e) {
                  console.error('Error saving order to localStorage:', e)
                }

                clearCart()
                router.push(`/order-status/${orderData.orderId}`)
              } else {
                throw new Error(verifyData.error || 'Signature verification failed.')
              }
            } catch (err: any) {
              setError(err.message || 'Payment verification failed.')
              setLoading(false)
            }
          },
          prefill: {
            name,
            email,
          },
          theme: {
            color: '#1b3f27',
          },
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.on('payment.failed', function (response: any) {
          setError(`Payment failed: ${response.error.description}`)
          setLoading(false)
        })
        rzp.open()
      } else {
        // 3. Mock Payment in development
        console.warn('Razorpay keys not fully configured. Simulating mock payment.')
        
        // Fire mock verify to advance order status (response not checked in dev mode)
        void fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpayOrderId: orderData.razorpayOrderId || 'mock_order_id',
            razorpayPaymentId: 'mock_pay_id_' + Math.random().toString(36).substring(7),
            razorpaySignature: 'mock_signature',
            orderId: orderData.orderId,
          }),
        })

        // Wait a second to simulate loading
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Save order ID to localStorage for history fallback
        try {
          const localOrders = JSON.parse(localStorage.getItem('forest_brew_recent_orders') || '[]')
          if (!localOrders.includes(orderData.orderId)) {
            localOrders.push(orderData.orderId)
            localStorage.setItem('forest_brew_recent_orders', JSON.stringify(localOrders))
          }
        } catch (e) {
          console.error('Error saving order to localStorage:', e)
        }

        clearCart()
        router.push(`/order-status/${orderData.orderId}?mock=true`)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="lazyOnload" onLoad={() => setLeafletLoaded(true)} />

      <div className="auth-page" style={{ padding: '100px 16px 60px 16px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, maxWidth: 1000, width: '100%' }} className="checkout-layout">
          
          {/* Order Summary Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="auth-card"
            style={{ height: 'fit-content' }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', marginBottom: 20 }}>
              🌿 Order Summary
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 350, overflowY: 'auto', paddingRight: 8 }}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--forest)' }}>{item.name} × {item.quantity}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                      {formatCustomization(item.customization)}
                    </p>
                  </div>
                  <span style={{ fontWeight: 700 }}>{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: 'var(--text-soft)' }}>
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {starsToRedeem > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: 'var(--leaf)', fontWeight: 600 }}>
                  <span>🌟 Stars Reward Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: 'var(--text-soft)' }}>
                <span>Delivery / Pickup Fee</span>
                <span>₹0.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 12, fontWeight: 700, fontSize: '1.2rem', color: 'var(--forest)' }}>
                <span>Total</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
            </div>
          </motion.div>

          {/* Customer Details & Checkout Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="auth-card"
          >
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', marginBottom: 20 }}>
              ☕ Customer Details
            </h2>

            {validatingCart && (
              <div style={{ background: 'rgba(74,140,63,0.06)', border: '1px solid rgba(74,140,63,0.2)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 16, fontSize: '0.85rem', color: 'var(--forest)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--leaf)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Checking item availability…
              </div>
            )}

            {cartWarning && !validatingCart && (
              <div style={{ background: 'rgba(255,160,0,0.08)', border: '1px solid rgba(255,160,0,0.35)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 16, fontSize: '0.85rem', color: '#b45309', lineHeight: 1.5 }}>
                {cartWarning}
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.25)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 16, fontSize: '0.85rem', color: '#c62828' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name</label>
                <input
                  type="text"
                  className="form-field"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Arjun Dev"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Email Address</label>
                <input
                  type="email"
                  className="form-field"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              {/* Order Type Toggle */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Order Options</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    type="button"
                    onClick={() => setOrderType('DINE_IN')}
                    style={{
                      background: orderType === 'DINE_IN' ? 'var(--forest)' : 'transparent',
                      color: orderType === 'DINE_IN' ? '#fff' : 'var(--text-soft)',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: 'calc(var(--radius-md) - 2px)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    ☕ Dine-In / Pickup
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('DELIVERY')}
                    style={{
                      background: orderType === 'DELIVERY' ? 'var(--forest)' : 'transparent',
                      color: orderType === 'DELIVERY' ? '#fff' : 'var(--text-soft)',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: 'calc(var(--radius-md) - 2px)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    🚗 Home Delivery
                  </button>
                </div>
              </div>

              {/* Dine-In Details (only shown if Dine-In is selected) */}
              {orderType === 'DINE_IN' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '3px solid var(--leaf)', paddingLeft: 12, marginTop: 4 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, display: 'block' }}>
                    Select a Table / Seat Number
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(tNum => (
                      <button
                        key={tNum}
                        type="button"
                        onClick={() => setTableNumber(tNum)}
                        style={{
                          background: tableNumber === tNum ? 'var(--forest)' : 'rgba(255,255,255,0.03)',
                          color: tableNumber === tNum ? '#fff' : 'var(--text-soft)',
                          border: '1px solid ' + (tableNumber === tNum ? 'var(--leaf)' : 'rgba(255,255,255,0.08)'),
                          padding: '10px 0',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s',
                          boxShadow: tableNumber === tNum ? '0 0 10px rgba(74, 140, 63, 0.25)' : 'none',
                        }}
                      >
                        🪑 {tNum}
                      </button>
                    ))}
                  </div>
                  {tableNumber && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--mint)', fontWeight: 600 }}>
                      Selected Table: {tableNumber}
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Details (only shown if Delivery is selected) */}
              {orderType === 'DELIVERY' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '3px solid var(--leaf)', paddingLeft: 12, marginTop: 4 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Phone Number</label>
                    <input
                      type="tel"
                      className="form-field"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      required={orderType === 'DELIVERY'}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Delivery Address</label>
                    <textarea
                      className="form-field"
                      style={{ minHeight: 80, resize: 'vertical' }}
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Enter address manually or select on the map below..."
                      required={orderType === 'DELIVERY'}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600 }}>Visual Map Picker</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.geolocation && mapInstance && markerInstance) {
                            navigator.geolocation.getCurrentPosition((position) => {
                              const lat = position.coords.latitude
                              const lng = position.coords.longitude
                              mapInstance.setView([lat, lng], 15)
                              markerInstance.setLatLng([lat, lng])
                              setLatitude(lat)
                              setLongitude(lng)
                              fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                                .then(res => res.json())
                                .then(data => {
                                  if (data.display_name) setAddress(data.display_name)
                                })
                            })
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--mint)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        📍 Locate Me
                      </button>
                    </div>

                    <div
                      id="map-picker"
                      style={{
                        height: 200,
                        width: '100%',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        zIndex: 5
                      }}
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Click map or drag marker to set exact spot</span>
                      {latitude && longitude && (
                        <span>Coords: {latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Starbucks Loyalty Stars Redemption (Green/Gold Status) */}
              {session?.user && profile?.user && (
                <div style={{
                  background: 'rgba(74, 140, 63, 0.05)',
                  border: '1px solid rgba(74, 140, 63, 0.15)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--forest)' }}>
                      🌟 Starbucks Rewards (Stars)
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--amber)', fontWeight: 700 }}>
                      {profile.user.loyaltyPoints} Stars Available
                    </span>
                  </div>
                  {maxStarsPossible > 0 ? (
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginBottom: 8 }}>
                        Redeem Stars for a discount (1 Star = ₹1.00). You can redeem up to {maxStarsPossible} Stars for this order.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="number"
                          min="0"
                          max={maxStarsPossible}
                          value={starsToRedeem}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0
                            setStarsToRedeem(Math.min(maxStarsPossible, Math.max(0, val)))
                          }}
                          style={{
                            width: '100px',
                            background: '#fff',
                            border: '1px solid rgba(0,0,0,0.15)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                            color: '#000',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setStarsToRedeem(maxStarsPossible)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--leaf)',
                            color: 'var(--leaf)',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Redeem Max
                        </button>
                        {starsToRedeem > 0 && (
                          <button
                            type="button"
                            onClick={() => setStarsToRedeem(0)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-soft)',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                      Earn stars by placing orders or loading your card. (1 Star per ₹1 spent).
                    </p>
                  )}
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Payment Method
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Option 1: Starbucks Card Wallet */}
                  {session?.user ? (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: paymentMethod === 'WALLET' ? 'rgba(27, 63, 39, 0.05)' : 'transparent',
                        border: '1px solid ' + (paymentMethod === 'WALLET' ? 'var(--leaf)' : 'rgba(0,0,0,0.1)'),
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'WALLET'}
                          onChange={() => setPaymentMethod('WALLET')}
                          style={{ accentColor: 'var(--forest)' }}
                        />
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--forest)' }}>
                            💳 Starbucks Card Wallet
                          </span>
                          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-soft)' }}>
                            Balance: {formatPrice(profile?.user?.walletBalance || 0)}
                          </span>
                        </div>
                      </div>
                      {profile && profile.user?.walletBalance < finalTotal && (
                        <span style={{ fontSize: '0.7rem', color: '#d32f2f', fontWeight: 600 }}>
                          Insufficient Funds
                        </span>
                      )}
                    </label>
                  ) : (
                    <div style={{
                      background: 'rgba(0,0,0,0.03)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      fontSize: '0.8rem',
                      color: 'var(--text-soft)'
                    }}>
                      💡 <Link href="/profile" style={{ color: 'var(--leaf)', fontWeight: 700 }}>Sign in</Link> to pay with your Starbucks Card and earn Stars.
                    </div>
                  )}

                  {/* Option 2: Credit Card / UPI (Razorpay) */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: paymentMethod === 'RAZORPAY' ? 'rgba(27, 63, 39, 0.05)' : 'transparent',
                      border: '1px solid ' + (paymentMethod === 'RAZORPAY' ? 'var(--leaf)' : 'rgba(0,0,0,0.1)'),
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'RAZORPAY'}
                      onChange={() => setPaymentMethod('RAZORPAY')}
                      style={{ accentColor: 'var(--forest)', marginRight: 10 }}
                    />
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--forest)' }}>
                        🌐 Online Payment (Credit Card / UPI / NetBanking)
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-soft)' }}>
                        Secure checkout via Razorpay Gateway
                      </span>
                    </div>
                  </label>

                  {/* Option 3: Cash on Delivery / Counter */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: paymentMethod === 'CASH' ? 'rgba(27, 63, 39, 0.05)' : 'transparent',
                      border: '1px solid ' + (paymentMethod === 'CASH' ? 'var(--leaf)' : 'rgba(0,0,0,0.1)'),
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'CASH'}
                      onChange={() => setPaymentMethod('CASH')}
                      style={{ accentColor: 'var(--forest)', marginRight: 10 }}
                    />
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--forest)' }}>
                        💵 Cash on Delivery / Counter
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-soft)' }}>
                        Pay with physical cash at pickup or upon delivery
                      </span>
                    </div>
                  </label>

                  {/* Option 4: Scan QR Code */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: paymentMethod === 'QR' ? 'rgba(27, 63, 39, 0.05)' : 'transparent',
                      border: '1px solid ' + (paymentMethod === 'QR' ? 'var(--leaf)' : 'rgba(0,0,0,0.1)'),
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'QR'}
                      onChange={() => setPaymentMethod('QR')}
                      style={{ accentColor: 'var(--forest)', marginRight: 10 }}
                    />
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--forest)' }}>
                        📱 Scan QR Code
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-soft)' }}>
                        Scan UPI QR code after placing the order
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Special Notes (Optional)</label>
                <textarea
                  className="form-field"
                  style={{ minHeight: 80, resize: 'vertical' }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Extra hot, leave at the counter..."
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading || (paymentMethod === 'WALLET' && !!profile && profile.user?.walletBalance < finalTotal)}
                className="btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading 
                  ? '🌿 Processing Order...' 
                  : (paymentMethod === 'WALLET' && !!profile && profile.user?.walletBalance < finalTotal)
                    ? '⚠️ Insufficient Wallet Balance'
                    : paymentMethod === 'CASH'
                      ? `Place Order (Cash) · ${formatPrice(finalTotal)}`
                      : paymentMethod === 'QR'
                        ? `Place Order (Scan QR) · ${formatPrice(finalTotal)}`
                        : `Pay ${formatPrice(finalTotal)}`
                }
              </motion.button>

              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-soft)', marginTop: 8 }}>
                🔒 Razorpay Encrypted Transaction.
                <br />
                {!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.startsWith('rzp_live') && (
                  <span style={{ color: 'var(--leaf)', fontWeight: 600 }}>
                    🛠️ Development mode active: A mock payment simulation will run.
                  </span>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .checkout-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}
