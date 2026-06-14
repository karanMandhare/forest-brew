'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import LivePopupNotifications from '@/components/LivePopupNotifications'


interface WorkerData {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
  salary: number
  isAvailable: boolean
  createdAt: string
}

interface OrderItem {
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
}

interface Order {
  id: string
  status: 'PENDING' | 'RECEIVED' | 'ASSIGNED' | 'BREWING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  orderType: 'DINE_IN' | 'DELIVERY'
  totalAmount: number
  paymentMethod: string
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  deliveryAddress?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  acceptedAt?: string | null
  assignedAt?: string | null
  preparingAt?: string | null
  readyAt?: string | null
  deliveredAt?: string | null
  cancelledAt?: string | null
  workerId?: string | null
  estimatedTime?: number | null
}

interface WorkerProfileResponse {
  worker: WorkerData
  activeDeliveries: Order[]
  completedDeliveries: Order[]
  admins: any[]
  performance: {
    rating: number
    totalFeedbacks: number
    avgDeliveryTimeMinutes: number
    onTimeRate: number
  } | null
  stats: {
    activeCount: number
    completedCount: number
  }
}

export default function WorkerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [worker, setWorker] = useState<WorkerData | null>(null)
  const [activeDeliveries, setActiveDeliveries] = useState<Order[]>([])
  const [completedDeliveries, setCompletedDeliveries] = useState<Order[]>([])
  const [stats, setStats] = useState({ activeCount: 0, completedCount: 0 })

  const [activeTab, setActiveTab] = useState<'deliveries' | 'history' | 'records' | 'analytics' | 'profile' | 'subscribers'>('deliveries')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  const [attendances, setAttendances] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [recordsStats, setRecordsStats] = useState<any>({
    present: 0,
    halfDay: 0,
    sickLeave: 0,
    absent: 0,
    totalBonus: 0,
    totalPaid: 0
  })

  const [showPrepModal, setShowPrepModal] = useState<string | null>(null)
  const [prepTime, setPrepTime] = useState<number>(15)
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [selectedAlertItem, setSelectedAlertItem] = useState('')

  // New states for admin contacts, worker performance, and chat
  const [admins, setAdmins] = useState<any[]>([])
  const [performance, setPerformance] = useState<{
    rating: number
    totalFeedbacks: number
    avgDeliveryTimeMinutes: number
    onTimeRate: number
  } | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Extra worker console states
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false)
  const [broadcastNotification, setBroadcastNotification] = useState<any | null>(null)

  // Subscribers States
  const [subscribersList, setSubscribersList] = useState<any[]>([])
  const [loadingSubscribers, setLoadingSubscribers] = useState(false)
  const [subscriberSearchEmail, setSubscriberSearchEmail] = useState('')
  const [subscriberSearchResult, setSubscriberSearchResult] = useState<any | null>(null)
  const [subscriberSearchError, setSubscriberSearchError] = useState('')
  const [searchingSubscriber, setSearchingSubscriber] = useState(false)
  const [redeemingDrink, setRedeemingDrink] = useState(false)
  const [redeemDrinkName, setRedeemDrinkName] = useState('Forest Espresso')

  const fetchSubscribersList = async () => {
    setLoadingSubscribers(true)
    try {
      const res = await fetch('/api/worker/subscribers')
      if (res.ok) {
        const data = await res.json()
        setSubscribersList(data.subscribers || [])
      }
    } catch (err) {
      console.error('Error fetching subscribers:', err)
    } finally {
      setLoadingSubscribers(false)
    }
  }

  const handleSubscriberSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subscriberSearchEmail.trim()) return
    setSearchingSubscriber(true)
    setSubscriberSearchError('')
    setSubscriberSearchResult(null)
    try {
      const res = await fetch(`/api/worker/subscribers?email=${encodeURIComponent(subscriberSearchEmail.trim())}`)
      const data = await res.json()
      if (res.ok) {
        setSubscriberSearchResult(data.subscriber)
      } else {
        setSubscriberSearchError(data.error || 'No active subscriber found.')
      }
    } catch {
      setSubscriberSearchError('Failed to connect to verification server.')
    } finally {
      setSearchingSubscriber(false)
    }
  }

  const handleRedeemSubscriberDrink = async (email: string) => {
    setRedeemingDrink(true)
    try {
      const res = await fetch('/api/worker/subscribers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberEmail: email, drinkName: redeemDrinkName })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message || 'Daily drink redeemed successfully!')
        fetchSubscribersList()
        try {
          const syncRes = await fetch(`/api/worker/subscribers?email=${encodeURIComponent(email)}`)
          if (syncRes.ok) {
            const syncData = await syncRes.json()
            setSubscriberSearchResult(syncData.subscriber)
          }
        } catch {}
      } else {
        showToast(data.error || 'Failed to redeem drink', 'error')
      }
    } catch {
      showToast('Connection error during drink redemption', 'error')
    } finally {
      setRedeemingDrink(false)
    }
  }

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const formatPrice = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100)
  }

  const fetchRecordsData = useCallback(async () => {
    try {
      const res = await fetch('/api/worker/records')
      if (res.ok) {
        const data = await res.json()
        setAttendances(data.attendances || [])
        setPayments(data.payments || [])
        setRecordsStats(data.stats || {
          present: 0,
          halfDay: 0,
          sickLeave: 0,
          absent: 0,
          totalBonus: 0,
          totalPaid: 0
        })
      }
    } catch (err) {
      console.error('Error fetching records:', err)
    }
  }, [])

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory')
      if (res.ok) {
        const data = await res.json()
        setInventoryItems(data)
      }
    } catch (err) {
      console.error('Error fetching inventory:', err)
    }
  }, [])

  const fetchWorkerData = useCallback(async () => {
    try {
      const res = await fetch('/api/worker/profile')
      if (res.status === 401 || res.status === 403) {
        router.push('/')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch profile')
      const data: WorkerProfileResponse = await res.json()
      setWorker(data.worker)
      setActiveDeliveries(data.activeDeliveries)
      setCompletedDeliveries(data.completedDeliveries)
      setAdmins(data.admins || [])
      setPerformance(data.performance || null)
      setStats(data.stats)
    } catch (err: any) {
      console.error(err)
      showToast('⚠️ Error loading dashboard data', 'error')
    } finally {
      setLoading(false)
    }
  }, [router, showToast])

  const fetchChatMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/support/chat')
      if (res.ok) {
        const data = await res.json()
        setChatMessages(data)
      }
    } catch (err) {
      console.error('Error fetching support chat:', err)
    }
  }, [])

  const fetchFeedbackData = useCallback(async () => {
    setLoadingFeedbacks(true)
    try {
      const res = await fetch('/api/worker/feedback')
      if (res.ok) {
        const data = await res.json()
        setFeedbacks(data.feedbacks || [])
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err)
    } finally {
      setLoadingFeedbacks(false)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        const latestSystemBroadcast = data.find((n: any) => n.type === 'SYSTEM' && !n.isRead)
        if (latestSystemBroadcast) {
          setBroadcastNotification(latestSystemBroadcast)
        } else {
          setBroadcastNotification(null)
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }, [])

  const handleDismissBroadcast = useCallback(async () => {
    setBroadcastNotification(null)
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      showToast('Broadcast dismissed and marked as read.', 'success')
    } catch (err) {
      console.error('Error marking notifications as read:', err)
    }
  }, [showToast])

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || sendingChat) return
    setSendingChat(true)
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput })
      })
      if (res.ok) {
        const newMessage = await res.json()
        setChatMessages(prev => {
          if (prev.some(m => m.id === newMessage.id)) return prev
          return [...prev, newMessage]
        })
        setChatInput('')
      } else {
        showToast('Failed to send message', 'error')
      }
    } catch {
      showToast('Error connecting to support chat', 'error')
    } finally {
      setSendingChat(false)
    }
  }

  // Keep latest refs of changing handlers and state to avoid EventSource reconnections
  const fetchWorkerDataRef = useRef(fetchWorkerData)
  const fetchRecordsDataRef = useRef(fetchRecordsData)
  const fetchInventoryRef = useRef(fetchInventory)
  const fetchChatMessagesRef = useRef(fetchChatMessages)
  const fetchFeedbackDataRef = useRef(fetchFeedbackData)
  const workerRef = useRef(worker)

  useEffect(() => {
    fetchWorkerDataRef.current = fetchWorkerData
  }, [fetchWorkerData])

  useEffect(() => {
    fetchRecordsDataRef.current = fetchRecordsData
  }, [fetchRecordsData])

  useEffect(() => {
    fetchInventoryRef.current = fetchInventory
  }, [fetchInventory])

  useEffect(() => {
    fetchChatMessagesRef.current = fetchChatMessages
  }, [fetchChatMessages])

  useEffect(() => {
    fetchFeedbackDataRef.current = fetchFeedbackData
  }, [fetchFeedbackData])

  useEffect(() => {
    workerRef.current = worker
  }, [worker])

  // Scroll support chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Fetch support chat when switching to Profile tab
  useEffect(() => {
    if (activeTab === 'profile') {
      fetchChatMessages()
    }
  }, [activeTab, fetchChatMessages])

  // Fetch feedback when switching to Analytics tab
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchFeedbackData()
    }
  }, [activeTab, fetchFeedbackData])

  // Real-time EventSource connection for Worker Dashboard
  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'DELIVERY') return

    let eventSource: EventSource | null = null

    function connectSSE() {
      console.log('Connecting to SSE stream from Worker Console...')
      eventSource = new EventSource('/api/notifications/stream', { withCredentials: true })

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'connected') {
            console.log('Worker SSE connected with role:', data.role)
          } else if (data.type === 'order_update') {
            console.log('Worker SSE order_update event received:', data)
            fetchWorkerDataRef.current()
          } else if (data.type === 'worker_record_updated') {
            console.log('Worker SSE worker_record_updated event received:', data)
            const currentWorkerId = workerRef.current?.id || (session?.user as any)?.id
            if (data.workerId === currentWorkerId) {
              fetchWorkerDataRef.current()
              fetchRecordsDataRef.current()
            }
          } else if (data.type === 'inventory_low') {
            console.log('Worker SSE inventory_low event received:', data)
            fetchInventoryRef.current()
          } else if (data.type === 'support_chat') {
            console.log('Worker SSE support_chat event received:', data)
            const currentWorkerId = workerRef.current?.id || (session?.user as any)?.id
            if (data.userId === currentWorkerId) {
              setChatMessages(prev => {
                if (prev.some(m => m.id === data.message.id)) return prev
                return [...prev, data.message]
              })
            }
          } else if (data.type === 'notification') {
            console.log('Worker SSE notification event received:', data)
            if (data.notification?.type === 'SYSTEM') {
              setBroadcastNotification(data.notification)
              showToast('📢 New Store Broadcast: ' + data.notification.message, 'success')
            }
          } else if (data.type === 'new_delivery_assigned') {
            console.log('Worker SSE new_delivery_assigned event received:', data)
            // Forward to popup component
            window.dispatchEvent(new CustomEvent('forest_brew_sse', { detail: data }))
            // Refresh deliveries list
            fetchWorkerDataRef.current()
          }
        } catch (err) {
          console.error('Error parsing Worker SSE event data:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.warn('Worker SSE EventSource connection closed or failed, attempting reconnect...')
        if (eventSource) {
          eventSource.close()
        }
        // Attempt reconnection after 5 seconds
        setTimeout(connectSSE, 5000)
      }
    }

    connectSSE()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [session, status, showToast])

  // Fetch active tab data immediately when tab becomes active
  useEffect(() => {
    if (activeTab === 'deliveries') {
      fetchWorkerData()
    } else if (activeTab === 'records') {
      fetchRecordsData()
    } else if (activeTab === 'subscribers') {
      fetchSubscribersList()
    }
  }, [activeTab, fetchWorkerData, fetchRecordsData])

  // Initial load and auto refresh (every 30s)
  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'DELIVERY') {
      router.push('/')
      return
    }

    // Load initial context once
    fetchWorkerData()
    fetchRecordsData()
    fetchInventory()
    fetchNotifications()
    fetchFeedbackData()

    const interval = setInterval(() => {
      fetchNotifications()
      if (activeTab === 'deliveries') {
        fetchWorkerData()
      } else if (activeTab === 'records') {
        fetchRecordsData()
      } else if (activeTab === 'profile') {
        fetchChatMessagesRef.current()
      } else if (activeTab === 'analytics') {
        fetchFeedbackDataRef.current()
      } else if (activeTab === 'subscribers') {
        fetchSubscribersList()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [session, status, router, fetchWorkerData, fetchRecordsData, fetchInventory, activeTab, fetchNotifications, fetchFeedbackData])

  const handleAcceptOrder = async (orderId: string, mins: number) => {
    try {
      const res = await fetch(`/api/worker/orders/${orderId}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', estimatedTime: mins })
      })
      if (res.ok) {
        showToast('☕ Order accepted and in preparation!')
        setShowPrepModal(null)
        await fetchWorkerData()
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed to accept order', 'error')
      }
    } catch {
      showToast('Connection error', 'error')
    }
  }

  const handleRejectOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to reject this order assignment?')) return
    try {
      const res = await fetch(`/api/worker/orders/${orderId}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      })
      if (res.ok) {
        showToast('⚠️ Assignment rejected and returned to queue')
        await fetchWorkerData()
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed to reject order', 'error')
      }
    } catch {
      showToast('Connection error', 'error')
    }
  }

  const handleMarkReady = async (orderId: string) => {
    try {
      const res = await fetch(`/api/worker/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READY' })
      })
      if (res.ok) {
        showToast('✨ Order marked as ready!')
        await fetchWorkerData()
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed to update status', 'error')
      }
    } catch {
      showToast('Connection error', 'error')
    }
  }

  const handleUpdateStatus = useCallback(async (orderId: string, nextStatus: 'OUT_FOR_DELIVERY' | 'DELIVERED') => {
    setUpdatingOrderId(orderId)
    try {
      const res = await fetch(`/api/worker/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update order')
      }

      showToast(
        nextStatus === 'OUT_FOR_DELIVERY'
          ? '🚚 Order status updated: Out for Delivery!'
          : '🎉 Order delivered successfully! Great job!'
      )
      await fetchWorkerData()
    } catch (err: any) {
      showToast(err.message || '⚠️ Update failed', 'error')
    } finally {
      setUpdatingOrderId(null)
    }
  }, [fetchWorkerData, showToast])

  if (status === 'loading' || loading || (session && session.user.role !== 'DELIVERY')) {
    return (
      <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90vh' }}>
        <div className="coffee-steam" style={{ transform: 'scale(1.5)' }}>
          <span /><span /><span />
        </div>
      </div>
    )
  }

  return (
    <div className="admin-console" style={{ minHeight: '100vh', padding: '120px 24px 60px' }}>
      <div className="grain" aria-hidden="true" />

      {/* Live real-time popup notifications for delivery assignments */}
      <LivePopupNotifications role="DELIVERY" />

      {/* Floating alert toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: 30,
              right: 30,
              zIndex: 999,
              background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(74, 140, 63, 0.95)',
              color: '#fff',
              padding: '16px 28px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              fontSize: '0.9rem',
              fontWeight: 700,
              backdropFilter: 'blur(10px)',
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header Console */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--forest)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              🌿 Delivery Console
            </h1>
            <p style={{ color: 'var(--text-soft)', marginTop: 6, fontSize: '0.95rem' }}>
              Welcome back, <strong style={{ color: 'var(--forest)' }}>{worker?.name || 'Partner'}</strong>
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="btn-outline"
            style={{ padding: '12px 24px', fontSize: '0.82rem', borderColor: 'var(--sage)', color: 'var(--forest)', background: 'transparent' }}
          >
            🚪 Sign Out
          </button>
        </div>

        {/* Real-time Admin Announcement Banner */}
        <AnimatePresence>
          {broadcastNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                background: 'linear-gradient(135deg, rgba(74, 140, 63, 0.2), rgba(13, 148, 136, 0.2))',
                border: '1.5px solid rgba(74, 140, 63, 0.4)',
                borderRadius: 'var(--radius-xl)',
                padding: '20px 24px',
                backdropFilter: 'blur(16px)',
                marginBottom: 32,
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <span style={{ fontSize: '2rem' }}>📢</span>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                    {broadcastNotification.title || 'Store Broadcast'}
                  </h4>
                  <p style={{ color: 'var(--text-dark)', fontSize: '0.9rem', margin: '4px 0 0 0', lineHeight: 1.4, fontWeight: 500 }}>
                    {broadcastNotification.message}
                  </p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)', display: 'block', marginTop: 6 }}>
                    Sent on {new Date(broadcastNotification.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={handleDismissBroadcast}
                style={{
                  background: 'rgba(74, 140, 63, 0.1)',
                  border: '1px solid rgba(74, 140, 63, 0.3)',
                  color: 'var(--forest)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  alignSelf: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--forest)'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(74, 140, 63, 0.1)'
                  e.currentTarget.style.color = 'var(--forest)'
                }}
              >
                Acknowledge & Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Cards Stats & Profile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 40 }}>
          {/* Profile Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.45)',
            border: '1.5px solid rgba(74, 140, 63, 0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
            backdropFilter: 'blur(12px)',
          }}>
            <h3 style={{ color: 'var(--forest)', margin: '0 0 16px 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              👤 Delivery Partner Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.9rem', color: 'var(--text-mid)' }}>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', fontWeight: 600 }}>Name</span>
                <strong style={{ color: 'var(--forest)' }}>{worker?.name || 'Not Available'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', fontWeight: 600 }}>Email Address</span>
                <strong style={{ color: 'var(--forest)' }}>{worker?.email}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', fontWeight: 600 }}>Phone Number</span>
                <strong style={{ color: 'var(--forest)' }}>{worker?.phone || 'No registered phone'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', fontWeight: 600 }}>Monthly Salary</span>
                <strong style={{ color: 'var(--leaf)', fontSize: '1.1rem' }}>{formatPrice(worker?.salary || 0)} / mo</strong>
              </div>
            </div>
          </div>

          {/* Shift Status Toggle Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.45)',
            border: '1.5px solid rgba(74, 140, 63, 0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{ color: 'var(--forest)', margin: '0 0 8px 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚡ Shift & Availability
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                Toggle your shift status. When offline, you won't be auto-assigned to new incoming orders.
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.05)', marginTop: 'auto' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: worker?.isAvailable ? '#4a8c3f' : '#ef5350' }}>
                {worker?.isAvailable ? '🟢 ONLINE & ACTIVE' : '🔴 OFFLINE'}
              </span>
              <button
                onClick={async () => {
                  if (!worker) return
                  const nextState = !worker.isAvailable
                  try {
                    const res = await fetch('/api/worker/status', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isAvailable: nextState })
                    })
                    if (res.ok) {
                      setWorker(prev => prev ? { ...prev, isAvailable: nextState } : null)
                      showToast(nextState ? '🟢 Shift started! You are now online.' : '🔴 Shift ended. You are offline.')
                    } else {
                      showToast('Failed to update status', 'error')
                    }
                  } catch {
                    showToast('Connection error', 'error')
                  }
                }}
                className="btn-primary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.75rem',
                  background: worker?.isAvailable ? '#ef5350' : 'var(--forest)',
                  border: 'none',
                  minWidth: 90
                }}
              >
                {worker?.isAvailable ? 'Go Offline' : 'Go Online'}
              </button>
            </div>
          </div>

          {/* Inventory Alerts Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.45)',
            border: '1.5px solid rgba(74, 140, 63, 0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{ color: 'var(--forest)', margin: '0 0 8px 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                🚨 Low Stock Alerts
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                Running low on ingredients? Send an instant alert notification to administrators.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
              <select
                value={selectedAlertItem}
                onChange={e => setSelectedAlertItem(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(74,140,63,0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 10px',
                  fontSize: '0.8rem',
                  color: 'var(--forest)',
                  outline: 'none',
                }}
              >
                <option value="">-- Choose Item --</option>
                {inventoryItems.map(item => (
                  <option key={item.id} value={item.name}>{item.name}</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!selectedAlertItem) { showToast('Select an item first', 'error'); return }
                  try {
                    const res = await fetch('/api/inventory/alert', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ itemName: selectedAlertItem })
                    })
                    if (res.ok) {
                      showToast(`🚨 Low stock alert sent for ${selectedAlertItem}!`)
                      setSelectedAlertItem('')
                    } else {
                      showToast('Failed to trigger alert', 'error')
                    }
                  } catch {
                    showToast('Connection error', 'error')
                  }
                }}
                className="btn-primary"
                style={{
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  background: '#ef5350',
                  border: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                Send Alert
              </button>
            </div>
          </div>

          {/* Stats Counter Active */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.45)',
            border: '1.5px solid rgba(74, 140, 63, 0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '3rem' }}>🚚</span>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--forest)', fontWeight: 800, margin: '10px 0 4px 0' }}>{stats.activeCount}</h2>
            <p style={{ margin: 0, color: 'var(--text-soft)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Deliveries
            </p>
          </div>

          {/* Stats Counter Completed */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.45)',
            border: '1.5px solid rgba(74, 140, 63, 0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '3rem' }}>🏆</span>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--forest)', fontWeight: 800, margin: '10px 0 4px 0' }}>{stats.completedCount}</h2>
            <p style={{ margin: 0, color: 'var(--text-soft)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Lifetime Completed
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', borderBottom: '2px solid rgba(74,140,63,0.1)', marginBottom: 32, gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('deliveries')}
            style={{
              padding: '14px 28px',
              fontSize: '0.9rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'deliveries' ? '3px solid var(--forest)' : '3px solid transparent',
              color: activeTab === 'deliveries' ? 'var(--forest)' : 'var(--text-soft)',
              cursor: 'pointer',
              transition: 'all 0.25s',
            }}
          >
            📋 Active Assignments ({activeDeliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '14px 28px',
              fontSize: '0.9rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'history' ? '3px solid var(--forest)' : '3px solid transparent',
              color: activeTab === 'history' ? 'var(--forest)' : 'var(--text-soft)',
              cursor: 'pointer',
              transition: 'all 0.25s',
            }}
          >
            📜 Completed History ({completedDeliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '14px 28px',
              fontSize: '0.9rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'analytics' ? '3px solid var(--forest)' : '3px solid transparent',
              color: activeTab === 'analytics' ? 'var(--forest)' : 'var(--text-soft)',
              cursor: 'pointer',
              transition: 'all 0.25s',
            }}
          >
            📊 Analytics Dashboard
          </button>
          <button
            onClick={() => setActiveTab('records')}
            style={{
              padding: '14px 28px',
              fontSize: '0.9rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'records' ? '3px solid var(--forest)' : '3px solid transparent',
              color: activeTab === 'records' ? 'var(--forest)' : 'var(--text-soft)',
              cursor: 'pointer',
              transition: 'all 0.25s',
            }}
          >
            📋 My Records & Attendance
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            style={{
              padding: '14px 28px',
              fontSize: '0.9rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'subscribers' ? '3px solid var(--forest)' : '3px solid transparent',
              color: activeTab === 'subscribers' ? 'var(--forest)' : 'var(--text-soft)',
              cursor: 'pointer',
              transition: 'all 0.25s',
            }}
          >
            ⭐ Subscribers
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '14px 28px',
              fontSize: '0.9rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '3px solid var(--forest)' : '3px solid transparent',
              color: activeTab === 'profile' ? 'var(--forest)' : 'var(--text-soft)',
              cursor: 'pointer',
              transition: 'all 0.25s',
            }}
          >
            👤 My Profile
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'deliveries' ? (
            activeDeliveries.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'rgba(255,255,255,0.3)',
                borderRadius: 'var(--radius-xl)',
                border: '1px dashed rgba(74,140,63,0.2)',
              }}>
                <span style={{ fontSize: '3rem' }}>☕</span>
                <h3 style={{ color: 'var(--forest)', fontSize: '1.25rem', marginTop: 16 }}>No active deliveries</h3>
                <p style={{ color: 'var(--text-soft)', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                  Relax! Orders will appear here as soon as they are ready for delivery.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {activeDeliveries.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.45)',
                      border: '1.5px solid rgba(74, 140, 63, 0.15)',
                      borderRadius: 'var(--radius-xl)',
                      padding: 28,
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    {/* Order Meta Header */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14, borderBottom: '1px solid rgba(74,140,63,0.1)', paddingBottom: 18, marginBottom: 20 }}>
                      <div>
                        <span style={{
                          fontSize: '0.72rem',
                          background: order.orderType === 'DINE_IN' ? '#4a8c3f' : 'var(--forest)',
                          color: '#fff',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          marginRight: 10,
                          textTransform: 'uppercase',
                        }}>
                          {order.orderType === 'DINE_IN' ? '🍽️ Dine-in' : '🚴 Delivery'}
                        </span>
                        <strong style={{ color: 'var(--forest)', fontSize: '1.1rem' }}>
                          Order #{order.id.slice(-6).toUpperCase()}
                        </strong>
                        <span style={{ color: 'var(--text-soft)', fontSize: '0.8rem', marginLeft: 10 }}>
                          Updated {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {/* Status badge */}
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        background: 
                          order.status === 'ASSIGNED' ? 'rgba(59, 130, 246, 0.12)' :
                          order.status === 'BREWING' ? 'rgba(139, 92, 246, 0.12)' :
                          order.status === 'READY' ? 'rgba(245, 158, 11, 0.12)' :
                          'rgba(16, 185, 129, 0.12)',
                        color: 
                          order.status === 'ASSIGNED' ? '#3b82f6' :
                          order.status === 'BREWING' ? '#8b5cf6' :
                          order.status === 'READY' ? '#d97706' :
                          '#059669',
                        border: 
                          order.status === 'ASSIGNED' ? '1px solid rgba(59, 130, 246, 0.2)' :
                          order.status === 'BREWING' ? '1px solid rgba(139, 92, 246, 0.2)' :
                          order.status === 'READY' ? '1px solid rgba(245, 158, 11, 0.2)' :
                          '1px solid rgba(16, 185, 129, 0.2)',
                      }}>
                        {order.status === 'ASSIGNED' && '⏳ Assigned'}
                        {order.status === 'BREWING' && '☕ Preparing'}
                        {order.status === 'READY' && '✨ Ready'}
                        {order.status === 'OUT_FOR_DELIVERY' && '🚚 Out for Delivery'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28 }}>
                      {/* Customer Address Details */}
                      <div>
                        <h4 style={{ color: 'var(--forest)', margin: '0 0 12px 0', fontSize: '0.95rem' }}>📞 Customer Details</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem', color: 'var(--text-mid)' }}>
                          <div>
                            Name: <strong style={{ color: 'var(--forest)' }}>{order.customerName || 'Guest Patient'}</strong>
                          </div>
                          <div>
                            Phone:{' '}
                            {order.customerPhone ? (
                              <a href={`tel:${order.customerPhone}`} style={{ color: 'var(--leaf)', fontWeight: 700 }}>
                                {order.customerPhone}
                              </a>
                            ) : (
                              <strong>Not provided</strong>
                            )}
                          </div>
                          <div>
                            Destination:{' '}
                            <strong style={{ color: 'var(--forest)', display: 'block', marginTop: 4, fontStyle: 'normal' }}>
                              {order.orderType === 'DINE_IN' ? `🍽️ Table Number: ${order.deliveryAddress || 'Dine-In'}` : `📍 ${order.deliveryAddress || 'No Address Provided'}`}
                            </strong>
                          </div>
                          {order.notes && (
                            <div style={{ background: 'rgba(245,158,11,0.06)', borderLeft: '3px solid #d97706', padding: '8px 12px', borderRadius: 4, marginTop: 6 }}>
                              <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, display: 'block' }}>Barista Notes</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-mid)' }}><strong>{order.notes}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items Listing */}
                      <div>
                        <h4 style={{ color: 'var(--forest)', margin: '0 0 12px 0', fontSize: '0.95rem' }}>☕ Order Items</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {order.items.map((item) => (
                            <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, borderBottom: '1px dashed rgba(74,140,63,0.08)', paddingBottom: 10, marginBottom: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.85rem', color: 'var(--text-mid)' }}>
                                <div>
                                  <span style={{ color: 'var(--forest)', fontWeight: 700 }}>{item.quantity}x</span>{' '}
                                  <span style={{ fontWeight: 600, color: 'var(--forest)' }}>{item.product.name}</span>
                                  {item.customizations && Object.keys(item.customizations).length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: 2, paddingLeft: 22 }}>
                                      {Object.entries(item.customizations).filter(([k]) => k !== 'specialInstructions').map(([k, v]: any) => (
                                        <span key={k} style={{ marginRight: 8, textTransform: 'capitalize' }}>
                                          {k}: <strong>{v}</strong>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span style={{ fontWeight: 600 }}>{formatPrice(item.unitPrice * item.quantity)}</span>
                              </div>
                              {item.customizations && typeof item.customizations === 'object' && item.customizations.specialInstructions && (
                                <div style={{
                                  background: 'rgba(245, 158, 11, 0.08)',
                                  borderLeft: '4px solid #f59e0b',
                                  borderRadius: '6px',
                                  padding: '8px 12px',
                                  marginTop: 6,
                                  marginLeft: 22,
                                  fontSize: '0.8rem',
                                  color: '#b45309',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  border: '1px solid rgba(245, 158, 11, 0.15)'
                                }}>
                                  <span>⚠️</span>
                                  <span><strong>Special Instruction:</strong> "{item.customizations.specialInstructions}"</span>
                                </div>
                              )}
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem', color: 'var(--forest)', marginTop: 6 }}>
                            <span>Total Value</span>
                            <span>{formatPrice(order.totalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 28, borderTop: '1px solid rgba(74,140,63,0.1)', paddingTop: 18 }}>
                      {order.orderType === 'DELIVERY' && order.deliveryAddress && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline"
                          style={{
                            marginRight: 'auto',
                            padding: '8px 16px',
                            fontSize: '0.8rem',
                            borderColor: 'var(--leaf)',
                            color: 'var(--forest)',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            textDecoration: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 700
                          }}
                        >
                          📍 Open in Maps
                        </a>
                      )}
                      {order.status === 'ASSIGNED' ? (
                        showPrepModal === order.id ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-mid)', fontWeight: 600 }}>Prep Time:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <input
                                type="range"
                                min="5"
                                max="60"
                                step="5"
                                value={prepTime}
                                onChange={(e) => setPrepTime(Number(e.target.value))}
                                style={{
                                  accentColor: 'var(--forest)',
                                  cursor: 'pointer',
                                  width: '120px',
                                }}
                              />
                              <span style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                color: 'var(--forest)',
                                background: 'rgba(74, 140, 63, 0.1)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                minWidth: '60px',
                                textAlign: 'center'
                              }}>
                                {prepTime} mins
                              </span>
                            </div>
                            <button
                              onClick={() => handleAcceptOrder(order.id, prepTime)}
                              className="btn-primary"
                              style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'var(--forest)', border: 'none' }}
                            >
                              ✔️ Confirm Accept
                            </button>
                            <button
                              onClick={() => setShowPrepModal(null)}
                              className="btn-outline"
                              style={{ padding: '8px 16px', fontSize: '0.8rem', borderColor: 'var(--sage)', color: 'var(--forest)', background: 'transparent' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button
                              onClick={() => {
                                setPrepTime(15)
                                setShowPrepModal(order.id)
                              }}
                              className="btn-primary"
                              style={{ padding: '10px 20px', fontSize: '0.85rem', background: 'var(--forest)', border: 'none' }}
                            >
                              ✔️ Accept Assignment
                            </button>
                            <button
                              onClick={() => handleRejectOrder(order.id)}
                              className="btn-outline"
                              style={{ padding: '10px 20px', fontSize: '0.85rem', borderColor: '#ef5350', color: '#ef5350', background: 'transparent' }}
                            >
                              ❌ Reject Assignment
                            </button>
                          </div>
                        )
                      ) : order.status === 'BREWING' ? (
                        <button
                          onClick={() => handleMarkReady(order.id)}
                          className="btn-primary"
                          style={{ minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--forest)' }}
                        >
                          ✨ Mark as Ready / Complete Preparation
                        </button>
                      ) : order.status === 'READY' ? (
                        order.orderType === 'DINE_IN' ? (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                            disabled={updatingOrderId !== null}
                            className="btn-primary"
                            style={{ minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--forest)' }}
                          >
                            {updatingOrderId === order.id ? '☕ Processing...' : '🍽️ Serve & Handover Table'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                            disabled={updatingOrderId !== null}
                            className="btn-primary"
                            style={{ minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                          >
                            {updatingOrderId === order.id ? '☕ Processing...' : '🚚 Pick Up & Start Delivery'}
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                          disabled={updatingOrderId !== null}
                          className="btn-primary"
                          style={{ minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--forest)' }}
                        >
                          {updatingOrderId === order.id ? '☕ Processing...' : '✅ Complete Delivery / Handover'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : activeTab === 'history' ? (
            completedDeliveries.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'rgba(255,255,255,0.3)',
                borderRadius: 'var(--radius-xl)',
                border: '1px dashed rgba(74,140,63,0.2)',
              }}>
                <span style={{ fontSize: '3rem' }}>📜</span>
                <h3 style={{ color: 'var(--forest)', fontSize: '1.25rem', marginTop: 16 }}>No completed deliveries yet</h3>
                <p style={{ color: 'var(--text-soft)', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                  Serve your first delivery to start filling your completed logs history!
                </p>
              </div>
            ) : (
              <div style={{
                background: 'rgba(255, 255, 255, 0.45)',
                border: '1.5px solid rgba(74, 140, 63, 0.15)',
                borderRadius: 'var(--radius-xl)',
                padding: 28,
                backdropFilter: 'blur(12px)',
                overflowX: 'auto',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(74,140,63,0.15)' }}>
                      <th style={{ padding: '12px 10px', color: 'var(--forest)', fontSize: '0.88rem', fontWeight: 700 }}>ID</th>
                      <th style={{ padding: '12px 10px', color: 'var(--forest)', fontSize: '0.88rem', fontWeight: 700 }}>Date</th>
                      <th style={{ padding: '12px 10px', color: 'var(--forest)', fontSize: '0.88rem', fontWeight: 700 }}>Customer</th>
                      <th style={{ padding: '12px 10px', color: 'var(--forest)', fontSize: '0.88rem', fontWeight: 700 }}>Destination</th>
                      <th style={{ padding: '12px 10px', color: 'var(--forest)', fontSize: '0.88rem', fontWeight: 700 }}>Order Items</th>
                      <th style={{ padding: '12px 10px', color: 'var(--forest)', fontSize: '0.88rem', fontWeight: 700 }}>Total Value</th>
                      <th style={{ padding: '12px 10px', color: 'var(--forest)', fontSize: '0.88rem', fontWeight: 700 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedDeliveries.map((order) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid rgba(74,140,63,0.06)', fontSize: '0.85rem', color: 'var(--text-mid)' }}>
                        <td style={{ padding: '16px 10px', fontWeight: 700, color: 'var(--forest)' }}>
                          #{order.id.slice(-6).toUpperCase()}
                        </td>
                        <td style={{ padding: '16px 10px' }}>
                          {new Date(order.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', display: 'block' }}>
                            {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td style={{ padding: '16px 10px' }}>
                          <strong style={{ color: 'var(--forest)' }}>{order.customerName || 'Guest Patient'}</strong>
                          {order.customerPhone && (
                            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-soft)' }}>
                              📞 {order.customerPhone}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 10px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📍 {order.deliveryAddress || 'Address details'}
                        </td>
                        <td style={{ padding: '16px 10px' }}>
                          {order.items.map(item => `${item.quantity}x ${item.product.name}`).join(', ')}
                        </td>
                        <td style={{ padding: '16px 10px', fontWeight: 600 }}>
                          {formatPrice(order.totalAmount)}
                        </td>
                        <td style={{ padding: '16px 10px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#059669',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            textTransform: 'uppercase',
                          }}>
                            Delivered
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'analytics' ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.45)',
              border: '1.5px solid rgba(74, 140, 63, 0.15)',
              borderRadius: 'var(--radius-xl)',
              padding: 28,
              backdropFilter: 'blur(12px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 28
            }}>
              {/* Header */}
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', fontSize: '1.4rem', margin: 0 }}>📊 Completed Analytics</h3>
                <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Real-time analysis of your preparation performance, speed, and volume.</p>
              </div>

              {/* Stats Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                {/* Orders Count Card */}
                <div style={{ background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(74, 140, 63, 0.15)', borderRadius: 'var(--radius-lg)', padding: 20, textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>☕</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orders Served</div>
                  <div style={{ fontSize: '2rem', color: 'var(--forest)', fontWeight: 800, marginTop: 6 }}>{completedDeliveries.length}</div>
                </div>

                {/* Avg Prep Speed Card */}
                <div style={{ background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(74, 140, 63, 0.15)', borderRadius: 'var(--radius-lg)', padding: 20, textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>⚡</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg. Prep Speed</div>
                  <div style={{ fontSize: '2rem', color: 'var(--forest)', fontWeight: 800, marginTop: 6 }}>
                    {(() => {
                      const speedList = completedDeliveries
                        .map(o => {
                          if (!o.preparingAt || !o.readyAt) return null
                          const diff = (new Date(o.readyAt).getTime() - new Date(o.preparingAt).getTime()) / 60000
                          return diff > 0 && diff < 120 ? diff : null
                        })
                        .filter((v): v is number => v !== null)
                      
                      if (speedList.length === 0) return 'N/A'
                      const avg = speedList.reduce((a, b) => a + b, 0) / speedList.length
                      return `${avg.toFixed(1)}m`
                    })()}
                  </div>
                </div>

                {/* Total Value Served Card */}
                <div style={{ background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(74, 140, 63, 0.15)', borderRadius: 'var(--radius-lg)', padding: 20, textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>💵</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue Processed</div>
                  <div style={{ fontSize: '2rem', color: 'var(--forest)', fontWeight: 800, marginTop: 6 }}>
                    {formatPrice(completedDeliveries.reduce((sum, o) => sum + o.totalAmount, 0))}
                  </div>
                </div>
              </div>

              {/* Chart Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28, marginTop: 12 }}>
                {/* Left Chart: Orders Volume Trend */}
                <div style={{ background: 'rgba(255, 255, 255, 0.55)', border: '1px solid rgba(74, 140, 63, 0.12)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
                  <h4 style={{ color: 'var(--forest)', margin: '0 0 16px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📈</span> Orders Served (Last 7 Days)
                  </h4>
                  {(() => {
                    const days = Array.from({ length: 7 }, (_, i) => {
                      const d = new Date()
                      d.setDate(d.getDate() - i)
                      return d.toISOString().split('T')[0]
                    }).reverse()

                    const counts = days.map(day => {
                      return completedDeliveries.filter(o => {
                        const dateStr = new Date(o.updatedAt).toISOString().split('T')[0]
                        return dateStr === day
                      }).length
                    })

                    const maxCount = Math.max(...counts, 4)
                    const width = 360
                    const height = 160
                    const padding = 30
                    const chartWidth = width - padding * 2
                    const chartHeight = height - padding * 2

                    const points = counts.map((c, i) => {
                      const x = padding + (i / 6) * chartWidth
                      const y = padding + chartHeight - (c / maxCount) * chartHeight
                      return { x, y, val: c }
                    })

                    const pathD = points.reduce((acc, p, i) => {
                      return acc + `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`
                    }, '')

                    const fillD = pathD + ` L${points[6].x},${height - padding} L${points[0].x},${height - padding} Z`

                    return (
                      <div>
                        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(74, 140, 63, 0.4)" />
                              <stop offset="100%" stopColor="rgba(74, 140, 63, 0.0)" />
                            </linearGradient>
                          </defs>

                          {Array.from({ length: 5 }).map((_, idx) => {
                            const yVal = padding + (idx / 4) * chartHeight
                            const textVal = Math.round(maxCount - (idx / 4) * maxCount)
                            return (
                              <g key={idx}>
                                <line x1={padding} y1={yVal} x2={width - padding} y2={yVal} stroke="rgba(74,140,63,0.08)" strokeDasharray="3" />
                                <text x={padding - 8} y={yVal + 3} fill="var(--text-soft)" fontSize="8" textAnchor="end">{textVal}</text>
                              </g>
                            )
                          })}

                          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(74,140,63,0.2)" strokeWidth="1.5" />

                          {counts.some(c => c > 0) && (
                            <path d={fillD} fill="url(#chartGrad)" />
                          )}

                          {counts.some(c => c > 0) && (
                            <path d={pathD} fill="none" stroke="var(--forest)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          )}

                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle cx={p.x} cy={p.y} r="4" fill="var(--cream)" stroke="var(--forest)" strokeWidth="2" />
                              <text x={p.x} y={p.y - 8} fill="var(--forest)" fontSize="8" fontWeight="bold" textAnchor="middle">{p.val}</text>
                            </g>
                          ))}

                          {days.map((day, i) => {
                            const dateObj = new Date(day)
                            const label = dateObj.toLocaleDateString([], { weekday: 'short' }).slice(0, 3)
                            const x = padding + (i / 6) * chartWidth
                            return (
                              <text key={i} x={x} y={height - padding + 16} fill="var(--text-soft)" fontSize="8" textAnchor="middle">{label}</text>
                            )
                          })}
                        </svg>
                      </div>
                    )
                  })()}
                </div>

                {/* Right Chart: Prep Speed Distribution */}
                <div style={{ background: 'rgba(255, 255, 255, 0.55)', border: '1px solid rgba(74, 140, 63, 0.12)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
                  <h4 style={{ color: 'var(--forest)', margin: '0 0 16px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>⏱️</span> Prep Speed Distribution
                  </h4>
                  {(() => {
                    const speedCategories = {
                      fast: { label: '⚡ Under 10m', count: 0, color: 'var(--leaf)' },
                      normal: { label: '☕ 10m - 15m', count: 0, color: 'var(--forest)' },
                      slow: { label: '⏳ Over 15m', count: 0, color: '#f59e0b' }
                    }

                    completedDeliveries.forEach(o => {
                      if (o.preparingAt && o.readyAt) {
                        const diff = (new Date(o.readyAt).getTime() - new Date(o.preparingAt).getTime()) / 60000
                        if (diff > 0 && diff < 120) {
                          if (diff < 10) speedCategories.fast.count++
                          else if (diff <= 15) speedCategories.normal.count++
                          else speedCategories.slow.count++
                        }
                      }
                    })

                    const totalAnalyzed = Object.values(speedCategories).reduce((sum, item) => sum + item.count, 0)
                    const activeTotal = totalAnalyzed === 0 ? 1 : totalAnalyzed

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {Object.entries(speedCategories).map(([key, item]) => {
                          const pct = (item.count / activeTotal) * 100
                          return (
                            <div key={key}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-mid)' }}>{item.label}</span>
                                <span style={{ fontWeight: 700, color: 'var(--forest)' }}>{item.count} orders ({pct.toFixed(0)}%)</span>
                              </div>
                              <div style={{ width: '100%', height: 10, background: 'rgba(0,0,0,0.03)', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 5, transition: 'width 0.5s ease-out' }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Customer Reviews & Delivery Feedback */}
              <div style={{ marginTop: 12 }}>
                <h4 style={{ color: 'var(--forest)', margin: '0 0 16px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)' }}>
                  <span>🌟</span> Customer Reviews & Delivery Feedback
                </h4>

                {loadingFeedbacks && feedbacks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.25)', borderRadius: 'var(--radius-lg)', border: '1px dashed rgba(74,140,63,0.15)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>Loading feedback logs...</div>
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.25)', borderRadius: 'var(--radius-lg)', border: '1px dashed rgba(74,140,63,0.15)' }}>
                    <span style={{ fontSize: '2rem' }}>⭐</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginTop: 8 }}>No delivery feedback ratings or reviews received yet.</div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    maxHeight: 400,
                    overflowY: 'auto',
                    paddingRight: 8,
                  }}>
                    {feedbacks.map((f: any) => {
                      return (
                        <div
                          key={f.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.65)',
                            border: '1.5px solid rgba(74, 140, 63, 0.12)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '16px 20px',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'transform 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ color: '#eab308', display: 'flex', gap: 2, fontSize: '0.95rem' }}>
                                {Array.from({ length: 5 }).map((_, idx) => (
                                  <span key={idx}>{idx < f.rating ? '★' : '☆'}</span>
                                ))}
                              </div>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: f.type === 'DELIVERY' ? 'rgba(13, 148, 136, 0.1)' : 'rgba(74, 140, 63, 0.1)',
                                color: f.type === 'DELIVERY' ? '#0d9488' : 'var(--forest)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                textTransform: 'uppercase'
                              }}>
                                {f.type || 'Order'} Review
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>
                              {new Date(f.createdAt).toLocaleDateString()} at {new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {f.comments && (
                            <p style={{
                              margin: '12px 0 0 0',
                              fontSize: '0.88rem',
                              color: 'var(--text-dark)',
                              lineHeight: 1.5,
                              fontStyle: 'italic',
                              fontWeight: 500,
                              background: 'rgba(74,140,63,0.03)',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-md)',
                              borderLeft: '3px solid var(--forest)'
                            }}>
                              "{f.comments}"
                            </p>
                          )}

                          <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                            <span>Order ID: <strong style={{ color: 'var(--text-mid)' }}>#{f.order?.id?.slice(-8).toUpperCase()}</strong></span>
                            {f.order?.customerName && (
                              <span>Customer: <strong style={{ color: 'var(--text-mid)' }}>{f.order.customerName}</strong></span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'records' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* HR Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.45)',
                  border: '1.5px solid rgba(74, 140, 63, 0.15)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 20,
                  backdropFilter: 'blur(12px)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>✅</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--forest)' }}>{recordsStats.present}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present Days</div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.45)',
                  border: '1.5px solid rgba(74, 140, 63, 0.15)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 20,
                  backdropFilter: 'blur(12px)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🌗</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>{recordsStats.halfDay}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Half Days</div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.45)',
                  border: '1.5px solid rgba(74, 140, 63, 0.15)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 20,
                  backdropFilter: 'blur(12px)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🤒</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0d9488' }}>{recordsStats.sickLeave}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sick Leaves</div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.45)',
                  border: '1.5px solid rgba(74, 140, 63, 0.15)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 20,
                  backdropFilter: 'blur(12px)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>❌</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e11d48' }}>{recordsStats.absent}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Absents</div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.45)',
                  border: '1.5px solid rgba(74, 140, 63, 0.15)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 20,
                  backdropFilter: 'blur(12px)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🎁</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--forest)' }}>{formatPrice(recordsStats.totalBonus)}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Bonuses</div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.45)',
                  border: '1.5px solid rgba(74, 140, 63, 0.15)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 20,
                  backdropFilter: 'blur(12px)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>💰</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--forest)' }}>{formatPrice(recordsStats.totalPaid)}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid</div>
                </div>
              </div>

              {/* Stacked Tables */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
                {/* Attendance Table */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.45)',
                  border: '1.5px solid rgba(74, 140, 63, 0.15)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 28,
                  backdropFilter: 'blur(12px)',
                }}>
                  <h3 style={{ color: 'var(--forest)', margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: 800 }}>📅 Attendance History</h3>
                  {attendances.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-soft)' }}>
                      No attendance history logged yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid rgba(74,140,63,0.15)' }}>
                            <th style={{ padding: '10px 8px', color: 'var(--forest)', fontSize: '0.82rem', fontWeight: 700 }}>Date</th>
                            <th style={{ padding: '10px 8px', color: 'var(--forest)', fontSize: '0.82rem', fontWeight: 700 }}>Status</th>
                            <th style={{ padding: '10px 8px', color: 'var(--forest)', fontSize: '0.82rem', fontWeight: 700 }}>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendances.map((att) => {
                            const dateStr = new Date(att.date).toLocaleDateString([], {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                            let bg = 'rgba(74, 140, 63, 0.12)'
                            let fg = '#4a8c3f'
                            let label = 'Present'
                            if (att.status === 'HALF_DAY') {
                              bg = 'rgba(245, 158, 11, 0.12)'
                              fg = '#d97706'
                              label = 'Half Day'
                            } else if (att.status === 'SICK_LEAVE') {
                              bg = 'rgba(13, 148, 136, 0.12)'
                              fg = '#0d9488'
                              label = 'Sick Leave'
                            } else if (att.status === 'ABSENT') {
                              bg = 'rgba(225, 29, 72, 0.12)'
                              fg = '#e11d48'
                              label = 'Absent'
                            }

                            return (
                              <tr key={att.id} style={{ borderBottom: '1px solid rgba(74,140,63,0.06)', fontSize: '0.8rem', color: 'var(--text-mid)' }}>
                                <td style={{ padding: '12px 8px', fontWeight: 600 }}>{dateStr}</td>
                                <td style={{ padding: '12px 8px' }}>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    background: bg,
                                    color: fg,
                                    border: `1.5px solid ${fg}20`,
                                    textTransform: 'uppercase',
                                    display: 'inline-block'
                                  }}>
                                    {label}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 8px', color: 'var(--text-soft)', fontStyle: att.notes ? 'normal' : 'italic' }}>
                                  {att.notes || '-'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Salary & Payments Table */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.45)',
                  border: '1.5px solid rgba(74, 140, 63, 0.15)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 28,
                  backdropFilter: 'blur(12px)',
                }}>
                  <h3 style={{ color: 'var(--forest)', margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: 800 }}>💵 Salary & Payslip History</h3>
                  {payments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-soft)' }}>
                      No payment history recorded yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid rgba(74,140,63,0.15)' }}>
                            <th style={{ padding: '10px 8px', color: 'var(--forest)', fontSize: '0.82rem', fontWeight: 700 }}>Month</th>
                            <th style={{ padding: '10px 8px', color: 'var(--forest)', fontSize: '0.82rem', fontWeight: 700 }}>Amounts</th>
                            <th style={{ padding: '10px 8px', color: 'var(--forest)', fontSize: '0.82rem', fontWeight: 700 }}>Status</th>
                            <th style={{ padding: '10px 8px', color: 'var(--forest)', fontSize: '0.82rem', fontWeight: 700 }}>Paid On</th>
                            <th style={{ padding: '10px 8px', color: 'var(--forest)', fontSize: '0.82rem', fontWeight: 700 }}>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => {
                            const isPaid = p.status === 'PAID'
                            return (
                              <tr key={p.id} style={{ borderBottom: '1px solid rgba(74,140,63,0.06)', fontSize: '0.8rem', color: 'var(--text-mid)' }}>
                                <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--forest)' }}>{p.month}</td>
                                <td style={{ padding: '12px 8px' }}>
                                  <div>Base: <strong>{formatPrice(p.amount)}</strong></div>
                                  {p.bonus > 0 && <div style={{ color: '#0d9488' }}>Bonus: <strong>+{formatPrice(p.bonus)}</strong></div>}
                                  <div style={{ borderTop: '1.5px dashed rgba(74,140,63,0.1)', marginTop: 4, paddingTop: 4, fontWeight: 700 }}>
                                    Total: {formatPrice(p.amount + p.bonus)}
                                  </div>
                                </td>
                                <td style={{ padding: '12px 8px' }}>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    background: isPaid ? 'rgba(74, 140, 63, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                    color: isPaid ? '#4a8c3f' : '#d97706',
                                    border: isPaid ? '1.5px solid rgba(74,140,63,0.2)' : '1.5px solid rgba(245,158,11,0.2)',
                                    textTransform: 'uppercase',
                                    display: 'inline-block'
                                  }}>
                                    {p.status}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 8px', color: 'var(--text-soft)' }}>
                                  {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                </td>
                                <td style={{ padding: '12px 8px', color: 'var(--text-soft)', fontStyle: p.notes ? 'normal' : 'italic' }}>
                                  {p.notes || '-'}
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
            </div>
          ) : activeTab === 'subscribers' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {/* Verification & Search console */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.45)',
                border: '1.5px solid rgba(74, 140, 63, 0.15)',
                borderRadius: 'var(--radius-xl)',
                padding: 28,
                backdropFilter: 'blur(12px)',
              }}>
                <h3 style={{ color: 'var(--forest)', margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🔍 Subscriber Verification & Scanner
                </h3>
                <form onSubmit={handleSubscriberSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    placeholder="Enter customer email address..."
                    required
                    value={subscriberSearchEmail}
                    onChange={(e) => setSubscriberSearchEmail(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 260,
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1.5px solid rgba(74, 140, 63, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 16px',
                      fontSize: '0.88rem',
                      color: 'var(--forest)',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={searchingSubscriber}
                    className="btn-primary"
                    style={{ padding: '10px 24px', background: 'var(--forest)', border: 'none', minWidth: 100 }}
                  >
                    {searchingSubscriber ? 'Searching...' : 'Verify Email'}
                  </button>
                </form>

                {subscriberSearchError && (
                  <div style={{ color: '#ef5350', fontSize: '0.85rem', fontWeight: 600, marginTop: 12 }}>
                    ⚠️ {subscriberSearchError}
                  </div>
                )}

                {/* Searched Subscriber Detail Card */}
                {subscriberSearchResult && (
                  <div style={{
                    marginTop: 20,
                    background: 'rgba(74, 140, 63, 0.05)',
                    border: '1.5px solid rgba(74, 140, 63, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 20,
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16
                  }}>
                    <div>
                      <span style={{
                        background: subscriberSearchResult.subscriptionTier === 'REDWOOD' ? 'rgba(245,158,11,0.15)' : 'rgba(74,140,63,0.15)',
                        border: '1.5px solid ' + (subscriberSearchResult.subscriptionTier === 'REDWOOD' ? 'rgba(245,158,11,0.3)' : 'rgba(74,140,63,0.3)'),
                        color: subscriberSearchResult.subscriptionTier === 'REDWOOD' ? '#f59e0b' : 'var(--forest)',
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {subscriberSearchResult.subscriptionTier} ACTIVE
                      </span>
                      <h4 style={{ margin: '8px 0 2px 0', color: 'var(--forest)', fontSize: '1.1rem', fontWeight: 700 }}>
                        {subscriberSearchResult.name || 'Anonymous Customer'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                        Email: {subscriberSearchResult.email} · Phone: {subscriberSearchResult.phone || '—'}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                        Expires on: {new Date(subscriberSearchResult.subscriptionExpires).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                      </p>
                    </div>

                    {/* Quick Drink Redemption action */}
                    {subscriberSearchResult.subscriptionTier === 'REDWOOD' && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'rgba(255,255,255,0.4)',
                        padding: 10,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(74, 140, 63, 0.1)'
                      }}>
                        <select
                          value={redeemDrinkName}
                          onChange={(e) => setRedeemDrinkName(e.target.value)}
                          style={{
                            background: '#fff',
                            border: '1px solid rgba(0,0,0,0.15)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 10px',
                            fontSize: '0.8rem',
                            color: 'var(--forest)',
                            outline: 'none',
                          }}
                        >
                          <option value="Forest Espresso">☕ Forest Espresso</option>
                          <option value="Mossy Latte">🍵 Mossy Latte</option>
                          <option value="Canopy Pour-Over">🍃 Canopy Pour-Over</option>
                          <option value="Wildflower Cold Brew">🍹 Wildflower Cold Brew</option>
                          <option value="Sunrise Cortado">☀️ Sunrise Cortado</option>
                          <option value="Velvet Flat White">🥛 Velvet Flat White</option>
                        </select>
                        <button
                          onClick={() => handleRedeemSubscriberDrink(subscriberSearchResult.email)}
                          disabled={redeemingDrink}
                          className="btn-primary"
                          style={{ padding: '8px 16px', background: 'var(--forest)', border: 'none', fontSize: '0.78rem' }}
                        >
                          {redeemingDrink ? 'Redeeming...' : 'Redeem Daily Drink'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active Subscribers Registry List */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.45)',
                border: '1.5px solid rgba(74, 140, 63, 0.15)',
                borderRadius: 'var(--radius-xl)',
                padding: 28,
                backdropFilter: 'blur(12px)',
              }}>
                <h3 style={{ color: 'var(--forest)', margin: '0 0 16px 0', fontSize: '1.2rem' }}>
                  👥 Active Subscribers Registry ({subscribersList.length})
                </h3>

                {loadingSubscribers ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-soft)', fontSize: '0.9rem' }}>
                    Loading active club members...
                  </div>
                ) : subscribersList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-soft)', fontSize: '0.9rem' }}>
                    No active subscribers found in database.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(74,140,63,0.15)', color: 'var(--forest)', fontSize: '0.85rem' }}>
                          <th style={{ padding: '10px 8px' }}>Subscriber</th>
                          <th style={{ padding: '10px 8px' }}>Membership Tier</th>
                          <th style={{ padding: '10px 8px' }}>Validity Expires</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscribersList.map((sub) => (
                          <tr key={sub.id} style={{ borderBottom: '1px solid rgba(74,140,63,0.06)', fontSize: '0.82rem' }}>
                            <td style={{ padding: '12px 8px' }}>
                              <strong style={{ color: 'var(--text-dark)' }}>{sub.name || 'Anonymous Member'}</strong>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>{sub.email}</div>
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <span style={{
                                background: sub.subscriptionTier === 'REDWOOD' ? 'rgba(245,158,11,0.1)' : 'rgba(74,140,63,0.1)',
                                color: sub.subscriptionTier === 'REDWOOD' ? '#b45309' : '#4a8c3f',
                                padding: '2px 8px',
                                borderRadius: 8,
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}>
                                {sub.subscriptionTier}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px', color: 'var(--text-mid)' }}>
                              {new Date(sub.subscriptionExpires).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              <button
                                onClick={() => {
                                  setSubscriberSearchEmail(sub.email)
                                  setSubscriberSearchResult(sub)
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--forest)',
                                  textDecoration: 'underline',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  fontSize: '0.8rem'
                                }}
                              >
                                Verify & Action
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {/* Header / Avatar Row */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.45)',
                border: '1.5px solid rgba(74, 140, 63, 0.15)',
                borderRadius: 'var(--radius-xl)',
                padding: 24,
                backdropFilter: 'blur(12px)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 24,
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'var(--forest)',
                  color: 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 800,
                  boxShadow: 'var(--shadow-md)'
                }}>
                  {worker?.name ? worker.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'W'}
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', fontSize: '1.8rem', margin: 0 }}>
                    {worker?.name || 'Delivery Partner'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <span style={{
                      fontSize: '0.75rem',
                      background: 'rgba(74, 140, 63, 0.1)',
                      color: 'var(--forest)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      💼 {worker?.role || 'Delivery Staff'}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      background: worker?.isAvailable ? 'rgba(74, 140, 63, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: worker?.isAvailable ? '#4a8c3f' : '#ef5350',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                    }}>
                      {worker?.isAvailable ? '🟢 Online & Available' : '🔴 Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Two Column Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 28, alignItems: 'start' }}>
                {/* Left Column: Personal info, Employment, Payroll, Performance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  {/* Personal & Employment Info */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.45)',
                    border: '1.5px solid rgba(74, 140, 63, 0.15)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 28,
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20
                  }}>
                    <div>
                      <h4 style={{ color: 'var(--forest)', margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>👤</span> Personal & Employment Info
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', fontWeight: 600 }}>Full Name</span>
                          <strong style={{ color: 'var(--forest)', fontSize: '0.95rem' }}>{worker?.name || 'Not Available'}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', fontWeight: 600 }}>Email Address</span>
                          <strong style={{ color: 'var(--forest)', fontSize: '0.95rem', wordBreak: 'break-all' }}>{worker?.email}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', fontWeight: 600 }}>Phone Number</span>
                          <strong style={{ color: 'var(--forest)', fontSize: '0.95rem' }}>{worker?.phone || 'No phone registered'}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', fontWeight: 600 }}>Date Joined</span>
                          <strong style={{ color: 'var(--forest)', fontSize: '0.95rem' }}>
                            {worker?.createdAt ? new Date(worker.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(74, 140, 63, 0.1)', paddingTop: 16 }}>
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-soft)', display: 'block', fontWeight: 600 }}>Base Monthly Salary</span>
                      <strong style={{ color: 'var(--leaf)', fontSize: '1.3rem', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        {formatPrice(worker?.salary || 0)}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 500 }}>/ month</span>
                      </strong>
                    </div>
                  </div>

                  {/* Performance metrics card */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.45)',
                    border: '1.5px solid rgba(74, 140, 63, 0.15)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 24,
                    backdropFilter: 'blur(12px)',
                  }}>
                    <h4 style={{ color: 'var(--forest)', margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>⭐</span> Performance Statistics
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)', fontWeight: 600 }}>Rating</span>
                        <strong style={{ color: 'var(--forest)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          ⭐ {performance?.rating || '4.8'} <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', fontWeight: 500 }}>({performance?.totalFeedbacks || 0} reviews)</span>
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)', fontWeight: 600 }}>Avg. Delivery Speed</span>
                        <strong style={{ color: 'var(--forest)', fontSize: '1.1rem' }}>
                          ⏱️ {performance?.avgDeliveryTimeMinutes || 15} mins
                        </strong>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-soft)' }}>On-Time Rate</span>
                          <span style={{ fontWeight: 700, color: 'var(--forest)' }}>{performance?.onTimeRate || 97}%</span>
                        </div>
                        <div style={{ width: '100%', height: 8, background: 'rgba(0,0,0,0.03)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${performance?.onTimeRate || 97}%`, height: '100%', background: 'var(--leaf)', borderRadius: 4 }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payroll & Attendance Summary */}
                  <div style={{
                    background: 'rgba(74, 140, 63, 0.04)',
                    border: '1.5px solid rgba(74, 140, 63, 0.15)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 24,
                    backdropFilter: 'blur(12px)',
                  }}>
                    <h4 style={{ color: 'var(--forest)', margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700 }}>📊 Payroll & Attendance Summary</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 20 }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', display: 'block' }}>Paid Base Salary</span>
                        <strong style={{ color: 'var(--forest)', fontSize: '1.15rem' }}>{formatPrice(recordsStats.totalPaid)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', display: 'block' }}>Bonuses Earned</span>
                        <strong style={{ color: 'var(--leaf)', fontSize: '1.15rem' }}>{formatPrice(recordsStats.totalBonus)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', display: 'block' }}>Attendance Rate</span>
                        <strong style={{ color: 'var(--forest)', fontSize: '1.15rem' }}>
                          {(() => {
                            const total = recordsStats.present + recordsStats.halfDay + recordsStats.absent + recordsStats.sickLeave
                            if (total === 0) return '100%'
                            const rate = ((recordsStats.present + recordsStats.halfDay * 0.5) / total) * 100
                            return `${rate.toFixed(0)}%`
                          })()}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Store Admin Contacts, Live Chat */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  {/* Store Admin Contacts */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.45)',
                    border: '1.5px solid rgba(74, 140, 63, 0.15)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 24,
                    backdropFilter: 'blur(12px)',
                  }}>
                    <h4 style={{ color: 'var(--forest)', margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🛡️</span> Store Administrators
                    </h4>
                    {admins.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: 0 }}>No administrators registered.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {admins.map((adm: any) => (
                          <div key={adm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid rgba(74, 140, 63, 0.08)' }}>
                            <div>
                              <strong style={{ color: 'var(--forest)', fontSize: '0.9rem', display: 'block' }}>{adm.name}</strong>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)', display: 'block' }}>{adm.email}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <a
                                href={`mailto:${adm.email}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: 'rgba(74, 140, 63, 0.1)',
                                  color: 'var(--forest)',
                                  textDecoration: 'none',
                                  fontSize: '0.9rem'
                                }}
                                title="Email Admin"
                              >
                                ✉️
                              </a>
                              {adm.phone && (
                                <a
                                  href={`tel:${adm.phone}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: 'rgba(74, 140, 63, 0.1)',
                                    color: 'var(--forest)',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem'
                                  }}
                                  title="Call Admin"
                                >
                                  📞
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Live Support Chat Console */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.45)',
                    border: '1.5px solid rgba(74, 140, 63, 0.15)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 24,
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    flexDirection: 'column',
                    height: 380,
                  }}>
                    <h4 style={{ color: 'var(--forest)', margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>💬</span> Live Chat with Support
                    </h4>
                    
                    {/* Messages container */}
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.3)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid rgba(74, 140, 63, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      marginBottom: 16,
                    }}>
                      {chatMessages.length === 0 ? (
                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-soft)', fontSize: '0.85rem' }}>
                          No messages yet. Send a message to start chatting with administrators!
                        </div>
                      ) : (
                        chatMessages.map((msg: any) => {
                          const isSelf = msg.senderId === worker?.id
                          return (
                            <div
                              key={msg.id}
                              style={{
                                alignSelf: isSelf ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                                background: isSelf ? 'var(--forest)' : 'rgba(255, 255, 255, 0.8)',
                                color: isSelf ? '#fff' : 'var(--text-dark)',
                                padding: '10px 14px',
                                borderRadius: isSelf ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                boxShadow: 'var(--shadow-sm)',
                                fontSize: '0.85rem',
                                border: isSelf ? 'none' : '1px solid rgba(74, 140, 63, 0.1)',
                              }}
                            >
                              <div style={{ fontWeight: 700, fontSize: '0.7rem', color: isSelf ? 'rgba(255,255,255,0.7)' : 'var(--forest)', marginBottom: 2 }}>
                                {isSelf ? 'You' : 'Admin'}
                              </div>
                              <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                              <div style={{ fontSize: '0.65rem', opacity: 0.7, textAlign: 'right', marginTop: 4 }}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          )
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Type a message to admin..."
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        disabled={sendingChat}
                        style={{
                          flex: 1,
                          background: 'rgba(255, 255, 255, 0.8)',
                          border: '1.5px solid rgba(74, 140, 63, 0.2)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '10px 16px',
                          fontSize: '0.85rem',
                          color: 'var(--forest)',
                          outline: 'none',
                          transition: 'border-color 0.25s',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={sendingChat || !chatInput.trim()}
                        className="btn-primary"
                        style={{
                          padding: '10px 20px',
                          fontSize: '0.85rem',
                          background: 'var(--forest)',
                          border: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {sendingChat ? 'Sending...' : 'Send 📨'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
