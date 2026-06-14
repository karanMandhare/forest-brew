'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/types'
import Script from 'next/script'
import Link from 'next/link'

interface ProfileData {
  user: {
    id: string
    email: string
    name: string
    phone?: string | null
    image?: string | null
    role: string
    loyaltyPoints: number
    walletBalance: number
    salary?: number
    subscriptionTier?: string | null
    subscriptionExpires?: string | null
    subscriptionStatus?: string | null
    unlockedBadges?: string | null
    createdAt: string
  }
  orders: Array<{
    id: string
    totalAmount: number
    status: string
    orderType: string
    tableNumber?: string | null
    paymentMethod: string
    starsRedeemed: number
    deliveryUserId?: string | null
    workerId?: string | null
    createdAt: string
    items: Array<{
      id: string
      quantity: number
      unitPrice: number
      customizations: any
      product: {
        id: string
        name: string
        imageUrl: string
        basePrice: number
      }
    }>
  }>
  walletTransactions: Array<{
    id: string
    amount: number
    type: 'TOP_UP' | 'SPENT' | 'REFUND'
    note?: string | null
    createdAt: string
  }>
  loyaltyTransactions: Array<{
    id: string
    points: number
    type: 'EARN' | 'REDEEM' | 'BONUS'
    note?: string | null
    createdAt: string
  }>
  reservations: Array<{
    id: string
    customerName: string
    email: string
    phone?: string | null
    date: string
    guestCount: number
    specialNotes?: string | null
    confirmed: boolean
    status: string
    advancePaid: number
    remainingPaid: number
    totalAmount: number
    visited: boolean
    tableNumber?: string | null
    cancellationReason?: string | null
    createdAt: string
    feedbacks: Array<{
      id: string
      rating: number
      comments: string | null
    }>
  }>
}

