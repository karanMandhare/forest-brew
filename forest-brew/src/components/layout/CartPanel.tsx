'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/types'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function CartPanel() {
  const {
    items, isOpen, closeCart,
    removeItem, updateQuantity, clearCart,
    totalPrice, totalItems, updateInstructions,
  } = useCartStore()

  const [checkingOut, setCheckingOut] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Skip SSR to prevent hydration mismatches from Zustand local storage
  if (!mounted) {
    return null
  }

  const handleCheckout = async () => {
    if (items.length === 0) return
    setCheckingOut(true)
    // Navigate to checkout — secure payment handled server-side
    router.push('/checkout')
    setCheckingOut(false)
    closeCart()
  }

  const getCustomizationLabel = (item: any) => {
    const cust = item.customization
    if (!cust) return ''

    const hasFood = cust.foodWarming !== undefined || cust.foodSize !== undefined || cust.foodAddons !== undefined
    const hasDrink = cust.milk !== undefined || cust.syrups !== undefined || cust.temperature !== undefined || cust.size !== undefined

    if (hasFood && hasDrink) {
      const foodParts: string[] = []
      if (cust.foodSize) {
        foodParts.push(cust.foodSize === 'large' ? 'Large Portion' : 'Regular Portion')
      }
      if (cust.foodWarming) {
        foodParts.push(cust.foodWarming === 'warmed' ? 'Warm & Toasted' : 'Served Cold')
      }
      if (cust.foodAddons?.length) {
        const addonLabels: Record<string, string> = {
          extra_cheese: 'Extra Cheese',
          gluten_free: 'Gluten-Free Bun',
        }
        const addons = cust.foodAddons.map((addon: string) => addonLabels[addon] || addon)
        foodParts.push(addons.join(', '))
      }

      const drinkParts: string[] = []
      if (cust.size) drinkParts.push(cust.size.toUpperCase())
      if (cust.temperature) drinkParts.push(cust.temperature.toUpperCase())
      if (cust.milk && cust.milk !== 'whole') {
        drinkParts.push(`${cust.milk} milk`)
      }
      if (cust.syrups?.length) {
        drinkParts.push(cust.syrups.join(', '))
      }

      return `Sandwich: [${foodParts.join(' · ')}] · Latte: [${drinkParts.join(' · ')}]`
    }

    const parts: string[] = []
    const isFood = item.category === 'FOOD' || hasFood

    if (isFood) {
      if (cust.foodSize) {
        parts.push(cust.foodSize === 'large' ? 'Large Portion' : 'Regular Portion')
      }
      if (cust.foodWarming) {
        parts.push(cust.foodWarming === 'warmed' ? 'Warm & Toasted' : 'Served Cold')
      }
      if (cust.foodAddons?.length) {
        const addonLabels: Record<string, string> = {
          extra_cheese: 'Extra Cheese',
          gluten_free: 'Gluten-Free Bun',
        }
        const addons = cust.foodAddons.map((addon: string) => addonLabels[addon] || addon)
        parts.push(addons.join(', '))
      }
    } else {
      if (cust.size) parts.push(cust.size)
      if (cust.temperature) parts.push(cust.temperature)
      if (cust.milk && cust.milk !== 'whole') {
        parts.push(`${cust.milk} milk`)
      }
      if (cust.syrups?.length) {
        parts.push(cust.syrups.join(', '))
      }
    }
    return parts.join(' · ')
  }

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="cart-overlay active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <motion.div
        className={`cart-panel ${isOpen ? 'open' : ''}`}
        initial={false}
        animate={{ x: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        aria-label="Shopping cart"
        role="dialog"
      >
        {/* Header */}
        <div className="cart-header">
          <div>
            <h3>Your Order</h3>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-soft)', fontSize: '0.75rem',
                  cursor: 'pointer', textDecoration: 'underline',
                  marginTop: 4,
                }}
              >
                Clear Cart
              </button>
            )}
          </div>
          <button className="close-cart" onClick={closeCart} aria-label="Close cart">✕</button>
        </div>

        {/* Items */}
        <div className="cart-items">
          <AnimatePresence mode="popLayout">
            {!mounted || items.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center', color: 'var(--text-soft)', marginTop: 40 }}
              >
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🌿</div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--forest)' }}>
                  Your cup awaits
                </p>
                <p style={{ fontSize: '0.85rem', marginTop: 8 }}>
                  Add something from the menu to get started.
                </p>
              </motion.div>
            ) : (
              items.map((item) => (
                <motion.div
                  key={item.id}
                  className="cart-item"
                  layout
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, padding: 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    {getCustomizationLabel(item) && (
                      <span className="cart-item-custom">
                        {getCustomizationLabel(item)}
                      </span>
                    )}
                    <span className="cart-item-price">
                      {formatPrice(item.basePrice + item.customizationPrice)} each
                    </span>
                    <button
                      style={{
                        background: 'none', border: 'none',
                        color: '#e53935', fontSize: '0.72rem',
                        cursor: 'pointer', textDecoration: 'underline',
                        marginTop: 2, textAlign: 'left', padding: 0,
                      }}
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>

                    {/* Special Instructions Edit Field */}
                    <div style={{ marginTop: 6, width: '90%' }}>
                      <input
                        type="text"
                        placeholder="✍️ Special instructions..."
                        value={item.customization.specialInstructions || ''}
                        onChange={(e) => updateInstructions(item.id, e.target.value)}
                        style={{
                          width: '100%',
                          fontSize: '0.7rem',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(168,197,160,0.15)',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: 'var(--text-soft)',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--earth)', fontSize: '0.95rem' }}>
                      {formatPrice(item.lineTotal)}
                    </span>
                    <div className="qty-ctrl">
                      <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>−</button>
                      <span className="qty-val">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>+</button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="cart-footer">
          <div className="cart-subtotal-row">
            <span>{mounted ? totalItems() : 0} item{(!mounted || totalItems() !== 1) ? 's' : ''}</span>
            <span>Subtotal: {formatPrice(mounted ? totalPrice() : 0)}</span>
          </div>
          <div className="cart-total">
            <span>Total</span>
            <span>{formatPrice(mounted ? totalPrice() : 0)}</span>
          </div>
          <motion.button
            className="btn-primary"
            style={{ width: '100%', opacity: (!mounted || items.length === 0) ? 0.5 : 1 }}
            disabled={!mounted || items.length === 0 || checkingOut}
            onClick={handleCheckout}
            whileTap={{ scale: 0.97 }}
          >
            {checkingOut ? '⏳ Processing...' : '🌿 Checkout'}
          </motion.button>
          <p style={{
            fontSize: '0.68rem', color: 'var(--text-soft)',
            textAlign: 'center', marginTop: 10,
          }}>
            🔒 Secure payment via Razorpay
          </p>
        </div>
      </motion.div>
    </>
  )
}
