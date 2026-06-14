'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatMessage {
  id: string
  userId: string
  senderId: string
  senderRole: string
  message: string
  createdAt: string
}

export function SupportChat() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const user = session?.user as { id?: string; role?: string } | undefined
  const userId = user?.id
  const userRole = user?.role

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch initial chat history
  useEffect(() => {
    if (!isOpen || !userId || userRole === 'ADMIN' || userRole === 'DELIVERY') return

    async function fetchMessages() {
      try {
        const res = await fetch('/api/support/chat')
        if (res.ok) {
          const contentType = res.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json()
            setMessages(data)
          }
        }
      } catch (err) {
        console.error('Failed to fetch support chat history:', err)
      }
    }

    fetchMessages()
  }, [isOpen, userId, userRole])

  // Setup EventSource for real-time messages
  useEffect(() => {
    if (!userId) return

    const eventSource = new EventSource('/api/notifications/stream', { withCredentials: true })

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'support_chat' && data.userId === userId) {
          const msg = data.message
          // Only add if it's not already in the list
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
      } catch (err) {
        console.error('Error parsing SSE in support chat:', err)
      }
    }

    return () => {
      eventSource.close()
    }
  }, [userId])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !userId) return

    const text = inputValue.trim()
    setInputValue('')
    setLoading(true)

    // Optimistic message
    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      userId,
      senderId: userId,
      senderRole: 'USER',
      message: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (res.ok) {
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const saved = await res.json()
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? saved : m))
          )
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setLoading(false)
    }
  }

  // Skip SSR to prevent hydration mismatches
  if (!mounted) {
    return null
  }

  if (userRole === 'ADMIN' || userRole === 'DELIVERY') {
    return null
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, fontFamily: 'var(--font-nunito)' }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              width: 340,
              height: 460,
              background: 'rgba(30, 48, 38, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(168, 197, 160, 0.25)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            {/* Header */}
            <div
              style={{
                background: 'var(--forest)',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(168, 197, 160, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4caf50' }} />
                <div>
                  <h4 style={{ margin: 0, color: 'white', fontSize: '0.9rem', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
                    Forest Brew Support
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>Replies instantly</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Chat Body */}
            <div
              style={{
                flex: 1,
                padding: '16px 20px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {!userId ? (
                <div style={{ textAlign: 'center', color: 'var(--text-soft)', fontSize: '0.8rem', margin: 'auto 0' }}>
                  <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 8 }}>🔒</span>
                  <p style={{ margin: 0, color: 'white', fontWeight: 600 }}>Sign in to Chat</p>
                  <p style={{ fontSize: '0.72rem', marginTop: 4 }}>Please log in to chat with our baristas and support team.</p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-soft)', fontSize: '0.8rem', margin: 'auto 0', padding: 20 }}>
                  <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 8 }}>🌱</span>
                  <p style={{ margin: 0, color: 'white', fontWeight: 600 }}>Hello! How can we help?</p>
                  <p style={{ fontSize: '0.72rem', marginTop: 4 }}>Ask us about your order, our source beans, or special requests!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === userId
                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                      }}
                    >
                      <div
                        style={{
                          background: isMe ? 'var(--forest)' : 'rgba(255,255,255,0.06)',
                          color: 'white',
                          padding: '8px 12px',
                          borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          fontSize: '0.8rem',
                          lineHeight: 1.4,
                          border: isMe ? 'none' : '1px solid rgba(168, 197, 160, 0.15)',
                        }}
                      >
                        {msg.message}
                      </div>
                      <span
                        style={{
                          fontSize: '0.6rem',
                          color: 'var(--text-soft)',
                          display: 'block',
                          textAlign: isMe ? 'right' : 'left',
                          marginTop: 4,
                        }}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                })
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Input Form */}
            {userId && (
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(168, 197, 160, 0.2)',
                  display: 'flex',
                  gap: 8,
                  background: 'rgba(0,0,0,0.1)',
                }}
              >
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(168, 197, 160, 0.2)',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    color: 'white',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !inputValue.trim()}
                  style={{
                    background: 'var(--forest)',
                    border: 'none',
                    color: 'white',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    opacity: inputValue.trim() ? 1 : 0.6,
                    transition: 'opacity 0.2s',
                  }}
                >
                  ➤
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        style={{
          background: 'var(--forest)',
          border: '1px solid rgba(168, 197, 160, 0.3)',
          borderRadius: '50%',
          width: 56,
          height: 56,
          color: 'white',
          fontSize: '1.45rem',
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-end',
          marginLeft: 'auto',
        }}
        aria-label="Contact Customer Support"
      >
        {isOpen ? '✕' : '💬'}
      </motion.button>
    </div>
  )
}
