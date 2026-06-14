'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrinkBuilder } from '@/components/ui/DrinkBuilder'
import { useCartStore } from '@/store/cartStore'
import { useSession } from 'next-auth/react'
import { formatPrice } from '@/types'
import type { Product, CartCustomization } from '@/types'

gsap.registerPlugin(ScrollTrigger)

const MENU_ITEMS: Product[] = [
  {
    id: 'prod-forest-espresso',
    name: 'Forest Espresso',
    slug: 'forest-espresso',
    description: 'A commanding double shot from Ethiopian highlands, dark and complex.',
    notes: 'Dark cacao · Wild honey · Pine wood smoke · Cedar finish',
    basePrice: 32000,
    imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&q=75',
    badge: '🌿 Signature',
    origin: 'Ethiopia Yirgacheffe',
    category: 'HOT',
    isAvailable: true,
  },
  {
    id: 'prod-mossy-latte',
    name: 'Mossy Latte',
    slug: 'mossy-latte',
    description: 'Silky matcha-kissed espresso with oat cream and warming cinnamon.',
    notes: 'Matcha-kissed · Oat cream · Warm cinnamon · Morning mist',
    basePrice: 38000,
    imageUrl: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=600&q=75',
    badge: '💚 Bestseller',
    origin: 'Colombia Huila',
    category: 'HOT',
    isAvailable: true,
  },
  {
    id: 'prod-canopy-pourover',
    name: 'Canopy Pour-Over',
    slug: 'canopy-pour-over',
    description: 'A bright and fruity Kenyan AA, slow-brewed to perfection.',
    notes: 'Black currant · Cedar · Citrus zest · Dew-fresh brightness',
    basePrice: 44000,
    imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=75',
    badge: '🍃 Reserve',
    origin: 'Kenya AA',
    category: 'RESERVE',
    isAvailable: true,
  },
  {
    id: 'prod-wildflower-coldbrew',
    name: 'Wildflower Cold Brew',
    slug: 'wildflower-cold-brew',
    description: '24-hour cold-steeped Guatemalan beans with hibiscus & petal sweetness.',
    notes: 'Hibiscus · Amber · Cool earth · Petal sweetness',
    basePrice: 36000,
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=75',
    badge: '🌺 Seasonal',
    origin: 'Guatemala Antigua',
    category: 'COLD',
    isAvailable: true,
  },
  {
    id: 'prod-sunrise-cortado',
    name: 'Sunrise Cortado',
    slug: 'sunrise-cortado',
    description: 'Equal parts espresso and steamed milk, warm hazelnut and honey.',
    notes: 'Hazelnut · Wild honey · Toasted grain · Soft amber warmth',
    basePrice: 34000,
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=75',
    badge: '☀️ Morning',
    origin: 'Brazil Cerrado',
    category: 'HOT',
    isAvailable: true,
  },
  {
    id: 'prod-velvet-flatwhite',
    name: 'Velvet Flat White',
    slug: 'velvet-flat-white',
    description: "Ristretto-based with microfoam silk. The barista's pride.",
    notes: 'Brown sugar · Vanilla blossom · Silky microfoam cloud',
    basePrice: 37000,
    imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=75',
    badge: '🤍 Classic',
    origin: 'Honduras SHB',
    category: 'HOT',
    isAvailable: true,
  },
]

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'HOT', label: '☕ Hot' },
  { key: 'COLD', label: '🧊 Cold' },
  { key: 'FOOD', label: '🥪 Food' },
  { key: 'RESERVE', label: '🍃 Reserve' },
  { key: 'SEASONAL', label: '🌺 Seasonal' },
]

const STICKERS = [
  { id: 'st-espresso', name: 'Forest Espresso', src: '/images/espresso_sticker.png' },
  { id: 'st-matcha', name: 'Mossy Latte', src: '/images/matcha_sticker.png' },
  { id: 'st-coldbrew', name: 'Wildflower Cold Brew', src: '/images/iced_coffee_sticker.png' },
]

const CATEGORY_ORDER = ['HOT', 'COLD', 'FOOD', 'RESERVE', 'SEASONAL']

