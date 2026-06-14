'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice } from '@/types'
import LivePopupNotifications from '@/components/LivePopupNotifications'

type OrderStatus = 'PENDING' | 'RECEIVED' | 'ASSIGNED' | 'BREWING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

interface Order {
  id: string
  status: OrderStatus
  orderType: 'DINE_IN' | 'DELIVERY'
  totalAmount: number
  paymentMethod: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  deliveryAddress?: string
  latitude?: number
  longitude?: number
  paymentId?: string
  notes?: string
  createdAt: string
  updatedAt: string
  tableNumber?: string | null
  user?: { email: string; name: string } | null
  deliveryUserId?: string | null
  deliveryUser?: { id: string; name: string; email: string; phone?: string | null } | null
  items: Array<{
    quantity: number
    unitPrice: number
    customizations: any
    product: { name: string }
  }>
}

interface AdminData {
  orders: Order[]
  total: number
  pages: number
  revenue: { today: number; thisWeek: number; thisMonth: number }
}

const CATEGORY_ORDER = ['HOT', 'COLD', 'FOOD', 'RESERVE', 'SEASONAL']

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Tabs: 'barista' (Kanban), 'orders' (Registry List), 'reservations' (Bookings), 'menu' (Manage Menu), 'analytics' (Revenue Analytics), 'profile' (Admin Profile), 'workers' (Staff Workers), 'inventory' (Inventory), 'complaints' (Complaints), 'subscriptions' (Subscriptions), 'financials' (Financials)
  const [activeTab, setActiveTab] = useState<'barista' | 'orders' | 'reservations' | 'menu' | 'analytics' | 'profile' | 'workers' | 'inventory' | 'complaints' | 'subscriptions' | 'financials'>('barista')

  // Admin profile state
  const [adminProfile, setAdminProfile] = useState<any>(null)
  const [loadingAdminProfile, setLoadingAdminProfile] = useState(false)
  const [adminEditName, setAdminEditName] = useState('')
  const [adminEditImage, setAdminEditImage] = useState('')
  const [adminEditPhone, setAdminEditPhone] = useState('')
  const [adminProfileSaving, setAdminProfileSaving] = useState(false)
  const [adminProfileMsg, setAdminProfileMsg] = useState<{type:'success'|'error',text:string}|null>(null)
  const [adminPwCurrent, setAdminPwCurrent] = useState('')
  const [adminPwNew, setAdminPwNew] = useState('')
  const [adminPwConfirm, setAdminPwConfirm] = useState('')
  const [adminPwSaving, setAdminPwSaving] = useState(false)
  const [adminPwMsg, setAdminPwMsg] = useState<{type:'success'|'error',text:string}|null>(null)
  const [adminShowPwCurrent, setAdminShowPwCurrent] = useState(false)
  const [adminShowPwNew, setAdminShowPwNew] = useState(false)
  const [adminShowPwConfirm, setAdminShowPwConfirm] = useState(false)
  const [adminOtpStep, setAdminOtpStep] = useState<'idle'|'sending'|'otp'|'verifying'|'newpw'|'done'>('idle')
  const [adminOtpEmail, setAdminOtpEmail] = useState('')
  const [adminOtpCode, setAdminOtpCode] = useState('')
  const [adminOtpNewPw, setAdminOtpNewPw] = useState('')
  const [adminOtpNewPwConfirm, setAdminOtpNewPwConfirm] = useState('')
  const [adminOtpMsg, setAdminOtpMsg] = useState<{type:'success'|'error',text:string}|null>(null)
  const [showAdminOtpReset, setShowAdminOtpReset] = useState(false)

  // Worker staff management states
  const [workersList, setWorkersList] = useState<any[]>([])
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [showWorkerModal, setShowWorkerModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<any | null>(null)
  const [adminsList, setAdminsList] = useState<any[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(false)

  // Worker Chat Modal states
  const [showChatModal, setShowChatModal] = useState(false)
  const [chatWorker, setChatWorker] = useState<any | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const chatWorkerRef = useRef<any>(null)

  useEffect(() => {
    chatWorkerRef.current = chatWorker
  }, [chatWorker])

  const fetchChatMessages = useCallback(async (workerId: string) => {
    try {
      const res = await fetch(`/api/support/chat?userId=${workerId}`)
      if (res.ok) {
        const data = await res.json()
        setChatMessages(data)
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err)
    }
  }, [])

  const handleOpenChatModal = (worker: any) => {
    setChatWorker(worker)
    setChatMessages([])
    setChatInput('')
    setShowChatModal(true)
    fetchChatMessages(worker.id)
  }

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !chatWorker || sendingChat) return
    setSendingChat(true)
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput.trim(),
          targetUserId: chatWorker.id
        })
      })
      if (res.ok) {
        const newMessage = await res.json()
        setChatMessages(prev => {
          if (prev.some(m => m.id === newMessage.id)) return prev
          return [...prev, newMessage]
        })
        setChatInput('')
      } else {
        showToast('❌ Failed to send message.')
      }
    } catch {
      showToast('❌ Error connecting to support chat.')
    } finally {
      setSendingChat(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])
  
  const [workerName, setWorkerName] = useState('')
  const [workerEmail, setWorkerEmail] = useState('')
  const [workerPhone, setWorkerPhone] = useState('')
  const [workerSalaryRupees, setWorkerSalaryRupees] = useState('')
  const [workerPassword, setWorkerPassword] = useState('')
  const [workerFormError, setWorkerFormError] = useState('')
  const [workerSubmitting, setWorkerSubmitting] = useState(false)

  // Worker HR & Ledger states
  const [selectedWorkerForLedger, setSelectedWorkerForLedger] = useState<any | null>(null)
  const [workerAttendances, setWorkerAttendances] = useState<any[]>([])
  const [workerPayments, setWorkerPayments] = useState<any[]>([])
  const [loadingLedger, setLoadingLedger] = useState(false)

  // Attendance Form States
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [attendanceStatus, setAttendanceStatus] = useState<'PRESENT' | 'HALF_DAY' | 'SICK_LEAVE' | 'ABSENT'>('PRESENT')
  const [attendanceNotes, setAttendanceNotes] = useState('')
  const [submittingAttendance, setSubmittingAttendance] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')

  // Payment Form States
  const [paymentMonth, setPaymentMonth] = useState(() => {
    const d = new Date()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[d.getMonth()]} ${d.getFullYear()}`
  })
  const [paymentAmountRupees, setPaymentAmountRupees] = useState('')
  const [paymentBonusRupees, setPaymentBonusRupees] = useState('0')
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PENDING'>('PAID')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [paymentNotes, setPaymentNotes] = useState('')
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')


  // Menu Management State
  interface MenuProduct {
    id: string
    name: string
    slug: string
    description: string
    notes: string
    basePrice: number
    imageUrl: string
    badge?: string | null
    origin?: string | null
    category: 'HOT' | 'COLD' | 'FOOD' | 'RESERVE' | 'SEASONAL'
    isAvailable: boolean
    sortOrder: number
  }

  interface MenuModifier {
    id: string
    name: string
    type: 'MILK' | 'SYRUP' | 'TEMPERATURE' | 'SIZE'
    priceAdjustment: number
    isAvailable: boolean
    sortOrder: number
  }

  const [products, setProducts] = useState<MenuProduct[]>([])
  const [modifiers, setModifiers] = useState<MenuModifier[]>([])
  const [loadingMenu, setLoadingMenu] = useState(false)

  // Subscriptions Tab State
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false)

  // Financial Ledger Tab State
  const [financials, setFinancials] = useState<any>(null)
  const [loadingFinancials, setLoadingFinancials] = useState(false)

  // Product Form states
  const [editingProduct, setEditingProduct] = useState<MenuProduct | null>(null)
  const [isProductFormOpen, setIsProductFormOpen] = useState(false)
  const [productName, setProductName] = useState('')
  const [productSlug, setProductSlug] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productNotes, setProductNotes] = useState('')
  const [productPriceRupees, setProductPriceRupees] = useState('')
  const [productImageUrl, setProductImageUrl] = useState('')
  const [productBadge, setProductBadge] = useState('')
  const [productOrigin, setProductOrigin] = useState('')
  const [productCategory, setProductCategory] = useState<'HOT' | 'COLD' | 'FOOD' | 'RESERVE' | 'SEASONAL'>('HOT')
  const [productIsAvailable, setProductIsAvailable] = useState(true)
  const [productSortOrder, setProductSortOrder] = useState('0')
  const [productFormError, setProductFormError] = useState('')
  const [productSubmitting, setProductSubmitting] = useState(false)

  // Modifier Edit states
  const [editingModifierId, setEditingModifierId] = useState<string | null>(null)
  const [modifierPriceRupees, setModifierPriceRupees] = useState('')
  const [modifierIsAvailable, setModifierIsAvailable] = useState(true)
  const [modifierSubmitting, setModifierSubmitting] = useState(false)

  // Menu list search & filters
  const [menuSearch, setMenuSearch] = useState('')
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('ALL')
  
  // Admin Data & Lists
  const [data, setData] = useState<AdminData | null>(null)
  const [kanbanOrders, setKanbanOrders] = useState<Order[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  
  // Status flags
  const [loading, setLoading] = useState(true)
  const [loadingReservations, setLoadingReservations] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [pingingId, setPingingId] = useState<string | null>(null)
  const [confirmingResvId, setConfirmingResvId] = useState<string | null>(null)
  
  // Registry Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pendingQrCount, setPendingQrCount] = useState(0)

  const fetchPendingQrCount = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders?status=PENDING&limit=100')
      if (res.ok) {
        const json = await res.json()
        const qrPending = (json.orders || []).filter((o: any) => o.paymentMethod === 'QR')
        setPendingQrCount(qrPending.length)
      }
    } catch (err) {
      console.error('Fetch pending QR count error:', err)
    }
  }, [])
  
  // Expandable row detail inside registry list
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  
  // Toast notifications
  const [toast, setToast] = useState<string | null>(null)

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [chartView, setChartView] = useState<'monthly' | 'daily' | 'hourly' | 'dayOfWeek'>('daily')

  // Inventory Management State
  const [inventoryList, setInventoryList] = useState<any[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false)
  const [editingInventoryItem, setEditingInventoryItem] = useState<any | null>(null)
  const [invName, setInvName] = useState('')
  const [invQuantity, setInvQuantity] = useState(0)
  const [invUnit, setInvUnit] = useState('units')
  const [invThreshold, setInvThreshold] = useState(10)
  const [invCategory, setInvCategory] = useState('')
  const [invError, setInvError] = useState('')
  const [invSubmitting, setInvSubmitting] = useState(false)

  // Complaints / Feedback list state
  const [feedbackList, setFeedbackList] = useState<any[]>([])
  const [loadingFeedback, setLoadingFeedback] = useState(false)

  // Broadcast Alert Console states
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastTarget, setBroadcastTarget] = useState<'online' | 'all'>('online')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => {
      setToast(prev => prev === msg ? null : prev)
    }, 4000)
  }

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastMsg.trim() || sendingBroadcast) return
    setSendingBroadcast(true)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMsg, target: broadcastTarget }),
      })
      if (res.ok) {
        const result = await res.json()
        showToast(`📢 Broadcast sent successfully to ${result.count} worker(s).`)
        setBroadcastMsg('')
      } else {
        const errorData = await res.json()
        showToast(`⚠️ Failed to send broadcast: ${errorData.error || 'Unknown error'}`)
      }
    } catch {
      showToast('⚠️ Connection error while sending broadcast')
    } finally {
      setSendingBroadcast(false)
    }
  }

  // Play local sound chime on action
  const playLocalChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1) // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.3)
    } catch (e) {
      console.error('Audio play error:', e)
    }
  }

  // Fetch paginated order registry
  const fetchOrders = useCallback(async () => {
    try {
      const query = new URLSearchParams()
      query.set('page', String(page))
      if (statusFilter !== 'ALL') {
        query.set('status', statusFilter)
      }
      if (search) {
        query.set('search', search)
      }
      const res = await fetch(`/api/admin/orders?${query.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Fetch orders registry error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  // Fetch recent active orders for the Kanban view
  const fetchKanbanOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders?limit=100&status=ALL')
      if (res.ok) {
        const json = await res.json()
        setKanbanOrders(json.orders || [])
        setData(prev => ({
          ...prev,
          revenue: json.revenue,
          total: json.total,
          pages: prev?.pages ?? json.pages,
          orders: prev?.orders ?? []
        }))
      }
    } catch (err) {
      console.error('Fetch kanban orders error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch table bookings
  const fetchReservations = useCallback(async () => {
    setLoadingReservations(true)
    try {
      const res = await fetch('/api/admin/reservations')
      if (res.ok) {
        const json = await res.json()
        setReservations(json)
      }
    } catch (err) {
      console.error('Fetch reservations error:', err)
    } finally {
      setLoadingReservations(false)
    }
  }, [])

  // Menu helper functions
  const fetchMenuData = useCallback(async () => {
    setLoadingMenu(true)
    try {
      const [resProd, resMod] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/modifiers')
      ])
      if (resProd.ok && resMod.ok) {
        const prodData = await resProd.json()
        const modData = await resMod.json()
        setProducts(prodData)
        setModifiers(modData)
      } else {
        showToast('❌ Failed to fetch menu details.')
      }
    } catch (err) {
      console.error('Fetch menu data error:', err)
      showToast('❌ Connection error fetching menu.')
    } finally {
      setLoadingMenu(false)
    }
  }, [])

  // Fetch revenue analytics details
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true)
    try {
      const res = await fetch('/api/admin/analytics')
      if (res.ok) {
        const json = await res.json()
        setAnalyticsData(json)
      } else {
        showToast('❌ Failed to fetch analytics data.')
      }
    } catch (err) {
      console.error('Fetch analytics error:', err)
      showToast('❌ Connection error fetching analytics.')
    } finally {
      setLoadingAnalytics(false)
    }
  }, [])

  // Fetch workers staff list
  const fetchWorkers = useCallback(async () => {
    setLoadingWorkers(true)
    try {
      const res = await fetch('/api/admin/workers')
      if (res.ok) {
        const data = await res.json()
        setWorkersList(data)
      } else {
        showToast('❌ Failed to fetch workers.')
      }
    } catch (err) {
      console.error('Fetch workers error:', err)
      showToast('❌ Connection error fetching workers.')
    } finally {
      setLoadingWorkers(false)
    }
  }, [])

  const fetchAdmins = useCallback(async () => {
    setLoadingAdmins(true)
    try {
      const res = await fetch('/api/admin/admins')
      if (res.ok) {
        const data = await res.json()
        setAdminsList(data)
      }
    } catch (err) {
      console.error('Fetch admins error:', err)
    } finally {
      setLoadingAdmins(false)
    }
  }, [])

  // Fetch worker ledger records (attendance logs and payment history)
  const fetchWorkerRecords = useCallback(async (workerId: string) => {
    setLoadingLedger(true)
    try {
      const res = await fetch(`/api/admin/workers/${workerId}/records`)
      if (res.ok) {
        const data = await res.json()
        setWorkerAttendances(data.attendances || [])
        setWorkerPayments(data.payments || [])
      } else {
        showToast('❌ Failed to fetch worker ledger.')
      }
    } catch (err) {
      console.error('Fetch worker ledger error:', err)
      showToast('❌ Connection error fetching ledger.')
    } finally {
      setLoadingLedger(false)
    }
  }, [])

  // Fetch inventory list
  const fetchInventory = useCallback(async () => {
    setLoadingInventory(true)
    try {
      const res = await fetch('/api/inventory')
      if (res.ok) {
        const json = await res.json()
        setInventoryList(json)
      }
    } catch (err) {
      console.error('Fetch inventory error:', err)
    } finally {
      setLoadingInventory(false)
    }
  }, [])

  // Fetch feedback/complaints list
  const fetchFeedback = useCallback(async () => {
    setLoadingFeedback(true)
    try {
      const res = await fetch('/api/feedback')
      if (res.ok) {
        const json = await res.json()
        setFeedbackList(json)
      }
    } catch (err) {
      console.error('Fetch feedback error:', err)
    } finally {
      setLoadingFeedback(false)
    }
  }, [])

  // Financials Fetching
  const fetchFinancials = useCallback(async () => {
    setLoadingFinancials(true)
    try {
      const res = await fetch('/api/admin/financials')
      if (res.ok) {
        const data = await res.json()
        setFinancials(data)
      }
    } catch (err) {
      console.error('Fetch financials error:', err)
    } finally {
      setLoadingFinancials(false)
    }
  }, [])

  // Subscriptions Fetching
  const fetchSubscriptions = useCallback(async () => {
    setLoadingSubscriptions(true)
    try {
      const res = await fetch('/api/admin/subscriptions')
      if (res.ok) {
        const data = await res.json()
        setSubscribers(data.subscribers || [])
      }
    } catch (err) {
      console.error('Fetch subscriptions error:', err)
    } finally {
      setLoadingSubscriptions(false)
    }
  }, [])

  // Combined dashboard data refreshes (optimized to fetch active tab data only)
  const refreshAllData = useCallback(async () => {
    const promises: Promise<any>[] = [
      fetchPendingQrCount()
    ]
    if (activeTab === 'barista') {
      promises.push(fetchKanbanOrders())
    } else if (activeTab === 'orders') {
      promises.push(fetchOrders())
    } else if (activeTab === 'reservations') {
      promises.push(fetchReservations())
    } else if (activeTab === 'menu') {
      promises.push(fetchMenuData())
    } else if (activeTab === 'analytics') {
      promises.push(fetchAnalytics())
    } else if (activeTab === 'workers') {
      promises.push(fetchWorkers())
      promises.push(fetchAdmins())
      const selectedWorker = selectedWorkerRef.current
      if (selectedWorker) {
        promises.push(fetchWorkerRecords(selectedWorker.id))
      }
    } else if (activeTab === 'inventory') {
      promises.push(fetchInventory())
    } else if (activeTab === 'complaints') {
      promises.push(fetchFeedback())
    } else if (activeTab === 'subscriptions') {
      promises.push(fetchSubscriptions())
    } else if (activeTab === 'financials') {
      promises.push(fetchFinancials())
    }
    await Promise.all(promises)
  }, [fetchOrders, fetchKanbanOrders, fetchReservations, fetchPendingQrCount, fetchAnalytics, fetchMenuData, fetchWorkers, fetchAdmins, fetchWorkerRecords, fetchInventory, fetchFeedback, fetchSubscriptions, fetchFinancials, activeTab])

  // Trigger tab data fetches immediately when tab becomes active
  useEffect(() => {
    if (activeTab === 'barista') {
      fetchKanbanOrders()
    } else if (activeTab === 'orders') {
      fetchOrders()
    } else if (activeTab === 'reservations') {
      fetchReservations()
    } else if (activeTab === 'menu') {
      fetchMenuData()
    } else if (activeTab === 'analytics') {
      fetchAnalytics()
    } else if (activeTab === 'workers') {
      fetchWorkers()
      fetchAdmins()
    } else if (activeTab === 'inventory') {
      fetchInventory()
    } else if (activeTab === 'complaints') {
      fetchFeedback()
    } else if (activeTab === 'subscriptions') {
      fetchSubscriptions()
    } else if (activeTab === 'financials') {
      fetchFinancials()
    }
  }, [activeTab, fetchOrders, fetchKanbanOrders, fetchReservations, fetchMenuData, fetchAnalytics, fetchWorkers, fetchAdmins, fetchInventory, fetchFeedback, fetchSubscriptions, fetchFinancials])

  // Keep latest refs of changing handlers to avoid EventSource reconnections
  const refreshAllDataRef = useRef(refreshAllData)
  const selectedWorkerRef = useRef<any>(null)
  
  useEffect(() => {
    refreshAllDataRef.current = refreshAllData
  }, [refreshAllData])

  useEffect(() => {
    selectedWorkerRef.current = selectedWorkerForLedger
  }, [selectedWorkerForLedger])

  // Real-time EventSource Listener for Admin Operations
  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') return

    let eventSource: EventSource | null = null

    function connectSSE() {
      console.log('Connecting to SSE stream from Admin Console...')
      eventSource = new EventSource('/api/notifications/stream', { withCredentials: true })

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'connected') {
            console.log('SSE connected with role:', data.role)
          } else if (data.type === 'order_update') {
            console.log('SSE order_update event received:', data)
            refreshAllDataRef.current()
          } else if (data.type === 'worker_record_updated') {
            console.log('SSE worker_record_updated event received:', data)
            fetchWorkers()
            const currentSelectedWorker = selectedWorkerRef.current
            if (currentSelectedWorker && currentSelectedWorker.id === data.workerId) {
              fetchWorkerRecords(currentSelectedWorker.id)
            }
          } else if (data.type === 'inventory_low') {
            console.log('SSE inventory_low event received:', data)
            showToast(`⚠️ Inventory low: ${data.inventoryName} (${data.quantity})`)
            fetchInventory()
          } else if (data.type === 'support_chat') {
            console.log('SSE support_chat event received:', data)
            fetchFeedback()
            const currentChatWorker = chatWorkerRef.current
            if (currentChatWorker && data.userId === currentChatWorker.id) {
              setChatMessages(prev => {
                if (prev.some(m => m.id === data.message.id)) return prev
                return [...prev, data.message]
              })
            }
          } else if (data.type === 'new_order' || data.type === 'new_booking' || data.type === 'new_delivery_assigned') {
            // Forward popup events to window for LivePopupNotifications component
            window.dispatchEvent(new CustomEvent('forest_brew_sse', { detail: data }))
            // Also refresh the relevant tab data
            if (data.type === 'new_order') refreshAllDataRef.current()
            if (data.type === 'new_booking') fetchReservations()
          }
        } catch (err) {
          console.error('Error parsing SSE event data:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.warn('SSE EventSource connection closed or failed, attempting reconnect...')
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
  }, [session, status, fetchWorkers, fetchWorkerRecords, fetchInventory, fetchFeedback])

  // Auto-refresh interval (every 30s) and Auth check
  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }

    refreshAllData()

    const interval = setInterval(() => {
      refreshAllData()
    }, 30000)

    return () => clearInterval(interval)
  }, [session, status, router, refreshAllData])

  // Status transitions
  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    // Find the order to check its orderType and delivery status
    const order = kanbanOrders.find(o => o.id === orderId) || (data as any)?.orders?.find((o: any) => o.id === orderId)
    const isDelivery = order?.orderType === 'DELIVERY'
    const hasWorker = !!(order?.deliveryUserId || order?.deliveryUser)

    let nextStatus: OrderStatus
    if (currentStatus === 'PENDING') {
      nextStatus = 'RECEIVED'
    } else if (currentStatus === 'RECEIVED') {
      if (isDelivery) {
        if (!hasWorker) {
          showToast('⚠️ Please assign a delivery worker first.')
          return
        }
        nextStatus = 'ASSIGNED'
      } else {
        nextStatus = 'BREWING'
      }
    } else if (currentStatus === 'ASSIGNED') {
      nextStatus = 'BREWING'
    } else if (currentStatus === 'BREWING') {
      nextStatus = 'READY'
    } else if (currentStatus === 'READY') {
      if (isDelivery) {
        if (!hasWorker) {
          showToast('⚠️ Please assign a delivery worker first.')
          return
        }
        nextStatus = 'OUT_FOR_DELIVERY'
      } else {
        nextStatus = 'DELIVERED'
      }
    } else if (currentStatus === 'OUT_FOR_DELIVERY') {
      nextStatus = 'DELIVERED'
    } else {
      return
    }

    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        showToast(`Order status updated to ${nextStatus}!`)
        playLocalChime()
        await refreshAllData()
      } else {
        showToast('❌ Failed to update status.')
      }
    } catch (err) {
      console.error('Advance status error:', err)
      showToast('❌ Connection error updating status.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Worker staff handlers
  const handleAssignWorker = async (orderId: string, workerId: string) => {
    const order = kanbanOrders.find(o => o.id === orderId) || (data as any)?.orders?.find((o: any) => o.id === orderId)
    const targetStatus = order?.status === 'RECEIVED' ? 'ASSIGNED' : order?.status || 'ASSIGNED'

    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: targetStatus,
          deliveryUserId: workerId 
        }),
      })
      if (res.ok) {
        showToast(targetStatus === 'ASSIGNED' ? 'Order assigned to delivery worker!' : 'Delivery worker reassigned!')
        playLocalChime()
        await refreshAllData()
      } else {
        showToast('❌ Failed to assign worker.')
      }
    } catch (err) {
      console.error('Assign worker error:', err)
      showToast('❌ Connection error assigning worker.')
    } finally {
      setUpdatingId(null)
    }
  }

  const getWorkerActiveLoad = (workerId: string) => {
    return kanbanOrders.filter(order => 
      order.deliveryUserId === workerId && 
      ['ASSIGNED', 'BREWING', 'READY', 'OUT_FOR_DELIVERY'].includes(order.status)
    ).length
  }

  // Calculate recommended worker based on active workload
  const onlineWorkersListForRecom = workersList.filter(w => w.isAvailable)
  let recommendedWorkerId: string | null = null
  if (onlineWorkersListForRecom.length > 0) {
    let bestWorker = onlineWorkersListForRecom[0]
    let minLoad = getWorkerActiveLoad(bestWorker.id)
    for (let i = 1; i < onlineWorkersListForRecom.length; i++) {
      const w = onlineWorkersListForRecom[i]
      const load = getWorkerActiveLoad(w.id)
      if (load < minLoad) {
        minLoad = load
        bestWorker = w
      }
    }
    recommendedWorkerId = bestWorker.id
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSmartAssign = async (orderId: string) => {
    const onlineWorkers = workersList.filter(w => w.isAvailable)
    if (onlineWorkers.length === 0) {
      showToast('⚠️ No online delivery workers available.')
      return
    }

    // Find worker with lowest active load
    let selectedWorker = onlineWorkers[0]
    let minLoad = getWorkerActiveLoad(selectedWorker.id)

    for (let i = 1; i < onlineWorkers.length; i++) {
      const w = onlineWorkers[i]
      const load = getWorkerActiveLoad(w.id)
      if (load < minLoad) {
        minLoad = load
        selectedWorker = w
      }
    }

    showToast(`🤖 Smart Assigning to ${selectedWorker.name} (Active load: ${minLoad})...`)
    await handleAssignWorker(orderId, selectedWorker.id)
  }

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    setInvError('')
    if (!invName.trim()) {
      setInvError('Item name is required')
      return
    }
    setInvSubmitting(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingInventoryItem?.id || undefined,
          name: invName.trim(),
          quantity: Number(invQuantity),
          unit: invUnit.trim(),
          threshold: Number(invThreshold),
          category: invCategory.trim() || null,
        }),
      })
      if (res.ok) {
        showToast(editingInventoryItem ? 'Inventory item updated!' : 'Inventory item added!')
        setIsInventoryModalOpen(false)
        setEditingInventoryItem(null)
        setInvName('')
        setInvQuantity(0)
        setInvUnit('units')
        setInvThreshold(10)
        setInvCategory('')
        await fetchInventory()
      } else {
        const errJson = await res.json()
        setInvError(errJson.error || 'Failed to save inventory item.')
      }
    } catch (err) {
      console.error(err)
      setInvError('Connection error.')
    } finally {
      setInvSubmitting(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleProcessRefund = async (orderId: string) => {
    if (!confirm(`Are you sure you want to refund Order #${orderId.slice(-6).toUpperCase()}? This will return the payment amount to the user's wallet.`)) return
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
      })
      if (res.ok) {
        showToast('💸 Refund successfully completed and wallet credited!')
        playLocalChime()
        await fetchFeedback()
        await refreshAllData()
      } else {
        const errJson = await res.json()
        showToast(`❌ Refund failed: ${errJson.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error(err)
      showToast('❌ Connection error processing refund.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteInventory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showToast('Inventory item deleted successfully.')
        await fetchInventory()
      } else {
        const data = await res.json()
        showToast(`❌ Failed to delete item: ${data.error || 'Unknown'}`)
      }
    } catch (err) {
      console.error(err)
      showToast('❌ Connection error.')
    }
  }

  const handleResolveComplaint = async (feedbackId: string, action: 'RESOLVE' | 'REFUND', refundAmount?: number) => {
    try {
      const res = await fetch('/api/admin/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId, action, refundAmount })
      })
      if (res.ok) {
        showToast(action === 'REFUND' ? '💸 Complaint resolved and refund issued!' : '✅ Complaint resolved!')
        playLocalChime()
        await fetchFeedback()
      } else {
        const errJson = await res.json()
        showToast(`❌ Action failed: ${errJson.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error(err)
      showToast('❌ Connection error.')
    }
  }

  const handleOpenAddWorkerModal = () => {
    setEditingWorker(null)
    setWorkerName('')
    setWorkerEmail('')
    setWorkerPhone('')
    setWorkerSalaryRupees('')
    setWorkerPassword('')
    setWorkerFormError('')
    setShowWorkerModal(true)
  }

  const handleOpenEditWorkerModal = (worker: any) => {
    setEditingWorker(worker)
    setWorkerName(worker.name || '')
    setWorkerEmail(worker.email || '')
    setWorkerPhone(worker.phone || '')
    setWorkerSalaryRupees(String((worker.salary || 0) / 100))
    setWorkerPassword('')
    setWorkerFormError('')
    setShowWorkerModal(true)
  }

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    setWorkerFormError('')

    if (!workerName.trim()) { setWorkerFormError('Name is required'); return }
    if (!workerEmail.trim()) { setWorkerFormError('Email is required'); return }
    const parsedSalary = parseFloat(workerSalaryRupees)
    if (isNaN(parsedSalary) || parsedSalary < 0) { setWorkerFormError('Salary must be a positive number'); return }

    setWorkerSubmitting(true)
    try {
      const salaryPaise = Math.round(parsedSalary * 100)
      const url = editingWorker ? `/api/admin/workers/${editingWorker.id}` : '/api/admin/workers'
      const method = editingWorker ? 'PATCH' : 'POST'

      const payload: any = {
        name: workerName.trim(),
        email: workerEmail.trim(),
        phone: workerPhone.trim() || null,
        salary: salaryPaise,
      }

      if (workerPassword.trim()) {
        payload.password = workerPassword.trim()
      } else if (!editingWorker) {
        payload.password = 'forestbrew123'
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        showToast(editingWorker ? 'Worker details updated!' : 'New worker registered!')
        setShowWorkerModal(false)
        setEditingWorker(null)
        setWorkerName('')
        setWorkerEmail('')
        setWorkerPhone('')
        setWorkerSalaryRupees('')
        setWorkerPassword('')
        await fetchWorkers()
      } else {
        setWorkerFormError(data.error || 'Failed to save worker.')
      }
    } catch (err) {
      console.error('Save worker error:', err)
      setWorkerFormError('Connection error.')
    } finally {
      setWorkerSubmitting(false)
    }
  }

  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm('Are you sure you want to remove this staff member? Their active deliveries will be unassigned.')) return
    try {
      const res = await fetch(`/api/admin/workers/${workerId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showToast('Worker removed successfully.')
        await fetchWorkers()
        if (selectedWorkerForLedger?.id === workerId) {
          setSelectedWorkerForLedger(null)
        }
      } else {
        const d = await res.json()
        showToast(`❌ Error: ${d.error || 'Failed to delete worker'}`)
      }
    } catch (err) {
      console.error('Delete worker error:', err)
      showToast('❌ Connection error removing worker.')
    }
  }

  // Auto-refresh worker records if ledger panel is open
  useEffect(() => {
    if (!selectedWorkerForLedger) return
    
    // Fetch immediately
    fetchWorkerRecords(selectedWorkerForLedger.id)
    
    const interval = setInterval(() => {
      fetchWorkerRecords(selectedWorkerForLedger.id)
    }, 8000)
    
    return () => clearInterval(interval)
  }, [selectedWorkerForLedger, fetchWorkerRecords])

  const handleSelectWorkerForLedger = (worker: any) => {
    setSelectedWorkerForLedger(worker)
    setPaymentAmountRupees(String((worker.salary || 0) / 100))
    setPaymentBonusRupees('0')
    setPaymentNotes('')
    setAttendanceNotes('')
    setAttendanceDate(new Date().toISOString().split('T')[0])
    setPaymentDate(new Date().toISOString().split('T')[0])
    setAttendanceStatus('PRESENT')
    setPaymentStatus('PAID')
    
    setTimeout(() => {
      const el = document.getElementById('hr-ledger-section')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWorkerForLedger) return
    setAttendanceError('')
    setSubmittingAttendance(true)
    try {
      const res = await fetch(`/api/admin/workers/${selectedWorkerForLedger.id}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'attendance',
          payload: {
            date: attendanceDate,
            status: attendanceStatus,
            notes: attendanceNotes.trim() || null
          }
        })
      })
      const data = await res.json()
      if (res.ok) {
        showToast('📅 Attendance logged successfully!')
        setAttendanceNotes('')
        fetchWorkerRecords(selectedWorkerForLedger.id)
        fetchWorkers()
      } else {
        setAttendanceError(data.error || 'Failed to log attendance.')
      }
    } catch (err) {
      console.error(err)
      setAttendanceError('Connection error.')
    } finally {
      setSubmittingAttendance(false)
    }
  }

  const handleDeleteAttendance = async (recordId: string) => {
    if (!selectedWorkerForLedger) return
    if (!confirm('Are you sure you want to delete this attendance log?')) return
    try {
      const res = await fetch(`/api/admin/workers/${selectedWorkerForLedger.id}/records/${recordId}?type=attendance`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showToast('🗑️ Attendance record deleted.')
        fetchWorkerRecords(selectedWorkerForLedger.id)
        fetchWorkers()
      } else {
        const d = await res.json()
        showToast(`❌ Error: ${d.error || 'Failed to delete record'}`)
      }
    } catch (err) {
      console.error(err)
      showToast('❌ Connection error.')
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWorkerForLedger) return
    setPaymentError('')
    
    const parsedAmount = parseFloat(paymentAmountRupees)
    const parsedBonus = parseFloat(paymentBonusRupees)
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setPaymentError('Base salary amount must be positive.')
      return
    }
    if (isNaN(parsedBonus) || parsedBonus < 0) {
      setPaymentError('Bonus amount must be positive.')
      return
    }
    
    setSubmittingPayment(true)
    try {
      const amountPaise = Math.round(parsedAmount * 100)
      const bonusPaise = Math.round(parsedBonus * 100)
      
      const res = await fetch(`/api/admin/workers/${selectedWorkerForLedger.id}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          payload: {
            month: paymentMonth,
            amount: amountPaise,
            bonus: bonusPaise,
            status: paymentStatus,
            paymentDate: paymentStatus === 'PAID' ? paymentDate : null,
            notes: paymentNotes.trim() || null
          }
        })
      })
      const data = await res.json()
      if (res.ok) {
        showToast('💰 Payment record saved successfully!')
        setPaymentNotes('')
        setPaymentBonusRupees('0')
        fetchWorkerRecords(selectedWorkerForLedger.id)
        fetchWorkers()
      } else {
        setPaymentError(data.error || 'Failed to save payment.')
      }
    } catch (err) {
      console.error(err)
      setPaymentError('Connection error.')
    } finally {
      setSubmittingPayment(false)
    }
  }

  const handleDeletePayment = async (recordId: string) => {
    if (!selectedWorkerForLedger) return
    if (!confirm('Are you sure you want to delete this payment record?')) return
    try {
      const res = await fetch(`/api/admin/workers/${selectedWorkerForLedger.id}/records/${recordId}?type=payment`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showToast('🗑️ Payment record deleted.')
        fetchWorkerRecords(selectedWorkerForLedger.id)
        fetchWorkers()
      } else {
        const d = await res.json()
        showToast(`❌ Error: ${d.error || 'Failed to delete payment'}`)
      }
    } catch (err) {
      console.error(err)
      showToast('❌ Connection error.')
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (res.ok) {
        showToast('Order cancelled successfully.')
        await refreshAllData()
      } else {
        showToast('❌ Failed to cancel order.')
      }
    } catch (err) {
      console.error('Cancel order error:', err)
      showToast('❌ Connection error cancelling order.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Ping Counter buzzer
  const handlePingOrder = async (orderId: string) => {
    setPingingId(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/ping`, {
        method: 'POST',
      })
      if (res.ok) {
        showToast('📣 Counter call alert broadcasted to customer!')
        playLocalChime()
      } else {
        showToast('❌ Failed to send counter alert.')
      }
    } catch (err) {
      console.error('Ping order error:', err)
      showToast('❌ Connection error sending ping.')
    } finally {
      setPingingId(null)
    }
  }

  const handleConfirmReservation = async (resvId: string, confirmed: boolean) => {
    setConfirmingResvId(resvId)
    try {
      const res = await fetch(`/api/admin/reservations/${resvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: confirmed ? 'CONFIRMED' : 'PENDING' }),
      })
      if (res.ok) {
        showToast(confirmed ? 'Reservation space approved & email sent!' : 'Reservation status reverted.')
        await fetchReservations()
      } else {
        showToast('❌ Failed to update reservation.')
      }
    } catch (err) {
      console.error('Confirm reservation error:', err)
      showToast('❌ Connection error updating booking.')
    } finally {
      setConfirmingResvId(null)
    }
  }

  const handleMarkVisited = async (resvId: string) => {
    setConfirmingResvId(resvId)
    try {
      const res = await fetch(`/api/admin/reservations/${resvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })
      if (res.ok) {
        showToast('Reservation completed! Visit marked and remaining payment of ₹450 logged.')
        playLocalChime()
        await fetchReservations()
      } else {
        const data = await res.json()
        showToast(`❌ Failed: ${data.error || 'Server error'}`)
      }
    } catch (err) {
      console.error('Mark visited error:', err)
      showToast('❌ Connection error updating booking.')
    } finally {
      setConfirmingResvId(null)
    }
  }

  const handleCancelReservation = async (resvId: string) => {
    const reason = prompt("Enter specific reason for cancellation (sent to customer email):", "Floor capacity reached for requested slot.")
    if (reason === null) return // cancelled prompt
    if (!reason.trim()) {
      alert("A cancellation reason is required.")
      return
    }

    setConfirmingResvId(resvId)
    try {
      const res = await fetch(`/api/admin/reservations/${resvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', cancellationReason: reason }),
      })
      if (res.ok) {
        showToast('Reservation cancelled and advance payment refunded.')
        await fetchReservations()
      } else {
        const errJson = await res.json()
        showToast(`❌ Failed to cancel reservation: ${errJson.error || 'Server error'}`)
      }
    } catch (err) {
      console.error('Cancel reservation error:', err)
      showToast('❌ Connection error cancelling booking.')
    } finally {
      setConfirmingResvId(null)
    }
  }

  const handleDeleteReservation = async (resvId: string) => {
    if (!confirm('Are you sure you want to cancel/delete this table reservation? This will delete the booking row and issue a refund if it is not already cancelled.')) return
    setConfirmingResvId(resvId)
    try {
      const res = await fetch(`/api/admin/reservations/${resvId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast('Reservation deleted and refunded if applicable.')
        await fetchReservations()
      } else {
        showToast('❌ Failed to delete reservation.')
      }
    } catch (err) {
      console.error('Delete reservation error:', err)
      showToast('❌ Connection error deleting booking.')
    } finally {
      setConfirmingResvId(null)
    }
  }



  useEffect(() => {
    if (activeTab === 'menu') {
      fetchMenuData()
    }
  }, [activeTab, fetchMenuData])

  // Helper to prefill form for editing or reset for adding
  const openProductForm = (prod: MenuProduct | null = null) => {
    if (prod) {
      setEditingProduct(prod)
      setProductName(prod.name)
      setProductSlug(prod.slug)
      setProductDescription(prod.description)
      setProductNotes(prod.notes)
      setProductPriceRupees((prod.basePrice / 100).toString())
      setProductImageUrl(prod.imageUrl)
      setProductBadge(prod.badge || '')
      setProductOrigin(prod.origin || '')
      setProductCategory(prod.category)
      setProductIsAvailable(prod.isAvailable)
      setProductSortOrder(prod.sortOrder.toString())
    } else {
      setEditingProduct(null)
      setProductName('')
      setProductSlug('')
      setProductDescription('')
      setProductNotes('')
      setProductPriceRupees('')
      setProductImageUrl('')
      setProductBadge('')
      setProductOrigin('')
      setProductCategory('HOT')
      setProductIsAvailable(true)
      setProductSortOrder('0')
    }
    setProductFormError('')
    setIsProductFormOpen(true)
  }

  // Handle product add/edit form submission
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProductFormError('')
    setProductSubmitting(true)

    const basePricePaise = Math.round(parseFloat(productPriceRupees) * 100)
    if (isNaN(basePricePaise) || basePricePaise < 0) {
      setProductFormError('Please enter a valid price in rupees.')
      setProductSubmitting(false)
      return
    }

    const payload = {
      name: productName,
      slug: productSlug || productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      description: productDescription,
      notes: productNotes,
      basePrice: basePricePaise,
      imageUrl: productImageUrl,
      badge: productBadge || null,
      origin: productOrigin || null,
      category: productCategory,
      isAvailable: productIsAvailable,
      sortOrder: parseInt(productSortOrder) || 0
    }

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok) {
        showToast(editingProduct ? 'Product updated successfully!' : 'New product added to menu!')
        setIsProductFormOpen(false)
        fetchMenuData()
      } else {
        setProductFormError(data.error || 'Failed to save product.')
      }
    } catch (err: any) {
      console.error(err)
      setProductFormError('Network error saving product details.')
    } finally {
      setProductSubmitting(false)
    }
  }

  // Handle delete product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showToast('Product deleted successfully.')
        fetchMenuData()
      } else {
        const data = await res.json()
        showToast(`❌ Failed to delete product: ${data.error || 'Unknown'}`)
      }
    } catch (err) {
      console.error(err)
      showToast('❌ Connection error deleting product.')
    }
  }

  // Handle inline modifier editing toggle
  const startModifierEdit = (mod: MenuModifier) => {
    setEditingModifierId(mod.id)
    setModifierPriceRupees((mod.priceAdjustment / 100).toString())
    setModifierIsAvailable(mod.isAvailable)
  }

  const handleUpdateModifier = async (mod: MenuModifier) => {
    setModifierSubmitting(true)
    const priceAdjustmentPaise = Math.round(parseFloat(modifierPriceRupees) * 100)
    if (isNaN(priceAdjustmentPaise)) {
      showToast('❌ Please enter a valid price adjustment.')
      setModifierSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/admin/modifiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: mod.id,
          name: mod.name,
          priceAdjustment: priceAdjustmentPaise,
          isAvailable: modifierIsAvailable
        })
      })

      if (res.ok) {
        showToast('Modifier updated successfully!')
        setEditingModifierId(null)
        fetchMenuData()
      } else {
        const data = await res.json()
        showToast(`❌ Failed to update modifier: ${data.error || 'Unknown'}`)
      }
    } catch (err) {
      console.error(err)
      showToast('❌ Connection error updating modifier.')
    } finally {
      setModifierSubmitting(false)
    }
  }

  const handleExport = (type: 'orders' | 'payments' | 'reservations') => {
    window.open(`/api/admin/export?type=${type}`)
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

  // Filter Kanban Columns
  const getKanbanOrdersByStatus = (status: OrderStatus) => {
    return kanbanOrders.filter(order => order.status === status)
  }

  // Formatted wait time helper for Kanban cards
  const getElapsedTime = (createdAtStr: string) => {
    const elapsedMs = Date.now() - new Date(createdAtStr).getTime()
    const elapsedMins = Math.floor(elapsedMs / 60000)
    if (elapsedMins < 1) return 'Just now'
    return `${elapsedMins}m ago`
  }

  if (status === 'loading' || (loading && !data) || (session && session.user.role !== 'ADMIN')) {
    return (
      <div className="admin-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#09170a' }}>
        <div style={{ color: 'var(--mint)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', textAlign: 'center' }}>
          <span className="pulse-dot" style={{ background: 'var(--mint)', marginRight: 12 }} /> 
          Loading operations console...
        </div>
      </div>
    )
  }

  return (
    <div className="admin-layout" style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)', padding: '100px 24px 60px 24px', color: 'var(--cream)', position: 'relative' }}>
      
      {/* Live real-time popup notifications */}
      <LivePopupNotifications role="ADMIN" />

      {/* Toast Alert overlay */}
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

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ color: 'var(--mint)', fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
              Management Console
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: 'var(--cream)', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
              🌿 Forest Brew Barista Operations
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={refreshAllData}
              className="btn-outline"
              style={{ borderColor: 'rgba(123,196,127,0.2)', color: 'var(--sage)', padding: '10px 20px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.03)' }}
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => router.push('/')}
              className="btn-outline"
              style={{ borderColor: 'rgba(123,196,127,0.3)', color: 'var(--mint)', padding: '10px 20px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.03)' }}
            >
              ← Cafe Front
            </button>
          </div>
        </div>

        {/* Revenue / Stats Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
          {[
            { label: "Today's Brew Revenue", value: data?.revenue.today ?? 0, emoji: '☕', color: 'rgba(123, 196, 127, 0.15)', glow: 'rgba(123,196,127,0.2)' },
            { label: 'Revenue This Week', value: data?.revenue.thisWeek ?? 0, emoji: '🌿', color: 'rgba(74, 140, 63, 0.15)', glow: 'rgba(74,140,63,0.2)' },
            { label: 'Revenue This Month', value: data?.revenue.thisMonth ?? 0, emoji: '🌳', color: 'rgba(200, 135, 58, 0.15)', glow: 'rgba(200,135,58,0.2)' },
            { label: 'Total Orders Registry', value: data?.total ?? 0, emoji: '📋', isCount: true, color: 'rgba(253, 246, 232, 0.1)', glow: 'rgba(253,246,232,0.1)' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.02, boxShadow: `0 12px 30px ${stat.glow}` }}
              style={{
                background: stat.color,
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--sage)', fontWeight: 600 }}>{stat.label}</span>
                <span style={{ fontSize: '1.5rem' }}>{stat.emoji}</span>
              </div>
              <div style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginTop: 14, color: '#fff' }}>
                {stat.isCount ? stat.value : formatPrice(stat.value)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Operations Section Wrapper */}
        <div style={{ background: 'rgba(20, 45, 23, 0.35)', border: '1px solid rgba(168, 197, 160, 0.15)', borderRadius: 'var(--radius-xl)', padding: '32px 24px', boxShadow: '0 12px 48px rgba(0,0,0,0.4)', backdropFilter: 'var(--glass-blur-xl)' }}>
          
          {/* Tabs & Exports Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 'var(--radius-full)' }}>
              <button
                onClick={() => setActiveTab('barista')}
                style={{
                  background: activeTab === 'barista' ? 'var(--forest)' : 'transparent',
                  border: activeTab === 'barista' ? '1px solid var(--leaf)' : '1px solid transparent',
                  color: activeTab === 'barista' ? '#fff' : 'var(--sage)',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                🧑‍🍳 Barista Brew Screen
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                style={{
                  background: activeTab === 'orders' ? 'var(--forest)' : 'transparent',
                  border: activeTab === 'orders' ? '1px solid var(--leaf)' : '1px solid transparent',
                  color: activeTab === 'orders' ? '#fff' : 'var(--sage)',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                📋 Order Registry
              </button>
              <button
                onClick={() => setActiveTab('reservations')}
                style={{
                  background: activeTab === 'reservations' ? 'var(--forest)' : 'transparent',
                  border: activeTab === 'reservations' ? '1px solid var(--leaf)' : '1px solid transparent',
                  color: activeTab === 'reservations' ? '#fff' : 'var(--sage)',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                📅 Table Bookings ({reservations.length})
              </button>
              <button
                onClick={() => setActiveTab('menu')}
                style={{
                  background: activeTab === 'menu' ? 'var(--forest)' : 'transparent',
                  border: activeTab === 'menu' ? '1px solid var(--leaf)' : '1px solid transparent',
                  color: activeTab === 'menu' ? '#fff' : 'var(--sage)',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                🍵 Manage Menu
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                style={{
                  background: activeTab === 'analytics' ? 'var(--forest)' : 'transparent',
                  border: activeTab === 'analytics' ? '1px solid var(--leaf)' : '1px solid transparent',
                  color: activeTab === 'analytics' ? '#fff' : 'var(--sage)',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                📊 Revenue Analytics
              </button>
              <button
                onClick={() => setActiveTab('workers')}
                style={{
                  background: activeTab === 'workers' ? 'var(--forest)' : 'transparent',
                  border: activeTab === 'workers' ? '1px solid var(--leaf)' : '1px solid transparent',
                  color: activeTab === 'workers' ? '#fff' : 'var(--sage)',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                👷 Staff Workers
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                style={{
                  background: activeTab === 'inventory' ? 'var(--forest)' : 'transparent',
                  border: activeTab === 'inventory' ? '1px solid var(--leaf)' : '1px solid transparent',
                  color: activeTab === 'inventory' ? '#fff' : 'var(--sage)',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                📦 Inventory
              </button>
              <button
                onClick={() => setActiveTab('complaints')}
                style={{
                  background: activeTab === 'complaints' ? 'var(--forest)' : 'transparent',
                  border: activeTab === 'complaints' ? '1px solid var(--leaf)' : '1px solid transparent',
                  color: activeTab === 'complaints' ? '#fff' : 'var(--sage)',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                ⚠️ Complaints
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                style={{
                  background: activeTab === 'subscriptions' ? 'var(--forest)' : 'transparent',
                  border: activeTab === 'subscriptions' ? '1px solid var(--leaf)' : '1px solid transparent',
                  color: activeTab === 'subscriptions' ? '#fff' : 'var(--sage)',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                ⭐ Subscriptions
              </button>
              <button
                onClick={() => setActiveTab('financials')}
                style={{
                  background: activeTab === 'financials' ? 'var(--forest)' : 'transparent',
                  border: activeTab === 'financials' ? '1px solid var(--leaf)' : '1px solid transparent',
                  color: activeTab === 'financials' ? '#fff' : 'var(--sage)',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                📊 Financials
              </button>
              <button
                onClick={() => { setActiveTab('profile'); if (!adminProfile) { setLoadingAdminProfile(true); fetch('/api/admin/profile').then(r => r.json()).then(d => { setAdminProfile(d); setAdminEditName(d.admin?.name || ''); setAdminEditImage(d.admin?.image || ''); setAdminEditPhone(d.admin?.phone || ''); setAdminOtpEmail(d.admin?.email || '') }).finally(() => setLoadingAdminProfile(false)) } }}
                style={{
                  background: activeTab === 'profile' ? 'var(--forest)' : 'transparent',
                  border: activeTab === 'profile' ? '1px solid var(--leaf)' : '1px solid transparent',
                  color: activeTab === 'profile' ? '#fff' : 'var(--sage)',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                👤 My Profile
              </button>
            </div>

            {/* Export options */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => handleExport('orders')}
                className="btn-outline"
                style={{ padding: '8px 16px', fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.15)', color: 'var(--cream)' }}
              >
                📥 Export Orders CSV
              </button>
              <button
                onClick={() => handleExport('payments')}
                className="btn-outline"
                style={{ padding: '8px 16px', fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.15)', color: 'var(--cream)' }}
              >
                💳 Export Payments CSV
              </button>
              <button
                onClick={() => handleExport('reservations')}
                className="btn-outline"
                style={{ padding: '8px 16px', fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.15)', color: 'var(--cream)' }}
              >
                📅 Export Bookings CSV
              </button>
            </div>
          </div>

          {/* TAB: ADMIN PROFILE */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {loadingAdminProfile ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--sage)' }}>Loading profile...</div>
              ) : adminProfile ? (
                <>
                  {/* Identity Card */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {adminEditImage ? (
                      <img src={adminEditImage} alt="Admin" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--amber)' }} onError={() => setAdminEditImage('')} />
                    ) : (
                      <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,#3f2b1b,#5c2d0d)', border: '3px solid var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-display)' }}>
                        {(adminProfile.admin?.name || adminProfile.admin?.email || 'A')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>{adminProfile.admin?.name || 'Admin'}</div>
                      <div style={{ color: 'var(--sage)', fontSize: '0.85rem', marginTop: 4 }}>{adminProfile.admin?.email} {adminProfile.admin?.phone && `• ${adminProfile.admin.phone}`}</div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ background: 'rgba(200,135,58,0.15)', border: '1px solid rgba(200,135,58,0.3)', color: 'var(--amber)', borderRadius: 100, padding: '2px 12px', fontSize: '0.72rem', fontWeight: 700 }}>ADMIN</span>
                        <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--sage)', borderRadius: 100, padding: '2px 12px', fontSize: '0.72rem' }}>
                          Since {adminProfile.admin?.createdAt ? new Date(adminProfile.admin.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                        </span>
                        <span style={{ background: adminProfile.admin?.hasPassword ? 'rgba(74,140,63,0.12)' : 'rgba(229,57,53,0.1)', border: '1px solid rgba(74,140,63,0.2)', color: adminProfile.admin?.hasPassword ? 'var(--mint)' : '#ef5350', borderRadius: 100, padding: '2px 12px', fontSize: '0.72rem' }}>
                          {adminProfile.admin?.hasPassword ? '🔐 Password Set' : '🔓 No Password (Google)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Platform Stats */}
                  <div>
                    <h4 style={{ color: 'var(--amber)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>📊 Platform Statistics</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                      {[
                        { label: 'Total Orders', value: String(adminProfile.stats?.totalOrders || 0), icon: '☕', color: 'var(--mint)' },
                        { label: 'Total Revenue', value: `₹${((adminProfile.stats?.totalRevenue || 0) / 100).toFixed(2)}`, icon: '💰', color: 'var(--amber)' },
                        { label: 'Pending Orders', value: String(adminProfile.stats?.pendingOrders || 0), icon: '⏳', color: 'var(--amber)' },
                        { label: 'Total Bookings', value: String(adminProfile.stats?.totalReservations || 0), icon: '📅', color: 'var(--mint)' },
                        { label: 'Confirmed', value: String(adminProfile.stats?.confirmedReservations || 0), icon: '✅', color: 'var(--mint)' },
                        { label: 'Cancelled', value: String(adminProfile.stats?.cancelledReservations || 0), icon: '❌', color: '#ef5350' },
                        { label: 'Total Users', value: String(adminProfile.stats?.totalUsers || 0), icon: '👥', color: 'var(--mint)' },
                        { label: 'Menu Products', value: String(adminProfile.stats?.totalProducts || 0), icon: '🍵', color: 'var(--sage)' },
                      ].map(stat => (
                        <div key={stat.label} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                          <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{stat.icon}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--sage)', marginBottom: 4 }}>{stat.label}</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Edit Profile */}
                  <div style={{ maxWidth: 560 }}>
                    <h4 style={{ color: 'var(--amber)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>✏️ Edit Profile</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>Display Name</label>
                        <input value={adminEditName} onChange={e => setAdminEditName(e.target.value)} placeholder="Admin name" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fff', fontSize: '0.9rem', width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>Profile Photo URL</label>
                        <input value={adminEditImage} onChange={e => setAdminEditImage(e.target.value)} placeholder="https://..." style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fff', fontSize: '0.9rem', width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>Phone Number</label>
                        <input value={adminEditPhone} onChange={e => setAdminEditPhone(e.target.value)} placeholder="Phone number" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fff', fontSize: '0.9rem', width: '100%' }} />
                      </div>
                      {adminProfileMsg && (
                        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', background: adminProfileMsg.type === 'success' ? 'rgba(74,140,63,0.12)' : 'rgba(229,57,53,0.1)', color: adminProfileMsg.type === 'success' ? 'var(--mint)' : '#ef5350', border: `1px solid ${adminProfileMsg.type === 'success' ? 'rgba(74,140,63,0.3)' : 'rgba(229,57,53,0.3)'}` }}>
                          {adminProfileMsg.text}
                        </div>
                      )}
                      <button
                        disabled={adminProfileSaving}
                        onClick={async () => {
                          setAdminProfileSaving(true); setAdminProfileMsg(null)
                          try {
                            const res = await fetch('/api/user/update-profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: adminEditName, image: adminEditImage, phone: adminEditPhone }) })
                            const d = await res.json()
                            if (res.ok) { setAdminProfileMsg({ type: 'success', text: '✅ Profile updated!' }); setAdminProfile((p: any) => ({ ...p, admin: { ...p.admin, name: adminEditName, image: adminEditImage, phone: adminEditPhone } })) }
                            else setAdminProfileMsg({ type: 'error', text: d.error || 'Failed.' })
                          } catch { setAdminProfileMsg({ type: 'error', text: 'Connection error.' }) }
                          finally { setAdminProfileSaving(false) }
                        }}
                        className="btn-primary"
                        style={{ padding: '10px 28px', fontSize: '0.88rem', alignSelf: 'flex-start' }}
                      >
                        {adminProfileSaving ? 'Saving...' : '💾 Save Profile'}
                      </button>
                    </div>
                  </div>

                  {/* Change Password */}
                  <div style={{ maxWidth: 480 }}>
                    <h4 style={{ color: 'var(--amber)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>🔑 Change Password</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { label: 'Current Password', val: adminPwCurrent, set: setAdminPwCurrent, show: adminShowPwCurrent, toggle: () => setAdminShowPwCurrent(v => !v) },
                        { label: 'New Password', val: adminPwNew, set: setAdminPwNew, show: adminShowPwNew, toggle: () => setAdminShowPwNew(v => !v) },
                        { label: 'Confirm New Password', val: adminPwConfirm, set: setAdminPwConfirm, show: adminShowPwConfirm, toggle: () => setAdminShowPwConfirm(v => !v) },
                      ].map(field => (
                        <div key={field.label}>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>{field.label}</label>
                          <div style={{ position: 'relative' }}>
                            <input type={field.show ? 'text' : 'password'} value={field.val} onChange={e => field.set(e.target.value)} placeholder="••••••••" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '10px 44px 10px 14px', color: '#fff', fontSize: '0.9rem', width: '100%' }} />
                            <button type="button" onClick={field.toggle} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage)', fontSize: '0.85rem' }}>
                              {field.show ? '🙈' : '👁️'}
                            </button>
                          </div>
                        </div>
                      ))}
                      {adminPwMsg && (
                        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', background: adminPwMsg.type === 'success' ? 'rgba(74,140,63,0.12)' : 'rgba(229,57,53,0.1)', color: adminPwMsg.type === 'success' ? 'var(--mint)' : '#ef5350', border: `1px solid ${adminPwMsg.type === 'success' ? 'rgba(74,140,63,0.3)' : 'rgba(229,57,53,0.3)'}` }}>
                          {adminPwMsg.text}
                        </div>
                      )}
                      <button
                        disabled={adminPwSaving}
                        onClick={async () => {
                          setAdminPwMsg(null)
                          if (adminPwNew !== adminPwConfirm) { setAdminPwMsg({ type: 'error', text: 'Passwords do not match.' }); return }
                          if (adminPwNew.length < 8) { setAdminPwMsg({ type: 'error', text: 'Min 8 characters.' }); return }
                          setAdminPwSaving(true)
                          try {
                            const res = await fetch('/api/user/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: adminPwCurrent, newPassword: adminPwNew }) })
                            const d = await res.json()
                            if (res.ok) { setAdminPwMsg({ type: 'success', text: '✅ Password changed!' }); setAdminPwCurrent(''); setAdminPwNew(''); setAdminPwConfirm('') }
                            else setAdminPwMsg({ type: 'error', text: d.error || 'Failed.' })
                          } catch { setAdminPwMsg({ type: 'error', text: 'Connection error.' }) }
                          finally { setAdminPwSaving(false) }
                        }}
                        className="btn-primary"
                        style={{ padding: '10px 28px', fontSize: '0.88rem', alignSelf: 'flex-start' }}
                      >
                        {adminPwSaving ? 'Updating...' : '🔑 Update Password'}
                      </button>
                    </div>
                    {/* OTP Reset */}
                    <div style={{ marginTop: 20 }}>
                      <button onClick={() => { setShowAdminOtpReset(v => !v); setAdminOtpStep('idle'); setAdminOtpMsg(null) }} style={{ background: 'none', border: 'none', color: 'var(--amber)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                        {showAdminOtpReset ? '▲ Hide' : '▼ Forgot Password?'} Reset via Email OTP
                      </button>
                      {showAdminOtpReset && (
                        <div style={{ marginTop: 14, padding: 18, background: 'rgba(200,135,58,0.06)', border: '1px solid rgba(200,135,58,0.2)', borderRadius: 'var(--radius-lg)' }}>
                          {(adminOtpStep === 'idle' || adminOtpStep === 'sending') && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <input value={adminOtpEmail} onChange={e => setAdminOtpEmail(e.target.value)} placeholder="Admin email" type="email" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fff', fontSize: '0.88rem', width: '100%' }} />
                              <button onClick={async () => { setAdminOtpStep('sending'); const r = await fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: adminOtpEmail }) }); if (r.ok) { setAdminOtpStep('otp'); setAdminOtpMsg({ type: 'success', text: 'OTP sent!' }) } else { setAdminOtpMsg({ type: 'error', text: 'Failed to send OTP.' }); setAdminOtpStep('idle') } }} disabled={adminOtpStep === 'sending'} className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem', alignSelf: 'flex-start' }}>{adminOtpStep === 'sending' ? 'Sending...' : '📧 Send OTP'}</button>
                            </div>
                          )}
                          {(adminOtpStep === 'otp' || adminOtpStep === 'verifying') && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <input value={adminOtpCode} onChange={e => setAdminOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit OTP" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fff', fontSize: '1.2rem', letterSpacing: '0.3em', textAlign: 'center', width: '100%' }} maxLength={6} />
                              <button onClick={async () => { setAdminOtpStep('verifying'); const r = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: adminOtpEmail, otp: adminOtpCode }) }); if (r.ok) { setAdminOtpStep('newpw'); setAdminOtpMsg({ type: 'success', text: 'OTP verified!' }) } else { setAdminOtpMsg({ type: 'error', text: 'Invalid OTP.' }); setAdminOtpStep('otp') } }} disabled={adminOtpStep === 'verifying' || adminOtpCode.length < 6} className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem', alignSelf: 'flex-start' }}>{adminOtpStep === 'verifying' ? 'Verifying...' : '✅ Verify OTP'}</button>
                            </div>
                          )}
                          {adminOtpStep === 'newpw' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <input type="password" value={adminOtpNewPw} onChange={e => setAdminOtpNewPw(e.target.value)} placeholder="New password (min 8 chars)" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fff', fontSize: '0.88rem', width: '100%' }} />
                              <input type="password" value={adminOtpNewPwConfirm} onChange={e => setAdminOtpNewPwConfirm(e.target.value)} placeholder="Confirm new password" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fff', fontSize: '0.88rem', width: '100%' }} />
                              <button onClick={async () => { if (adminOtpNewPw !== adminOtpNewPwConfirm) { setAdminOtpMsg({ type: 'error', text: 'Passwords do not match.' }); return } const r = await fetch('/api/auth/reset-password-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: adminOtpEmail, newPassword: adminOtpNewPw }) }); if (r.ok) { setAdminOtpStep('done'); setAdminOtpMsg({ type: 'success', text: '✅ Password reset!' }) } else { setAdminOtpMsg({ type: 'error', text: 'Reset failed.' }) } }} className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem', alignSelf: 'flex-start' }}>🔒 Set New Password</button>
                            </div>
                          )}
                          {adminOtpStep === 'done' && <p style={{ color: 'var(--mint)', fontWeight: 700, margin: 0 }}>✅ Password reset! Please log in again.</p>}
                          {adminOtpMsg && adminOtpStep !== 'done' && <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', background: adminOtpMsg.type === 'success' ? 'rgba(74,140,63,0.12)' : 'rgba(229,57,53,0.1)', color: adminOtpMsg.type === 'success' ? 'var(--mint)' : '#ef5350' }}>{adminOtpMsg.text}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--sage)' }}>Failed to load profile. Refresh to retry.</div>
              )}
            </div>
          )}

          {/* TAB 1: BARISTA BREW SCREEN (KANBAN BOARD) */}
          {activeTab === 'barista' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--mint)' }}>
                  🧑‍🍳 Active Kitchen Queue
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--sage)' }}>
                  Displays pending, brewing, and ready orders requiring counter pickup.
                </span>
              </div>

              {/* Kanban columns grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                
                {/* Column 1: Received Queue */}
                <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-lg)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(255,255,255,0.06)', paddingBottom: 10 }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem', color: 'var(--cream)' }}>
                      📥 Queue <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem' }}>{getKanbanOrdersByStatus('RECEIVED').length}</span>
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>Awaiting Brew</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '65vh', paddingRight: 4 }}>
                    {getKanbanOrdersByStatus('RECEIVED').length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--sage)', fontSize: '0.85rem', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                        🍵 Queue is currently empty.
                      </div>
                    ) : (
                      getKanbanOrdersByStatus('RECEIVED').map(order => (
                        <BaristaKanbanCard 
                          key={order.id} 
                          order={order} 
                          onAdvance={() => handleAdvanceStatus(order.id, 'RECEIVED')} 
                          onCancel={() => handleCancelOrder(order.id)}
                          onPing={handlePingOrder}
                          updatingId={updatingId}
                          pingingId={pingingId}
                          elapsedTime={getElapsedTime(order.createdAt)}
                          formatCustomization={formatCustomization}
                          workersList={workersList}
                          onAssignWorker={handleAssignWorker}
                          recommendedWorkerId={recommendedWorkerId}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Column 2: Brewing Screen */}
                <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-lg)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(200, 135, 58, 0.2)', paddingBottom: 10 }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem', color: 'var(--amber)' }}>
                      ☕ Brewing <span style={{ background: 'rgba(200, 135, 58, 0.15)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem' }}>{getKanbanOrdersByStatus('BREWING').length}</span>
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>Active Brews</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '65vh', paddingRight: 4 }}>
                    {getKanbanOrdersByStatus('BREWING').length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--sage)', fontSize: '0.85rem', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                        🪵 No active brews right now.
                      </div>
                    ) : (
                      getKanbanOrdersByStatus('BREWING').map(order => (
                        <BaristaKanbanCard 
                          key={order.id} 
                          order={order} 
                          onAdvance={() => handleAdvanceStatus(order.id, 'BREWING')} 
                          onCancel={() => handleCancelOrder(order.id)}
                          onPing={handlePingOrder}
                          updatingId={updatingId}
                          pingingId={pingingId}
                          elapsedTime={getElapsedTime(order.createdAt)}
                          formatCustomization={formatCustomization}
                          workersList={workersList}
                          onAssignWorker={handleAssignWorker}
                          recommendedWorkerId={recommendedWorkerId}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Column 3: Ready / Counter Pickup */}
                <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-lg)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(123, 196, 127, 0.2)', paddingBottom: 10 }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem', color: 'var(--mint)' }}>
                      ✨ Ready / Pickup <span style={{ background: 'rgba(123, 196, 127, 0.15)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem' }}>{getKanbanOrdersByStatus('READY').length}</span>
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>Counter / Pickup</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '65vh', paddingRight: 4 }}>
                    {getKanbanOrdersByStatus('READY').length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--sage)', fontSize: '0.85rem', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                        🌱 No cups pending pickup at counter.
                      </div>
                    ) : (
                      getKanbanOrdersByStatus('READY').map(order => (
                        <BaristaKanbanCard 
                          key={order.id} 
                          order={order} 
                          onAdvance={() => handleAdvanceStatus(order.id, 'READY')} 
                          onCancel={() => handleCancelOrder(order.id)}
                          onPing={handlePingOrder}
                          updatingId={updatingId}
                          pingingId={pingingId}
                          elapsedTime={getElapsedTime(order.createdAt)}
                          formatCustomization={formatCustomization}
                          workersList={workersList}
                          onAssignWorker={handleAssignWorker}
                          recommendedWorkerId={recommendedWorkerId}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Column 4: Out for Delivery */}
                <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-lg)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(232, 168, 78, 0.2)', paddingBottom: 10 }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem', color: 'var(--amber)' }}>
                      🛵 Out for Delivery <span style={{ background: 'rgba(232, 168, 78, 0.15)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem' }}>{getKanbanOrdersByStatus('OUT_FOR_DELIVERY').length}</span>
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>Transit Queue</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '65vh', paddingRight: 4 }}>
                    {getKanbanOrdersByStatus('OUT_FOR_DELIVERY').length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--sage)', fontSize: '0.85rem', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                        🛵 No orders currently in transit.
                      </div>
                    ) : (
                      getKanbanOrdersByStatus('OUT_FOR_DELIVERY').map(order => (
                        <BaristaKanbanCard 
                          key={order.id} 
                          order={order} 
                          onAdvance={() => handleAdvanceStatus(order.id, 'OUT_FOR_DELIVERY')} 
                          onCancel={() => handleCancelOrder(order.id)}
                          onPing={handlePingOrder}
                          updatingId={updatingId}
                          pingingId={pingingId}
                          elapsedTime={getElapsedTime(order.createdAt)}
                          formatCustomization={formatCustomization}
                          workersList={workersList}
                          onAssignWorker={handleAssignWorker}
                          recommendedWorkerId={recommendedWorkerId}
                        />
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: ORDER REGISTRY DATABASE */}
          {activeTab === 'orders' && (
            <div>
              {pendingQrCount > 0 && (
                <div
                  style={{
                    background: 'rgba(232, 168, 78, 0.15)',
                    border: '1px solid rgba(232, 168, 78, 0.4)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxShadow: '0 8px 32px rgba(232, 168, 78, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.4rem' }}>💳</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--amber)', fontWeight: 700 }}>
                        Pending QR Payments
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--sage)' }}>
                        There are {pendingQrCount} QR code payment order(s) awaiting validation. Confirm them to queue them for brewing.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setStatusFilter('PENDING')
                      setPage(1)
                    }}
                    style={{
                      background: 'var(--amber)',
                      color: '#000',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                      fontWeight: 850,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    View Pending
                  </button>
                </div>
              )}
              {/* Search & Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 24, alignItems: 'center' }} className="filters-grid">
                
                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Search order database by ID, customer name, email..."
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(168,197,160,0.15)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 20px',
                      color: '#fff',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--sage)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['ALL', 'PENDING', 'RECEIVED', 'BREWING', 'READY', 'DELIVERED', 'CANCELLED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setStatusFilter(st)
                        setPage(1)
                      }}
                      style={{
                        background: statusFilter === st ? 'var(--leaf)' : 'rgba(255,255,255,0.05)',
                        color: statusFilter === st ? '#fff' : 'var(--sage)',
                        border: '1px solid ' + (statusFilter === st ? 'var(--leaf)' : 'rgba(255,255,255,0.08)'),
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        transition: 'all 0.2s',
                      }}
                    >
                      {st === 'PENDING' ? '⏳ PENDING' : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data?.orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sage)' }}>
                    🌿 No matching orders found in database.
                  </div>
                ) : (
                  data?.orders.map((order) => {
                    const isExpanded = expandedOrderId === order.id
                    return (
                      <div
                        key={order.id}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(123, 196, 127, 0.12)',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          transition: 'all 0.25s',
                        }}
                      >
                        {/* Summary Bar */}
                        <div
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          style={{
                            padding: '16px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            flexWrap: 'wrap',
                            gap: 16,
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ color: 'var(--mint)', fontWeight: 700, fontSize: '0.95rem' }}>
                                #{order.id.slice(-6).toUpperCase()}
                              </span>
                              <span style={{ color: 'var(--sage)', fontSize: '0.75rem' }}>
                                {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                              {order.orderType === 'DINE_IN' ? (
                                <span style={{
                                  background: 'rgba(123, 196, 127, 0.15)',
                                  border: '1px solid rgba(123, 196, 127, 0.4)',
                                  color: 'var(--mint)',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.7rem',
                                  fontWeight: 700
                                }}>
                                  📍 Table {order.tableNumber || 'Takeaway'}
                                </span>
                              ) : (
                                <span style={{
                                  background: 'rgba(232, 168, 78, 0.15)',
                                  border: '1px solid rgba(232, 168, 78, 0.4)',
                                  color: 'var(--amber)',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.7rem',
                                  fontWeight: 700
                                }}>
                                  🚗 Delivery
                                </span>
                              )}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: 4 }}>
                              Fulfillment: {order.customerName || order.user?.name || 'Guest'} ·{' '}
                              {order.items.reduce((acc, it) => acc + it.quantity, 0)} items ·{' '}
                              <strong style={{ color: '#fff' }}>{formatPrice(order.totalAmount)}</strong>
                              {order.orderType === 'DELIVERY' && order.deliveryUser && (
                                <>
                                  {' · '}
                                  <span style={{ color: 'var(--mint)', fontWeight: 600 }}>
                                    🛵 {order.deliveryUser.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={(e) => e.stopPropagation()}>
                            <span className={`status-pill status-${order.status}`} style={{ fontSize: '0.78rem' }}>
                              {{
                                PENDING: '⏳ Pending',
                                RECEIVED: '📥 Received',
                                ASSIGNED: '📋 Assigned',
                                BREWING: '☕ Brewing',
                                READY: '✨ Ready',
                                OUT_FOR_DELIVERY: '🛵 In Transit',
                                DELIVERED: '🌿 Delivered',
                                CANCELLED: '❌ Cancelled',
                              }[order.status] || order.status}
                            </span>

                            {order.status === 'PENDING' && order.paymentMethod === 'QR' ? (
                              <button
                                onClick={() => handleAdvanceStatus(order.id, order.status)}
                                disabled={updatingId === order.id}
                                style={{
                                  background: 'rgba(232, 168, 78, 0.25)',
                                  border: '1px solid rgba(232, 168, 78, 0.6)',
                                  borderRadius: 'var(--radius-full)',
                                  padding: '6px 14px',
                                  color: 'var(--amber)',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  boxShadow: '0 0 15px rgba(232, 168, 78, 0.25)',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {updatingId === order.id ? '...' : '💳 Confirm QR Payment'}
                              </button>
                            ) : (
                              order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => handleAdvanceStatus(order.id, order.status)}
                                  disabled={updatingId === order.id}
                                  style={{
                                    background: 'rgba(74,140,63,0.3)',
                                    border: '1px solid rgba(74,140,63,0.5)',
                                    borderRadius: 'var(--radius-full)',
                                    padding: '6px 14px',
                                    color: 'var(--mint)',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  {updatingId === order.id ? '...' : '→ Advance'}
                                </button>
                              )
                            )}

                            {order.status === 'READY' && (
                              <button
                                onClick={() => handlePingOrder(order.id)}
                                disabled={pingingId === order.id}
                                title="Ping client phone with counter notification chime"
                                style={{
                                  background: 'rgba(200,135,58,0.2)',
                                  border: '1px solid rgba(200,135,58,0.4)',
                                  borderRadius: 'var(--radius-full)',
                                  padding: '6px 12px',
                                  color: 'var(--amber)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                📣 {pingingId === order.id ? 'Pinging...' : 'Ping'}
                              </button>
                            )}

                            <span style={{ color: 'var(--sage)', fontSize: '0.8rem', marginLeft: 4 }}>
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          </div>
                        </div>

                        {/* Collapsible Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              style={{
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                background: 'rgba(0,0,0,0.25)',
                                padding: '20px 24px',
                              }}
                            >
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="details-grid">
                                
                                {/* Items list */}
                                <div>
                                  <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--mint)', letterSpacing: '0.08em', marginBottom: 12 }}>
                                    Order Items
                                  </h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {order.items.map((item, idx) => (
                                      <div key={idx} style={{ paddingBottom: 8, borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                                          <span>
                                            {item.product.name} <strong style={{ color: 'var(--mint)' }}>× {item.quantity}</strong>
                                          </span>
                                          <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                                        </div>
                                        {item.customizations && Object.keys(item.customizations).length > 0 && (
                                          <div style={{ fontSize: '0.75rem', color: 'var(--amber)', marginTop: 4, background: 'rgba(200, 135, 58, 0.08)', padding: '4px 8px', borderLeft: '2px solid var(--gold)', borderRadius: 2 }}>
                                            {formatCustomization(item.customizations)}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Order & Customer Metadata */}
                                <div>
                                  <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--mint)', letterSpacing: '0.08em', marginBottom: 12 }}>
                                    Customer & Payment
                                  </h4>
                                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 6, color: 'rgba(255,255,255,0.8)' }}>
                                    <div>
                                      <strong>Fulfillment:</strong> {order.orderType === 'DELIVERY' ? '🚗 Home Delivery' : `📍 Dine-In (Table ${order.tableNumber || 'Takeaway'})`}
                                    </div>
                                    <div>
                                      <strong>Email:</strong> {order.customerEmail || order.user?.email || 'Guest'}
                                    </div>
                                    {order.customerPhone && (
                                      <div>
                                        <strong>Phone:</strong> {order.customerPhone}
                                      </div>
                                    )}
                                    {order.orderType === 'DELIVERY' && order.deliveryAddress && (
                                      <div>
                                        <strong>Delivery Address:</strong> {order.deliveryAddress}
                                      </div>
                                    )}
                                    {order.orderType === 'DELIVERY' && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                        <strong>Delivery Staff:</strong>
                                        {(order.status === 'READY' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'RECEIVED' || order.status === 'BREWING') ? (
                                          <select
                                            value={order.deliveryUserId || order.deliveryUser?.id || ''}
                                            onChange={(e) => handleAssignWorker(order.id, e.target.value)}
                                            disabled={updatingId === order.id}
                                            style={{
                                              background: 'rgba(0,0,0,0.3)',
                                              border: '1px solid rgba(255,255,255,0.15)',
                                              borderRadius: 'var(--radius-sm)',
                                              padding: '4px 8px',
                                              color: '#fff',
                                              fontSize: '0.8rem',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            <option value="">-- Assign Delivery Staff --</option>
                                            {workersList
                                              .filter((w) => w.isAvailable || w.id === order.deliveryUserId)
                                              .map((worker) => (
                                                <option key={worker.id} value={worker.id}>
                                                  {worker.name} ({worker.phone || 'No Phone'}){worker.id === recommendedWorkerId ? ' ★ Recommended' : ''}
                                                </option>
                                              ))}
                                          </select>
                                        ) : order.deliveryUser ? (
                                          <span style={{ color: 'var(--mint)', fontWeight: 600 }}>
                                            {order.deliveryUser.name} {order.deliveryUser.phone ? `(${order.deliveryUser.phone})` : ''}
                                          </span>
                                        ) : (
                                          <span style={{ color: 'var(--sage)' }}>None assigned</span>
                                        )}
                                      </div>
                                    )}
                                    {order.orderType === 'DELIVERY' && order.latitude && order.longitude && (
                                      <div>
                                        <strong>Coordinates:</strong> {order.latitude.toFixed(5)}, {order.longitude.toFixed(5)}{' '}
                                        <a
                                          href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ color: 'var(--mint)', textDecoration: 'underline', fontWeight: 'bold', marginLeft: 6 }}
                                        >
                                          🗺️ Google Maps
                                        </a>
                                      </div>
                                    )}
                                    <div>
                                      <strong>Date Placed:</strong> {new Date(order.createdAt).toLocaleString('en-IN')}
                                    </div>
                                    <div>
                                      <strong>Payment ID:</strong>{' '}
                                      <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4, fontSize: '0.78rem' }}>
                                        {order.paymentId || 'Pending / unpaid'}
                                      </code>
                                    </div>
                                    {order.notes && (
                                      <div style={{ marginTop: 8, padding: 8, background: 'rgba(200,135,58,0.1)', borderLeft: '3px solid var(--gold)', borderRadius: 4 }}>
                                        <strong>Notes:</strong> {order.notes}
                                      </div>
                                    )}

                                    {/* Action Buttons */}
                                    {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                                      <div style={{ marginTop: 16 }}>
                                        <button
                                          onClick={() => handleCancelOrder(order.id)}
                                          disabled={updatingId === order.id}
                                          style={{
                                            background: 'rgba(229,57,53,0.15)',
                                            border: '1px solid rgba(229,57,53,0.3)',
                                            color: '#ef5350',
                                            padding: '8px 18px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                          }}
                                        >
                                          ✕ Cancel Order
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Pagination */}
              {data && data.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                  {Array.from({ length: data.pages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPage(idx + 1)}
                      style={{
                        background: page === idx + 1 ? 'var(--leaf)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: '#fff',
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESERVATIONS BOOKINGS */}
          {activeTab === 'reservations' && (() => {
            const totalTreasuryPaise = reservations.reduce((sum, resv) => {
              if (resv.status !== 'CANCELLED') {
                return sum + (resv.advancePaid || 0) + (resv.remainingPaid || 0)
              }
              return sum
            }, 0)

            const totalVisited = reservations.filter(r => r.visited).length
            const activeConfirmed = reservations.filter(r => r.status === 'CONFIRMED').length

            return (
              <div>
                {/* Treasury metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
                  <div style={{ background: 'linear-gradient(135deg, #1b3f27 0%, #0d2013 100%)', border: '1px solid rgba(123, 196, 127, 0.25)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Table Bookings Treasury</span>
                      <span style={{ fontSize: '1.5rem' }}>💰</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', marginTop: 10, fontFamily: 'var(--font-display)' }}>
                      {formatPrice(totalTreasuryPaise)}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--sage)', marginTop: 4 }}>
                      From {reservations.filter(r => r.status !== 'CANCELLED').length} active bookings (advance + remaining paid)
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visited / Completed</span>
                      <span style={{ fontSize: '1.5rem' }}>👥</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', marginTop: 10, fontFamily: 'var(--font-display)' }}>
                      {totalVisited}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--sage)', marginTop: 4 }}>
                      Customers checked-in at the coffee shop
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmed Bookings</span>
                      <span style={{ fontSize: '1.5rem' }}>⏳</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', marginTop: 10, fontFamily: 'var(--font-display)' }}>
                      {activeConfirmed}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--sage)', marginTop: 4 }}>
                      Awaiting guest arrival & check-in
                    </p>
                  </div>
                </div>

                {loadingReservations ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                    Loading reservations feed...
                  </div>
                ) : reservations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                    🌿 No reservations booked yet.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--mint)' }}>
                          <th style={{ padding: 12 }}>Date & Time</th>
                          <th style={{ padding: 12 }}>Customer</th>
                          <th style={{ padding: 12 }}>Phone</th>
                          <th style={{ padding: 12 }}>Guests</th>
                          <th style={{ padding: 12 }}>Advance Paid</th>
                          <th style={{ padding: 12 }}>Remaining Paid</th>
                          <th style={{ padding: 12 }}>Visited</th>
                          <th style={{ padding: 12 }}>Status</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map((resv) => (
                          <tr key={resv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                            <td style={{ padding: 12 }}>
                              <div>{new Date(resv.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--mint)', marginTop: 2 }}>
                                ⏰ {new Date(resv.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td style={{ padding: 12 }}>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{resv.customerName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--sage)' }}>{resv.email}</div>
                            </td>
                            <td style={{ padding: 12, color: 'var(--sage)' }}>
                              {resv.phone || '—'}
                            </td>
                            <td style={{ padding: 12 }}>
                              <div>👥 {resv.guestCount} guests</div>
                              {resv.tableNumber && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--mint)', marginTop: 2, fontWeight: 700 }}>
                                  🪑 Table {resv.tableNumber}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: 12, fontWeight: 700, color: resv.advancePaid > 0 ? '#ffb300' : 'var(--sage)' }}>
                              ₹{(resv.advancePaid / 100).toFixed(2)}
                            </td>
                            <td style={{ padding: 12, fontWeight: 700, color: resv.remainingPaid > 0 ? 'var(--mint)' : 'var(--sage)' }}>
                              ₹{(resv.remainingPaid / 100).toFixed(2)}
                            </td>
                            <td style={{ padding: 12 }}>
                              {resv.visited ? (
                                <span style={{ color: 'var(--mint)', fontWeight: 700 }}>✅ Yes</span>
                              ) : (
                                <span style={{ color: 'var(--sage)' }}>No</span>
                              )}
                            </td>
                            <td style={{ padding: 12 }}>
                              <span
                                style={{
                                  background: resv.status === 'COMPLETED' ? 'rgba(74,140,63,0.22)' : resv.status === 'CONFIRMED' ? 'rgba(74,140,63,0.12)' : resv.status === 'CANCELLED' ? 'rgba(229,57,53,0.15)' : 'rgba(200,135,58,0.18)',
                                  border: '1px solid ' + (resv.status === 'COMPLETED' ? 'var(--mint)' : resv.status === 'CONFIRMED' ? 'rgba(74,140,63,0.3)' : resv.status === 'CANCELLED' ? 'rgba(229,57,53,0.3)' : 'rgba(200,135,58,0.4)'),
                                  color: resv.status === 'COMPLETED' ? 'var(--mint)' : resv.status === 'CONFIRMED' ? 'var(--mint)' : resv.status === 'CANCELLED' ? '#ef5350' : 'var(--amber)',
                                  padding: '4px 10px',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  display: 'inline-block'
                                }}
                              >
                                {resv.status}
                              </span>
                              {resv.status === 'CANCELLED' && resv.cancellationReason && (
                                <div style={{ fontSize: '0.72rem', color: '#ef5350', marginTop: 6, fontStyle: 'italic', maxWidth: 180, wordBreak: 'break-word' }}>
                                  Reason: "{resv.cancellationReason}"
                                </div>
                              )}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                {resv.status === 'CONFIRMED' && (
                                  <button
                                    onClick={() => handleMarkVisited(resv.id)}
                                    disabled={confirmingResvId === resv.id}
                                    style={{
                                      background: 'linear-gradient(135deg, #1b3f27 0%, #0d5c1a 100%)',
                                      border: '1px solid var(--mint)',
                                      color: '#fff',
                                      padding: '6px 14px',
                                      borderRadius: 'var(--radius-full)',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                                    }}
                                  >
                                    Mark Visited & Paid (₹450)
                                  </button>
                                )}
                                {(!resv.status || resv.status === 'PENDING') && (
                                  <>
                                    <button
                                      onClick={() => handleConfirmReservation(resv.id, true)}
                                      disabled={confirmingResvId === resv.id}
                                      style={{
                                        background: 'var(--forest)',
                                        border: '1px solid var(--leaf)',
                                        color: 'var(--mint)',
                                        padding: '6px 12px',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Confirm Space
                                    </button>
                                    <button
                                      onClick={() => handleCancelReservation(resv.id)}
                                      disabled={confirmingResvId === resv.id}
                                      style={{
                                        background: 'rgba(200,135,58,0.15)',
                                        border: '1px solid rgba(200,135,58,0.3)',
                                        color: 'var(--amber)',
                                        padding: '6px 12px',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Reject & Refund
                                    </button>
                                  </>
                                )}
                                {(resv.status === 'CONFIRMED' || resv.status === 'PENDING') && (
                                  <button
                                    onClick={() => handleCancelReservation(resv.id)}
                                    disabled={confirmingResvId === resv.id}
                                    style={{
                                      background: 'rgba(200,135,58,0.15)',
                                      border: '1px solid rgba(200,135,58,0.3)',
                                      color: 'var(--amber)',
                                      padding: '6px 12px',
                                      borderRadius: 'var(--radius-full)',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel & Refund
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteReservation(resv.id)}
                                  disabled={confirmingResvId === resv.id}
                                  style={{
                                    background: 'rgba(229,57,53,0.15)',
                                    border: '1px solid rgba(229,57,53,0.3)',
                                    color: '#ef5350',
                                    padding: '6px 12px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Delete Record
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })()}

          {/* TAB 4: MANAGE MENU */}
          {activeTab === 'menu' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--mint)' }}>
                    🍵 Cafe Menu & Customizations
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: 4 }}>
                    Manage products, availability status, prices, and adjust customization options like Milk or Syrups.
                  </p>
                </div>
                <button
                  onClick={() => openProductForm(null)}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 'var(--radius-full)' }}
                >
                  ➕ Add New Product
                </button>
              </div>

              {/* Sub-Tabs / Toggle between Products and Modifiers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 40 }}>
                
                {/* 1. PRODUCTS SECTION */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12 }}>
                    <h4 style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '1.1rem' }}>
                      📋 Product Catalogue
                    </h4>
                    
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 'var(--radius-md)',
                          padding: '8px 16px',
                          color: '#fff',
                          fontSize: '0.85rem',
                          minWidth: 200,
                        }}
                      />
                      <select
                        value={menuCategoryFilter}
                        onChange={(e) => setMenuCategoryFilter(e.target.value)}
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 'var(--radius-md)',
                          padding: '8px 16px',
                          color: '#fff',
                          fontSize: '0.85rem',
                        }}
                      >
                        <option value="ALL">All Categories</option>
                        <option value="HOT">Hot Drinks</option>
                        <option value="COLD">Cold Drinks</option>
                        <option value="FOOD">Food Items</option>
                        <option value="RESERVE">Reserve Blends</option>
                        <option value="SEASONAL">Seasonal Special</option>
                      </select>
                    </div>
                  </div>

                  {loadingMenu ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                      Loading menu catalogue...
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                      {[...products]
                        .filter(prod => {
                          const matchesSearch = prod.name.toLowerCase().includes(menuSearch.toLowerCase()) || 
                            prod.description.toLowerCase().includes(menuSearch.toLowerCase())
                          const matchesCategory = menuCategoryFilter === 'ALL' || prod.category === menuCategoryFilter
                          return matchesSearch && matchesCategory
                        })
                        .sort((a, b) => {
                          const idxA = CATEGORY_ORDER.indexOf(a.category)
                          const idxB = CATEGORY_ORDER.indexOf(b.category)
                          if (idxA !== idxB) {
                            return idxA - idxB
                          }
                          return (a.sortOrder || 0) - (b.sortOrder || 0)
                        })
                        .map(prod => (
                          <div
                            key={prod.id}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid ' + (prod.isAvailable ? 'rgba(168,197,160,0.1)' : 'rgba(229,57,53,0.15)'),
                              borderRadius: 'var(--radius-lg)',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              transition: 'transform 0.2s',
                              position: 'relative'
                            }}
                          >
                            {/* Product Badge / Availability Overlay */}
                            {!prod.isAvailable && (
                              <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(2px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 2
                              }}>
                                <span style={{
                                  background: '#e53935',
                                  color: '#fff',
                                  padding: '4px 12px',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700
                                }}>
                                  Unavailable
                                </span>
                              </div>
                            )}

                            {/* Image Header */}
                            <div style={{ height: 160, width: '100%', position: 'relative', background: '#0e1d11' }}>
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=75'
                                }}
                              />
                              {prod.badge && (
                                <span style={{
                                  position: 'absolute',
                                  top: 12,
                                  left: 12,
                                  background: 'var(--forest)',
                                  border: '1px solid var(--leaf)',
                                  color: 'var(--mint)',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.68rem',
                                  fontWeight: 700
                                }}>
                                  {prod.badge}
                                </span>
                              )}
                              <span style={{
                                position: 'absolute',
                                bottom: 12,
                                right: 12,
                                background: 'rgba(0,0,0,0.6)',
                                color: 'var(--mint)',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}>
                                {prod.category}
                              </span>
                            </div>

                            {/* Details Content */}
                            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                              <h5 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--cream)', marginBottom: 4 }}>
                                {prod.name}
                              </h5>
                              {prod.origin && (
                                <p style={{ fontSize: '0.7rem', color: 'var(--mint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                                  🌍 {prod.origin}
                                </p>
                              )}
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-soft)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 34, marginBottom: 8 }}>
                                {prod.description}
                              </p>
                              {prod.notes && (
                                <div style={{ fontSize: '0.72rem', fontStyle: 'italic', color: 'var(--sage)', marginBottom: 12 }}>
                                  🌾 {prod.notes}
                                </div>
                              )}

                              {/* Price and Action Buttons */}
                              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                                  {formatPrice(prod.basePrice)}
                                </span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    onClick={() => openProductForm(prod)}
                                    className="btn-outline"
                                    style={{ padding: '6px 12px', fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.1)' }}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(prod.id)}
                                    className="btn-outline"
                                    style={{ padding: '6px 12px', fontSize: '0.72rem', borderColor: 'rgba(229,57,53,0.2)', color: '#ef5350' }}
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* 2. MODIFIERS SECTION */}
                <div>
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12, marginBottom: 20 }}>
                    <h4 style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '1.1rem' }}>
                      🥛 Customization & Extra Modifiers
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--sage)', marginTop: 4 }}>
                      Change charges for add-ons like Oat Milk, Vanilla Syrups, Sizes, or Temperature.
                    </p>
                  </div>

                  {loadingMenu ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                      Loading modifiers catalogue...
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', background: 'rgba(255,255,255,0.01)' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--mint)' }}>
                            <th style={{ padding: 12 }}>Customization Name</th>
                            <th style={{ padding: 12 }}>Group Type</th>
                            <th style={{ padding: 12 }}>Price Modifier</th>
                            <th style={{ padding: 12 }}>Status</th>
                            <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modifiers.map((mod) => {
                            const isEditing = editingModifierId === mod.id
                            return (
                              <tr key={mod.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: 12, fontWeight: 700 }}>{mod.name}</td>
                                <td style={{ padding: 12 }}>
                                  <span style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.72rem',
                                    color: 'var(--sage)'
                                  }}>
                                    {mod.type}
                                  </span>
                                </td>
                                <td style={{ padding: 12 }}>
                                  {isEditing ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ color: 'var(--mint)' }}>₹</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={modifierPriceRupees}
                                        onChange={(e) => setModifierPriceRupees(e.target.value)}
                                        style={{
                                          width: 80,
                                          background: 'rgba(0,0,0,0.3)',
                                          border: '1px solid var(--mint)',
                                          borderRadius: 'var(--radius-sm)',
                                          padding: '4px 8px',
                                          color: '#fff',
                                          fontSize: '0.85rem'
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <span style={{ color: mod.priceAdjustment >= 0 ? 'var(--mint)' : '#ef5350', fontWeight: 600 }}>
                                      {mod.priceAdjustment >= 0 ? '+' : ''}{formatPrice(mod.priceAdjustment)}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: 12 }}>
                                  {isEditing ? (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
                                      <input
                                        type="checkbox"
                                        checked={modifierIsAvailable}
                                        onChange={(e) => setModifierIsAvailable(e.target.checked)}
                                        style={{ accentColor: 'var(--leaf)' }}
                                      />
                                      Available
                                    </label>
                                  ) : (
                                    <span style={{
                                      background: mod.isAvailable ? 'rgba(74,140,63,0.15)' : 'rgba(229,57,53,0.15)',
                                      border: '1px solid ' + (mod.isAvailable ? 'rgba(74,140,63,0.3)' : 'rgba(229,57,53,0.3)'),
                                      color: mod.isAvailable ? 'var(--mint)' : '#ef5350',
                                      padding: '3px 8px',
                                      borderRadius: 'var(--radius-full)',
                                      fontSize: '0.72rem'
                                    }}>
                                      {mod.isAvailable ? 'Available' : 'Disabled'}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: 12, textAlign: 'right' }}>
                                  {isEditing ? (
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                      <button
                                        onClick={() => handleUpdateModifier(mod)}
                                        disabled={modifierSubmitting}
                                        className="btn-primary"
                                        style={{ padding: '4px 12px', fontSize: '0.72rem', borderRadius: 'var(--radius-sm)' }}
                                      >
                                        {modifierSubmitting ? 'Saving' : 'Save'}
                                      </button>
                                      <button
                                        onClick={() => setEditingModifierId(null)}
                                        className="btn-outline"
                                        style={{ padding: '4px 12px', fontSize: '0.72rem', borderRadius: 'var(--radius-sm)', borderColor: 'rgba(255,255,255,0.15)' }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => startModifierEdit(mod)}
                                      className="btn-outline"
                                      style={{ padding: '4px 12px', fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.1)' }}
                                    >
                                      ✏️ Adjust
                                    </button>
                                  )}
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

              {/* PRODUCT FORM MODAL */}
              <AnimatePresence>
                {isProductFormOpen && (
                  <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16
                  }}>
                    <motion.div
                      initial={{ opacity: 0, y: 50, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 30, scale: 0.95 }}
                      style={{
                        background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)',
                        border: '1px solid var(--mint)',
                        borderRadius: 'var(--radius-xl)',
                        padding: 32,
                        width: '100%',
                        maxWidth: 700,
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                        color: 'var(--cream)'
                      }}
                    >
                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cream)', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                        {editingProduct ? '✏️ Edit Product details' : '➕ Add New Menu Product'}
                      </h4>

                      <form onSubmit={handleProductSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, textAlign: 'left' }}>
                        
                        {/* Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Product Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Java Chip Frappuccino"
                            value={productName}
                            onChange={(e) => {
                              setProductName(e.target.value)
                              // Auto-generate slug if adding
                              if (!editingProduct) {
                                setProductSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
                              }
                            }}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        {/* Slug */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>URL Slug *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. java-chip-frappuccino"
                            value={productSlug}
                            onChange={(e) => setProductSlug(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        {/* Base Price (Rupees) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Base Price (₹) *</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="e.g. 340.00"
                            value={productPriceRupees}
                            onChange={(e) => setProductPriceRupees(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        {/* Category */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Category *</label>
                          <select
                            value={productCategory}
                            onChange={(e) => setProductCategory(e.target.value as any)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem'
                            }}
                          >
                            <option value="HOT">Hot Drinks</option>
                            <option value="COLD">Cold Drinks</option>
                            <option value="FOOD">Food Items</option>
                            <option value="RESERVE">Reserve Blends</option>
                            <option value="SEASONAL">Seasonal Special</option>
                          </select>
                        </div>

                        {/* Image URL */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Image URL</label>
                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/..."
                            value={productImageUrl}
                            onChange={(e) => setProductImageUrl(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        {/* Tasting Notes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Tasting Notes</label>
                          <input
                            type="text"
                            placeholder="e.g. Rich Cocoa · Crunchy Choco-Chips · Sweet Cream"
                            value={productNotes}
                            onChange={(e) => setProductNotes(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        {/* Description */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Description *</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Detailed product write-up..."
                            value={productDescription}
                            onChange={(e) => setProductDescription(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem',
                              fontFamily: 'inherit',
                              resize: 'vertical'
                            }}
                          />
                        </div>

                        {/* Badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Highlight Badge (e.g. 🌿 Best Seller)</label>
                          <input
                            type="text"
                            placeholder="e.g. 🌿 Signature"
                            value={productBadge}
                            onChange={(e) => setProductBadge(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        {/* Origin */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Single Origin / Source</label>
                          <input
                            type="text"
                            placeholder="e.g. Chikmagalur, India"
                            value={productOrigin}
                            onChange={(e) => setProductOrigin(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        {/* Sort Order */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Sorting Order (Weight)</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={productSortOrder}
                            onChange={(e) => setProductSortOrder(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        {/* Availability Checkbox */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 600
                          }}>
                            <input
                              type="checkbox"
                              checked={productIsAvailable}
                              onChange={(e) => setProductIsAvailable(e.target.checked)}
                              style={{ width: 18, height: 18, accentColor: 'var(--leaf)' }}
                            />
                            Product Available for Order
                          </label>
                        </div>

                        {/* Error message */}
                        {productFormError && (
                          <div style={{ gridColumn: 'span 2', background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: 'var(--radius-md)', padding: 12, color: '#ef5350', fontSize: '0.85rem', fontWeight: 600 }}>
                            ⚠️ {productFormError}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20 }}>
                          <button
                            type="button"
                            onClick={() => setIsProductFormOpen(false)}
                            className="btn-outline"
                            style={{ padding: '10px 24px', borderColor: 'rgba(255,255,255,0.15)' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={productSubmitting}
                            className="btn-primary"
                            style={{ padding: '10px 32px', borderRadius: 'var(--radius-full)' }}
                          >
                            {productSubmitting ? 'Saving changes...' : 'Save Product'}
                          </button>
                        </div>

                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 5: REVENUE ANALYTICS */}
          {activeTab === 'analytics' && (
            <div>
              {loadingAnalytics && !analyticsData ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--sage)' }}>
                  <span className="pulse-dot" style={{ background: 'var(--mint)', marginRight: 12 }} />
                  Aggregating revenue analytics and drawing trends...
                </div>
              ) : !analyticsData ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--sage)' }}>
                  ⚠️ No analytics data loaded.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                  
                  {/* Overview Cards Grid */}
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--mint)', marginBottom: 20 }}>
                      📊 Financial Performance Overview
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                      {[
                        { label: "Today's Revenue", value: analyticsData.metrics.today, emoji: '📅', desc: 'Resets daily at midnight' },
                        { label: "Last Hour Revenue", value: analyticsData.metrics.lastHour, emoji: '⚡', desc: 'Trailing 60-min window' },
                        { label: "Yesterday's Revenue", value: analyticsData.metrics.yesterday, emoji: '⏳', desc: 'Previous calendar day' },
                        { label: "This Week's Revenue", value: analyticsData.metrics.thisWeek, emoji: '🌱', desc: 'Current calendar week' },
                        { label: "This Month's Revenue", value: analyticsData.metrics.thisMonth, emoji: '🌳', desc: 'Current calendar month' },
                        { label: "Last Month's Revenue", value: analyticsData.metrics.lastMonth, emoji: '🍂', desc: 'Previous calendar month' },
                        { label: "Average Order Value", value: analyticsData.metrics.averageOrderValue, emoji: '🍽️', desc: 'AOV per check' },
                        { label: "Total Completed Sales", value: analyticsData.metrics.totalRevenue, emoji: '📈', desc: 'All-time lifetime revenue' }
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(168, 197, 160, 0.12)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--sage)', fontWeight: 600 }}>{item.label}</span>
                            <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>
                          </div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: 10, fontFamily: 'var(--font-display)' }}>
                            {formatPrice(item.value)}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                            {item.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Peak Insights & Analytical Operations */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                    
                    {/* Peak Performance Highlights */}
                    <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                      <h4 style={{ color: 'var(--mint)', fontWeight: 700, fontSize: '1.05rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, marginBottom: 16 }}>
                        💡 Sales & Traffic Insights
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--sage)' }}>🌟 Best Performing Month</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                              {analyticsData.analysis.bestMonth.month}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ background: 'rgba(123,196,127,0.15)', color: 'var(--mint)', padding: '4px 8px', borderRadius: 4, fontSize: '0.85rem', fontWeight: 700 }}>
                              {formatPrice(analyticsData.analysis.bestMonth.revenue)}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--sage)' }}>🍂 Lowest Performing Month</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                              {analyticsData.analysis.worstMonth.month}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ background: 'rgba(229,57,53,0.15)', color: '#ef5350', padding: '4px 8px', borderRadius: 4, fontSize: '0.85rem', fontWeight: 700 }}>
                              {formatPrice(analyticsData.analysis.worstMonth.revenue)}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--sage)' }}>📅 Busiest Day of the Week</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                              {analyticsData.analysis.bestDayOfWeek.day}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ color: 'var(--mint)', fontSize: '0.9rem', fontWeight: 700 }}>
                              {formatPrice(analyticsData.analysis.bestDayOfWeek.revenue)}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--sage)' }}>⏰ Peak Traffic Hour</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                              {analyticsData.analysis.peakHour.hour}:00 - {analyticsData.analysis.peakHour.hour + 1}:00
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ color: 'var(--amber)', fontSize: '0.9rem', fontWeight: 700 }}>
                              {formatPrice(analyticsData.analysis.peakHour.revenue)}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Operational Summary */}
                    <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ color: 'var(--mint)', fontWeight: 700, fontSize: '1.05rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, marginBottom: 16 }}>
                          📊 Operational Efficiency
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--sage)' }}>Total Completed Orders:</span>
                            <strong style={{ color: '#fff' }}>{analyticsData.metrics.totalOrdersCount}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--sage)' }}>Average Sale ticket:</span>
                            <strong style={{ color: '#fff' }}>{formatPrice(analyticsData.metrics.averageOrderValue)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--sage)' }}>Order Volume (This Month):</span>
                            <strong style={{ color: '#fff' }}>
                              {analyticsData.charts.byMonth[analyticsData.charts.byMonth.length - 1]?.count ?? 0}
                            </strong>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ background: 'rgba(168,197,160,0.05)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px dashed rgba(168,197,160,0.2)', fontSize: '0.78rem', color: 'var(--sage)', marginTop: 12 }}>
                        💡 <strong>Owner Recommendation:</strong> Promote high-margin menu items during peak hours ({analyticsData.analysis.peakHour.hour}:00) on {analyticsData.analysis.bestDayOfWeek.day}s to capture traffic peaks.
                      </div>
                    </div>

                  </div>

                  {/* Custom SVG/CSS Interactive Chart Card */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(168,197,160,0.12)', borderRadius: 'var(--radius-xl)', padding: '32px 24px', boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }}>
                    
                    {/* Chart Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 16 }}>
                      <div>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)' }}>
                          📈 Revenue Trend Visualization
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--sage)', marginTop: 2 }}>
                          Perform trends analysis on chronological intervals.
                        </p>
                      </div>
                      
                      {/* Chart Controls */}
                      <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 'var(--radius-full)' }}>
                        {[
                          { label: 'Daily (30D)', value: 'daily' },
                          { label: 'Monthly (12M)', value: 'monthly' },
                          { label: 'Hourly (24H)', value: 'hourly' },
                          { label: 'Weekday (7D)', value: 'dayOfWeek' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setChartView(opt.value as any)}
                            style={{
                              background: chartView === opt.value ? 'var(--forest)' : 'transparent',
                              border: 'none',
                              color: chartView === opt.value ? '#fff' : 'var(--sage)',
                              padding: '6px 14px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chart Body */}
                    <div style={{ position: 'relative', height: 320, width: '100%', marginTop: 20 }}>
                      <RevenueChart 
                        view={chartView} 
                        data={analyticsData.charts} 
                      />
                    </div>
                  </div>

                  {/* Payment Ledger / History */}
                  <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, marginBottom: 16 }}>
                      <h4 style={{ color: 'var(--mint)', fontWeight: 700, fontSize: '1.1rem' }}>
                        💳 Historical Transactions Ledger
                      </h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--sage)' }}>
                        Showing latest 15 completed payments
                      </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--mint)' }}>
                            <th style={{ padding: '12px 8px' }}>Order ID</th>
                            <th style={{ padding: '12px 8px' }}>Customer Name</th>
                            <th style={{ padding: '12px 8px' }}>Email</th>
                            <th style={{ padding: '12px 8px' }}>Payment Method</th>
                            <th style={{ padding: '12px 8px' }}>Fulfillment Status</th>
                            <th style={{ padding: '12px 8px' }}>Date</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.recentPayments.map((payment: any) => (
                            <tr 
                              key={payment.id} 
                              style={{ 
                                borderBottom: '1px solid rgba(255,255,255,0.04)', 
                                background: 'rgba(255,255,255,0.005)' 
                              }}
                            >
                              <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--mint)' }}>
                                #{payment.id.slice(-6).toUpperCase()}
                              </td>
                              <td style={{ padding: '12px 8px', color: '#fff' }}>
                                {payment.customerName}
                              </td>
                              <td style={{ padding: '12px 8px', color: 'var(--sage)', fontSize: '0.8rem' }}>
                                {payment.customerEmail}
                              </td>
                              <td style={{ padding: '12px 8px' }}>
                                <span style={{
                                  background: payment.paymentMethod === 'WALLET' ? 'rgba(123, 196, 127, 0.15)' : payment.paymentMethod === 'STARS' ? 'rgba(232, 168, 78, 0.15)' : 'rgba(33, 150, 243, 0.15)',
                                  border: '1px solid ' + (payment.paymentMethod === 'WALLET' ? 'rgba(123, 196, 127, 0.4)' : payment.paymentMethod === 'STARS' ? 'rgba(232, 168, 78, 0.4)' : 'rgba(33, 150, 243, 0.4)'),
                                  color: payment.paymentMethod === 'WALLET' ? 'var(--mint)' : payment.paymentMethod === 'STARS' ? 'var(--amber)' : '#90caf9',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: '0.68rem',
                                  fontWeight: 700
                                }}>
                                  {payment.paymentMethod}
                                </span>
                              </td>
                              <td style={{ padding: '12px 8px' }}>
                                <span className={`status-pill status-${payment.status}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                  {payment.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 8px', color: 'var(--sage)', fontSize: '0.78rem' }}>
                                {new Date(payment.createdAt).toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                                {formatPrice(payment.totalAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
                )}
              </div>
            )}

            {/* TAB 6: STAFF WORKERS */}
            {activeTab === 'workers' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--mint)' }}>
                      👷 Cafe Workers & Delivery Staff
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: 4 }}>
                      Manage delivery personnel accounts, update their monthly salaries, and monitor order delivery statistics.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddWorkerModal}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 'var(--radius-full)' }}
                  >
                    ➕ Add Staff Member
                  </button>
                </div>

                {/* Workers Metrics Dashboard */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
                  {[
                    { label: "Total Delivery Staff", value: String(workersList.length), emoji: '👥', color: 'rgba(123, 196, 127, 0.08)', glow: 'rgba(123,196,127,0.1)' },
                    { label: "On Duty Now", value: String(workersList.filter(w => w.isAvailable).length), emoji: '🟢', color: 'rgba(52, 211, 153, 0.08)', glow: 'rgba(52,211,153,0.1)' },
                    { label: 'Monthly Salary Bill', value: `₹${(workersList.reduce((acc, w) => acc + (w.salary || 0), 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, emoji: '💰', color: 'rgba(200, 135, 58, 0.08)', glow: 'rgba(200,135,58,0.1)' },
                    { label: 'Total Orders Served', value: String(workersList.reduce((acc, w) => acc + (w.ordersServed || 0), 0)), emoji: '🛵', color: 'rgba(74, 140, 63, 0.08)', glow: 'rgba(74,140,63,0.1)' },
                    { label: 'Active Transit Deliveries', value: String(workersList.reduce((acc, w) => acc + (w.activeDeliveries || 0), 0)), emoji: '⚡', color: 'rgba(232, 168, 78, 0.08)', glow: 'rgba(232,168,78,0.1)' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        background: stat.color,
                        backdropFilter: 'var(--glass-blur)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--sage)', fontWeight: 600 }}>{stat.label}</span>
                        <span style={{ fontSize: '1.2rem' }}>{stat.emoji}</span>
                      </div>
                      <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginTop: 10, color: '#fff' }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 📢 Broadcast Staff Alert Control Panel */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1.5px solid rgba(168, 197, 160, 0.15)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  backdropFilter: 'blur(20px)',
                  marginBottom: 32,
                }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--mint)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📢</span> Broadcast Staff Alert
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 20px 0' }}>
                    Send an urgent system announcement to all active staff members. Online workers will receive a real-time slide-in alert banner instantly.
                  </p>

                  <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>Message Text</label>
                      <textarea
                        required
                        placeholder="Type the announcement details (e.g. 'Bonus pay active for next 2 hours!', 'High order volumes, please speed up deliveries')"
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        rows={3}
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 16px',
                          color: '#fff',
                          fontSize: '0.88rem',
                          outline: 'none',
                          resize: 'none',
                          fontFamily: 'inherit',
                          lineHeight: 1.4,
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>Target Staff:</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setBroadcastTarget('online')}
                            style={{
                              background: broadcastTarget === 'online' ? 'var(--forest)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${broadcastTarget === 'online' ? 'var(--leaf)' : 'rgba(255,255,255,0.1)'}`,
                              color: broadcastTarget === 'online' ? '#fff' : 'var(--sage)',
                              padding: '6px 14px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            🟢 Online Workers Only
                          </button>
                          <button
                            type="button"
                            onClick={() => setBroadcastTarget('all')}
                            style={{
                              background: broadcastTarget === 'all' ? 'var(--forest)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${broadcastTarget === 'all' ? 'var(--leaf)' : 'rgba(255,255,255,0.1)'}`,
                              color: broadcastTarget === 'all' ? '#fff' : 'var(--sage)',
                              padding: '6px 14px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            👥 All Registered Workers
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={sendingBroadcast || !broadcastMsg.trim()}
                        className="btn-primary"
                        style={{
                          padding: '10px 24px',
                          borderRadius: 'var(--radius-full)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'var(--mint)',
                          color: '#000',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {sendingBroadcast ? 'Broadcasting...' : '📢 Send Broadcast'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Worker Performance Leaderboard */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: 32 }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--amber)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    🏆 Worker Performance Leaderboard
                  </h4>
                  {workersList.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--sage)' }}>No workers to display.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                      {workersList
                        .map((worker) => {
                          const volumeScore = Math.min((worker.ordersServed || 0) * 5, 100);
                          const ratingScore = (worker.avgRating || 0) * 20;
                          const speedScore = worker.avgPrepSpeed > 0 ? Math.min(Math.round((20 / worker.avgPrepSpeed) * 100), 100) : 0;
                          const totalScore = Math.round(volumeScore * 0.3 + ratingScore * 0.4 + speedScore * 0.3);
                          return { ...worker, totalScore };
                        })
                        .sort((a, b) => b.totalScore - a.totalScore)
                        .slice(0, 3)
                        .map((worker, rankIdx) => (
                          <div
                            key={worker.id}
                            style={{
                              background: 'rgba(0,0,0,0.2)',
                              border: `1px solid ${rankIdx === 0 ? 'rgba(232, 168, 78, 0.4)' : 'rgba(255,255,255,0.05)'}`,
                              borderRadius: 'var(--radius-md)',
                              padding: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 16,
                              position: 'relative'
                            }}
                          >
                            <div style={{
                              fontSize: '1.8rem',
                              fontWeight: 800,
                              color: rankIdx === 0 ? 'var(--gold)' : rankIdx === 1 ? '#c0c0c0' : '#cd7f32',
                              width: 32,
                              textAlign: 'center'
                            }}>
                              {rankIdx === 0 ? '🥇' : rankIdx === 1 ? '🥈' : '🥉'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>{worker.name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--sage)', marginTop: 2, display: 'flex', gap: 12 }}>
                                <span>⭐ {worker.avgRating || 'No Rating'}</span>
                                <span>⏱️ {worker.avgPrepSpeed ? `${worker.avgPrepSpeed}m prep` : '—'}</span>
                                <span>☕ {worker.ordersServed} served</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--sage)', textTransform: 'uppercase' }}>Score</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: rankIdx === 0 ? 'var(--gold)' : 'var(--mint)' }}>{worker.totalScore}/100</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Workers List Table */}
                {loadingWorkers && workersList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                    Loading staff roster...
                  </div>
                ) : workersList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sage)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)' }}>
                    🌾 No delivery workers registered yet. Click "Add Staff Member" above to create one.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', background: 'rgba(255,255,255,0.01)' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--mint)' }}>
                          <th style={{ padding: 12 }}>Staff Member</th>
                          <th style={{ padding: 12 }}>Phone</th>
                          <th style={{ padding: 12 }}>Monthly Salary</th>
                          <th style={{ padding: 12 }}>Active Deliveries</th>
                          <th style={{ padding: 12 }}>Orders Delivered</th>
                          <th style={{ padding: 12 }}>Date Joined</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workersList.map((worker) => (
                          <tr key={worker.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.005)' }}>
                            <td style={{ padding: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontWeight: 700, color: '#fff' }}>{worker.name}</div>
                                <span style={{
                                  background: worker.isAvailable ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255,255,255,0.04)',
                                  border: `1.5px solid ${worker.isAvailable ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                                  color: worker.isAvailable ? 'var(--mint)' : 'var(--sage)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.68rem',
                                  fontWeight: 700
                                }}>
                                  {worker.isAvailable ? '🟢 On Duty' : '🔴 Offline'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--sage)' }}>{worker.email}</div>
                            </td>
                            <td style={{ padding: 12, color: 'var(--sage)' }}>
                              {worker.phone ? `📞 ${worker.phone}` : '—'}
                            </td>
                            <td style={{ padding: 12, fontWeight: 600 }}>
                              ₹{((worker.salary || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: 12 }}>
                              {worker.activeDeliveries > 0 ? (
                                <span style={{ background: 'rgba(232, 168, 78, 0.15)', border: '1px solid rgba(232, 168, 78, 0.3)', color: 'var(--amber)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700 }}>
                                  🛵 {worker.activeDeliveries} in transit
                                </span>
                              ) : (
                                <span style={{ color: 'var(--sage)', fontSize: '0.78rem' }}>Idle</span>
                              )}
                            </td>
                            <td style={{ padding: 12, fontWeight: 700, color: 'var(--mint)' }}>
                              ✨ {worker.ordersServed}
                            </td>
                            <td style={{ padding: 12, color: 'var(--sage)', fontSize: '0.78rem' }}>
                              {new Date(worker.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <a
                                  href={`mailto:${worker.email}`}
                                  className="btn-outline"
                                  title="Send Email"
                                  style={{ padding: '4px 8px', fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                                >
                                  ✉️ Email
                                </a>
                                {worker.phone && (
                                  <a
                                    href={`tel:${worker.phone}`}
                                    className="btn-outline"
                                    title="Call Phone"
                                    style={{ padding: '4px 8px', fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                                  >
                                    📞 Call
                                  </a>
                                )}
                                <button
                                  onClick={() => handleOpenChatModal(worker)}
                                  className="btn-outline"
                                  title="Live Support Chat"
                                  style={{ padding: '4px 8px', fontSize: '0.72rem', borderColor: 'var(--mint)', color: 'var(--mint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}
                                >
                                  💬 Chat
                                </button>
                                <button
                                  onClick={() => handleSelectWorkerForLedger(worker)}
                                  className="btn-primary"
                                  style={{ padding: '4px 12px', fontSize: '0.72rem', background: 'var(--mint)', color: '#000', borderRadius: 'var(--radius-sm)', border: 'none' }}
                                >
                                  📊 HR Ledger
                                </button>
                                <button
                                  onClick={() => handleOpenEditWorkerModal(worker)}
                                  className="btn-outline"
                                  style={{ padding: '4px 12px', fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)' }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteWorker(worker.id)}
                                  className="btn-outline"
                                  style={{ padding: '4px 12px', fontSize: '0.72rem', borderColor: 'rgba(229,57,53,0.2)', color: '#ef5350', borderRadius: 'var(--radius-sm)' }}
                                >
                                  🗑️ Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Administrators List Table */}
                <div style={{ marginTop: 48, marginBottom: 24 }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--mint)', marginBottom: 8 }}>
                    🛡️ Administrator Accounts
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginBottom: 16 }}>
                    Registered store administrators who have full system credentials, menu modification rights, and financial ledger access.
                  </p>

                  {loadingAdmins && adminsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--sage)' }}>
                      Loading administrator roster...
                    </div>
                  ) : adminsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--sage)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)' }}>
                      No other administrators registered.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', background: 'rgba(255,255,255,0.01)' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--mint)' }}>
                            <th style={{ padding: 12 }}>Admin User</th>
                            <th style={{ padding: 12 }}>Phone</th>
                            <th style={{ padding: 12 }}>Role Badge</th>
                            <th style={{ padding: 12 }}>Date Created</th>
                            <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminsList.map((adm) => (
                            <tr key={adm.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.005)' }}>
                              <td style={{ padding: 12 }}>
                                <div style={{ fontWeight: 700, color: '#fff' }}>{adm.name || 'Admin Partner'}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--sage)' }}>{adm.email}</div>
                              </td>
                              <td style={{ padding: 12, color: 'var(--sage)' }}>
                                {adm.phone ? `📞 ${adm.phone}` : '—'}
                              </td>
                              <td style={{ padding: 12 }}>
                                <span style={{
                                  background: 'rgba(232, 168, 78, 0.12)',
                                  border: '1.5px solid rgba(232, 168, 78, 0.3)',
                                  color: 'var(--amber)',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase'
                                }}>
                                  🛡️ ADMIN
                                </span>
                              </td>
                              <td style={{ padding: 12, color: 'var(--sage)', fontSize: '0.78rem' }}>
                                {new Date(adm.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td style={{ padding: 12, textAlign: 'right' }}>
                                <a
                                  href={`mailto:${adm.email}`}
                                  className="btn-outline"
                                  style={{ padding: '4px 10px', fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.1)', textDecoration: 'none', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                                >
                                  ✉️ Email
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Performance & HR Ledger Section */}
                {selectedWorkerForLedger && (
                  <motion.div
                    id="hr-ledger-section"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: 40,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1.5px solid rgba(168, 197, 160, 0.15)',
                      borderRadius: 'var(--radius-xl)',
                      padding: 28,
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16, marginBottom: 28 }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--mint)', fontWeight: 700, letterSpacing: '0.05em' }}>Performance & HR Ledger</span>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#fff', margin: '4px 0 0 0' }}>
                          👤 Records for {selectedWorkerForLedger.name}
                        </h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--sage)' }}>{selectedWorkerForLedger.email}</span>
                      </div>
                      <button
                        onClick={() => setSelectedWorkerForLedger(null)}
                        className="btn-outline"
                        style={{ padding: '8px 16px', fontSize: '0.78rem', borderColor: 'rgba(255,255,255,0.15)' }}
                      >
                        ❌ Close Ledger
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 32 }}>
                      
                      {/* ATTENDANCE SECTION */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                          <h5 style={{ color: 'var(--mint)', margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700 }}>📅 Log Attendance</h5>
                          
                          <form onSubmit={handleAddAttendance} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>Date</label>
                                <input
                                  type="date"
                                  required
                                  value={attendanceDate}
                                  onChange={(e) => setAttendanceDate(e.target.value)}
                                  style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px 12px',
                                    color: '#fff',
                                    fontSize: '0.85rem'
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>Status</label>
                                <select
                                  value={attendanceStatus}
                                  onChange={(e) => setAttendanceStatus(e.target.value as any)}
                                  style={{
                                    background: '#071208',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px 12px',
                                    color: '#fff',
                                    fontSize: '0.85rem'
                                  }}
                                >
                                  <option value="PRESENT">Present</option>
                                  <option value="HALF_DAY">Half Day</option>
                                  <option value="SICK_LEAVE">Sick Leave</option>
                                  <option value="ABSENT">Absent</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <label style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>Notes / Reason</label>
                              <input
                                type="text"
                                placeholder="e.g. Regular shift, Sick note submitted"
                                value={attendanceNotes}
                                onChange={(e) => setAttendanceNotes(e.target.value)}
                                style={{
                                  background: 'rgba(0,0,0,0.3)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '8px 12px',
                                  color: '#fff',
                                  fontSize: '0.85rem'
                                }}
                              />
                            </div>

                            {attendanceError && (
                              <div style={{ color: '#ef5350', fontSize: '0.78rem', fontWeight: 600 }}>
                                ⚠️ {attendanceError}
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={submittingAttendance}
                              className="btn-primary"
                              style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', alignSelf: 'flex-start', fontSize: '0.82rem' }}
                            >
                              {submittingAttendance ? 'Logging...' : '💾 Save Attendance'}
                            </button>
                          </form>
                        </div>

                        {/* Attendance History Table */}
                        <div>
                          <h5 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '1.05rem', fontWeight: 700 }}>📅 Attendance History</h5>
                          {loadingLedger && workerAttendances.length === 0 ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--sage)' }}>Loading history...</div>
                          ) : workerAttendances.length === 0 ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--sage)', fontStyle: 'italic', padding: '10px 0' }}>
                              No attendance records logged.
                            </div>
                          ) : (
                            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: 'var(--mint)' }}>
                                    <th style={{ padding: 10 }}>Date</th>
                                    <th style={{ padding: 10 }}>Status</th>
                                    <th style={{ padding: 10 }}>Notes</th>
                                    <th style={{ padding: 10, textAlign: 'right' }}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {workerAttendances.map((att) => {
                                    const dateStr = new Date(att.date).toLocaleDateString('en-IN', {
                                      day: 'numeric', month: 'short', year: 'numeric'
                                    })
                                    let color = 'var(--mint)'
                                    if (att.status === 'HALF_DAY') color = 'var(--amber)'
                                    if (att.status === 'SICK_LEAVE') color = '#0d9488'
                                    if (att.status === 'ABSENT') color = '#ef5350'

                                    return (
                                      <tr key={att.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <td style={{ padding: 10, fontWeight: 600, color: '#fff' }}>{dateStr}</td>
                                        <td style={{ padding: 10 }}>
                                          <span style={{ color, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                            {att.status.replace('_', ' ')}
                                          </span>
                                        </td>
                                        <td style={{ padding: 10, color: 'var(--sage)', fontSize: '0.78rem' }}>{att.notes || '-'}</td>
                                        <td style={{ padding: 10, textAlign: 'right' }}>
                                          <button
                                            onClick={() => handleDeleteAttendance(att.id)}
                                            style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
                                          >
                                            🗑️ Delete
                                          </button>
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

                      {/* SALARY & PAYMENTS SECTION */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                          <h5 style={{ color: 'var(--mint)', margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700 }}>💵 Record Salary & Bonus</h5>
                          
                          <form onSubmit={handleAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>Month / Period</label>
                                <select
                                  value={paymentMonth}
                                  onChange={(e) => setPaymentMonth(e.target.value)}
                                  style={{
                                    background: '#071208',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px 12px',
                                    color: '#fff',
                                    fontSize: '0.85rem'
                                  }}
                                >
                                  {(() => {
                                    const opts = []
                                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                                    const currYear = new Date().getFullYear()
                                    // Generate options for last year, this year and next year
                                    for (let year = currYear - 1; year <= currYear + 1; year++) {
                                      for (let m = 0; m < 12; m++) {
                                        opts.push(`${months[m]} ${year}`)
                                      }
                                    }
                                    return opts.map(o => <option key={o} value={o}>{o}</option>)
                                  })()}
                                </select>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>Payment Status</label>
                                <select
                                  value={paymentStatus}
                                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                                  style={{
                                    background: '#071208',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px 12px',
                                    color: '#fff',
                                    fontSize: '0.85rem'
                                  }}
                                >
                                  <option value="PAID">Paid</option>
                                  <option value="PENDING">Pending</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>Base Salary (INR)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  value={paymentAmountRupees}
                                  onChange={(e) => setPaymentAmountRupees(e.target.value)}
                                  style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px 12px',
                                    color: '#fff',
                                    fontSize: '0.85rem'
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>Bonus (INR)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  value={paymentBonusRupees}
                                  onChange={(e) => setPaymentBonusRupees(e.target.value)}
                                  style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px 12px',
                                    color: '#fff',
                                    fontSize: '0.85rem'
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: paymentStatus === 'PAID' ? '1fr 1fr' : '1fr', gap: 14 }}>
                              {paymentStatus === 'PAID' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <label style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>Paid Date</label>
                                  <input
                                    type="date"
                                    required
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    style={{
                                      background: 'rgba(0,0,0,0.3)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: 'var(--radius-md)',
                                      padding: '8px 12px',
                                      color: '#fff',
                                      fontSize: '0.85rem'
                                    }}
                                  />
                                </div>
                              )}

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.78rem', color: 'var(--sage)', fontWeight: 600 }}>Notes / Reference</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Bank transfer ref #1234"
                                  value={paymentNotes}
                                  onChange={(e) => setPaymentNotes(e.target.value)}
                                  style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px 12px',
                                    color: '#fff',
                                    fontSize: '0.85rem'
                                  }}
                                />
                              </div>
                            </div>

                            {paymentError && (
                              <div style={{ color: '#ef5350', fontSize: '0.78rem', fontWeight: 600 }}>
                                ⚠️ {paymentError}
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={submittingPayment}
                              className="btn-primary"
                              style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', alignSelf: 'flex-start', fontSize: '0.82rem' }}
                            >
                              {submittingPayment ? 'Saving...' : '💾 Save Payment Record'}
                            </button>
                          </form>
                        </div>

                        {/* Salary & Payment Logs */}
                        <div>
                          <h5 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '1.05rem', fontWeight: 700 }}>💵 Salary Payment Logs</h5>
                          {loadingLedger && workerPayments.length === 0 ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--sage)' }}>Loading history...</div>
                          ) : workerPayments.length === 0 ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--sage)', fontStyle: 'italic', padding: '10px 0' }}>
                              No salary payment history found.
                            </div>
                          ) : (
                            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: 'var(--mint)' }}>
                                    <th style={{ padding: 10 }}>Period</th>
                                    <th style={{ padding: 10 }}>Base & Bonus</th>
                                    <th style={{ padding: 10 }}>Status</th>
                                    <th style={{ padding: 10 }}>Notes</th>
                                    <th style={{ padding: 10, textAlign: 'right' }}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {workerPayments.map((p) => {
                                    const amountVal = p.amount / 100
                                    const bonusVal = p.bonus / 100
                                    const totalVal = amountVal + bonusVal
                                    const isPaid = p.status === 'PAID'

                                    return (
                                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <td style={{ padding: 10, fontWeight: 700, color: '#fff' }}>{p.month}</td>
                                        <td style={{ padding: 10 }}>
                                          <div>Base: ₹{amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                          {bonusVal > 0 && <div style={{ color: 'var(--mint)', fontSize: '0.78rem' }}>Bonus: +₹{bonusVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>}
                                          <div style={{ fontWeight: 700, marginTop: 2, fontSize: '0.82rem', color: '#fff' }}>
                                            Total: ₹{totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                          </div>
                                        </td>
                                        <td style={{ padding: 10 }}>
                                          <span style={{
                                            color: isPaid ? 'var(--mint)' : 'var(--amber)',
                                            fontWeight: 700,
                                            fontSize: '0.72rem',
                                            textTransform: 'uppercase'
                                          }}>
                                            {p.status}
                                          </span>
                                          {p.paymentDate && (
                                            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--sage)' }}>
                                              {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ padding: 10, color: 'var(--sage)', fontSize: '0.78rem' }}>{p.notes || '-'}</td>
                                        <td style={{ padding: 10, textAlign: 'right' }}>
                                          <button
                                            onClick={() => handleDeletePayment(p.id)}
                                            style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
                                          >
                                            🗑️ Delete
                                          </button>
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
                  </motion.div>
                )}

                {/* Add/Edit Worker Modal overlay */}
                <AnimatePresence>
                  {showWorkerModal && (
                    <div style={{
                      position: 'fixed',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(0,0,0,0.7)',
                      backdropFilter: 'blur(5px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 999,
                      padding: 16
                    }}>
                      <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        style={{
                          background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)',
                          border: '1px solid var(--mint)',
                          borderRadius: 'var(--radius-xl)',
                          padding: 32,
                          width: '100%',
                          maxWidth: 500,
                          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                          color: 'var(--cream)'
                        }}
                      >
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--cream)', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                          {editingWorker ? '✏️ Edit Worker Details' : '➕ Register New Delivery Worker'}
                        </h4>

                        <form onSubmit={handleSaveWorker} style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
                          
                          {/* Name */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Full Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. John Doe"
                              value={workerName}
                              onChange={(e) => setWorkerName(e.target.value)}
                              style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 16px',
                                color: '#fff',
                                fontSize: '0.9rem'
                              }}
                            />
                          </div>

                          {/* Email */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Email Address *</label>
                            <input
                              type="email"
                              required
                              placeholder="e.g. john@forestbrew.com"
                              value={workerEmail}
                              onChange={(e) => setWorkerEmail(e.target.value)}
                              style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 16px',
                                color: '#fff',
                                fontSize: '0.9rem'
                              }}
                            />
                          </div>

                          {/* Phone */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Phone Number</label>
                            <input
                              type="text"
                              placeholder="e.g. 9876543210"
                              value={workerPhone}
                              onChange={(e) => setWorkerPhone(e.target.value)}
                              style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 16px',
                                color: '#fff',
                                fontSize: '0.9rem'
                              }}
                            />
                          </div>

                          {/* Salary */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Monthly Salary (INR) *</label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              placeholder="e.g. 25000.00"
                              value={workerSalaryRupees}
                              onChange={(e) => setWorkerSalaryRupees(e.target.value)}
                              style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 16px',
                                color: '#fff',
                                fontSize: '0.9rem'
                              }}
                            />
                          </div>

                          {/* Password */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>
                              {editingWorker ? 'Reset Password (optional)' : 'Password (defaults to forestbrew123)'}
                            </label>
                            <input
                              type="password"
                              placeholder={editingWorker ? 'Leave blank to keep current password' : ' forestbrew123'}
                              value={workerPassword}
                              onChange={(e) => setWorkerPassword(e.target.value)}
                              style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 16px',
                                color: '#fff',
                                fontSize: '0.9rem'
                              }}
                            />
                          </div>

                          {/* Error Message */}
                          {workerFormError && (
                            <div style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: 'var(--radius-md)', padding: 12, color: '#ef5350', fontSize: '0.85rem', fontWeight: 600 }}>
                              ⚠️ {workerFormError}
                            </div>
                          )}

                          {/* Modal Action buttons */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                            <button
                              type="button"
                              onClick={() => setShowWorkerModal(false)}
                              className="btn-outline"
                              style={{ padding: '10px 24px', borderColor: 'rgba(255,255,255,0.15)' }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={workerSubmitting}
                              className="btn-primary"
                              style={{ padding: '10px 32px', borderRadius: 'var(--radius-full)' }}
                            >
                              {workerSubmitting ? 'Saving...' : 'Save Worker'}
                            </button>
                          </div>

                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Worker Chat Modal overlay */}
                <AnimatePresence>
                  {showChatModal && chatWorker && (
                    <div style={{
                      position: 'fixed',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(0,0,0,0.75)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 999,
                      padding: 16
                    }}>
                      <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        style={{
                          background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)',
                          border: '1px solid var(--mint)',
                          borderRadius: 'var(--radius-xl)',
                          padding: 24,
                          width: '100%',
                          maxWidth: 550,
                          height: '80vh',
                          maxHeight: 700,
                          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                          color: 'var(--cream)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16, marginBottom: 16 }}>
                          <div>
                            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                              💬 Support Chat: {chatWorker.name}
                            </h4>
                            <span style={{ fontSize: '0.78rem', color: 'var(--mint)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', animation: 'pulse 1.5s infinite' }} />
                              SSE Sync Active
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setShowChatModal(false)
                              setChatWorker(null)
                            }}
                            className="btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.15)' }}
                          >
                            ✕ Close
                          </button>
                        </div>

                        {/* Messages Area */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }} className="custom-chart-scrollbar">
                          {chatMessages.length === 0 ? (
                            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--sage)', fontSize: '0.85rem', fontStyle: 'italic', padding: 20 }}>
                              No messages in this chat thread yet. Send a message to start conversation!
                            </div>
                          ) : (
                            chatMessages.map((msg) => {
                              const isAdmin = msg.senderRole === 'ADMIN'
                              return (
                                <div
                                  key={msg.id}
                                  style={{
                                    alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%',
                                    background: isAdmin ? 'rgba(74, 140, 63, 0.25)' : 'rgba(255,255,255,0.06)',
                                    border: `1px solid ${isAdmin ? 'rgba(123, 196, 127, 0.25)' : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 14px',
                                    position: 'relative',
                                  }}
                                >
                                  <div style={{ fontSize: '0.88rem', color: '#fff', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {msg.message}
                                  </div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--sage)', marginTop: 4, textAlign: isAdmin ? 'right' : 'left' }}>
                                    {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              )
                            })
                          )}
                          <div ref={chatEndRef} />
                        </div>

                        {/* Message Input Form */}
                        <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                          <input
                            type="text"
                            required
                            placeholder="Type a message..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            style={{
                              flex: 1,
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="submit"
                            disabled={sendingChat || !chatInput.trim()}
                            className="btn-primary"
                            style={{ padding: '10px 24px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                          >
                            {sendingChat ? 'Sending...' : '📨 Send'}
                          </button>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--mint)' }}>
                      📦 Inventory Management & Stock Alert
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: 4 }}>
                      Track ingredients, coffee beans, syrups, and packaging. Receive real-time alerts when stock drops below thresholds.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingInventoryItem(null)
                      setInvName('')
                      setInvQuantity(0)
                      setInvUnit('units')
                      setInvThreshold(10)
                      setInvCategory('')
                      setInvError('')
                      setIsInventoryModalOpen(true)
                    }}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 'var(--radius-full)' }}
                  >
                    ➕ Add Stock Item
                  </button>
                </div>

                {/* Low Stock Alerts Banner */}
                {inventoryList.filter(item => item.quantity <= item.threshold).length > 0 && (
                  <div style={{
                    background: 'rgba(229, 57, 53, 0.12)',
                    border: '1px solid rgba(229, 57, 53, 0.35)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 20px',
                    marginBottom: 24,
                    color: '#ef5350',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
                      🚨 {inventoryList.filter(item => item.quantity <= item.threshold).length} Low Stock Alert(s)
                    </strong>
                    <div style={{ fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {inventoryList.filter(item => item.quantity <= item.threshold).map(item => (
                        <span key={item.id} style={{ background: 'rgba(229, 57, 53, 0.2)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                          ⚠️ {item.name}: {item.quantity} {item.unit} (Min: {item.threshold})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inventory Table/Grid */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
                      <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700 }}>Item Name</th>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700 }}>Category</th>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700 }}>Stock Level</th>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700 }}>Threshold</th>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700 }}>Status</th>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingInventory ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                              ⏳ Loading inventory items...
                            </td>
                          </tr>
                        ) : inventoryList.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                              📦 No inventory records found.
                            </td>
                          </tr>
                        ) : (
                          inventoryList.map(item => {
                            const isLow = item.quantity <= item.threshold;
                            return (
                              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '16px 20px', color: 'var(--cream)', fontWeight: 600 }}>{item.name}</td>
                                <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.7)' }}>{item.category || 'Uncategorized'}</td>
                                <td style={{ padding: '16px 20px', color: isLow ? '#ef5350' : 'var(--mint)', fontWeight: 700 }}>
                                  {item.quantity} {item.unit}
                                </td>
                                <td style={{ padding: '16px 20px', color: 'var(--sage)' }}>{item.threshold} {item.unit}</td>
                                <td style={{ padding: '16px 20px' }}>
                                  {isLow ? (
                                    <span style={{ background: 'rgba(229, 57, 53, 0.15)', color: '#ef5350', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: 700 }}>
                                      ⚠️ LOW STOCK
                                    </span>
                                  ) : (
                                    <span style={{ background: 'rgba(74, 140, 63, 0.15)', color: 'var(--mint)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: 700 }}>
                                      ✅ OK
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                    <button
                                      onClick={() => {
                                        setEditingInventoryItem(item)
                                        setInvName(item.name)
                                        setInvQuantity(item.quantity)
                                        setInvUnit(item.unit)
                                        setInvThreshold(item.threshold)
                                        setInvCategory(item.category || '')
                                        setInvError('')
                                        setIsInventoryModalOpen(true)
                                      }}
                                      className="btn-outline"
                                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteInventory(item.id)}
                                      className="btn-outline"
                                      style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#ef5350', borderColor: 'rgba(229, 57, 53, 0.2)' }}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'complaints' && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--mint)' }}>
                    ⚠️ Customer Complaints & Refund Console
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: 4 }}>
                    Review customer complaints, view linked order receipts, and process wallet refunds or mark complaints as resolved.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {loadingFeedback ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                      ⏳ Loading complaints registry...
                    </div>
                  ) : feedbackList.filter(fb => fb.type === 'COMPLAINT').length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', color: 'var(--sage)' }}>
                      🪵 No active customer complaints filed. Great job!
                    </div>
                  ) : (
                    feedbackList.filter(fb => fb.type === 'COMPLAINT').map((complaint) => (
                      <div key={complaint.id} style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 'var(--radius-xl)',
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{
                                background: complaint.status === 'PENDING' ? 'rgba(229,57,53,0.15)' : complaint.status === 'REFUNDED' ? 'rgba(200,135,58,0.15)' : 'rgba(74,140,63,0.15)',
                                color: complaint.status === 'PENDING' ? '#ef5350' : complaint.status === 'REFUNDED' ? 'var(--amber)' : 'var(--mint)',
                                border: `1px solid ${complaint.status === 'PENDING' ? 'rgba(229,57,53,0.3)' : complaint.status === 'REFUNDED' ? 'rgba(200,135,58,0.3)' : 'rgba(74,140,63,0.3)'}`,
                                borderRadius: 'var(--radius-sm)',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}>
                                {complaint.status}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--sage)' }}>
                                Filed on {new Date(complaint.createdAt).toLocaleDateString()} at {new Date(complaint.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--cream)', marginTop: 8 }}>
                              Complaint #{complaint.id.slice(-6).toUpperCase()} by {complaint.user?.name || 'Guest User'}
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--sage)', marginTop: 2 }}>
                              Email: <strong>{complaint.user?.email || 'N/A'}</strong>
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <span key={idx} style={{ color: idx < complaint.rating ? 'var(--gold)' : 'rgba(255,255,255,0.1)', fontSize: '1.1rem' }}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>

                        {complaint.comments && (
                          <div style={{
                            background: 'rgba(0,0,0,0.15)',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: '3px solid #ef5350',
                            fontSize: '0.88rem',
                            color: 'var(--cream)',
                            lineHeight: 1.5
                          }}>
                            "{complaint.comments}"
                          </div>
                        )}

                        {complaint.order && (
                          <div style={{
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px dashed rgba(255,255,255,0.08)',
                            borderRadius: 'var(--radius-md)',
                            padding: 16,
                            fontSize: '0.82rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12
                          }}>
                            <div>
                              <strong style={{ color: 'var(--sage)' }}>Linked Order ID:</strong>{' '}
                              <span style={{ fontFamily: 'monospace', color: 'var(--cream)' }}>{complaint.order.id}</span>
                            </div>
                            <div>
                              <strong style={{ color: 'var(--sage)' }}>Order Amount:</strong>{' '}
                              <span style={{ color: 'var(--mint)', fontWeight: 700 }}>₹{(complaint.order.totalAmount / 100).toFixed(2)}</span>
                            </div>
                            <div>
                              <strong style={{ color: 'var(--sage)' }}>Order Date:</strong>{' '}
                              <span>{new Date(complaint.order.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}

                        {complaint.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                            <button
                              onClick={() => handleResolveComplaint(complaint.id, 'RESOLVE')}
                              className="btn-outline"
                              style={{ padding: '8px 20px', fontSize: '0.8rem' }}
                            >
                              ✅ Resolve without Refund
                            </button>
                            {complaint.order && complaint.userId && (
                              <button
                                onClick={() => handleResolveComplaint(complaint.id, 'REFUND', complaint.order.totalAmount)}
                                className="btn-primary"
                                style={{ padding: '8px 24px', fontSize: '0.8rem', background: '#e53935', borderColor: '#d32f2f' }}
                              >
                                💸 Issue Wallet Refund
                              </button>
                            )}
                          </div>
                        )}

                        {complaint.status === 'REFUNDED' && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--sage)', textAlign: 'right', fontStyle: 'italic' }}>
                            Refunded amount of ₹{((complaint.refundAmount || 0) / 100).toFixed(2)} issued to customer wallet.
                          </div>
                        )}
                        {complaint.status === 'RESOLVED' && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--sage)', textAlign: 'right', fontStyle: 'italic' }}>
                            Marked resolved on {complaint.resolvedAt ? new Date(complaint.resolvedAt).toLocaleDateString() : 'N/A'}.
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}


            {activeTab === 'financials' && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--mint)' }}>
                    💰 Store Financials Ledger
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: 4 }}>
                    Aggregated store revenue from all coffee orders, table bookings, and prepaid subscription club passes.
                  </p>
                </div>

                {loadingFinancials ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                    ⏳ Fetching financial databases...
                  </div>
                ) : financials ? (
                  <div>
                    {/* Big Stats Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                      
                      {/* Total Revenue */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px solid var(--mint)', borderRadius: 'var(--radius-xl)', padding: '20px 24px', boxShadow: '0 8px 24px rgba(123,196,127,0.05)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--mint)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Total Combined Revenue</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: 8, fontFamily: 'var(--font-display)' }}>
                          ₹{(financials.totalRevenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: 6 }}>
                          All revenue streams aggregated
                        </div>
                      </div>

                      {/* Orders Revenue */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', padding: '20px 24px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coffee Orders Revenue</div>
                        <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', marginTop: 8 }}>
                          ₹{(financials.ordersRevenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: 6 }}>
                          From {financials.ordersCount} total fulfilled orders
                        </div>
                      </div>

                      {/* Table Bookings Revenue */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', padding: '20px 24px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Table Bookings Revenue</div>
                        <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', marginTop: 8 }}>
                          ₹{(financials.bookingsRevenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: 6 }}>
                          From {financials.bookingsCount} confirmed reservations
                        </div>
                      </div>

                      {/* Subscriptions Revenue */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', padding: '20px 24px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subscriptions Revenue</div>
                        <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', marginTop: 8 }}>
                          ₹{(financials.subscriptionsRevenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: 6 }}>
                          From {financials.subscriptionsCount} club memberships loaded
                        </div>
                      </div>

                    </div>

                    {/* Detailed Breakdown Card */}
                    <div style={{ background: 'rgba(20,45,23,0.3)', border: '1px solid rgba(168,197,160,0.15)', borderRadius: 'var(--radius-2xl)', padding: 32, backdropFilter: 'var(--glass-blur)', marginBottom: 28 }}>
                      <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>💰 Revenue Share Analysis</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {[
                          { name: 'Coffee & Food Orders', value: financials.ordersRevenue, color: 'var(--mint)', percentage: financials.totalRevenue > 0 ? (financials.ordersRevenue / financials.totalRevenue) * 100 : 0 },
                          { name: 'Table Seating Reservations', value: financials.bookingsRevenue, color: '#10b981', percentage: financials.totalRevenue > 0 ? (financials.bookingsRevenue / financials.totalRevenue) * 100 : 0 },
                          { name: 'Prepaid Membership Passes', value: financials.subscriptionsRevenue, color: 'var(--amber)', percentage: financials.totalRevenue > 0 ? (financials.subscriptionsRevenue / financials.totalRevenue) * 100 : 0 }
                        ].map((share, idx) => (
                          <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8 }}>
                              <span style={{ color: 'var(--cream)', fontWeight: 600 }}>{share.name}</span>
                              <span style={{ color: '#fff', fontWeight: 700 }}>
                                ₹{(share.value / 100).toFixed(2)} ({share.percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: share.color, width: `${share.percentage}%`, borderRadius: 4 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                    ❌ Failed to calculate financials.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--mint)' }}>
                    ⭐ Forest Club Subscriptions
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: 4 }}>
                    Monitor active memberships, subscription types, pricing, and billing dates.
                  </p>
                </div>

                {/* Subscriptions Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', padding: '18px 20px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Subscriptions</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: 6 }}>
                      {subscribers.filter(s => s.subscriptionStatus === 'ACTIVE').length}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', padding: '18px 20px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated Monthly Value</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--mint)', marginTop: 6 }}>
                      ₹{(subscribers.filter(s => s.subscriptionStatus === 'ACTIVE').reduce((sum, s) => {
                        const amt = s.subscriptionTier === 'SEEDLING' ? 399 : s.subscriptionTier === 'CANOPY' ? 999 : s.subscriptionTier === 'REDWOOD' ? 1999 : 0;
                        return sum + amt;
                      }, 0)).toLocaleString('en-IN')}.00
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', padding: '18px 20px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seedling / Canopy / Redwood</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginTop: 10 }}>
                      🌱 {subscribers.filter(s => s.subscriptionTier === 'SEEDLING' && s.subscriptionStatus === 'ACTIVE').length} 
                      {'  |  '} 
                      🌳 {subscribers.filter(s => s.subscriptionTier === 'CANOPY' && s.subscriptionStatus === 'ACTIVE').length} 
                      {'  |  '} 
                      🌲 {subscribers.filter(s => s.subscriptionTier === 'REDWOOD' && s.subscriptionStatus === 'ACTIVE').length}
                    </div>
                  </div>
                </div>

                {/* Subscriptions Registry Table */}
                <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                  {loadingSubscriptions ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                      ⏳ Loading subscriptions database...
                    </div>
                  ) : subscribers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                      🪵 No subscription memberships recorded yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '16px 20px', color: 'var(--sage)', fontWeight: 700 }}>Customer Member</th>
                            <th style={{ padding: '16px 20px', color: 'var(--sage)', fontWeight: 700 }}>Membership Level</th>
                            <th style={{ padding: '16px 20px', color: 'var(--sage)', fontWeight: 700 }}>Monthly Amount</th>
                            <th style={{ padding: '16px 20px', color: 'var(--sage)', fontWeight: 700 }}>Valid Through</th>
                            <th style={{ padding: '16px 20px', color: 'var(--sage)', fontWeight: 700 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subscribers.map((sub) => {
                            const price = sub.subscriptionTier === 'SEEDLING' ? 399 : sub.subscriptionTier === 'CANOPY' ? 999 : sub.subscriptionTier === 'REDWOOD' ? 1999 : 0;
                            return (
                              <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '16px 20px' }}>
                                  <div style={{ fontWeight: 700, color: '#fff' }}>{sub.name || 'Anonymous User'}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--sage)', marginTop: 2 }}>{sub.email}</div>
                                  {sub.phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', marginTop: 2 }}>📞 {sub.phone}</div>}
                                </td>
                                <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                                  {sub.subscriptionTier === 'SEEDLING' && <span style={{ color: 'var(--mint)' }}>🌱 The Seedling Pass</span>}
                                  {sub.subscriptionTier === 'CANOPY' && <span style={{ color: '#10b981' }}>🌳 The Canopy Pass</span>}
                                  {sub.subscriptionTier === 'REDWOOD' && <span style={{ color: 'var(--amber)' }}>🌲 The Redwood Club</span>}
                                </td>
                                <td style={{ padding: '16px 20px', fontWeight: 700, color: '#fff' }}>
                                  ₹{price}.00
                                </td>
                                <td style={{ padding: '16px 20px', color: 'var(--sage)' }}>
                                  {sub.subscriptionExpires ? new Date(sub.subscriptionExpires).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                  <span style={{
                                    background: sub.subscriptionStatus === 'ACTIVE' ? 'rgba(74,140,63,0.15)' : 'rgba(229,57,53,0.1)',
                                    color: sub.subscriptionStatus === 'ACTIVE' ? 'var(--mint)' : '#ef5350',
                                    border: `1px solid ${sub.subscriptionStatus === 'ACTIVE' ? 'rgba(74,140,63,0.3)' : 'rgba(229,57,53,0.2)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '3px 10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700
                                  }}>
                                    {sub.subscriptionStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inventory Add/Edit Modal */}

            {/* Inventory Add/Edit Modal */}
            <AnimatePresence>
              {isInventoryModalOpen && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(5px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 999,
                  padding: 16
                }}>
                  <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.95 }}
                    style={{
                      background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)',
                      border: '1px solid var(--mint)',
                      borderRadius: 'var(--radius-xl)',
                      padding: 32,
                      width: '100%',
                      maxWidth: 500,
                      boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                      color: 'var(--cream)'
                    }}
                  >
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--cream)', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                      {editingInventoryItem ? '✏️ Edit Stock Item' : '➕ Add New Inventory Item'}
                    </h4>

                    <form onSubmit={handleSaveInventory} style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Item Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Arabica Espresso Beans"
                          value={invName}
                          onChange={(e) => setInvName(e.target.value)}
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 16px',
                            color: '#fff',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Quantity *</label>
                          <input
                            type="number"
                            required
                            value={invQuantity}
                            onChange={(e) => setInvQuantity(parseInt(e.target.value) || 0)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem',
                              width: '100%'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Unit *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. kg, liters, cups"
                            value={invUnit}
                            onChange={(e) => setInvUnit(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem',
                              width: '100%'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Alert Threshold *</label>
                          <input
                            type="number"
                            required
                            value={invThreshold}
                            onChange={(e) => setInvThreshold(parseInt(e.target.value) || 0)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem',
                              width: '100%'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Category</label>
                          <input
                            type="text"
                            placeholder="e.g. Beans, Dairy, Cups"
                            value={invCategory}
                            onChange={(e) => setInvCategory(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem',
                              width: '100%'
                            }}
                          />
                        </div>
                      </div>

                      {invError && (
                        <div style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: 'var(--radius-md)', padding: 12, color: '#ef5350', fontSize: '0.85rem', fontWeight: 600 }}>
                          ⚠️ {invError}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                        <button
                          type="button"
                          onClick={() => setIsInventoryModalOpen(false)}
                          className="btn-outline"
                          style={{ padding: '10px 24px', borderColor: 'rgba(255,255,255,0.15)' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={invSubmitting}
                          className="btn-primary"
                          style={{ padding: '10px 32px', borderRadius: 'var(--radius-full)' }}
                        >
                          {invSubmitting ? 'Saving...' : 'Save Item'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

        </div>

      </div>

      <style jsx global>{`
        .chart-bar-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-10px);
          background: rgba(12, 30, 16, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid var(--mint);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.6);
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s ease;
          z-index: 10;
          text-align: center;
          white-space: nowrap;
        }
        .chart-bar-container:hover .chart-bar-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(-6px);
        }
        .custom-chart-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-chart-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
          border-radius: 3px;
        }
        .custom-chart-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168,197,160,0.2);
          border-radius: 3px;
        }
        .custom-chart-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168,197,160,0.4);
        }
        .status-pill {
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-weight: 700;
          font-size: 0.72rem;
          display: inline-block;
        }
        .status-RECEIVED {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: var(--cream);
        }
        .status-BREWING {
          background: rgba(200, 135, 58, 0.15);
          border: 1px solid rgba(200, 135, 58, 0.3);
          color: var(--amber);
        }
        .status-READY {
          background: rgba(123, 196, 127, 0.15);
          border: 1px solid rgba(123, 196, 127, 0.3);
          color: var(--mint);
        }
        .status-DELIVERED {
          background: rgba(74, 140, 63, 0.2);
          border: 1px solid rgba(74, 140, 63, 0.4);
          color: var(--mint);
        }
        .status-OUT_FOR_DELIVERY {
          background: rgba(232, 168, 78, 0.15);
          border: 1px solid rgba(232, 168, 78, 0.35);
          color: var(--amber);
        }
        .status-CANCELLED {
          background: rgba(229,57,53,0.15);
          border: 1px solid rgba(229,57,53,0.3);
          color: #ef5350;
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          animation: ssePulse 1.5s infinite ease-in-out;
        }
        @keyframes ssePulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr !important;
          }
          .details-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

