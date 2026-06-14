'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface VideoPlaylist {
  id: string
  title: string
  emoji: string
  description: string
  src: string
  aspect: 'landscape' | 'portrait'
  theme: 'harvest' | 'grind' | 'extraction' | 'foam' | 'chill'
}

const VIDEOS_PLAYLIST: VideoPlaylist[] = [
  {
    id: 'harvest',
    title: '🌿 Canopy Harvest',
    emoji: '🌿',
    description: 'Step into our sun-dappled shade-grown farms in India. Hand-picking the perfect, vibrant cherries from organic coffea plants.',
    src: 'https://videos.pexels.com/video-files/7121117/7121117-hd_1920_1080_25fps.mp4',
    aspect: 'landscape',
    theme: 'harvest'
  },
  {
    id: 'grind',
    title: '🪵 Roast & Grind',
    emoji: '🪵',
    description: 'The golden ground beans are tightly packed into our premium portafilter, capturing a perfectly dense, aromatic extraction base.',
    src: 'https://videos.pexels.com/video-files/32653727/13922593_1080_1920_60fps.mp4',
    aspect: 'portrait',
    theme: 'grind'
  },
  {
    id: 'extraction',
    title: '☕ Sacred Extraction',
    emoji: '☕',
    description: 'Watch the thick, hazelnut-toned crema flow down under high pressure. The hot extraction releasing single-origin honeyed undertones.',
    src: 'https://videos.pexels.com/video-files/7118140/7118140-hd_1920_1080_25fps.mp4',
    aspect: 'landscape',
    theme: 'extraction'
  },
  {
    id: 'foam',
    title: '🥛 Velvet Foam',
    emoji: '🥛',
    description: 'Witness our barista expertly texturizing cold organic milk into a velvety, micro-foam cream, perfect for pouring intricate latte art.',
    src: 'https://videos.pexels.com/video-files/34505178/14619690_1080_1920_30fps.mp4',
    aspect: 'portrait',
    theme: 'foam'
  },
  {
    id: 'chill',
    title: '❄️ Chill Fusion',
    emoji: '❄️',
    description: 'Pouring hot espresso shot over crystal ice and milk, crafting our layered signature forest iced coffee drink.',
    src: 'https://videos.pexels.com/video-files/34506437/14620410_1080_1920_30fps.mp4',
    aspect: 'portrait',
    theme: 'chill'
  }
]

const FIREFLIES = Array.from({ length: 18 }).map((_, idx) => {
  const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }
  const seed = idx * 5
  return {
    id: idx,
    left: `${pseudoRandom(seed + 1) * 100}%`,
    top: `${pseudoRandom(seed + 2) * 85 + 10}%`,
    size: `${pseudoRandom(seed + 3) * 7 + 4}px`,
    delay: `${pseudoRandom(seed + 4) * -15}s`,
    duration: `${pseudoRandom(seed + 5) * 12 + 10}s`
  }
})

