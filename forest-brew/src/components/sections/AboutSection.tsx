'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    // Photos parallax
    gsap.from('.about-photo-main', {
      x: -60, opacity: 0, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: '.about-inner', start: 'top 78%' },
    })
    gsap.from('.about-photo-sec', {
      x: 60, opacity: 0, duration: 1.1, delay: 0.15, ease: 'power3.out',
      scrollTrigger: { trigger: '.about-inner', start: 'top 78%' },
    })
    gsap.from('.about-stat-badge', {
      scale: 0.7, opacity: 0, duration: 0.7, delay: 0.4, ease: 'back.out(2)',
      scrollTrigger: { trigger: '.about-inner', start: 'top 78%' },
    })
    // Text reveals
    gsap.from('.about-text > *', {
      y: 40, opacity: 0, stagger: 0.12, duration: 0.85, ease: 'power3.out',
      scrollTrigger: { trigger: '.about-text', start: 'top 80%' },
    })
    // Stats counter
    gsap.utils.toArray<HTMLElement>('.stat-cell-n').forEach(el => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        onEnter: () => {
          el.style.opacity = '0'
          gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
        },
      })
    })
  }, { scope: sectionRef })

  return (
    <section id="about" ref={sectionRef}>
      <div className="about-bg-photo" aria-hidden />
      <div className="about-overlay" aria-hidden />
      <div className="about-leaf-deco about-leaf-1" aria-hidden>🌿</div>
      <div className="about-leaf-deco about-leaf-2" aria-hidden>🍃</div>

      <div className="about-inner">
        {/* Photos */}
        <div className="about-photos">
          <div className="about-photo-main">
            <img
              src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=75"
              alt="Barista crafting coffee"
              loading="lazy"
            />
          </div>
          <div className="about-photo-sec">
            <img
              src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=75"
              alt="Espresso pour"
              loading="lazy"
            />
          </div>
          <div className="about-stat-badge">
            <div className="about-stat-n">8+</div>
            <div className="about-stat-l">Farm Partners</div>
          </div>
          <div style={{ position: 'absolute', bottom: '16%', right: '2%', fontSize: '2rem', animation: 'floatUp 5s ease-in-out infinite', zIndex: 4 }} aria-hidden>🌱</div>
        </div>

        {/* Text */}
        <div className="about-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 32, height: 2, background: 'var(--mint)', borderRadius: 2 }}/>
            <span style={{ color: 'var(--mint)', fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>
              Our Roots
            </span>
          </div>
          <h2 className="about-h2">
            Born From the<br/><em>Forest Floor</em>
          </h2>
          <p className="about-p">
            Every bean we roast carries the memory of altitude, rainfall, and volcanic soil. We source exclusively from family-run forest farms where shade-grown trees tower above the coffee plants like quiet, watchful guardians.
          </p>
          <p className="about-p">
            Forest Brew is not just a café — it is a living ecosystem. Our walls breathe with living moss panels, our light filters through canopies of hanging fern, and every cup honours the land that made it possible.
          </p>

          <div className="about-stats-row">
            <div className="stat-cell">
              <div className="stat-cell-n">8+</div>
              <div className="stat-cell-l">Farm Partners</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell-n">100%</div>
              <div className="stat-cell-l">Shade Grown</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell-n">Zero</div>
              <div className="stat-cell-l">Waste Policy</div>
            </div>
          </div>

          <ul className="values-list">
            <li><div className="v-dot"/>Single-origin beans sourced directly from growers</li>
            <li><div className="v-dot"/>Compostable packaging, reusable cups encouraged</li>
            <li><div className="v-dot"/>Living wall ecosystem inside every branch</li>
            <li><div className="v-dot"/>10% of profits fund agroforestry restoration</li>
          </ul>

          <a href="#visit" className="btn-primary" style={{ display: 'inline-block' }}>
            🌳 Visit the Garden
          </a>
        </div>
      </div>
    </section>
  )
}