// Dedicated visual Card component for Kanban columns
function BaristaKanbanCard({ 
  order, 
  onAdvance, 
  onCancel, 
  onPing, 
  updatingId, 
  pingingId, 
  elapsedTime,
  formatCustomization,
  workersList = [],
  onAssignWorker,
  recommendedWorkerId
}: { 
  order: Order
  onAdvance: () => void
  onCancel: () => void
  onPing: (id: string) => void
  updatingId: string | null
  pingingId: string | null
  elapsedTime: string
  formatCustomization: (cust: any) => string
  workersList?: any[]
  onAssignWorker: (orderId: string, workerId: string) => void
  recommendedWorkerId?: string | null
}) {
  const isUpdating = updatingId === order.id
  const isPinging = pingingId === order.id

  const getActionLabel = () => {
    switch (order.status) {
      case 'RECEIVED': return '☕ Start Brew'
      case 'BREWING':  return '✨ Mark Ready'
      case 'READY':    return order.orderType === 'DELIVERY' ? '🛵 Out for Delivery' : '🌿 Complete / Deliver'
      case 'OUT_FOR_DELIVERY': return '🏁 Complete Delivery'
      default:         return '→ Advance'
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(168, 197, 160, 0.12)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'border 0.2s ease',
        position: 'relative'
      }}
    >
      {/* Elapsed time and table badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--sage)' }}>
          ⏱️ {elapsedTime}
        </span>
        
        {order.orderType === 'DINE_IN' ? (
          <span style={{
            background: 'rgba(123, 196, 127, 0.15)',
            border: '1px solid rgba(123, 196, 127, 0.4)',
            color: 'var(--mint)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            fontWeight: 800,
            boxShadow: '0 0 10px rgba(123,196,127,0.1)'
          }}>
            📍 Table {order.tableNumber || 'Takeaway'}
          </span>
        ) : (
          <span style={{
            background: 'rgba(232, 168, 78, 0.12)',
            border: '1px solid rgba(232, 168, 78, 0.3)',
            color: 'var(--amber)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            fontWeight: 800
          }}>
            🚗 Delivery
          </span>
        )}
      </div>

      {/* Order info */}
      <div>
        <h5 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--cream)', display: 'flex', justifyContent: 'space-between' }}>
          <span>#{order.id.slice(-6).toUpperCase()}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--mint)' }}>{formatPrice(order.totalAmount)}</span>
        </h5>
        <p style={{ fontSize: '0.8rem', color: 'var(--sage)', marginTop: 2 }}>
          Customer: <strong>{order.customerName || order.user?.name || 'Guest'}</strong>
        </p>

        {order.orderType === 'DELIVERY' && (order.status === 'READY' || order.status === 'OUT_FOR_DELIVERY') && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--sage)', fontWeight: 600 }}>
              🛵 Delivery Worker:
            </label>
            <select
              value={order.deliveryUserId || order.deliveryUser?.id || ''}
              onChange={(e) => onAssignWorker(order.id, e.target.value)}
              disabled={isUpdating}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                color: '#fff',
                fontSize: '0.8rem',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              <option value="">-- Assign Delivery Staff --</option>
              {workersList
                .filter((w) => w.isAvailable || w.id === order.deliveryUserId)
                .map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name} ({worker.phone || 'No Phone'}){worker.id === recommendedWorkerId ? ' ★ Recommended' : ''}
                  </option>
                ))}
            </select>
          </div>
        )}

        {order.orderType === 'DELIVERY' && order.deliveryUser && (
          <div style={{ marginTop: 6, padding: '6px 8px', background: 'rgba(74, 140, 63, 0.1)', border: '1px solid rgba(74, 140, 63, 0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', color: 'var(--mint)' }}>
            🛵 Assigned: <strong>{order.deliveryUser.name}</strong> {order.deliveryUser.phone ? `(${order.deliveryUser.phone})` : ''}
          </div>
        )}
      </div>

      {/* Items queue */}
      <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {order.items.map((item, idx) => (
            <div key={idx} style={{ fontSize: '0.82rem', paddingBottom: idx !== order.items.length - 1 ? 6 : 0, borderBottom: idx !== order.items.length - 1 ? '1px dashed rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.product.name}</span>
                <strong style={{ color: 'var(--mint)' }}>×{item.quantity}</strong>
              </div>
              {item.customizations && Object.keys(item.customizations).length > 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--amber)', marginTop: 2, background: 'rgba(200,135,58,0.05)', padding: '2px 6px', borderRadius: 2, borderLeft: '2px solid var(--gold)' }}>
                  {formatCustomization(item.customizations)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notes box */}
      {order.notes && (
        <div style={{ fontSize: '0.75rem', padding: '6px 8px', background: 'rgba(200,135,58,0.08)', borderLeft: '2px solid var(--gold)', color: 'var(--cream)', borderRadius: 2 }}>
          📝 {order.notes}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        
        {/* Status transition button */}
        <button
          onClick={onAdvance}
          disabled={isUpdating}
          style={{
            flex: 1,
            background: 'var(--forest)',
            border: '1px solid var(--leaf)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            color: 'var(--cream)',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.2s',
            textAlign: 'center',
            minWidth: 100
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--leaf)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--forest)'}
        >
          {isUpdating ? 'Updating...' : getActionLabel()}
        </button>

        {/* Ready buzzer buttons */}
        {order.status === 'READY' && (
          <button
            onClick={() => onPing(order.id)}
            disabled={isPinging}
            title="Ping customer at counter"
            style={{
              background: 'rgba(200,135,58,0.2)',
              border: '1px solid rgba(200,135,58,0.4)',
              color: 'var(--amber)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            📣 {isPinging ? '...' : 'Ping'}
          </button>
        )}

        {/* Cancel option */}
        <button
          onClick={onCancel}
          disabled={isUpdating}
          title="Cancel order"
          style={{
            background: 'rgba(229,57,53,0.1)',
            border: '1px solid rgba(229,57,53,0.2)',
            color: '#ef5350',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

    </motion.div>
  )
}

interface ChartItem {
  label: string
  revenue: number
  count: number
}

function RevenueChart({ view, data }: { view: 'monthly' | 'daily' | 'hourly' | 'dayOfWeek'; data: any }) {
  let chartData: ChartItem[] = []

  if (view === 'monthly') {
    chartData = (data.byMonth || []).map((m: any) => ({
      label: m.month,
      revenue: m.revenue,
      count: m.count
    }))
  } else if (view === 'daily') {
    chartData = (data.byDay || []).map((d: any) => ({
      label: d.date,
      revenue: d.revenue,
      count: d.count
    }))
  } else if (view === 'hourly') {
    chartData = (data.byHour || []).map((h: any) => ({
      label: `${h.hour}:00`,
      revenue: h.revenue,
      count: h.count
    }))
  } else if (view === 'dayOfWeek') {
    chartData = (data.byDayOfWeek || []).map((dw: any) => ({
      label: dw.day,
      revenue: dw.revenue,
      count: dw.count
    }))
  }

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1)

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'flex-end', gap: view === 'daily' ? '4px' : '12px', paddingBottom: 24, overflowX: 'auto' }} className="custom-chart-scrollbar">
      {chartData.map((bar, i) => {
        const percentage = (bar.revenue / maxRevenue) * 100
        const barHeight = bar.revenue > 0 ? Math.max(percentage, 4) : 0

        return (
          <div
            key={i}
            className="chart-bar-container"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              height: '100%',
              justifyContent: 'flex-end',
              minWidth: view === 'daily' ? 18 : 45,
              position: 'relative'
            }}
          >
            <div className="chart-bar-tooltip" style={{ pointerEvents: 'none' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--mint)', marginBottom: 2 }}>{bar.label}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{formatPrice(bar.revenue)}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{bar.count} order{bar.count !== 1 ? 's' : ''}</div>
            </div>

            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${barHeight}%` }}
              transition={{ duration: 0.5, delay: i * (view === 'daily' ? 0.012 : 0.025), ease: 'easeOut' }}
              style={{
                width: '100%',
                background: 'linear-gradient(to top, rgba(74, 140, 63, 0.4) 0%, rgba(123, 196, 127, 0.85) 100%)',
                borderRadius: '4px 4px 0 0',
                border: '1px solid rgba(123, 196, 127, 0.3)',
                cursor: 'pointer',
                transition: 'background 0.2s, border-color 0.2s',
                boxShadow: bar.revenue > 0 ? '0 0 10px rgba(123, 196, 127, 0.15)' : 'none'
              }}
              whileHover={{ 
                background: 'linear-gradient(to top, rgba(74, 140, 63, 0.65) 0%, rgba(123, 196, 127, 1) 100%)',
                borderColor: 'var(--mint)',
                boxShadow: '0 0 15px rgba(123, 196, 127, 0.4)'
              }}
            />

            <div
              style={{
                fontSize: view === 'daily' ? '0.65rem' : '0.75rem',
                color: 'var(--sage)',
                marginTop: 8,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                transform: view === 'daily' ? 'rotate(-45deg) translate(-5px, 2px)' : 'none',
                height: view === 'daily' ? 24 : 'auto'
              }}
            >
              {view === 'daily' ? bar.label.split(' ')[0] : bar.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
