'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatPrice } from '@/types'
import type { Product, CartCustomization } from '@/types'

const MILK_OPTIONS = [
  { id: 'whole',   label: 'Whole Milk',    price: 0,    emoji: '🥛' },
  { id: 'oat',     label: 'Oat Milk',      price: 4000, emoji: '🌾' },
  { id: 'almond',  label: 'Almond Milk',   price: 5000, emoji: '🌰' },
  { id: 'soy',     label: 'Soy Milk',      price: 4000, emoji: '🫘' },
  { id: 'coconut', label: 'Coconut Milk',  price: 5000, emoji: '🥥' },
  { id: 'skimmed', label: 'Skimmed Milk',  price: 0,    emoji: '💧' },
]

const SYRUP_OPTIONS = [
  { id: 'vanilla',  label: 'Vanilla',        price: 3000, emoji: '🌼' },
  { id: 'hazelnut', label: 'Hazelnut',        price: 3000, emoji: '🌰' },
  { id: 'caramel',  label: 'Caramel',         price: 3000, emoji: '🍯' },
  { id: 'classic',  label: 'Classic',         price: 3000, emoji: '✨' },
  { id: 'lavender', label: 'Lavender',        price: 3500, emoji: '💜' },
]

const TEMP_OPTIONS = [
  { id: 'hot',     label: 'Hot',     price: 0,    emoji: '♨️' },
  { id: 'iced',    label: 'Iced',    price: 0,    emoji: '🧊' },
  { id: 'blended', label: 'Blended', price: 2000, emoji: '🌀' },
] as const

const SIZE_OPTIONS = [
  { id: 'tall',   label: 'Tall',   sub: '12 oz', price: 0,     emoji: '☕' },
  { id: 'grande', label: 'Grande', sub: '16 oz', price: 5000,  emoji: '🥤' },
  { id: 'venti',  label: 'Venti',  sub: '20 oz', price: 10000, emoji: '🧃' },
] as const

const FOOD_WARMING_OPTIONS = [
  { id: 'not_warmed', label: 'Served Cold', price: 0, emoji: '❄️' },
  { id: 'warmed', label: 'Warm & Toasted', price: 0, emoji: '🔥' },
] as const

const FOOD_SIZE_OPTIONS = [
  { id: 'regular', label: 'Regular Portion', price: 0, emoji: '🍽️' },
  { id: 'large', label: 'Large Portion', price: 5000, emoji: '🍔' },
] as const

const FOOD_ADDON_OPTIONS = [
  { id: 'extra_cheese', label: 'Extra Cheese', price: 3000, emoji: '🧀' },
  { id: 'gluten_free', label: 'Gluten-Free Bun', price: 4000, emoji: '🌾' },
]

interface DrinkBuilderProps {
  product: Product
  onClose: () => void
  onAdd: (customization: CartCustomization) => void
}

