'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { BookingModal } from '@/components/ui/BookingModal'

export function FooterSection() {
  const [bookingOpen, setBookingOpen] = useState(false)
  const { data: session } = useSession()
  const isStaff = session?.user && (session.user.role === 'ADMIN' || session.user.role === 'DELIVERY')

  return (
    <>
      <footer id="visit">
        <div className="footer-bg-img" aria-hidden />
        <div className="footer-overlay" aria-hidden />
        <div className="footer-leaf-1" aria-hidden>🌿</div>
        <div className="footer-leaf-2" aria-hidden>🍃</div>

        <div className="footer-inner">
          <div className="footer-grid">
            {/* Brand */}
            <div>
              <div className="footer-logo">🌿 Forest Brew</div>
              <p className="footer-desc">
                Where coffee and nature breathe together. Sustainably sourced, lovingly roasted, always shared between good people.
              </p>
              <div className="footer-socials">
                {['IG','TW','FB','YT'].map(s => (
                  <div key={s} className="soc">{s}</div>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div>
              <div className="footer-h">Hours</div>
              <div className="footer-row"><span>Monday – Friday</span><span>7:00 am – 9:00 pm</span></div>
              <div className="footer-row"><span>Saturday</span><span>8:00 am – 10:30 pm</span></div>
              <div className="footer-row"><span>Sunday</span><span>9:00 am – 8:00 pm</span></div>
              <div style={{ marginTop: 16, fontSize: '0.72rem', color: 'rgba(168,197,160,0.5)', fontStyle: 'italic' }}>
                Kitchen closes 30 min before closing
              </div>
            </div>

            {/* Location */}
            <div>
              <div className="footer-h">Find Us</div>
              <p className="footer-addr">
                12 Canopy Lane<br/>
                Koregaon Park<br/>
                Pune, MH 411001
              </p>
              <div className="footer-contact">
                hello@forestbrew.in<br/>
                +91 20 2600 0000
              </div>
            </div>

            {/* Reserve */}
            <div>
              <div className="footer-h">Reserve a Table</div>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.85, marginBottom: 22, color: 'rgba(253,246,232,0.5)' }}>
                Book the garden terrace or the private brew room for your next special morning. Seats fill fast on weekends.
              </p>
              {isStaff ? (
                <div style={{ fontSize: '0.8rem', color: 'rgba(168,197,160,0.6)', fontStyle: 'italic', border: '1px dashed rgba(168,197,160,0.2)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center', lineHeight: 1.4 }}>
                  🚫 Reservations restricted for staff accounts
                </div>
              ) : (
                <button
                  className="btn-primary"
                  style={{ width: '100%', animation: 'none' }}
                  onClick={() => setBookingOpen(true)}
                >
                  🌸 Book Now
                </button>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="footer-bar">
            <span style={{ color: 'rgba(253,246,232,0.3)' }}>
              © 2026 Forest Brew. All rights reserved. Grown with love.
            </span>
            <span>🌿 Rooted in Nature · Brewed with Heart</span>
          </div>
        </div>
      </footer>

      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  )
}