export default function UserProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'account' | 'orders' | 'wallet' | 'stars' | 'bookings' | 'notifications' | 'subscription'>('account')
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [showBellDropdown, setShowBellDropdown] = useState(false)

  // Feedback states for table booking completion
  const [feedbackResvId, setFeedbackResvId] = useState<string | null>(null)
  const [feedbackRating, setFeedbackRating] = useState<number>(5)
  const [feedbackComment, setFeedbackComment] = useState<string>('')
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false)

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackResvId) return
    setSubmittingFeedback(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: feedbackResvId,
          rating: feedbackRating,
          comments: feedbackComment,
          type: 'RESERVATION',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('💚 Thank you for your feedback!')
        setFeedbackResvId(null)
        setFeedbackComment('')
        setFeedbackRating(5)
        await fetchProfileData()
      } else {
        showToast(`❌ Failed to submit feedback: ${data.error || 'Unknown'}`)
      }
    } catch {
      showToast('❌ Error submitting feedback')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        setUnreadNotificationsCount(data.filter((n: any) => !n.isRead).length)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }, [])

  const markNotificationsAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' })
      if (res.ok) {
        setUnreadNotificationsCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      }
    } catch (err) {
      console.error('Error marking notifications read:', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'notifications') {
      markNotificationsAsRead()
    }
  }, [activeTab])

  // Account editing state
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editImage, setEditImage] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Password change state
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [showPwCurrent, setShowPwCurrent] = useState(false)
  const [showPwNew, setShowPwNew] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [pwMsg, setPwMsg] = useState<{type:'success'|'error', text:string}|null>(null)

  // OTP Reset state
  const [otpStep, setOtpStep] = useState<'idle'|'sending'|'otp'|'verifying'|'newpw'|'done'>('idle')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpNewPw, setOtpNewPw] = useState('')
  const [otpNewPwConfirm, setOtpNewPwConfirm] = useState('')
  const [otpMsg, setOtpMsg] = useState<{type:'success'|'error', text:string}|null>(null)
  const [showOtpReset, setShowOtpReset] = useState(false)

  // Top up states
  // Sync edit fields when profile loads
  const [profileSaveMsg, setProfileSaveMsg] = useState<{type:'success'|'error', text:string}|null>(null)

  const [topupAmount, setTopupAmount] = useState<number>(500) // Default ₹500
  const [customAmountText, setCustomAmountText] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const { addItem, openCart } = useCartStore()

  // Tipping states
  const [tippingOrderId, setTippingOrderId] = useState<string | null>(null)
  const [tipAmountText, setTipAmountText] = useState('')
  const [tippingLoading, setTippingLoading] = useState(false)

  const handleSendTip = async (e: React.FormEvent, orderId: string) => {
    e.preventDefault()
    if (!tipAmountText || parseFloat(tipAmountText) <= 0) {
      showToast('❌ Please enter a valid tip amount.')
      return
    }
    setTippingLoading(true)
    try {
      const res = await fetch('/api/user/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amountRupees: tipAmountText
        })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`💚 Successfully sent ₹${parseFloat(tipAmountText).toFixed(2)} tip to ${data.workerName || 'staff'}!`)
        setTipAmountText('')
        setTippingOrderId(null)
        await fetchProfileData() // Refresh profile balance & transactions
      } else {
        showToast(`❌ Failed to tip: ${data.error || 'Unknown error'}`)
      }
    } catch {
      showToast('❌ Network connection error.')
    } finally {
      setTippingLoading(false)
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => {
      setToast(prev => prev === msg ? null : prev)
    }, 4000)
  }

  const fetchProfileData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      } else {
        const errData = await res.json()
        setError(errData.error || 'Failed to load profile details.')
      }
    } catch (err) {
      console.error(err)
      setError('Connection error fetching profile details.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role === 'ADMIN') {
        router.push('/admin')
      } else if (session?.user?.role === 'DELIVERY') {
        router.push('/worker')
      } else {
        fetchProfileData()
        fetchNotifications()
      }
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status, session, router, fetchProfileData, fetchNotifications])

  // Sync edit fields when profile loads
  useEffect(() => {
    if (profile?.user) {
      setEditName(profile.user.name || '')
      setEditEmail(profile.user.email || '')
      setEditImage(profile.user.image || '')
      setEditPhone(profile.user.phone || '')
    }
  }, [profile])

  // Update profile handler
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileSaveMsg(null)
    try {
      const res = await fetch('/api/user/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, image: editImage, phone: editPhone }),
      })
      const data = await res.json()
      if (res.ok) {
        setProfileSaveMsg({ type: 'success', text: 'Profile updated successfully!' })
        await fetchProfileData()
      } else {
        setProfileSaveMsg({ type: 'error', text: data.error || 'Failed to update profile.' })
      }
    } catch {
      setProfileSaveMsg({ type: 'error', text: 'Connection error.' })
    } finally {
      setProfileSaving(false)
    }
  }

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (pwNew !== pwConfirm) { setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return }
    if (pwNew.length < 8) { setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return }
    setPwSaving(true)
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwMsg({ type: 'success', text: '✅ Password changed successfully!' })
        setPwCurrent(''); setPwNew(''); setPwConfirm('')
      } else {
        setPwMsg({ type: 'error', text: data.error || 'Failed to change password.' })
      }
    } catch {
      setPwMsg({ type: 'error', text: 'Connection error.' })
    } finally {
      setPwSaving(false)
    }
  }

  // OTP reset handlers
  const handleSendOTP = async () => {
    if (!otpEmail) { setOtpMsg({ type: 'error', text: 'Enter your email.' }); return }
    setOtpStep('sending')
    setOtpMsg(null)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail }),
      })
      if (res.ok) {
        setOtpStep('otp')
        setOtpMsg({ type: 'success', text: `OTP sent to ${otpEmail}. Check your inbox.` })
      } else {
        const d = await res.json(); setOtpMsg({ type: 'error', text: d.error || 'Failed to send OTP.' }); setOtpStep('idle')
      }
    } catch { setOtpMsg({ type: 'error', text: 'Connection error.' }); setOtpStep('idle') }
  }

  const handleVerifyOTP = async () => {
    if (!otpCode) { setOtpMsg({ type: 'error', text: 'Enter the OTP code.' }); return }
    setOtpStep('verifying')
    setOtpMsg(null)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp: otpCode }),
      })
      if (res.ok) {
        setOtpStep('newpw')
        setOtpMsg({ type: 'success', text: 'OTP verified! Now set your new password.' })
      } else {
        const d = await res.json(); setOtpMsg({ type: 'error', text: d.error || 'Invalid OTP.' }); setOtpStep('otp')
      }
    } catch { setOtpMsg({ type: 'error', text: 'Connection error.' }); setOtpStep('otp') }
  }

  const handleResetPassword = async () => {
    if (!otpNewPw || otpNewPw !== otpNewPwConfirm) { setOtpMsg({ type: 'error', text: 'Passwords do not match.' }); return }
    if (otpNewPw.length < 8) { setOtpMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return }
    try {
      const res = await fetch('/api/auth/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, newPassword: otpNewPw }),
      })
      if (res.ok) {
        setOtpStep('done')
        setOtpMsg({ type: 'success', text: '✅ Password reset! Please log in with your new password.' })
      } else {
        const d = await res.json(); setOtpMsg({ type: 'error', text: d.error || 'Reset failed.' })
      }
    } catch { setOtpMsg({ type: 'error', text: 'Connection error.' }) }
  }

  // Top Up Wallet via Razorpay
  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setTopupLoading(true)

    const amountInPaise = customAmountText 
      ? Math.round(parseFloat(customAmountText) * 100) 
      : topupAmount * 100

    if (isNaN(amountInPaise) || amountInPaise < 10000 || amountInPaise > 500000) {
      setError('Please reload between ₹100 and ₹5,000.')
      setTopupLoading(false)
      return
    }

    try {
      // 1. Create topup order
      const res = await fetch('/api/user/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountInPaise }),
      })

      const topupData = await res.json()
      if (!res.ok) {
        throw new Error(topupData.error || 'Failed to initiate reload.')
      }

      const isRazorpayConfigured =
        topupData.razorpayOrderId &&
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
        !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.includes('xxxxxxxx')

      if (isRazorpayConfigured) {
        // 2. Open Razorpay Widget
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: topupData.amount,
          currency: 'INR',
          name: 'Forest Brew Card',
          description: 'Reload Forest Brew Prepaid Digital Wallet balance',
          order_id: topupData.razorpayOrderId,
          handler: async function (response: any) {
            setTopupLoading(true)
            try {
              const verifyRes = await fetch('/api/user/wallet/verify-topup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  amount: amountInPaise,
                }),
              })

              const verifyData = await verifyRes.json()
              if (verifyRes.ok && verifyData.success) {
                showToast(`💳 Reloaded ₹${(amountInPaise / 100).toFixed(0)} successfully! Earned bonus stars.`)
                setCustomAmountText('')
                await fetchProfileData()
              } else {
                throw new Error(verifyData.error || 'Reload verification failed.')
              }
            } catch (err: any) {
              setError(err.message || 'Reload failed.')
            } finally {
              setTopupLoading(false)
            }
          },
          prefill: {
            name: profile?.user?.name || session?.user?.name || '',
            email: profile?.user?.email || session?.user?.email || '',
          },
          theme: { color: '#1b3f27' },
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.open()
      } else {
        // 3. Mock Topup Reload in Dev
        console.warn('Razorpay keys not fully configured. Simulating mock wallet load.')
        const mockVerifyRes = await fetch('/api/user/wallet/verify-topup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpayOrderId: topupData.razorpayOrderId || 'mock_topup_order_id',
            razorpayPaymentId: 'mock_pay_topup_' + Math.random().toString(36).substring(7),
            razorpaySignature: 'mock_signature',
            amount: amountInPaise,
          }),
        })

        await new Promise(resolve => setTimeout(resolve, 1500))

        if (mockVerifyRes.ok) {
          showToast(`💳 Reloaded ₹${(amountInPaise / 100).toFixed(0)} successfully (Mock Mode)!`)
          setCustomAmountText('')
          await fetchProfileData()
        } else {
          const verifyData = await mockVerifyRes.json()
          throw new Error(verifyData.error || 'Mock reload verification failed.')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Reload failed.')
    } finally {
      setTopupLoading(false)
    }
  }

  // Quick Reorder action
  const handleReorder = (order: ProfileData['orders'][0]) => {
    order.items.forEach(item => {
      addItem({
        id: item.product.id,
        name: item.product.name,
        basePrice: item.product.basePrice,
        imageUrl: item.product.imageUrl,
      }, item.customizations)
    })
    showToast(`🛒 Added items from Order #${order.id.slice(-6).toUpperCase()} to your cart!`)
    openCart()
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
      if (customization.size) parts.push(`Size: ${String(customization.size).toUpperCase()}`)
      if (customization.temperature) parts.push(`Temp: ${String(customization.temperature).toUpperCase()}`)
      if (customization.milk) parts.push(`Milk: ${String(customization.milk).toUpperCase()}`)
      if (customization.syrups && Array.isArray(customization.syrups)) {
        if (customization.syrups.length > 0) parts.push(`Syrups: ${customization.syrups.join(', ')}`)
      } else if (customization.syrups && typeof customization.syrups === 'string') {
        parts.push(`Syrup: ${customization.syrups}`)
      }
    }
    return parts.join(' · ')
  }

  // Stars tiers
  const getLoyaltyTier = (points: number) => {
    if (points >= 200) return { title: '🌟 Gold Status Member', starsNeeded: 0, text: 'You are a VIP. Enjoy exclusive bonus offers and free drink redemptions!' }
    return { title: '🌿 Green Status Member', starsNeeded: 200 - points, text: `Earn ${200 - points} more Stars to unlock Gold Status!` }
  }

  if (status === 'loading' || (loading && !profile) || (session?.user && (session.user.role === 'ADMIN' || session.user.role === 'DELIVERY'))) {
    return (
      <div className="admin-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#09170a' }}>
        <div style={{ color: 'var(--mint)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', textAlign: 'center' }}>
          <span className="pulse-dot" style={{ background: 'var(--mint)', marginRight: 12 }} /> 
          Loading your rewards account...
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 16px' }}>
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: 450, padding: '40px 24px' }}>
          <span style={{ fontSize: '3.5rem' }}>☕</span>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', marginTop: 16 }}>
            Starbucks Rewards & Wallet
          </h2>
          <p style={{ color: 'var(--text-soft)', marginTop: 12, marginBottom: 24, fontSize: '0.9rem', lineHeight: '1.5' }}>
            Sign in to check your Starbucks card balance, load funds, view your star level, and enjoy rapid one-click reordering of your favorite custom blends.
          </p>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => signIn()}>
            Sign In / Register
          </button>
        </div>
      </div>
    )
  }

  const userStars = profile?.user?.loyaltyPoints || 0
  const tierInfo = getLoyaltyTier(userStars)
  const goldProgress = Math.min(100, (userStars / 200) * 100)

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="admin-layout" style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)', padding: '100px 24px 60px 24px', color: 'var(--cream)' }}>
        
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              style={{
                position: 'fixed',
                top: 24,
                right: 24,
                background: 'rgba(27, 63, 39, 0.92)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--mint)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 24px',
                color: 'var(--cream)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              <span>🌿</span>
              <span>{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ color: 'var(--mint)', fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
                My Account
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--cream)' }}>
                Welcome back, {profile?.user?.name || 'Coffee Lover'}
              </h1>
              <p style={{ color: 'var(--sage)', fontSize: '0.88rem', marginTop: 4 }}>
                Member since {profile?.user?.createdAt ? new Date(profile.user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'recently'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
              {/* Notification Bell */}
              <button
                onClick={() => {
                  setShowBellDropdown(v => !v)
                  if (!showBellDropdown) {
                    markNotificationsAsRead()
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  fontSize: '1.2rem',
                  color: 'var(--cream)',
                  outline: 'none'
                }}
              >
                🔔
                {unreadNotificationsCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    background: '#d32f2f',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Bell Dropdown */}
              <AnimatePresence>
                {showBellDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 54,
                      width: 320,
                      background: 'rgba(17, 34, 21, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(168, 197, 160, 0.25)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 16,
                      boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--mint)' }}>Recent Notifications</span>
                      <button
                        onClick={() => {
                          setActiveTab('notifications')
                          setShowBellDropdown(false)
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--sage)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        View All
                      </button>
                    </div>
                    <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '0.78rem', color: 'var(--sage)' }}>
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.slice(0, 4).map(n => (
                          <div key={n.id} style={{ fontSize: '0.78rem', borderBottom: '1px dashed rgba(255,255,255,0.04)', paddingBottom: 8 }}>
                            <div style={{ fontWeight: 600, color: '#fff' }}>{n.title}</div>
                            <div style={{ color: 'var(--sage)', marginTop: 2, lineHeight: 1.3 }}>{n.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Link
                href="/"
                className="btn-outline"
                style={{ borderColor: 'rgba(123,196,127,0.3)', color: 'var(--mint)', padding: '10px 20px', borderRadius: 'var(--radius-full)', display: 'inline-block', textDecoration: 'none' }}
              >
                ← Cafe Menu
              </Link>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 24, color: '#ff8a80', fontSize: '0.9rem' }}>
              ⚠️ {error}
            </div>
          )}



          {/* Detailed Ledger Section (Tabs) */}
          <div style={{ background: 'rgba(20, 45, 23, 0.35)', border: '1px solid rgba(168, 197, 160, 0.15)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', backdropFilter: 'var(--glass-blur)' }}>
            
            {/* Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
              {[
                { key: 'account', label: '🔐 My Account' },
                { key: 'subscription', label: '⭐ Forest Club' },
                { key: 'orders', label: '☕ Past Orders' },
                { key: 'bookings', label: '📅 Table Bookings' },
                { key: 'wallet', label: '💳 Wallet' },
                { key: 'stars', label: '🌟 Stars' },
                { key: 'notifications', label: `🔔 Notifications (${unreadNotificationsCount})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid var(--mint)' : '2px solid transparent',
                    color: activeTab === tab.key ? '#fff' : 'var(--sage)',
                    padding: '8px 12px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    paddingBottom: 14,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB: MY ACCOUNT ──────────────────────────────── */}
            {activeTab === 'account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

                {/* === Avatar + Identity === */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {editImage ? (
                      <img src={editImage} alt="Avatar" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--mint)' }} onError={() => setEditImage('')} />
                    ) : (
                      <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,#1b3f27,#0d5c1a)', border: '3px solid var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: '#7bc47f', fontFamily: 'var(--font-display)' }}>
                        {(profile?.user?.name || profile?.user?.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Identity */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>
                      {profile?.user?.name || 'Member'}
                    </div>
                    <div style={{ color: 'var(--sage)', fontSize: '0.85rem', marginTop: 4 }}>
                      {profile?.user?.email} {profile?.user?.phone && `• ${profile.user.phone}`}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(74,140,63,0.15)', border: '1px solid rgba(74,140,63,0.3)', color: 'var(--mint)', borderRadius: 100, padding: '2px 12px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {profile?.user?.role || 'USER'}
                      </span>
                      <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--sage)', borderRadius: 100, padding: '2px 12px', fontSize: '0.72rem' }}>
                        Member since {profile?.user?.createdAt ? new Date(profile.user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* === Account Stats === */}
                <div>
                  <h4 style={{ color: 'var(--mint)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>📊 Account Statistics</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
                    {[
                      { label: 'Total Spending', value: formatPrice(profile?.orders?.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + o.totalAmount, 0) || 0), icon: '💰' },
                      { label: 'Orders Placed', value: String(profile?.orders?.length || 0), icon: '☕' },
                      { label: 'Stars Earned', value: String(profile?.user?.loyaltyPoints || 0) + ' ★', icon: '🌟' },
                      { label: 'Wallet Balance', value: formatPrice(profile?.user?.walletBalance || 0), icon: '💳' },
                      { label: 'Table Bookings', value: String(profile?.reservations?.length || 0), icon: '📅' },
                      { label: 'Member ID', value: profile?.user?.id?.slice(-8).toUpperCase() || '—', icon: '🔖' },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                        <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{stat.icon}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sage)', marginBottom: 4 }}>{stat.label}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* === Edit Profile === */}
                <div>
                  <h4 style={{ color: 'var(--mint)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>✏️ Edit Account Details</h4>
                  <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="profile-grid-three">
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>Display Name</label>
                        <input className="form-field" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name" style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>Email Address</label>
                        <input className="form-field" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@example.com" style={{ width: '100%' }} disabled />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>Phone Number</label>
                        <input className="form-field" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone number" style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>Profile Photo URL</label>
                      <input className="form-field" value={editImage} onChange={e => setEditImage(e.target.value)} placeholder="https://example.com/photo.jpg" style={{ width: '100%' }} />
                      <p style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: 4 }}>Paste any direct image link (Google Photos, Imgur, etc.)</p>
                    </div>
                    {profileSaveMsg && (
                      <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', background: profileSaveMsg.type === 'success' ? 'rgba(74,140,63,0.12)' : 'rgba(229,57,53,0.1)', color: profileSaveMsg.type === 'success' ? 'var(--mint)' : '#ef5350', border: `1px solid ${profileSaveMsg.type === 'success' ? 'rgba(74,140,63,0.3)' : 'rgba(229,57,53,0.3)'}` }}>
                        {profileSaveMsg.text}
                      </div>
                    )}
                    <div>
                      <button type="submit" disabled={profileSaving} className="btn-primary" style={{ padding: '10px 28px', fontSize: '0.88rem' }}>
                        {profileSaving ? 'Saving...' : '💾 Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* === Change Password === */}
                <div>
                  <h4 style={{ color: 'var(--mint)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>🔑 Change Password</h4>
                  <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
                    {[
                      { label: 'Current Password', val: pwCurrent, set: setPwCurrent, show: showPwCurrent, toggle: () => setShowPwCurrent(v => !v) },
                      { label: 'New Password', val: pwNew, set: setPwNew, show: showPwNew, toggle: () => setShowPwNew(v => !v) },
                      { label: 'Confirm New Password', val: pwConfirm, set: setPwConfirm, show: showPwConfirm, toggle: () => setShowPwConfirm(v => !v) },
                    ].map(field => (
                      <div key={field.label}>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>{field.label}</label>
                        <div style={{ position: 'relative' }}>
                          <input className="form-field" type={field.show ? 'text' : 'password'} value={field.val} onChange={e => field.set(e.target.value)} placeholder="••••••••" style={{ width: '100%', paddingRight: 44 }} />
                          <button type="button" onClick={field.toggle} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage)', fontSize: '0.85rem' }}>
                            {field.show ? '🙈' : '👁️'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {pwMsg && (
                      <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', background: pwMsg.type === 'success' ? 'rgba(74,140,63,0.12)' : 'rgba(229,57,53,0.1)', color: pwMsg.type === 'success' ? 'var(--mint)' : '#ef5350', border: `1px solid ${pwMsg.type === 'success' ? 'rgba(74,140,63,0.3)' : 'rgba(229,57,53,0.3)'}` }}>
                        {pwMsg.text}
                      </div>
                    )}
                    <button type="submit" disabled={pwSaving} className="btn-primary" style={{ padding: '10px 28px', fontSize: '0.88rem', alignSelf: 'flex-start' }}>
                      {pwSaving ? 'Updating...' : '🔑 Update Password'}
                    </button>
                  </form>
                </div>

                {/* === Forgot / Reset Password via OTP === */}
                <div>
                  <button
                    onClick={() => { setShowOtpReset(v => !v); setOtpStep('idle'); setOtpMsg(null); setOtpEmail(profile?.user?.email || '') }}
                    style={{ background: 'none', border: 'none', color: 'var(--amber)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    {showOtpReset ? '▲ Hide' : '▼ Forgot Password?'} Reset via Email OTP
                  </button>

                  {showOtpReset && (
                    <div style={{ marginTop: 16, padding: 20, background: 'rgba(200,135,58,0.06)', border: '1px solid rgba(200,135,58,0.2)', borderRadius: 'var(--radius-lg)', maxWidth: 480 }}>
                      <h5 style={{ margin: '0 0 16px', color: 'var(--amber)', fontSize: '0.9rem', fontWeight: 700 }}>🔐 Reset Password via Email OTP</h5>

                      {/* Step 1: Enter email */}
                      {(otpStep === 'idle' || otpStep === 'sending') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>Your registered email</label>
                            <input className="form-field" type="email" value={otpEmail} onChange={e => setOtpEmail(e.target.value)} placeholder="email@example.com" style={{ width: '100%' }} />
                          </div>
                          <button onClick={handleSendOTP} disabled={otpStep === 'sending'} className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.85rem', alignSelf: 'flex-start' }}>
                            {otpStep === 'sending' ? 'Sending OTP...' : '📧 Send OTP to Email'}
                          </button>
                        </div>
                      )}

                      {/* Step 2: Enter OTP */}
                      {(otpStep === 'otp' || otpStep === 'verifying') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--sage)' }}>Enter the 6-digit code sent to <strong style={{ color: '#fff' }}>{otpEmail}</strong></p>
                          <input
                            className="form-field"
                            value={otpCode}
                            onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6-digit OTP"
                            maxLength={6}
                            style={{ fontSize: '1.4rem', letterSpacing: '0.3em', textAlign: 'center', width: '100%' }}
                          />
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={handleVerifyOTP} disabled={otpStep === 'verifying' || otpCode.length < 6} className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.85rem' }}>
                              {otpStep === 'verifying' ? 'Verifying...' : '✅ Verify OTP'}
                            </button>
                            <button onClick={() => setOtpStep('idle')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--sage)', padding: '10px 20px', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '0.82rem' }}>
                              ← Back
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Step 3: New password */}
                      {otpStep === 'newpw' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>New Password</label>
                            <input className="form-field" type="password" value={otpNewPw} onChange={e => setOtpNewPw(e.target.value)} placeholder="Min 8 characters" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>Confirm New Password</label>
                            <input className="form-field" type="password" value={otpNewPwConfirm} onChange={e => setOtpNewPwConfirm(e.target.value)} placeholder="Repeat password" style={{ width: '100%' }} />
                          </div>
                          <button onClick={handleResetPassword} className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.85rem', alignSelf: 'flex-start' }}>
                            🔒 Set New Password
                          </button>
                        </div>
                      )}

                      {/* Step 4: Done */}
                      {otpStep === 'done' && (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                          <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                          <p style={{ color: 'var(--mint)', fontWeight: 700, margin: 0 }}>Password reset successfully!</p>
                          <p style={{ color: 'var(--sage)', fontSize: '0.85rem', marginTop: 6 }}>Please log in again with your new password.</p>
                        </div>
                      )}

                      {/* OTP messages */}
                      {otpMsg && otpStep !== 'done' && (
                        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', background: otpMsg.type === 'success' ? 'rgba(74,140,63,0.12)' : 'rgba(229,57,53,0.1)', color: otpMsg.type === 'success' ? 'var(--mint)' : '#ef5350', border: `1px solid ${otpMsg.type === 'success' ? 'rgba(74,140,63,0.3)' : 'rgba(229,57,53,0.3)'}` }}>
                          {otpMsg.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}

             {/* Tab: Subscriptions */}
             {activeTab === 'subscription' && (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                 {!profile?.user?.subscriptionTier || profile.user.subscriptionStatus !== 'ACTIVE' ? (
                   <div style={{
                     textAlign: 'center',
                     padding: '48px 24px',
                     border: '1px dashed rgba(168,197,160,0.2)',
                     borderRadius: 'var(--radius-xl)',
                     background: 'rgba(255,255,255,0.01)',
                     display: 'flex',
                     flexDirection: 'column',
                     alignItems: 'center',
                     gap: 16
                   }}>
                     <span style={{ fontSize: '3rem' }}>⭐</span>
                     <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#fff', margin: 0 }}>
                       Unlock the Forest Brew Club
                     </h3>
                     <p style={{ color: 'var(--sage)', fontSize: '0.88rem', maxWidth: 450, margin: '0 auto', lineHeight: 1.5 }}>
                       You do not have an active Forest Club subscription. Get 10%-20% off all orders, free daily specialty beverages, priority bookings, and coworking workspace passes.
                     </p>
                     <Link
                       href="/subscription"
                       className="btn-primary"
                       style={{ padding: '12px 28px', borderRadius: 'var(--radius-full)', textDecoration: 'none', fontWeight: 700 }}
                     >
                       Explore Subscription Passes
                     </Link>
                   </div>
                 ) : (
                   <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }} className="checkout-layout">
                     {/* Pass Details */}
                     <div style={{
                       background: 'rgba(255,255,255,0.02)',
                       border: '1px solid rgba(255,255,255,0.06)',
                       borderRadius: 'var(--radius-xl)',
                       padding: 28,
                       display: 'flex',
                       flexDirection: 'column',
                       justifyContent: 'space-between'
                     }}>
                       <div>
                         <span style={{
                           background: profile.user.subscriptionTier === 'REDWOOD' ? 'rgba(245,158,11,0.15)' : profile.user.subscriptionTier === 'CANOPY' ? 'rgba(16,185,129,0.15)' : 'rgba(74,140,63,0.15)',
                           border: '1px solid ' + (profile.user.subscriptionTier === 'REDWOOD' ? 'rgba(245,158,11,0.3)' : profile.user.subscriptionTier === 'CANOPY' ? 'rgba(16,185,129,0.3)' : 'rgba(74,140,63,0.3)'),
                           color: profile.user.subscriptionTier === 'REDWOOD' ? '#f59e0b' : profile.user.subscriptionTier === 'CANOPY' ? 'var(--mint)' : '#7bc47f',
                           padding: '4px 12px',
                           borderRadius: 20,
                           fontSize: '0.7rem',
                           fontWeight: 700,
                           textTransform: 'uppercase',
                           display: 'inline-block',
                           marginBottom: 16
                         }}>
                           Active Membership Pass
                         </span>
                         
                         <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#fff', margin: '0 0 8px 0' }}>
                           {profile.user.subscriptionTier === 'SEEDLING' && '🌱 The Seedling Pass'}
                           {profile.user.subscriptionTier === 'CANOPY' && '🌳 The Canopy Pass'}
                           {profile.user.subscriptionTier === 'REDWOOD' && '🌲 The Redwood Club'}
                         </h3>
                         
                         <p style={{ color: 'var(--sage)', fontSize: '0.85rem', margin: '0 0 24px 0' }}>
                           Deducted monthly from wallet. Valid through <strong>{profile.user.subscriptionExpires ? new Date(profile.user.subscriptionExpires).toLocaleDateString('en-IN', { dateStyle: 'long' }) : '—'}</strong>
                         </p>

                         {/* Tier Benefits */}
                         <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                           <span style={{ fontSize: '0.78rem', color: 'var(--mint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Membership Benefits:</span>
                           <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
                             {profile.user.subscriptionTier === 'SEEDLING' && (
                               <>
                                 <li>✓ <strong>10% off</strong> all cafe beverage and food items.</li>
                                 <li>✓ <strong>1 free customization</strong> (syrup, milk etc) per order.</li>
                                 <li>✓ <strong>Double stars</strong> earned on card reloads.</li>
                               </>
                             )}
                             {profile.user.subscriptionTier === 'CANOPY' && (
                               <>
                                 <li>✓ <strong>20% off</strong> all cafe beverage and food items.</li>
                                 <li>✓ <strong>3 free signature drinks</strong> every month.</li>
                                 <li>✓ <strong>Unlimited free customizations</strong> (milks, toppings).</li>
                                 <li>✓ <strong>Priority visual bookings</strong> seating reservations.</li>
                               </>
                             )}
                             {profile.user.subscriptionTier === 'REDWOOD' && (
                               <>
                                 <li>✓ <strong>1 free beverage daily</strong> (barista hand-crafted).</li>
                                 <li>✓ <strong>20% off</strong> all premium pastry and food items.</li>
                                 <li>✓ <strong>Free coworking table access</strong> at the Canopy Nest.</li>
                                 <li>✓ <strong>VIP bookings</strong> of visual layouts and tables.</li>
                                 <li>✓ <strong>Exclusive single-origin</strong> bean tasting invites.</li>
                               </>
                             )}
                           </ul>
                         </div>
                       </div>

                       <div style={{ marginTop: 24, fontSize: '0.75rem', color: 'var(--text-soft)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                         Need to change tiers? Subscriptions auto-renew but you can let them expire or subscribe to a different tier.
                       </div>
                     </div>

                     {/* Visual QR Card pass */}
                     <div style={{
                       background: profile.user.subscriptionTier === 'REDWOOD'
                         ? 'linear-gradient(135deg, rgba(180,83,9,0.3) 0%, rgba(245,158,11,0.08) 100%)'
                         : 'linear-gradient(135deg, rgba(27,63,39,0.35) 0%, rgba(13,148,136,0.08) 100%)',
                       border: '1px solid ' + (profile.user.subscriptionTier === 'REDWOOD' ? 'rgba(245,158,11,0.25)' : 'rgba(168,197,160,0.2)'),
                       borderRadius: 'var(--radius-xl)',
                       padding: 32,
                       display: 'flex',
                       flexDirection: 'column',
                       alignItems: 'center',
                       justifyItems: 'center',
                       textAlign: 'center',
                       boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                       position: 'relative'
                     }}>
                       <div style={{ color: 'var(--mint)', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 800, marginBottom: 20 }}>
                         Store Member Verification
                       </div>

                       {/* Simulated SVG QR Code */}
                       <div style={{ background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', marginBottom: 20 }}>
                         <svg width="130" height="130" viewBox="0 0 10 10" style={{ background: '#fff' }}>
                           {/* Corners */}
                           <rect x="0" y="0" width="3" height="3" fill="#0f2212" />
                           <rect x="1" y="1" width="1" height="1" fill="#fff" />
                           
                           <rect x="7" y="0" width="3" height="3" fill="#0f2212" />
                           <rect x="8" y="1" width="1" height="1" fill="#fff" />
                           
                           <rect x="0" y="7" width="3" height="3" fill="#0f2212" />
                           <rect x="1" y="8" width="1" height="1" fill="#fff" />
                           
                           {/* Random blocks representing data */}
                           <rect x="4" y="0" width="1" height="2" fill="#0f2212" />
                           <rect x="5" y="1" width="1" height="1" fill="#0f2212" />
                           <rect x="3" y="3" width="1" height="1" fill="#0f2212" />
                           <rect x="4" y="4" width="2" height="2" fill="#0f2212" />
                           <rect x="1" y="4" width="2" height="1" fill="#0f2212" />
                           <rect x="8" y="4" width="1" height="3" fill="#0f2212" />
                           <rect x="5" y="7" width="1" height="2" fill="#0f2212" />
                           <rect x="7" y="8" width="2" height="1" fill="#0f2212" />
                         </svg>
                       </div>

                       <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
                         {profile.user.name || 'Member Pass'}
                       </div>
                       <div style={{ color: 'var(--sage)', fontSize: '0.78rem', lineHeight: 1.4 }}>
                         Email: {profile.user.email}<br/>
                         <span style={{ fontSize: '0.7rem', color: 'var(--text-soft)', marginTop: 8, display: 'inline-block' }}>
                           Show this QR code to the barista to redeem your active benefits at the counter.
                         </span>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             )}

            {/* Tab 1: Orders */}
            {activeTab === 'orders' && (

              <div>
                {!profile?.orders || profile.orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sage)', fontSize: '0.9rem' }}>
                    🌿 You haven't placed any orders yet. Place your first order to earn stars!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {profile.orders.map(order => (
                      <div
                        key={order.id}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 20,
                        }}
                      >
                        {/* Order info */}
                        <div style={{ flex: 1, minWidth: 280 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <span style={{ color: 'var(--mint)', fontWeight: 700, fontSize: '0.95rem' }}>
                              #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--sage)' }}>
                              {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}{' '}
                              {new Date(order.createdAt).toLocaleTimeString('en-IN', { timeStyle: 'short' })}
                            </span>
                            <span style={{
                              background: 'rgba(255,255,255,0.06)',
                              color: 'var(--sage)',
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}>
                              {order.orderType === 'DELIVERY' ? '🛵 Delivery' : '☕ Dine In'}
                            </span>
                          </div>

                          {/* Items list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '12px 0' }}>
                            {order.items.map(item => (
                              <div key={item.id} style={{ fontSize: '0.85rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--cream)' }}>
                                  {item.product.name} × {item.quantity}
                                </span>{' '}
                                <span style={{ color: 'var(--text-soft)', fontSize: '0.75rem' }}>
                                  ({formatPrice(item.unitPrice)} each)
                                </span>
                                {item.customizations && formatCustomization(item.customizations) && (
                                  <div style={{ color: 'var(--sage)', fontSize: '0.75rem', marginTop: 2, paddingLeft: 8, borderLeft: '1.5px solid rgba(255,255,255,0.08)' }}>
                                    {formatCustomization(item.customizations)}
                                  </div>
                                )}
                                {item.customizations?.specialInstructions && (
                                  <div style={{ color: 'var(--amber)', fontSize: '0.75rem', marginTop: 2, paddingLeft: 8, borderLeft: '1.5px solid rgba(255,255,255,0.08)', fontStyle: 'italic' }}>
                                    Note: "{item.customizations.specialInstructions}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Payment summaries */}
                          <div style={{ fontSize: '0.8rem', color: 'var(--sage)', display: 'flex', gap: 16 }}>
                            <span>Paid via: <strong style={{ color: '#fff' }}>{order.paymentMethod}</strong></span>
                            {order.starsRedeemed > 0 && (
                              <span style={{ color: 'var(--amber)' }}> Redeemed: {order.starsRedeemed} Stars</span>
                            )}
                          </div>
                        </div>

                        {/* Order pricing / actions */}
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                            {formatPrice(order.totalAmount)}
                          </span>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '100px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: order.status === 'DELIVERED' ? 'rgba(74,140,63,0.15)' : 'rgba(232,168,78,0.15)',
                            color: order.status === 'DELIVERED' ? 'var(--mint)' : 'var(--amber)',
                            border: '1px solid ' + (order.status === 'DELIVERED' ? 'rgba(74,140,63,0.3)' : 'rgba(232,168,78,0.3)'),
                          }}>
                            {order.status}
                          </span>
                          {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' ? (
                            <Link
                              href={`/order-status/${order.id}`}
                              className="btn-outline"
                              style={{
                                marginTop: 10,
                                padding: '8px 16px',
                                fontSize: '0.75rem',
                                background: 'var(--forest)',
                                color: '#fff',
                                borderColor: 'var(--leaf)',
                                borderRadius: 'var(--radius-full)',
                                textDecoration: 'none',
                                display: 'inline-block',
                                textAlign: 'center'
                              }}
                            >
                              📡 Track Live Order
                            </Link>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', marginTop: 10 }}>
                              <button
                                onClick={() => handleReorder(order)}
                                className="btn-outline"
                                style={{
                                  padding: '8px 16px',
                                  fontSize: '0.75rem',
                                  borderColor: 'rgba(123,196,127,0.3)',
                                  color: 'var(--mint)',
                                  borderRadius: 'var(--radius-full)',
                                  background: 'transparent',
                                }}
                              >
                                🔄 Order Again
                              </button>

                              {order.status === 'DELIVERED' && (order.deliveryUserId || order.workerId) && (
                                <>
                                  {tippingOrderId === order.id ? (
                                    <form onSubmit={(e) => handleSendTip(e, order.id)} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                                      <input
                                        type="number"
                                        step="5"
                                        min="1"
                                        max="500"
                                        placeholder="Tip (₹)"
                                        value={tipAmountText}
                                        onChange={(e) => setTipAmountText(e.target.value)}
                                        style={{
                                          width: 80,
                                          background: 'rgba(0,0,0,0.3)',
                                          border: '1px solid rgba(168,197,160,0.2)',
                                          borderRadius: 'var(--radius-md)',
                                          padding: '6px 10px',
                                          color: '#fff',
                                          fontSize: '0.78rem',
                                          outline: 'none'
                                        }}
                                      />
                                      <button
                                        type="submit"
                                        disabled={tippingLoading}
                                        className="btn-primary"
                                        style={{ padding: '6px 12px', fontSize: '0.72rem', background: 'var(--mint)', color: '#0f2212' }}
                                      >
                                        Tip
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setTippingOrderId(null)}
                                        className="btn-outline"
                                        style={{ padding: '6px 10px', fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--sage)', background: 'transparent' }}
                                      >
                                        ✕
                                      </button>
                                    </form>
                                  ) : (
                                    <button
                                      onClick={() => { setTippingOrderId(order.id); setTipAmountText('20') }}
                                      className="btn-outline"
                                      style={{
                                        padding: '8px 16px',
                                        fontSize: '0.75rem',
                                        borderColor: 'rgba(232,168,78,0.3)',
                                        color: 'var(--amber)',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'transparent',
                                      }}
                                    >
                                      💸 Tip Worker
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: My Wallet */}
            {activeTab === 'wallet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }} className="profile-grid">
                  {/* Virtual Card Graphic */}
                  <div style={{ background: 'linear-gradient(135deg, #1b3f27 0%, #0d2013 100%)', border: '1px solid rgba(123, 196, 127, 0.25)', borderRadius: 'var(--radius-lg)', padding: '24px', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 24px rgba(0,0,0,0.4)' }}>
                    <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '12rem', opacity: 0.04 }}>🌿</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Card Balance</span>
                        <div style={{ fontSize: '2.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#fff', marginTop: 4 }}>
                          {formatPrice(profile?.user?.walletBalance || 0)}
                        </div>
                      </div>
                      <span style={{ fontSize: '2.2rem' }}>🌿</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 32 }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sage)', letterSpacing: '0.05em' }}>CARDHOLDER</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginTop: 2, textTransform: 'uppercase' }}>
                          {profile?.user?.name || 'Prepaid Guest'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--sage)' }}>
                        **** **** {profile?.user?.id ? profile.user.id.slice(-6).toUpperCase() : 'XXXX'}
                      </div>
                    </div>
                  </div>

                  {/* Top Up Form */}
                  <form onSubmit={handleTopup} style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 'var(--radius-md)', padding: 16, border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--sage)', fontWeight: 600, display: 'block', marginBottom: 12 }}>
                        ➕ Load Balance / Add Funds (10% Bonus Stars!)
                      </span>
                      
                      {/* Pre-set Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                        {[100, 200, 500, 1000].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => { setTopupAmount(amt); setCustomAmountText('') }}
                            style={{
                              background: (topupAmount === amt && !customAmountText) ? 'var(--forest)' : 'rgba(255,255,255,0.03)',
                              color: (topupAmount === amt && !customAmountText) ? '#fff' : 'var(--sage)',
                              border: '1px solid ' + ((topupAmount === amt && !customAmountText) ? 'var(--leaf)' : 'rgba(255,255,255,0.08)'),
                              padding: '8px 0',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            ₹{amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                      <input
                        type="number"
                        value={customAmountText}
                        onChange={e => setCustomAmountText(e.target.value)}
                        placeholder="Or enter custom (₹)"
                        min="100"
                        max="5000"
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid rgba(168,197,160,0.15)',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px 14px',
                          color: '#fff',
                          fontSize: '0.82rem',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={topupLoading}
                        className="btn-primary"
                        style={{ padding: '10px 0', fontSize: '0.8rem', width: '100%' }}
                      >
                        {topupLoading ? 'Loading...' : 'Load Card'}
                      </button>
                    </div>
                  </form>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--cream)', marginBottom: 14 }}>
                    📜 Wallet Transaction History
                  </h4>
                  {!profile?.walletTransactions || profile.walletTransactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sage)', fontSize: '0.9rem' }}>
                      💳 No wallet transaction history available. Load money to get started.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--sage)' }}>
                            <th style={{ padding: '12px' }}>Date</th>
                            <th style={{ padding: '12px' }}>Type</th>
                            <th style={{ padding: '12px' }}>Note / Reference</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.walletTransactions.map(tx => {
                            const isCredit = tx.type === 'TOP_UP' || tx.type === 'REFUND'
                            return (
                              <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--cream)' }}>
                                <td style={{ padding: '14px 12px' }}>
                                  {new Date(tx.createdAt).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                                </td>
                                <td style={{ padding: '14px 12px', fontWeight: 700 }}>
                                  <span style={{
                                    color: isCredit ? 'var(--mint)' : '#ff8a80',
                                    background: isCredit ? 'rgba(74,140,63,0.1)' : 'rgba(229,57,53,0.1)',
                                    padding: '2px 8px',
                                    borderRadius: 4
                                  }}>
                                    {tx.type}
                                  </span>
                                </td>
                                <td style={{ padding: '14px 12px', color: 'var(--sage)' }}>
                                  {tx.note || 'Wallet update'}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: isCredit ? 'var(--mint)' : '#fff', fontSize: '0.95rem' }}>
                                  {isCredit ? '+' : '-'}{formatPrice(Math.abs(tx.amount))}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Loyalty points (Stars) activity */}
            {activeTab === 'stars' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }} className="profile-grid">
                  {/* Stars Rewards Club Panel */}
                  <div style={{ background: 'rgba(20, 45, 23, 0.35)', border: '1px solid rgba(168, 197, 160, 0.15)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', backdropFilter: 'var(--glass-blur)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        🌟 Stars Rewards Club
                      </h3>
                      <span style={{ fontSize: '1.3rem', color: 'var(--amber)' }}>🌟</span>
                    </div>

                    <div style={{ textAlign: 'center', padding: '12px 0 24px 0' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--mint)', letterSpacing: '0.15em', fontWeight: 700, textTransform: 'uppercase' }}>
                        {tierInfo.title}
                      </div>
                      <div style={{ fontSize: '3.6rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--amber)', marginTop: 8 }}>
                        {userStars} <span style={{ fontSize: '1.5rem', color: 'var(--sage)' }}>Stars</span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: 8, padding: '0 16px', lineHeight: 1.4 }}>
                        {tierInfo.text}
                      </p>
                    </div>

                    {/* Progress bar */}
                    {userStars < 200 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>
                          <span>0 Stars</span>
                          <span>{userStars} / 200 Stars</span>
                          <span>Gold Status 🌟</span>
                        </div>
                        <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <div style={{ height: '100%', width: `${goldProgress}%`, background: 'linear-gradient(90deg, var(--leaf) 0%, var(--amber) 100%)', borderRadius: 10 }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tiers catalog */}
                  <div style={{ background: 'rgba(20, 45, 23, 0.35)', border: '1px solid rgba(168, 197, 160, 0.15)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', backdropFilter: 'var(--glass-blur)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--sage)', fontWeight: 700, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Redemption Perks:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--sage)' }}>
                        <span>☕ 50 Stars</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>Free Customization / Shot</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--sage)' }}>
                        <span>🥐 150 Stars</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>Free Hot Brew Coffee</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--sage)' }}>
                        <span>🥪 300 Stars</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>Free Meal / Sandwich</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--cream)', marginBottom: 14 }}>
                    📜 Loyalty Stars Activity Log
                  </h4>
                  {!profile?.loyaltyTransactions || profile.loyaltyTransactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sage)', fontSize: '0.9rem' }}>
                      🌟 No stars activity found. Earn stars by completing orders and loading your prepaid card.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--sage)' }}>
                            <th style={{ padding: '12px' }}>Date</th>
                            <th style={{ padding: '12px' }}>Activity</th>
                            <th style={{ padding: '12px' }}>Details</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Stars Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.loyaltyTransactions.map(tx => {
                            const isCredit = tx.points > 0
                            return (
                              <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--cream)' }}>
                                <td style={{ padding: '14px 12px' }}>
                                  {new Date(tx.createdAt).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                                </td>
                                <td style={{ padding: '14px 12px', fontWeight: 700 }}>
                                  <span style={{
                                    color: isCredit ? 'var(--amber)' : '#9e9e9e',
                                    background: isCredit ? 'rgba(253,246,232,0.08)' : 'rgba(255,255,255,0.03)',
                                    padding: '2px 8px',
                                    borderRadius: 4
                                  }}>
                                    {tx.type}
                                  </span>
                                </td>
                                <td style={{ padding: '14px 12px', color: 'var(--sage)' }}>
                                  {tx.note || 'Loyalty ledger log'}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: isCredit ? 'var(--amber)' : '#9e9e9e', fontSize: '0.95rem' }}>
                                  {isCredit ? '+' : ''}{tx.points} ★
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Table Reservations Bookings */}
            {activeTab === 'bookings' && (
              <div>
                {!profile?.reservations || profile.reservations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📅</div>
                    <p style={{ color: 'var(--sage)', fontSize: '0.9rem', marginBottom: 20 }}>
                      🌿 You haven't booked any table reservations yet.
                    </p>
                    <Link
                      href="/"
                      className="btn-primary"
                      style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 'var(--radius-full)', textDecoration: 'none' }}
                    >
                      Reserve a Table Now
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {profile.reservations.map(resv => (
                      <div
                        key={resv.id}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 20,
                        }}
                      >
                        {/* Booking Info */}
                        <div style={{ flex: 1, minWidth: 280 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <span style={{ color: 'var(--mint)', fontWeight: 700, fontSize: '0.95rem' }}>
                              Booking #{resv.id.slice(-6).toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--sage)' }}>
                              Requested on {new Date(resv.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.88rem', color: 'var(--cream)', margin: '12px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span>👥</span>
                              <strong>{resv.guestCount} guests</strong>
                            </div>
                            {resv.tableNumber && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span>🪑</span>
                                <span>Selected Space: <strong>Table {resv.tableNumber}</strong></span>
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span>📅</span>
                              <span>
                                {new Date(resv.date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>⏰</span>
                              <span>
                                {new Date(resv.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {resv.specialNotes && (
                              <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 4, fontSize: '0.8rem', borderLeft: '2.5px solid var(--mint)', color: 'var(--sage)' }}>
                                <strong>Special Request:</strong> "{resv.specialNotes}"
                              </div>
                            )}
                            {resv.status === 'CANCELLED' && resv.cancellationReason && (
                              <div style={{ marginTop: 8, padding: 8, background: 'rgba(229,57,53,0.08)', borderRadius: 4, fontSize: '0.8rem', borderLeft: '2.5px solid #ef5350', color: '#ff8a80' }}>
                                <strong>Reason for Cancellation:</strong> "{resv.cancellationReason}"
                              </div>
                            )}
                          </div>

                          {/* Advance Paid Summary */}
                          <div style={{ fontSize: '0.8rem', color: 'var(--sage)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div>
                              💳 Advance payment: <strong style={{ color: '#fff' }}>₹{(resv.advancePaid / 100).toFixed(2)}</strong>
                              {resv.status === 'CANCELLED' ? (
                                <span style={{ color: 'var(--mint)', fontWeight: 600 }}> (Refunded to Wallet)</span>
                              ) : resv.status === 'CONFIRMED' ? (
                                <span style={{ color: 'var(--sage)' }}> (Applied/Held)</span>
                              ) : resv.status === 'COMPLETED' ? (
                                <span style={{ color: 'var(--mint)' }}> (Applied to Visit)</span>
                              ) : (
                                <span style={{ color: 'var(--amber)' }}> (Held pending confirmation)</span>
                              )}
                            </div>
                            {resv.status === 'COMPLETED' && (
                              <div style={{ color: 'var(--mint)', fontWeight: 600 }}>
                                ☕ remaining payment paid at cafe: <strong style={{ color: '#fff' }}>₹{(resv.remainingPaid / 100).toFixed(2)}</strong> (Visited: Yes)
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status badge & Feedback actions */}
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <span style={{
                            padding: '6px 14px',
                            borderRadius: '100px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: resv.status === 'COMPLETED' ? 'rgba(74,140,63,0.22)' : resv.status === 'CONFIRMED' ? 'rgba(74,140,63,0.15)' : resv.status === 'CANCELLED' ? 'rgba(229,57,53,0.15)' : 'rgba(232,168,78,0.15)',
                            color: resv.status === 'COMPLETED' ? 'var(--mint)' : resv.status === 'CONFIRMED' ? 'var(--mint)' : resv.status === 'CANCELLED' ? '#ef5350' : 'var(--amber)',
                            border: '1px solid ' + (resv.status === 'COMPLETED' ? 'var(--mint)' : resv.status === 'CONFIRMED' ? 'rgba(74,140,63,0.3)' : resv.status === 'CANCELLED' ? 'rgba(229,57,53,0.3)' : 'rgba(232,168,78,0.3)'),
                          }}>
                            {resv.status === 'COMPLETED' ? '🎉 COMPLETED & VISITED' : resv.status === 'CONFIRMED' ? '✅ CONFIRMED' : resv.status === 'CANCELLED' ? '❌ CANCELLED' : '⏳ PENDING APPROVAL'}
                          </span>

                          {resv.status === 'COMPLETED' && (
                            <div>
                              {(!resv.feedbacks || resv.feedbacks.length === 0) ? (
                                <button
                                  onClick={() => {
                                    setFeedbackResvId(resv.id)
                                    setFeedbackRating(5)
                                    setFeedbackComment('')
                                  }}
                                  className="btn-primary"
                                  style={{
                                    marginTop: 10,
                                    padding: '8px 16px',
                                    fontSize: '0.75rem',
                                    borderRadius: 'var(--radius-full)',
                                  }}
                                >
                                  ✍️ Give Visit Feedback
                                </button>
                              ) : (
                                <div style={{
                                  marginTop: 10,
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(168,197,160,0.15)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '10px 14px',
                                  fontSize: '0.75rem',
                                  textAlign: 'left',
                                  maxWidth: 240
                                }}>
                                  <div style={{ color: 'var(--amber)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span>💚 Rated:</span>
                                    <span>{'★'.repeat(resv.feedbacks[0].rating)}{'☆'.repeat(5 - resv.feedbacks[0].rating)}</span>
                                  </div>
                                  {resv.feedbacks[0].comments && (
                                    <p style={{ color: 'var(--sage)', margin: '4px 0 0 0', fontStyle: 'italic', fontSize: '0.7rem' }}>
                                      "{resv.feedbacks[0].comments}"
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: Notifications */}
            {activeTab === 'notifications' && (
              <div>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sage)', fontSize: '0.9rem' }}>
                    🔔 No notifications yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        style={{
                          background: n.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(123,196,127,0.08)',
                          border: '1px solid ' + (n.isRead ? 'rgba(255,255,255,0.05)' : 'rgba(123,196,127,0.25)'),
                          borderRadius: 'var(--radius-md)',
                          padding: '16px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 16
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block' }} />}
                            {n.title}
                          </div>
                          <p style={{ color: 'var(--sage)', fontSize: '0.85rem', marginTop: 4, lineHeight: 1.4 }}>
                            {n.message}
                          </p>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--sage)', whiteSpace: 'nowrap' }}>
                          {new Date(n.createdAt).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Feedback Submission Modal overlay */}
      <AnimatePresence>
        {feedbackResvId && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
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
                background: 'linear-gradient(135deg, #112a14 0%, #071208 100%)',
                border: '1px solid var(--mint)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px',
                maxWidth: 480,
                width: '100%',
                boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                position: 'relative'
              }}
            >
              <button
                onClick={() => setFeedbackResvId(null)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'none',
                  border: 'none',
                  color: 'var(--sage)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                ✕
              </button>

              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', fontSize: '1.4rem', marginBottom: 12 }}>
                💚 Share Your Cafe Visit Feedback
              </h3>
              <p style={{ color: 'var(--sage)', fontSize: '0.85rem', marginBottom: 20 }}>
                We hope you enjoyed your table reservation! Please rate your experience and share any suggestions for our service, drinks, or ambiance.
              </p>

              <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--sage)', marginBottom: 8, fontWeight: 600 }}>Rating</label>
                  <div style={{ display: 'flex', gap: 8, fontSize: '1.8rem', cursor: 'pointer' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        style={{
                          color: star <= feedbackRating ? 'var(--amber)' : 'rgba(255,255,255,0.15)',
                          transition: 'color 0.15s'
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--sage)', marginBottom: 8, fontWeight: 600 }}>Comments & Suggestions</label>
                  <textarea
                    className="form-field"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Tell us about the service, payment experience, or menu items..."
                    rows={4}
                    style={{ width: '100%', resize: 'none', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(168,197,160,0.25)', color: '#fff', padding: 12, borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="btn-primary"
                    style={{ flex: 1, padding: '10px 0', fontSize: '0.88rem' }}
                  >
                    {submittingFeedback ? 'Submitting...' : '🚀 Submit Feedback'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackResvId(null)}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--sage)',
                      padding: '10px 20px',
                      borderRadius: 'var(--radius-full)',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .profile-grid {
          grid-template-columns: 1.2fr 1fr;
        }
        .profile-grid-three {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 800px) {
          .profile-grid, .profile-grid-three {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}
