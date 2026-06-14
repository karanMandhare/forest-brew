'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !subject || !message) {
      setErrorMsg('Please fill in all fields.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, subject, message }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setName('')
        setEmail('')
        setSubject('')
        setMessage('')
      } else {
        setErrorMsg(data.error || 'Failed to send message. Please try again.')
        setStatus('error')
      }
    } catch (err) {
      setErrorMsg('A network error occurred. Please check your connection and try again.')
      setStatus('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #071208 0%, #0d2012 100%)',
      color: '#fff',
      padding: '120px 24px 80px 24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Blur Orbs */}
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '-10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(123,196,127,0.1) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '-10%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(39,94,56,0.15) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <span style={{ 
            color: 'var(--mint)', 
            fontSize: '0.85rem', 
            fontWeight: 700, 
            letterSpacing: '0.2em', 
            textTransform: 'uppercase'
          }}>
            Connect With Us
          </span>
          <h1 style={{ 
            fontFamily: 'var(--font-playfair), Georgia, serif', 
            fontSize: '3.5rem', 
            fontWeight: 700, 
            marginTop: '10px',
            color: '#fff',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            Reach Out Under The Canopy
          </h1>
          <p style={{ 
            color: 'var(--sage)', 
            maxWidth: '600px', 
            margin: '15px auto 0 auto', 
            lineHeight: 1.6,
            fontSize: '1.05rem' 
          }}>
            Have questions about our single-origin roasts, table reservations, or just want to talk coffee? Drop us a line and our team will get back to you.
          </p>
        </motion.div>

        {/* Content Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '40px',
          alignItems: 'start'
        }}>
          {/* Contact Details Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              background: 'linear-gradient(145deg, rgba(20,45,26,0.5), rgba(10,24,14,0.3))',
              border: '1px solid rgba(123,196,127,0.15)',
              borderRadius: '24px',
              padding: '40px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ 
              fontFamily: 'var(--font-playfair), Georgia, serif', 
              fontSize: '1.8rem', 
              marginBottom: '25px',
              color: 'var(--mint)' 
            }}>
              Forest Brew Roastery
            </h3>

            {/* Address */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '1.5rem', color: 'var(--mint)' }}>📍</div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700 }}>Our Sanctuary</h4>
                <p style={{ margin: 0, color: 'var(--sage)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Plot 28, Canopy Lane, Forest Park Road,<br />
                  Koregaon Park, Pune - 411001, India
                </p>
              </div>
            </div>

            {/* Hours */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '1.5rem', color: 'var(--mint)' }}>⏰</div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700 }}>Brewing Hours</h4>
                <p style={{ margin: 0, color: 'var(--sage)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Monday – Friday: 7:00 AM – 9:00 PM<br />
                  Saturday – Sunday: 6:00 AM – 10:00 PM
                </p>
              </div>
            </div>

            {/* Phone & Email */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '30px' }}>
              <div style={{ fontSize: '1.5rem', color: 'var(--mint)' }}>📞</div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700 }}>Contact Info</h4>
                <p style={{ margin: 0, color: 'var(--sage)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Phone: +91 20 2567 8900<br />
                  Email: hello@forestbrew.in
                </p>
              </div>
            </div>

            {/* Map Frame */}
            <div style={{
              borderRadius: '16px',
              overflow: 'hidden',
              height: '220px',
              border: '1px solid rgba(123,196,127,0.1)'
            }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3782.3887019846664!2d73.88720817598858!3d18.556534267866572!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2c114f6b0f023%3A0xc3e659424d55b0a!2sKoregaon%20Park%20Plaza!5e0!3m2!1sen!2sin!4v1718370000000!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </motion.div>

          {/* Contact Form Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              background: 'linear-gradient(145deg, rgba(20,45,26,0.5), rgba(10,24,14,0.3))',
              border: '1px solid rgba(123,196,127,0.15)',
              borderRadius: '24px',
              padding: '40px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ 
              fontFamily: 'var(--font-playfair), Georgia, serif', 
              fontSize: '1.8rem', 
              marginBottom: '25px',
              color: 'var(--mint)' 
            }}>
              Send A Message
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sage)' }}>Your Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Karan"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(123,196,127,0.2)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s'
                  }}
                  className="input-focus-ring"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sage)' }}>Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@example.com"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(123,196,127,0.2)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s'
                  }}
                  className="input-focus-ring"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sage)' }}>Subject</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What is this regarding?"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(123,196,127,0.2)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s'
                  }}
                  className="input-focus-ring"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sage)' }}>Message</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message here..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(123,196,127,0.2)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    transition: 'all 0.3s'
                  }}
                  className="input-focus-ring"
                />
              </div>

              <AnimatePresence mode="wait">
                {status === 'success' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ 
                      color: 'var(--mint)', 
                      fontSize: '0.85rem', 
                      background: 'rgba(123,196,127,0.1)', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(123,196,127,0.2)' 
                    }}
                  >
                    ✓ Message sent successfully! We will get back to you shortly.
                  </motion.div>
                )}

                {status === 'error' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ 
                      color: '#feb2b2', 
                      fontSize: '0.85rem', 
                      background: 'rgba(229,62,62,0.1)', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(229,62,62,0.2)' 
                    }}
                  >
                    ⚠️ {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit" 
                disabled={status === 'submitting'}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--mint)',
                  color: '#071208',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: status === 'submitting' ? 'default' : 'pointer',
                  opacity: status === 'submitting' ? 0.7 : 1,
                  transition: 'transform 0.2s, background 0.3s',
                  boxShadow: '0 4px 15px rgba(123,196,127,0.3)'
                }}
                className="btn-hover-scale"
              >
                {status === 'submitting' ? 'Sending Message...' : 'Send Message'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
