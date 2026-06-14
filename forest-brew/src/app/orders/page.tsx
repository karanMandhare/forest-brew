'use client'

import { useState, useEffect } from 'react'

import { useSession, signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { formatPrice } from '@/types'

interface ProductInfo {
  name: string
  imageUrl: string
  description: string
}

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  customizations: any
  product: ProductInfo
}

interface Order {
  id: string
  status: 'PENDING' | 'RECEIVED' | 'BREWING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  orderType: 'DINE_IN' | 'DELIVERY'
  totalAmount: number
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  deliveryAddress: string | null
  tableNumber: string | null
  notes: string | null
  createdAt: string
  items: OrderItem[]
}

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

export default function OrderHistoryPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active')

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true)
        setError('')
        
        let guestOrderIds: string[] = []
        if (typeof window !== 'undefined') {
          try {
            guestOrderIds = JSON.parse(localStorage.getItem('forest_brew_recent_orders') || '[]')
          } catch (e) {
            console.error('Error parsing local order storage:', e)
          }
        }

        const queryParams = new URLSearchParams()
        if (guestOrderIds.length > 0) {
          queryParams.set('guestOrderIds', guestOrderIds.join(','))
        }

        const res = await fetch(`/api/orders/history?${queryParams.toString()}`)
        if (!res.ok) {
          throw new Error('Failed to retrieve order history')
        }
        const data = await res.json()
        setOrders(data)
      } catch (err: any) {
        setError(err.message || 'Something went wrong while loading orders.')
      } finally {
        setLoading(false)
      }
    }

    if (sessionStatus === 'authenticated') {
      fetchOrders()
    }
  }, [session, sessionStatus])

  if (sessionStatus === 'loading') {
    return (
      <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 16px' }}>
        <div style={{ color: 'var(--mint)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', textAlign: 'center' }}>
          <div className="loading-spinner" style={{ border: '4px solid rgba(27,63,39,0.1)', borderTop: '4px solid var(--forest)', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
          Retrieving your order data...
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 16px' }}>
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: 450, padding: '40px 24px' }}>
          <span style={{ fontSize: '3.5rem' }}>📋</span>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', marginTop: 16 }}>
            Track Your Orders
          </h2>
          <p style={{ color: 'var(--text-soft)', marginTop: 12, marginBottom: 24, fontSize: '0.9rem', lineHeight: '1.5' }}>
            Please sign in to view your order history, track active brews, and manage your coffee experiences.
          </p>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => signIn()}>
            Sign In / Register
          </button>
        </div>
      </div>
    )
  }

  // Filter orders
  const activeOrders = orders.filter(
    order => ['RECEIVED', 'BREWING', 'READY'].includes(order.status)
  )
  const pastOrders = orders.filter(
    order => ['DELIVERED', 'CANCELLED'].includes(order.status)
  )

  const displayedOrders = activeTab === 'active' ? activeOrders : pastOrders

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'RECEIVED':
        return { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', label: 'Received' }
      case 'BREWING':
        return { bg: 'rgba(20, 184, 166, 0.15)', text: '#14b8a6', label: 'Brewing' }
      case 'READY':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Ready for pickup' }
      case 'DELIVERED':
        return { bg: 'rgba(74, 85, 104, 0.15)', text: '#a0aec0', label: 'Completed' }
      case 'CANCELLED':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Cancelled' }
      default:
        return { bg: 'rgba(160, 174, 192, 0.15)', text: '#718096', label: status }
    }
  }

  return (
    <div className="auth-page" style={{ padding: '120px 16px 60px 16px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ maxWidth: 900, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <motion.span 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: '2.5rem' }}
          >
            📋
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', fontSize: '2.5rem', marginTop: 8 }}
          >
            My Orders
          </motion.h1>
          <p style={{ color: 'var(--text-soft)', marginTop: 8 }}>
            Track your current brews and browse past coffee experiences.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => setActiveTab('active')}
            className={`btn-${activeTab === 'active' ? 'primary' : 'outline'}`}
            style={{ padding: '10px 24px', borderRadius: 30, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            🔥 Active Orders
            {activeOrders.length > 0 && (
              <span style={{ 
                background: 'var(--cream)', 
                color: 'var(--forest)', 
                padding: '2px 8px', 
                borderRadius: 12, 
                fontSize: '0.75rem', 
                fontWeight: 'bold' 
              }}>
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`btn-${activeTab === 'past' ? 'primary' : 'outline'}`}
            style={{ padding: '10px 24px', borderRadius: 30 }}
          >
            🍃 Order History
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div style={{ color: 'red', textAlign: 'center', margin: '20px 0', padding: 16, background: 'rgba(255,0,0,0.05)', borderRadius: 8 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="loading-spinner" style={{ border: '4px solid rgba(27,63,39,0.1)', borderTop: '4px solid var(--forest)', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            <p style={{ color: 'var(--text-soft)', marginTop: 16 }}>Retrieving your order data...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <AnimatePresence mode="popLayout">
              {displayedOrders.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px', 
                    background: 'rgba(255,255,255,0.03)', 
                    backdropFilter: 'blur(10px)', 
                    border: '1px solid rgba(27,63,39,0.08)', 
                    borderRadius: 16 
                  }}
                >
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>☕</span>
                  <h3 style={{ color: 'var(--forest)', fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>
                    No {activeTab} orders found
                  </h3>
                  <p style={{ color: 'var(--text-soft)', marginTop: 8, maxWidth: 400, margin: '8px auto 20px auto' }}>
                    {activeTab === 'active' 
                      ? "You don't have any active brews right now. Head over to the menu to order your next coffee!"
                      : "You haven't completed any orders on this device or account yet."}
                  </p>
                  <Link href="/#menu" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                    🌿 Browse Menu
                  </Link>
                </motion.div>
              ) : (
                displayedOrders.map((order) => {
                  const statusInfo = getStatusColor(order.status)
                  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(27, 63, 39, 0.08)',
                        borderRadius: 16,
                        padding: 24,
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20
                      }}
                    >
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-soft)', letterSpacing: '0.05em' }}>
                              ORDER ID:
                            </span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--forest)', fontSize: '0.95rem' }}>
                              #{order.id.substring(0, 8).toUpperCase()}...
                            </span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)', display: 'block', marginTop: 4 }}>
                            Ordered on {orderDate}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ 
                            background: statusInfo.bg, 
                            color: statusInfo.text, 
                            padding: '6px 14px', 
                            borderRadius: 20, 
                            fontSize: '0.8rem', 
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase'
                          }}>
                            {statusInfo.label}
                          </span>

                          <span style={{ 
                            background: 'rgba(27, 63, 39, 0.05)', 
                            color: 'var(--forest)', 
                            padding: '6px 14px', 
                            borderRadius: 20, 
                            fontSize: '0.8rem', 
                            fontWeight: 600 
                          }}>
                            {order.orderType === 'DINE_IN' ? '🪑 Dine-in' : '🚗 Delivery'}
                          </span>
                        </div>
                      </div>

                      <hr style={{ border: 0, borderTop: '1px solid rgba(0,0,0,0.06)', margin: 0 }} />

                      {/* Items */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {order.items.map((item) => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ 
                                width: 48, 
                                height: 48, 
                                borderRadius: 8, 
                                overflow: 'hidden', 
                                background: 'rgba(0,0,0,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <img 
                                  src={item.product.imageUrl || '/coffee-default.png'} 
                                  alt={item.product.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                              <div>
                                <h4 style={{ fontWeight: 700, color: 'var(--forest)', margin: 0 }}>
                                  {item.product.name} <span style={{ color: 'var(--text-soft)', fontWeight: 500 }}>× {item.quantity}</span>
                                </h4>
                                {item.customizations && (
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)', margin: '4px 0 0 0' }}>
                                    {formatCustomization(item.customizations)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--forest)' }}>
                              {formatPrice(item.unitPrice * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <hr style={{ border: 0, borderTop: '1px solid rgba(0,0,0,0.06)', margin: 0 }} />

                      {/* Card Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {order.orderType === 'DINE_IN' ? (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>🪑</span>
                              <span>Table Selection: <strong>Table {order.tableNumber || 'Counter'}</strong></span>
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: 6, maxWidth: 400 }}>
                              <span>📍</span>
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                Delivery Address: <strong>{order.deliveryAddress || 'N/A'}</strong>
                              </span>
                            </span>
                          )}

                          {order.notes && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                              Note: "{order.notes}"
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)', display: 'block' }}>Total Amount</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--forest)', display: 'block' }}>
                              {formatPrice(order.totalAmount)}
                            </span>
                          </div>

                          <Link href={`/order-status/${order.id}`} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                            🔍 Live Track
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