export function VideoSection() {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const backdropVideoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeVideo = VIDEOS_PLAYLIST[activeVideoIndex]

  const handleSelectVideo = (index: number) => {
    setActiveVideoIndex(index)
    setIsPlaying(false)
    setProgress(0)
  }

  const handleNext = () => {
    setActiveVideoIndex((prev) => (prev + 1) % VIDEOS_PLAYLIST.length)
    setIsPlaying(false)
    setProgress(0)
  }

  const handlePrev = () => {
    setActiveVideoIndex((prev) => (prev - 1 + VIDEOS_PLAYLIST.length) % VIDEOS_PLAYLIST.length)
    setIsPlaying(false)
    setProgress(0)
  }

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      backdropVideoRef.current?.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true)
        backdropVideoRef.current?.play().catch(() => {})
      }).catch(err => console.error('Play request failed:', err))
    }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    if (backdropVideoRef.current) {
      backdropVideoRef.current.muted = true // Backdrop must always remain muted!
    }
    setIsMuted(!isMuted)
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    const current = videoRef.current.currentTime
    const duration = videoRef.current.duration
    if (duration > 0) {
      setProgress((current / duration) * 100)
    }
  }

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const container = e.currentTarget
    const rect = container.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = clickX / rect.width
    if (videoRef.current && videoRef.current.duration > 0) {
      const newTime = percent * videoRef.current.duration
      videoRef.current.currentTime = newTime
      if (backdropVideoRef.current) {
        backdropVideoRef.current.currentTime = newTime
      }
      setProgress(percent * 100)
    }
  }

  // Handle card hover-loops for inactive slides
  const handleCardMouseEnter = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    video.play().catch(() => {})
  }

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    video.pause()
  }

  // Synchronize playing states and time updates
  useEffect(() => {
    const video = videoRef.current
    const backdrop = backdropVideoRef.current
    if (!video) return

    const handlePlay = () => {
      setIsPlaying(true)
      backdrop?.play().catch(() => {})
    }
    const handlePause = () => {
      setIsPlaying(false)
      backdrop?.pause()
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    // Sync current times occasionally
    const syncVideos = () => {
      if (backdrop && Math.abs(video.currentTime - backdrop.currentTime) > 0.35) {
        backdrop.currentTime = video.currentTime
      }
    }
    video.addEventListener('timeupdate', syncVideos)

    // Autoplay active video on load
    const startAutoplay = () => {
      video.play().then(() => {
        setIsPlaying(true)
        backdrop?.play().catch(() => {})
      }).catch(() => {
        setIsPlaying(false)
      })
    }

    startAutoplay()

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', syncVideos)
    }
  }, [activeVideoIndex])

  // GSAP reveal animations
  useGSAP(() => {
    gsap.from('.video-header .gsap-reveal', {
      opacity: 0,
      y: 40,
      stagger: 0.15,
      duration: 0.85,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.video-header',
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    })

    gsap.from('.video-slider-viewport', {
      opacity: 0,
      y: 55,
      duration: 0.95,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.video-slider-viewport',
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    })
  }, { scope: containerRef })

  return (
    <section id="video-section" ref={containerRef}>
      {/* Twinkling Forest Fireflies Background */}
     <div className="fireflies-container">
  {FIREFLIES.map((ff) => (
    <div
      key={ff.id}
      className="firefly"
      suppressHydrationWarning
      style={{
        left: ff.left,
        top: ff.top,
        width: ff.size,
        height: ff.size,
        animationDelay: ff.delay,
        animationDuration: ff.duration
      }}
    >
      {/* Any internal firefly elements go here */}
    </div>
  ))}
</div>


      {/* Floating leaves decorations */}
      <span className="v-leaf v-leaf-1">🍃</span>
      <span className="v-leaf v-leaf-2">🌿</span>

      <div className="video-inner">
        <div className="video-header">
          <div className="section-label gsap-reveal" style={{ justifyContent: 'center' }}>
            <div className="section-label-line" />
            <span>Behind the Brew</span>
            <div className="section-label-line" />
          </div>
          <h2 className="video-h2 gsap-reveal">
            The Brewing <em>Ritual</em>
          </h2>
          <p className="video-lead gsap-reveal">
            Step inside our cozy forest sanctuary. Slide through the 5 steps of our sacred coffee ritual, and witness the journey from sun-dappled shade farms to your warm cup.
          </p>
        </div>

        {/* 3D Glassy Slider Viewport */}
        <div className="video-slider-viewport">
          {/* Navigation Arrows */}
          <button
            type="button"
            className="slider-arrow arrow-prev"
            onClick={handlePrev}
            aria-label="Previous Ritual"
          >
            ‹
          </button>
          <button
            type="button"
            className="slider-arrow arrow-next"
            onClick={handleNext}
            aria-label="Next Ritual"
          >
            ›
          </button>

          {/* Slider Track with robust translation math */}
          <div
            className="video-slider-track"
            style={{
              transform: `translateX(calc(50% - ${(activeVideoIndex + 0.5)} * var(--card-width) - ${activeVideoIndex} * var(--card-gap)))`
            }}
          >
            {VIDEOS_PLAYLIST.map((vid, idx) => {
              const isActive = idx === activeVideoIndex
              const isPortrait = vid.aspect === 'portrait'
              const theme = vid.theme

              return (
                <div
                  key={vid.id}
                  className={`video-slider-card ${isActive ? 'active' : 'inactive'} aspect-landscape`}
                  onClick={() => {
                    if (!isActive) handleSelectVideo(idx)
                  }}
                >
                  <div className="card-glass-frame">
                    {/* Synchronized Blurred Video Reflection Backdrop for Portrait streams */}
                    {isPortrait && (
                      <div className="video-backdrop-wrapper">
                        {isActive ? (
                          <video
                            ref={backdropVideoRef}
                            key={`backdrop-${vid.src}`}
                            src={vid.src}
                            className="video-backdrop-blur"
                            loop
                            playsInline
                            muted
                          />
                        ) : (
                          <div className="video-backdrop-placeholder" />
                        )}
                      </div>
                    )}

                    {/* Active Theme Particle Overlays */}
                    {isActive && (
                      <div className="video-theme-overlay">
                        {theme === 'harvest' && (
                          <>
                            <div className="theme-leaf theme-leaf-1">🍃</div>
                            <div className="theme-leaf theme-leaf-2">🌿</div>
                            <div className="theme-leaf theme-leaf-3">🍃</div>
                          </>
                        )}
                        {theme === 'grind' && (
                          <>
                            <div className="theme-bean theme-bean-1">☕</div>
                            <div className="theme-bean theme-bean-2">🫘</div>
                            <div className="theme-bean theme-bean-3">☕</div>
                          </>
                        )}
                        {theme === 'extraction' && (
                          <>
                            <div className="theme-steam-ring theme-steam-1" />
                            <div className="theme-steam-ring theme-steam-2" />
                            <div className="theme-steam-ring theme-steam-3" />
                          </>
                        )}
                        {theme === 'foam' && (
                          <>
                            <div className="theme-froth-bubble theme-froth-1" />
                            <div className="theme-froth-bubble theme-froth-2" />
                            <div className="theme-froth-bubble theme-froth-3" />
                          </>
                        )}
                        {theme === 'chill' && (
                          <>
                            <div className="theme-frost theme-frost-1">❄️</div>
                            <div className="theme-frost theme-frost-2">✨</div>
                            <div className="theme-frost theme-frost-3">❄️</div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Video Stream Element */}
                    {isActive ? (
                      <video
                        ref={videoRef}
                        key={vid.src}
                        src={vid.src}
                        loop
                        playsInline
                        muted={isMuted}
                        onTimeUpdate={handleTimeUpdate}
                        className={`main-branding-video ${isPortrait ? 'contain-video' : 'cover-video'}`}
                      />
                    ) : (
                      <video
                        src={vid.src}
                        loop
                        playsInline
                        muted
                        preload="metadata"
                        onMouseEnter={handleCardMouseEnter}
                        onMouseLeave={handleCardMouseLeave}
                        className={`main-branding-video teaser-video ${isPortrait ? 'contain-video' : 'cover-video'}`}
                      />
                    )}

                    {/* Glassy Frosted Blur Cover for Inactive Cards */}
                    {!isActive && (
                      <div className="inactive-frosted-overlay">
                        <div className="inactive-peek-info">
                          <span className="peek-emoji">{vid.emoji}</span>
                          <span className="peek-title">{vid.title}</span>
                          <span className="peek-prompt">Click to play</span>
                        </div>
                      </div>
                    )}

                    {/* Gradient Overlay for active card to make controls pop */}
                    {isActive && <div className="video-overlay" />}

                    {/* Floating Play/Pause Button on Active Card */}
                    {isActive && (
                      <div
                        className={`video-play-overlay-btn ${isPlaying ? 'playing' : 'paused'}`}
                        onClick={togglePlay}
                      >
                        <div className="play-icon-wrap">
                          {isPlaying ? (
                            <svg className="ctrl-svg" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="6" y="4" width="4" height="16" rx="1.5" />
                              <rect x="14" y="4" width="4" height="16" rx="1.5" />
                            </svg>
                          ) : (
                            <svg className="ctrl-svg" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 4 }}>
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </div>
                        <span className="btn-play-text">{isPlaying ? 'Pause Ritual' : 'Play Ritual'}</span>
                      </div>
                    )}

                    {/* Active Card Progress and Volume Dashboard */}
                    {isActive && (
                      <div className="video-dashboard-controls" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="dashboard-btn"
                          onClick={togglePlay}
                          aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? '⏸' : '▶'}
                        </button>

                        <button
                          type="button"
                          className="dashboard-btn mute-btn"
                          onClick={toggleMute}
                          aria-label={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? '🔇' : '🔊'}
                        </button>

                        <div className="dashboard-progress-container" onClick={handleProgressBarClick}>
                          <div className="dashboard-progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dynamic Ritual Description Display */}
        <div className="video-active-details">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeVideoIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="details-inner"
            >
              <h3 className="active-ritual-title">
                {activeVideo.title}
              </h3>
              <p className="active-ritual-desc">
                {activeVideo.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Premium Frosted Vine Pod Navigation */}
        <div className="video-nature-nav">
          <div className="vine-pod-container">
            {/* Winding organic SVG Vine */}
            <svg className="nav-vine-svg" viewBox="0 0 500 50" fill="none" preserveAspectRatio="none">
              <path
                d="M 20 25 Q 125 10 250 25 T 480 25"
                stroke="rgba(168, 237, 160, 0.2)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 20 25 Q 125 10 250 25 T 480 25"
                className="active-growing-vine"
                stroke="rgba(123, 196, 127, 0.45)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                style={{
                  strokeDasharray: '500',
                  strokeDashoffset: `${500 - (activeVideoIndex / (VIDEOS_PLAYLIST.length - 1)) * 500}`
                }}
              />
              {/* Decorative side leaves branching from vine */}
              <path d="M 85 18 Q 80 5 95 10" stroke="rgba(123, 196, 127, 0.4)" strokeWidth="2" fill="none" />
              <path d="M 210 26 Q 215 38 202 32" stroke="rgba(123, 196, 127, 0.4)" strokeWidth="2" fill="none" />
              <path d="M 330 20 Q 325 5 340 10" stroke="rgba(123, 196, 127, 0.4)" strokeWidth="2" fill="none" />
              <path d="M 430 27 Q 438 39 425 33" stroke="rgba(123, 196, 127, 0.4)" strokeWidth="2" fill="none" />
            </svg>
            
            {/* Sprouting Stepping Stones Indicators */}
            <div className="vine-indicators">
              {VIDEOS_PLAYLIST.map((vid, idx) => {
                const isActive = idx === activeVideoIndex
                return (
                  <button
                    key={vid.id}
                    type="button"
                    className={`vine-indicator-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectVideo(idx)}
                    aria-label={`Show ${vid.title}`}
                  >
                    {/* Glowing Selection Aura */}
                    {isActive && (
                      <motion.div
                        layoutId="activeVineGlow"
                        className="vine-glow-aura"
                        transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                      />
                    )}
                    <span className="indicator-emoji">{vid.emoji}</span>
                    <span className="indicator-label">{vid.title.split(' ').slice(1).join(' ')}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
