'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const quotes = [
  {
    text: 'Coffee and love — both best when shared in the quiet warmth of a morning, with nowhere else to be.',
    author: 'Sofia & Arjun',
    sub: 'Regular guests · Table by the fern',
    icon: '🌸', iconClass: 'q-icon-w', leaf: '🍃',
  },
  {
    text: 'Hold my hand the way the forest holds the rain — gently, completely, with no intention of letting go before the storm has passed.',
    author: 'Forest Brew',
    sub: 'Our quiet philosophy',
    icon: '🌿', iconClass: 'q-icon-n', leaf: '🌿',
  },
  {
    text: 'You are the foam in my morning latte — light, warm, impossibly soft, and the very best part of waking up.',
    author: 'Priya to Rohan',
    sub: 'A love note left on a napkin',
    icon: '☕', iconClass: 'q-icon-m', leaf: '🌺',
  },
  {
    text: 'Some love stories begin with a glance across the room. Ours began over a shared cup, under the canopy of old oaks, on a rainy Tuesday.',
    author: 'Meera & Dev',
    sub: 'Together since 2021, here since day one',
    icon: '💚', iconClass: 'q-icon-w', leaf: '💚',
  },
  {
    text: 'The best conversations happen between the first sip and the last — say everything you need to, right here, in this warm quiet space.',
    author: 'Forest Brew',
    sub: 'A gentle reminder to slow down',
    icon: '🌱', iconClass: 'q-icon-g', leaf: '🌾',
  },
  {
    text: 'Like roots beneath the earth — invisible, deep, unshakeable, and always reaching toward each other. That is how I love you, quietly and completely.',
    author: 'Kavya to Mihir',
    sub: 'Written on our café wall, forever',
    icon: '🌳', iconClass: 'q-icon-m', leaf: '🌳',
  },
]

export function QuotesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    gsap.from('.quote-card', {
      opacity: 0,
      y: 50,
      stagger: 0.12,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.quotes-grid',
        start: 'top 82%',
      },
    })
    gsap.from('.quotes-center', {
      opacity: 0,
      y: 40,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.quotes-center',
        start: 'top 85%',
      },
    })
  }, { scope: sectionRef })

  return (
    <section id="quotes" ref={sectionRef}>
      {/* Background leaf decoration */}
      <div className="quotes-bg-leaves" aria-hidden>
        {['🍃','🌿','🍂','🌱','🍃','🌾'].map((leaf, i) => (
          <span key={i} className={`qbl qbl-${i+1}`}>{leaf}</span>
        ))}
      </div>

      <div className="quotes-inner">
        <div className="quotes-center">
          <div className="section-label" style={{ justifyContent: 'center' }}>
            <div className="section-label-line"/>
            <span>Love &amp; Coffee</span>
            <div className="section-label-line"/>
          </div>
          <h2 className="quotes-h2">
            Words as Warm as<br/><em>Your Morning Cup</em>
          </h2>
          <p className="quotes-lead">
            Some of the most beautiful things in life cannot be rushed — love, coffee, and the quiet in between.
          </p>
        </div>

        <div className="quotes-grid">
          {quotes.map((q, i) => (
            <motion.div
              key={i}
              className="quote-card"
              whileHover={{ y: -10, scale: 1.02 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <div className="q-accent-leaf">{q.leaf}</div>
              <div className="q-mark">&ldquo;</div>
              <p className="q-text">{q.text}</p>
              <div className="q-meta">
                <div className={`q-icon ${q.iconClass}`}>{q.icon}</div>
                <div>
                  <div className="q-author">{q.author}</div>
                  <div className="q-sub">{q.sub}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
