'use client'

export function LoveScene() {
  return (
    <section id="love-scene">
      <div className="love-sky-grad" aria-hidden />

      {/* Birds */}
      <div className="love-bird lb1">🐦</div>
      <div className="love-bird lb2">🐦</div>
      <div className="love-bird lb3">🦜</div>

      {/* Falling leaves */}
      {[
        { style: { top: 40, left: '28%', fontSize: '1.4rem', animation: 'leafFall 7s 0s ease-in infinite' } },
        { style: { top: 20, right: '33%', fontSize: '1.1rem', animation: 'leafFall2 8s 2s ease-in infinite' } },
        { style: { top: 55, left: '44%', fontSize: '0.95rem', animation: 'leafFall 6s 1s ease-in infinite' } },
        { style: { top: 10, left: '60%', fontSize: '1.2rem', animation: 'leafFall2 9s 3s ease-in infinite' } },
      ].map((leaf, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 3,
            ...leaf.style,
          }}
        >
          {['🍃','🌿','🍂','🍃'][i]}
        </div>
      ))}

      {/* Background trees SVG */}
      <svg
        className="love-tree-layer"
        height="380"
        viewBox="0 0 1400 380"
        preserveAspectRatio="none"
        aria-hidden
      >
        <g opacity="0.2">
          <polygon points="80,20 125,195 35,195"   fill="#4a8c3f"/>
          <rect x="74" y="193" width="12" height="187" fill="#5c3d1e"/>
          <polygon points="240,30 285,205 195,205"  fill="#558b2f"/>
          <rect x="234" y="203" width="12" height="177" fill="#5c3d1e"/>
          <polygon points="1160,22 1205,197 1115,197" fill="#4a8c3f"/>
          <rect x="1154" y="195" width="12" height="185" fill="#5c3d1e"/>
          <polygon points="1310,35 1355,208 1265,208" fill="#558b2f"/>
          <rect x="1304" y="206" width="12" height="174" fill="#5c3d1e"/>
        </g>
        <g opacity="0.45">
          <polygon points="160,15 215,210 105,210"  fill="#558b2f"/>
          <polygon points="160,72 225,272 95,272"   fill="#689f38"/>
          <rect x="153" y="270" width="14" height="110" fill="#3d2510"/>
          <polygon points="360,25 415,218 305,218"  fill="#4a8c3f"/>
          <polygon points="360,85 425,280 295,280"  fill="#558b2f"/>
          <rect x="353" y="278" width="14" height="102" fill="#3d2510"/>
          <polygon points="1050,20 1105,212 995,212" fill="#4a8c3f"/>
          <polygon points="1050,80 1115,275 985,275" fill="#558b2f"/>
          <rect x="1043" y="273" width="14" height="107" fill="#3d2510"/>
        </g>
        <g opacity="0.65">
          <ellipse cx="60"   cy="370" rx="55" ry="22" fill="#7bc47f"/>
          <ellipse cx="200"  cy="374" rx="42" ry="16" fill="#558b2f"/>
          <ellipse cx="340"  cy="370" rx="50" ry="20" fill="#7bc47f"/>
          <ellipse cx="1060" cy="370" rx="52" ry="21" fill="#7bc47f"/>
          <ellipse cx="1230" cy="374" rx="44" ry="17" fill="#558b2f"/>
          <ellipse cx="1370" cy="370" rx="50" ry="20" fill="#7bc47f"/>
        </g>
      </svg>

      {/* Ground strip */}
      <div aria-hidden style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
        background: 'linear-gradient(180deg,#81c784,#66bb6a)',
        borderRadius: '40% 40% 0 0/20% 20% 0 0', zIndex: 4,
      }}/>
      {/* Flowers on ground */}
      <div aria-hidden style={{
        position: 'absolute', bottom: 68, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 30, zIndex: 5, pointerEvents: 'none',
      }}>
        {['🌸','🌼','🌺','🌸'].map((f, i) => (
          <span key={i} style={{ fontSize: i % 2 === 0 ? '1.2rem' : '1rem', animation: `floatUp${i % 2 === 0 ? '' : '2'} ${3 + i * 0.4}s ease-in-out infinite` }}>{f}</span>
        ))}
      </div>

      <div className="love-inner">
        <h2 className="love-title">
          A Table for Two,<br/><em>Under the Whispering Trees</em>
        </h2>
        <p className="love-sub">
          Some of life&apos;s greatest moments happen over a quiet cup, in perfect company, with nowhere else to be.
        </p>

        {/* Big couple scene */}
        <div className="love-stage">
          {/* Extra hearts */}
          <div aria-hidden style={{ position: 'absolute', top: -90, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 10, width: 120 }}>
            <div style={{ position: 'absolute', left: 10, fontSize: '2rem', animation: 'heartFloat 2.5s ease-out infinite' }}>💚</div>
            <div style={{ position: 'absolute', left: 50, fontSize: '1.5rem', animation: 'heartFloat 2.5s 0.85s ease-out infinite' }}>💛</div>
            <div style={{ position: 'absolute', left: 30, fontSize: '1.1rem', animation: 'heartFloat 2.5s 1.7s ease-out infinite' }}>🌸</div>
            <div style={{ position: 'absolute', left: 0, fontSize: '0.9rem', animation: 'heartFloat 2.5s 2.3s ease-out infinite' }}>🍃</div>
          </div>

          {/* Woman */}
          <div className="person woman" style={{ marginRight: -18, zIndex: 3 }}>
            <div style={{ transform: 'scale(2)', transformOrigin: 'bottom center' }}>
              <div className="w-head">
                <div className="w-hair"/>
                <span className="w-hair-flower" style={{ fontSize: '1.1rem' }}>🌺</span>
                <div className="w-eye w-eye-l"/><div className="w-eye w-eye-r"/>
                <div className="w-cheek w-cheek-l"/><div className="w-cheek w-cheek-r"/>
                <div className="w-nose"/><div className="w-mouth"/>
              </div>
              <div className="w-body">
                <div className="w-collar"/>
                <div className="w-arm-r"><div className="w-hand-r"/></div>
              </div>
              <div className="w-skirt"/>
            </div>
          </div>

          {/* Table */}
          <div className="cafe-table-wrap" style={{ margin: '0 -18px', zIndex: 4 }}>
            <div style={{ transform: 'scale(2)', transformOrigin: 'bottom center', position: 'relative' }}>
              <div className="cups-on-table">
                {[0,1].map(i => (
                  <div key={i} className="cup-set">
                    <div className="cup-steam"><span/><span/>{i===0&&<span/>}</div>
                    <div className="cup-body">
                      <div className="cup-handle"/>
                      <div className="cup-coffee"><div className="cup-coffee-swirl"/></div>
                    </div>
                    <div className="cup-saucer"/>
                  </div>
                ))}
              </div>
              <div className="table-flower">🌼</div>
              <div className="table-candle">🕯️</div>
              <div className="table-top-surface"/>
            </div>
            <div className="table-leg"/>
            <div className="table-foot"/>
          </div>

          {/* Man */}
          <div className="person man" style={{ marginLeft: -18, zIndex: 3 }}>
            <div style={{ transform: 'scale(2)', transformOrigin: 'bottom center' }}>
              <div className="m-head">
                <div className="m-hair"/>
                <div className="m-ear-l"/><div className="m-ear-r"/>
                <div className="m-brow m-brow-l"/><div className="m-brow m-brow-r"/>
                <div className="m-eye m-eye-l"/><div className="m-eye m-eye-r"/>
                <div className="m-cheek m-cheek-l"/><div className="m-cheek m-cheek-r"/>
                <div className="m-mouth"/>
              </div>
              <div className="m-body">
                <div className="m-collar-l"/><div className="m-collar-r"/>
                <div className="m-tie"/>
                <div className="m-btn m-btn-1"/><div className="m-btn m-btn-2"/><div className="m-btn m-btn-3"/>
                <div className="m-pocket"/>
                <div className="m-arm-l"><div className="m-hand-l"/></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
