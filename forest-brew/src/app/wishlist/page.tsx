'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/types'
import Link from 'next/link'
import Image from 'next/image'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  notes: string
  basePrice: number
  imageUrl: string
  badge?: string | null
  origin?: string | null
  category: string
  isAvailable: boolean
}

export default function WishlistPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [wishlist, setWishlist] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const addItemToCart = useCartStore(state => state.addItem)
  const openCart = useCartStore(state => state.openCart)

  const fetchWishlist = async () => {
    try {
      const res = await fetch('/api/user/wishlist')
      if (res.ok) {
        const data = await res.json()
        setWishlist(data)
      }
    } catch (err) {
      console.error('Failed to load wishlist:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchWishlist()
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false)
    }
  }, [sessionStatus])

  const handleRemove = async (productId: string) => {
    setRemovingId(productId)
    try {
      const res = await fetch('/api/user/wishlist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      })

      if (res.ok) {
        setWishlist(prev => prev.filter(item => item.id !== productId))
      }
    } catch (err) {
      console.error('Failed to remove from wishlist:', err)
    } finally {
      setRemovingId(null)
    }
  }

  const handleAddToCart = (product: Product) => {
    addItemToCart({
      id: product.id,
      name: product.name,
      basePrice: product.basePrice,
      imageUrl: product.imageUrl,
      category: product.category as any,
    })
    openCart()
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #071208 0%, #0d2012 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        fontFamily: 'var(--font-nunito), sans-serif'
      }}>
        <div className="spinner" style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(123,196,127,0.1)',
          borderTop: '3px solid var(--mint)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #071208 0%, #0d2012 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center'
      }}>
        <span style={{ fontSize: '4rem', marginBottom: '20px' }}>🔒</span>
        <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '2.5rem', marginBottom: '10px' }}>Sign In Required</h2>
        <p style={{ color: 'var(--sage)', maxWidth: '450px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
          You must be logged in to view and manage your favorite items.
        </p>
        <Link href="/auth/login?callbackUrl=/wishlist" className="btn-primary" style={{ padding: '12px 30px', borderRadius: '30px', fontWeight: 'bold' }}>
          Sign In Now
        </Link>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #071208 0%, #0d2012 100%)',
      color: '#fff',
      padding: '120px 24px 80px 24px',
      position: 'relative'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <span style={{ color: 'var(--mint)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            My Sanctuary Favorites
          </span>
          <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '3.5rem', fontWeight: 700, marginTop: '8px' }}>
            Your Wishlist
          </h1>
          <p style={{ color: 'var(--sage)', marginTop: '8px', fontSize: '1rem' }}>
            A curated collection of your favorite roasts and forest snacks.
          </p>
        </div>

        {/* Wishlist Items Grid */}
        <AnimatePresence mode="popLayout">
          {wishlist.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                textAlign: 'center',
                padding: '60px 40px',
                background: 'linear-gradient(145deg, rgba(20,45,26,0.3), rgba(10,24,14,0.15))',
                border: '1px dashed rgba(123,196,127,0.2)',
                borderRadius: '24px',
                maxWidth: '600px',
                margin: '40px auto 0 auto'
              }}
            >
              <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '20px' }}>💚</span>
              <h3 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '1.8rem', marginBottom: '10px' }}>Your Sanctuary is Empty</h3>
              <p style={{ color: 'var(--sage)', marginBottom: '25px', lineHeight: 1.5 }}>
                You haven't added any favorites yet. Explore our menu to discover artisanal roasts, drinks, and snacks.
              </p>
              <Link href="/discover" className="btn-primary" style={{ padding: '12px 30px', borderRadius: '30px', fontWeight: 'bold' }}>
                Browse Coffee Menu
              </Link>
            </motion.div>
          ) : (
            <motion.div 
              layout
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '30px',
                marginTop: '20px'
              }}
            >
              {wishlist.map(product => (
                <motion.div
                  layout
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    background: 'linear-gradient(145deg, rgba(20,45,26,0.4), rgba(10,24,14,0.2))',
                    border: '1px solid rgba(123,196,127,0.15)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    backdropFilter: 'blur(5px)',
                    position: 'relative',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                  }}
                >
                  {/* Badge */}
                  {product.badge && (
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'var(--dark-green)',
                      color: 'var(--mint)',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: '1px solid rgba(123,196,127,0.3)',
                      zIndex: 2
                    }}>
                      {product.badge}
                    </span>
                  )}

                  {/* Image */}
                  <div style={{ position: 'relative', width: '100%', height: '200px', background: '#0a160b' }}>
                    <Image 
                      src={product.imageUrl} 
                      alt={product.name} 
                      fill
                      sizes="(max-width: 768px) 100vw, 30vw"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  </div>

                  {/* Body */}
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {product.category}
                      </span>
                      <span style={{ fontWeight: 800, color: 'var(--mint)', fontSize: '1.05rem' }}>
                        {formatPrice(product.basePrice)}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>{product.name}</h3>
                    
                    {product.notes && (
                      <div style={{ 
                        fontSize: '0.78rem', 
                        color: 'var(--mint)', 
                        background: 'rgba(123,196,127,0.08)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        borderLeft: '2px solid var(--mint)',
                        marginBottom: '10px',
                        fontStyle: 'italic'
                      }}>
                        {product.notes}
                      </div>
                    )}

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', lineHeight: 1.5, margin: '0 0 16px 0', flexGrow: 1 }}>
                      {product.description}
                    </p>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleAddToCart(product)}
                        style={{
                          flexGrow: 1,
                          background: 'var(--mint)',
                          color: '#071208',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 10px rgba(123,196,127,0.2)'
                        }}
                        className="btn-hover-scale"
                      >
                        🛒 Add to Cart
                      </button>

                      <button
                        onClick={() => handleRemove(product.id)}
                        disabled={removingId === product.id}
                        style={{
                          padding: '10px 14px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          color: '#ffb2b2',
                          cursor: removingId === product.id ? 'default' : 'pointer',
                          fontSize: '0.85rem'
                        }}
                        className="btn-hover-scale"
                      >
                        {removingId === product.id ? '...' : '🗑️'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