export function MenuSection() {
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({})
  const [stickerIdx, setStickerIdx] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { addItem, openCart } = useCartStore()
  const { data: session } = useSession()
  const isStaff = session?.user && (session.user.role === 'ADMIN' || session.user.role === 'DELIVERY')
  const [products, setProducts] = useState<Product[]>(MENU_ITEMS)
  const [isLoaded, setIsLoaded] = useState(false)
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'popularity'>('default')
  const [searchQuery, setSearchQuery] = useState('')
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Ctrl+K keyboard shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Load wishlist items on mount if logged in
  useEffect(() => {
    if (session?.user) {
      fetch('/api/user/wishlist')
        .then(res => res.ok && res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setWishlistIds(new Set(data.map(item => item.id)))
          }
        })
        .catch(err => console.error('Error fetching wishlist:', err))
    }
  }, [session])

  const handleToggleWishlist = async (productId: string) => {
    if (!session?.user) {
      alert('Please sign in to add items to your wishlist!')
      return
    }
    const isFav = wishlistIds.has(productId)
    setWishlistIds(prev => {
      const next = new Set(prev)
      if (isFav) next.delete(productId)
      else next.add(productId)
      return next
    })

    try {
      await fetch('/api/user/wishlist', {
        method: isFav ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
    } catch (err) {
      console.error('Error toggling wishlist:', err)
    }
  }

  // Fetch products from public API and preload images
  useEffect(() => {
    // First, preload initial static products & stickers
    MENU_ITEMS.forEach((item) => {
      const img = new Image()
      img.src = item.imageUrl
    })
    STICKERS.forEach((sticker) => {
      const img = new Image()
      img.src = sticker.src
    })

    // Fetch dynamic menu list from database
    async function loadProducts() {
      try {
        const res = await fetch('/api/products')
        if (res.ok) {
          const contentType = res.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json()
            if (Array.isArray(data) && data.length > 0) {
              setProducts(data)
              // Preload new dynamic product images
              data.forEach((item) => {
                const img = new Image()
                img.src = item.imageUrl
              })
            }
          }
        }
      } catch (err) {
        console.error('Failed to load menu products:', err)
      } finally {
        setIsLoaded(true)
      }
    }
    loadProducts()
  }, [])

  const handleNextSticker = () => {
    setStickerIdx((prev) => (prev + 1) % STICKERS.length)
  }

  const handlePrevSticker = () => {
    setStickerIdx((prev) => (prev - 1 + STICKERS.length) % STICKERS.length)
  }

  const handleDragEnd = (event: unknown, info: PanInfo) => {
    const swipeThreshold = 50
    if (info.offset.x < -swipeThreshold) {
      handleNextSticker()
    } else if (info.offset.x > swipeThreshold) {
      handlePrevSticker()
    }
  }

  // GSAP ScrollTrigger reveals
  useGSAP(() => {
    if (!isLoaded) return

    // Reveal header elements
    gsap.to('.menu-header .gsap-reveal', {
      opacity: 1,
      y: 0,
      stagger: 0.15,
      duration: 0.85,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.menu-header',
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    })

    gsap.from('.menu-card', {
      opacity: 0,
      y: 60,
      scale: 0.95,
      duration: 0.75,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.menu-grid',
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
    })
  }, { scope: sectionRef, dependencies: [isLoaded] })

  const sortProducts = (list: Product[]) => {
    const sorted = [...list]
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.basePrice - b.basePrice)
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.basePrice - a.basePrice)
    } else if (sortBy === 'popularity') {
      const hasBadge = (p: Product) => (p.badge && p.badge.trim().length > 0) ? 1 : 0
      sorted.sort((a, b) => hasBadge(b) - hasBadge(a))
    } else {
      sorted.sort((a, b) => {
        const idxA = CATEGORY_ORDER.indexOf(a.category)
        const idxB = CATEGORY_ORDER.indexOf(b.category)
        if (idxA !== idxB) {
          return idxA - idxB
        }
        return (a.sortOrder || 0) - (b.sortOrder || 0)
      })
    }
    return sorted
  }

  const filtered = products.filter(p => {
    if (activeFilter !== 'ALL') {
      if (activeFilter === 'SEASONAL') {
        if (p.category !== 'SEASONAL' && !p.badge?.includes('Seasonal')) return false
      } else if (p.category !== activeFilter) {
        return false
      }
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim()
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q) ||
        p.origin?.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    }
    return true
  })

  const sortedAndFiltered = sortProducts(filtered)

  const handleQuickAdd = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      basePrice: product.basePrice,
      imageUrl: product.imageUrl,
    })
    setAddedIds(prev => ({ ...prev, [product.id]: true }))
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }))
    }, 1500)
    openCart()
  }

  return (
    <section id="menu" ref={sectionRef}>
      {/* Swinging monkey decoration */}
      <svg className="swinging-monkey-container" width="120" height="260" viewBox="0 0 120 260" aria-hidden="true">
        <g className="monkey-swing-group">
          {/* Vine path */}
          <path d="M60,0 C55,40 65,80 60,120 C58,135 62,145 60,160" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />
          
          {/* Vine leaves */}
          <path d="M58,35 C45,30 40,40 58,42 Z" fill="#8bc34a" />
          <path d="M62,75 C75,70 80,80 62,82 Z" fill="#4caf50" />
          <path d="M59,115 C48,110 45,120 59,122 Z" fill="#8bc34a" />
          
          {/* Monkey Tail */}
          <path d="M50,225 C25,235 15,210 25,195 C30,187 40,195 35,202 C30,208 30,220 48,218" fill="none" stroke="#8d6e63" strokeWidth="4" strokeLinecap="round" />
          
          {/* Left Arm (holding vine) */}
          <path d="M48,192 C40,175 50,150 60,145" fill="none" stroke="#8d6e63" strokeWidth="5" strokeLinecap="round" />
          
          {/* Left Leg */}
          <path d="M50,225 C45,245 40,250 45,255" fill="none" stroke="#8d6e63" strokeWidth="5" strokeLinecap="round" />
          <circle cx="45" cy="255" r="4.5" fill="#8d6e63" />
          
          {/* Right Leg */}
          <path d="M70,225 C75,245 80,250 75,255" fill="none" stroke="#8d6e63" strokeWidth="5" strokeLinecap="round" />
          <circle cx="75" cy="255" r="4.5" fill="#8d6e63" />

          {/* Body */}
          <rect x="46" y="185" width="28" height="42" rx="14" fill="#8d6e63" />
          <rect x="51" y="195" width="18" height="26" rx="9" fill="#ffe0b2" />
          
          {/* Right Arm (holding coffee cup) */}
          <path d="M72,192 C80,195 85,200 90,205" fill="none" stroke="#8d6e63" strokeWidth="5" strokeLinecap="round" />
          
          {/* Coffee Mug */}
          <path d="M88,203 L98,203 L97,213 C97,216 95,218 92,218 L90,218 C87,218 85,216 85,213 Z" fill="#e8f5e9" stroke="#a8c5a0" strokeWidth="1.5" />
          <path d="M98,206 C101,206 102,210 98,211" fill="none" stroke="#a8c5a0" strokeWidth="1.5" />
          <line x1="87" y1="205" x2="96" y2="205" stroke="#3e2723" strokeWidth="1.5" />
          <path className="steam-line-1" d="M89,200 C88,196 90,194 89,190" fill="none" stroke="#a8c5a0" strokeWidth="1" strokeLinecap="round" />
          <path className="steam-line-2" d="M93,200 C92,195 94,193 93,188" fill="none" stroke="#a8c5a0" strokeWidth="1" strokeLinecap="round" />
          
          {/* Ears */}
          <circle cx="38" cy="165" r="8" fill="#8d6e63" />
          <circle cx="38" cy="165" r="5" fill="#ffe0b2" />
          <circle cx="82" cy="165" r="8" fill="#8d6e63" />
          <circle cx="82" cy="165" r="5" fill="#ffe0b2" />
          
          {/* Head */}
          <circle cx="60" cy="165" r="21" fill="#8d6e63" />
          <path d="M47,166 C47,152 73,152 73,166 C73,178 47,178 47,166 Z" fill="#ffe0b2" />
          <circle cx="54" cy="164" r="2.5" fill="#3e2723" />
          <circle cx="66" cy="164" r="2.5" fill="#3e2723" />
          <circle cx="50" cy="169" r="2" fill="#ffb74d" opacity="0.6" />
          <circle cx="70" cy="169" r="2" fill="#ffb74d" opacity="0.6" />
          <path d="M56,170 Q60,174 64,170" fill="none" stroke="#3e2723" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>

      {/* Decorative trees */}
      <svg className="menu-tree-dec menu-tree-l" width="120" height="360" viewBox="0 0 120 360">
        <polygon points="60,12 104,180 16,180" fill="#a8c5a0"/>
        <polygon points="60,75 110,250 10,250"  fill="#7bc47f"/>
        <rect x="52" y="248" width="16" height="112" fill="#a8c5a0"/>
      </svg>
      <svg className="menu-tree-dec menu-tree-r" width="120" height="360" viewBox="0 0 120 360">
        <polygon points="60,12 104,180 16,180" fill="#a8c5a0"/>
        <polygon points="60,75 110,250 10,250"  fill="#7bc47f"/>
        <rect x="52" y="248" width="16" height="112" fill="#a8c5a0"/>
      </svg>

      <div className="menu-inner">
        <div className="menu-header">
          <div className="menu-header-text">
            <div className="section-label gsap-reveal">
              <div className="section-label-line"/>
              <span>The Offerings</span>
            </div>
            <h2 className="menu-h2 gsap-reveal">
              Crafted from<br/><em>Earth to Cup</em>
            </h2>
          </div>
          <div className="menu-header-slider gsap-reveal">
            <div className="sticker-album-container">
              {/* Arrow Left */}
              <button 
                type="button" 
                className="sticker-arrow" 
                onClick={handlePrevSticker} 
                aria-label="Previous sticker"
              >
                ⟨
              </button>

              <div className="sticker-card-wrap">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={stickerIdx}
                    className="sticker-card"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.6}
                    onDragEnd={handleDragEnd}
                    initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                    animate={{ opacity: 1, scale: 1, rotate: stickerIdx % 2 === 0 ? 3 : -3 }}
                    exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <div className="sticker-img-frame">
                      <img
                        src={STICKERS[stickerIdx].src}
                        alt={STICKERS[stickerIdx].name}
                        className="sticker-img"
                        draggable="false"
                      />
                    </div>
                    <div className="sticker-label-text">
                      {STICKERS[stickerIdx].name}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Arrow Right */}
              <button 
                type="button" 
                className="sticker-arrow" 
                onClick={handleNextSticker} 
                aria-label="Next sticker"
              >
                ⟩
              </button>
            </div>
            
            {/* Dots */}
            <div className="sticker-dots">
              {STICKERS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  className={`sticker-dot ${stickerIdx === idx ? 'active' : ''}`}
                  onClick={() => setStickerIdx(idx)}
                  aria-label={`Go to sticker ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ maxWidth: '500px', margin: '0 auto 30px auto', position: 'relative', padding: '0 10px' }}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search our roastery menu... (Ctrl+K)"
            style={{
              width: '100%',
              padding: '14px 20px 14px 46px',
              borderRadius: '30px',
              background: 'var(--glass-bg)',
              border: '1.5px solid var(--glass-border)',
              color: 'var(--text-dark)',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'all 0.3s',
            }}
          />
          <span style={{ position: 'absolute', left: '26px', top: '16px', fontSize: '1rem', opacity: 0.6 }}>🔍</span>
          <span style={{
            position: 'absolute',
            right: '26px',
            top: '16px',
            fontSize: '0.72rem',
            background: 'rgba(0,0,0,0.08)',
            color: 'var(--text-soft)',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1.5px solid rgba(0,0,0,0.1)',
            pointerEvents: 'none'
          }}>
            Ctrl+K
          </span>
        </div>

        {/* Filter tabs */}
        <div className="menu-filters">
          {FILTERS.map(f => (
            <motion.button
              key={f.key}
              className={`menu-filter-btn ${activeFilter === f.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.key)}
              whileTap={{ scale: 0.96 }}
            >
              {f.label}
            </motion.button>
          ))}
        </div>

        {/* Sort Controls */}
        <div className="menu-sort-controls" style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)', alignSelf: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 6 }}>Sort:</span>
          {([
            { key: 'default', label: '🌱 Default' },
            { key: 'price-asc', label: '💵 Price: Low to High' },
            { key: 'price-desc', label: '💸 Price: High to Low' },
            { key: 'popularity', label: '🔥 Popularity' },
          ] as const).map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSortBy(s.key)}
              style={{
                background: sortBy === s.key ? 'var(--forest)' : 'rgba(255,255,255,0.03)',
                color: sortBy === s.key ? 'white' : 'var(--text-soft)',
                border: sortBy === s.key ? '1px solid var(--forest)' : '1px solid rgba(168,197,160,0.15)',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div
          key={activeFilter}
          className="menu-grid"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={sortedAndFiltered.length === 0 ? { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '200px' } : undefined}
        >
          {sortedAndFiltered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--sage)', padding: '40px 20px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(168,197,160,0.2)', borderRadius: 'var(--radius-lg)', width: '100%' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🌱</div>
              <h5 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--forest)', marginBottom: 8 }}>No Products Found</h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', maxWidth: 400, margin: '0 auto' }}>Try typing a different menu item, origin, or notes, or check back soon!</p>
            </div>
          ) : (
            sortedAndFiltered.map((product) => {
              const fallbackImage = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=75'
              return (
                <motion.div
                  key={product.id}
                  className="menu-card"
                  whileHover={{ y: -12, scale: 1.02 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {/* Image */}
                  <div className="menu-card-img-wrap" style={{ position: 'relative' }}>
                    <img
                      className="menu-card-img"
                      src={product.imageUrl || fallbackImage}
                      alt={product.name ? product.name.trim() : 'Coffee'}
                      onError={(e) => {
                        e.currentTarget.src = fallbackImage
                      }}
                    />
                    <div className="menu-img-overlay"/>
                    {product.badge && product.badge.trim() && (
                      <span className="menu-badge">{product.badge.trim()}</span>
                    )}
                    {product.origin && product.origin.trim() && (
                      <span className="menu-origin">{product.origin.trim()}</span>
                    )}
                    {/* Wishlist Heart Overlay */}
                    {mounted && !isStaff && (
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleWishlist(product.id)
                        }}
                        whileTap={{ scale: 0.9 }}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'rgba(7, 18, 8, 0.65)',
                          border: '1px solid rgba(123, 196, 127, 0.3)',
                          borderRadius: '50%',
                          width: '34px',
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 2,
                          color: wishlistIds.has(product.id) ? '#ff5252' : '#ffffff',
                          fontSize: '1rem',
                          outline: 'none',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                        aria-label={wishlistIds.has(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        {wishlistIds.has(product.id) ? '❤️' : '🤍'}
                      </motion.button>
                    )}
                  </div>

                  {/* Body */}
                  <div className="menu-body">
                    <div
                      className="menu-name"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {product.name ? product.name.trim() : ''}
                    </div>

                    {/* Product Ratings */}
                    {product.averageRating !== undefined && product.totalReviews !== undefined && product.totalReviews > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#e8a84e', marginBottom: '6px' }}>
                        <span>{'★'.repeat(Math.round(product.averageRating)) + '☆'.repeat(5 - Math.round(product.averageRating))}</span>
                        <span style={{ fontWeight: 700 }}>{product.averageRating}</span>
                        <span style={{ color: 'var(--text-soft)' }}>({product.totalReviews})</span>
                      </div>
                    )}
                    <div
                      className="menu-notes"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {product.notes ? product.notes.trim() : ''}
                    </div>
                    <div className="menu-dots">
                      <div className="menu-dot"/><div className="menu-dot"/><div className="menu-dot"/>
                    </div>
                    <div className="menu-footer-row">
                      <span className="menu-price">{formatPrice(product.basePrice)}</span>
                      {isStaff ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--sage)', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}>
                          Staff View Mode
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          {/* Customize button */}
                          <motion.button
                            onClick={() => setSelectedProduct(product)}
                            whileTap={{ scale: 0.96 }}
                            style={{
                              background: 'transparent',
                              border: '1.5px solid var(--sage)',
                              borderRadius: '100px',
                              padding: '8px 14px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: 'var(--text-mid)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            ✨ Custom
                          </motion.button>
                          {/* Quick add */}
                          <motion.button
                            className="menu-add-btn"
                            onClick={() => handleQuickAdd(product)}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              background: addedIds[product.id] ? 'var(--leaf)' : undefined,
                            }}
                          >
                            {addedIds[product.id] ? '✓ Added!' : '+ Add'}
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </motion.div>
      </div>

      {/* Drink Builder Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <DrinkBuilder
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAdd={(customization: CartCustomization) => {
              addItem({
                id: selectedProduct.id,
                name: selectedProduct.name,
                basePrice: selectedProduct.basePrice,
                imageUrl: selectedProduct.imageUrl,
              }, customization)
              setSelectedProduct(null)
              openCart()
            }}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