export function DrinkBuilder({ product, onClose, onAdd }: DrinkBuilderProps) {
  const isFood = product.category === 'FOOD'
  const isCombo = product.category === 'RESERVE' && product.name.toLowerCase().includes('sandwich') && product.name.toLowerCase().includes('latte')

  // Drink specific states
  const [milk, setMilk] = useState('whole')
  const [syrups, setSyrups] = useState<string[]>([])
  const [temperature, setTemperature] = useState<'hot' | 'iced' | 'blended'>(
    product.category === 'COLD' ? 'iced' : 'hot'
  )
  const [size, setSize] = useState<'tall' | 'grande' | 'venti'>('tall')

  // Food specific states
  const [foodWarming, setFoodWarming] = useState<'warmed' | 'not_warmed'>('not_warmed')
  const [foodSize, setFoodSize] = useState<'regular' | 'large'>('regular')
  const [foodAddons, setFoodAddons] = useState<string[]>([])
  const [specialInstructions, setSpecialInstructions] = useState('')

  const toggleSyrup = (id: string) => {
    setSyrups(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const toggleFoodAddon = (id: string) => {
    setFoodAddons(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const extraPrice = useMemo(() => {
    let total = 0
    if (isFood || isCombo) {
      total += FOOD_SIZE_OPTIONS.find(s => s.id === foodSize)?.price ?? 0
      total += foodAddons.reduce((sum, a) => sum + (FOOD_ADDON_OPTIONS.find(o => o.id === a)?.price ?? 0), 0)
    }
    if (!isFood || isCombo) {
      total += MILK_OPTIONS.find(m => m.id === milk)?.price ?? 0
      total += syrups.reduce((sum, s) => sum + (SYRUP_OPTIONS.find(o => o.id === s)?.price ?? 0), 0)
      total += TEMP_OPTIONS.find(t => t.id === temperature)?.price ?? 0
      total += SIZE_OPTIONS.find(s2 => s2.id === size)?.price ?? 0
    }
    return total
  }, [isFood, isCombo, milk, syrups, temperature, size, foodSize, foodAddons])

  const totalPrice = product.basePrice + extraPrice

  const handleAdd = () => {
    if (isCombo) {
      onAdd({ foodWarming, foodSize, foodAddons, milk, syrups, temperature, size, specialInstructions })
    } else if (isFood) {
      onAdd({ foodWarming, foodSize, foodAddons, specialInstructions })
    } else {
      onAdd({ milk, syrups, temperature, size, specialInstructions })
    }
  }

  return (
    <motion.div
      className="drink-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="drink-modal"
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
      >
        {/* Image */}
        <div style={{ position: 'relative' }}>
          <img
            className="drink-modal-img"
            src={product.imageUrl}
            alt={product.name}
          />
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', width: 36, height: 36,
              color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
          {product.badge && (
            <span className="menu-badge" style={{ top: 14, left: 14 }}>
              {product.badge}
            </span>
          )}
        </div>

        <div className="drink-modal-body">
          <div className="drink-modal-name">{product.name}</div>
          <div className="drink-modal-notes">{product.notes}</div>

          {isCombo ? (
            <>
              {/* Sandwich portion heading */}
              <div style={{
                margin: '20px 0 12px 0',
                paddingBottom: 6,
                borderBottom: '1px solid rgba(168,197,160,0.3)',
                color: 'var(--forest)',
                fontWeight: 700,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '0.04em'
              }}>
                <span>🥪</span> SANDWICH CUSTOMIZATION
              </div>

              {/* ── Food Warming ── */}
              <div className="builder-section">
                <div className="builder-label">Preparation</div>
                <div className="builder-options">
                  {FOOD_WARMING_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option ${foodWarming === opt.id ? 'selected' : ''}`}
                      onClick={() => setFoodWarming(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Food Portion Size ── */}
              <div className="builder-section">
                <div className="builder-label">Portion Size</div>
                <div className="builder-options">
                  {FOOD_SIZE_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option ${foodSize === opt.id ? 'selected' : ''}`}
                      onClick={() => setFoodSize(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      {opt.price > 0 && (
                        <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                          +{formatPrice(opt.price)}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Food Add-ons ── */}
              <div className="builder-section">
                <div className="builder-label">Add-ons (select any)</div>
                <div className="builder-options">
                  {FOOD_ADDON_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option multi ${foodAddons.includes(opt.id) ? 'selected' : ''}`}
                      onClick={() => toggleFoodAddon(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                        +{formatPrice(opt.price)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Latte portion heading */}
              <div style={{
                margin: '28px 0 12px 0',
                paddingBottom: 6,
                borderBottom: '1px solid rgba(168,197,160,0.3)',
                color: 'var(--forest)',
                fontWeight: 700,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '0.04em'
              }}>
                <span>☕</span> LATTE CUSTOMIZATION
              </div>

              {/* ── Size ── */}
              <div className="builder-section">
                <div className="builder-label">Size</div>
                <div className="builder-options">
                  {SIZE_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option ${size === opt.id ? 'selected' : ''}`}
                      onClick={() => setSize(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                        {opt.sub}
                        {opt.price > 0 && ` +${formatPrice(opt.price)}`}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Temperature ── */}
              <div className="builder-section">
                <div className="builder-label">Temperature</div>
                <div className="builder-options">
                  {TEMP_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option ${temperature === opt.id ? 'selected' : ''}`}
                      onClick={() => setTemperature(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      {opt.price > 0 && (
                        <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                          +{formatPrice(opt.price)}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Milk ── */}
              <div className="builder-section">
                <div className="builder-label">Milk Type</div>
                <div className="builder-options">
                  {MILK_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option ${milk === opt.id ? 'selected' : ''}`}
                      onClick={() => setMilk(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      {opt.price > 0 && (
                        <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                          +{formatPrice(opt.price)}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Syrups ── */}
              <div className="builder-section">
                <div className="builder-label">Syrups (select any)</div>
                <div className="builder-options">
                  {SYRUP_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option multi ${syrups.includes(opt.id) ? 'selected' : ''}`}
                      onClick={() => toggleSyrup(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                        +{formatPrice(opt.price)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          ) : isFood ? (
            <>
              {/* ── Food Warming ── */}
              <div className="builder-section">
                <div className="builder-label">Preparation</div>
                <div className="builder-options">
                  {FOOD_WARMING_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option ${foodWarming === opt.id ? 'selected' : ''}`}
                      onClick={() => setFoodWarming(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      {opt.price > 0 && (
                        <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                          +{formatPrice(opt.price)}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Food Portion Size ── */}
              <div className="builder-section">
                <div className="builder-label">Portion Size</div>
                <div className="builder-options">
                  {FOOD_SIZE_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option ${foodSize === opt.id ? 'selected' : ''}`}
                      onClick={() => setFoodSize(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      {opt.price > 0 && (
                        <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                          +{formatPrice(opt.price)}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Food Add-ons ── */}
              <div className="builder-section">
                <div className="builder-label">Add-ons (select any)</div>
                <div className="builder-options">
                  {FOOD_ADDON_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option multi ${foodAddons.includes(opt.id) ? 'selected' : ''}`}
                      onClick={() => toggleFoodAddon(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                        +{formatPrice(opt.price)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── Size ── */}
              <div className="builder-section">
                <div className="builder-label">Size</div>
                <div className="builder-options">
                  {SIZE_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option ${size === opt.id ? 'selected' : ''}`}
                      onClick={() => setSize(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                        {opt.sub}
                        {opt.price > 0 && ` +${formatPrice(opt.price)}`}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Temperature ── */}
              <div className="builder-section">
                <div className="builder-label">Temperature</div>
                <div className="builder-options">
                  {TEMP_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option ${temperature === opt.id ? 'selected' : ''}`}
                      onClick={() => setTemperature(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      {opt.price > 0 && (
                        <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                          +{formatPrice(opt.price)}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Milk ── */}
              <div className="builder-section">
                <div className="builder-label">Milk Type</div>
                <div className="builder-options">
                  {MILK_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option ${milk === opt.id ? 'selected' : ''}`}
                      onClick={() => setMilk(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      {opt.price > 0 && (
                        <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                          +{formatPrice(opt.price)}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Syrups ── */}
              <div className="builder-section">
                <div className="builder-label">Syrups (select any)</div>
                <div className="builder-options">
                  {SYRUP_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      className={`builder-option multi ${syrups.includes(opt.id) ? 'selected' : ''}`}
                      onClick={() => toggleSyrup(opt.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {opt.emoji} {opt.label}
                      <span style={{ opacity: 0.6, fontSize: '0.7em', marginLeft: 4 }}>
                        +{formatPrice(opt.price)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Special Instructions ── */}
          <div className="builder-section" style={{ width: '100%' }}>
            <div className="builder-label">Special Instructions</div>
            <textarea
              placeholder="e.g. Extra hot, no whipped cream, light ice, etc."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              style={{
                width: '100%',
                minHeight: '70px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(168,197,160,0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '0.85rem',
                color: 'var(--text-soft)',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--forest)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(168,197,160,0.2)'}
            />
          </div>

          {/* ── Price + CTA ── */}
          <div className="drink-modal-price-row">
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                Total
              </div>
              <motion.div
                className="drink-modal-total"
                key={totalPrice}
                initial={{ scale: 1.15, color: 'var(--leaf)' }}
                animate={{ scale: 1, color: 'var(--earth)' }}
                transition={{ duration: 0.3 }}
              >
                {formatPrice(totalPrice)}
              </motion.div>
              {extraPrice > 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', marginTop: 2 }}>
                  Base {formatPrice(product.basePrice)} + {formatPrice(extraPrice)} extras
                </div>
              )}
            </div>
            <motion.button
              className="btn-primary drink-modal-add"
              onClick={handleAdd}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              🛒 Add to Order
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
