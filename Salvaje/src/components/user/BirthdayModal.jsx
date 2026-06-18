import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const COLORS = ['#E8622A', '#F4B44B', '#2A5C2A', '#F4EFE5', '#D4480A', '#FFD700', '#FF6B35']
const PARTICLE_COUNT = 80

function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2.5 + Math.random() * 2,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotate: Math.random() * 360,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  }))
}

const particles = generateParticles()

export function BirthdayModal({ open, onClose, name }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(onClose, 8000)
    return () => clearTimeout(timer)
  }, [open, onClose])

  if (!open) return null

  const firstName = name?.split(' ')[0] || 'Salvaje'

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute top-0"
            style={{
              left: `${p.left}%`,
              width: p.shape === 'circle' ? p.size : p.size * 0.6,
              height: p.shape === 'circle' ? p.size : p.size * 1.4,
              backgroundColor: p.color,
              borderRadius: p.shape === 'circle' ? '50%' : '2px',
              animation: `confettiFall ${p.duration}s ${p.delay}s ease-in infinite`,
              transform: `rotate(${p.rotate}deg)`,
              opacity: 0.9,
            }}
          />
        ))}
      </div>

      {/* Modal card */}
      <div
        className="relative bg-salvaje-cream rounded-salvaje shadow-salvaje-lg px-8 py-10 max-w-sm w-full mx-4 text-center"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <div className="flex justify-center mb-4">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* cake base */}
            <rect x="8" y="36" width="48" height="20" rx="4" fill="#E8622A"/>
            <rect x="8" y="28" width="48" height="10" rx="3" fill="#F4B44B"/>
            {/* frosting drips */}
            <path d="M8 32 Q14 28 20 32 Q26 36 32 32 Q38 28 44 32 Q50 36 56 32" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            {/* candles */}
            <rect x="20" y="18" width="5" height="10" rx="2" fill="#F4EFE5"/>
            <rect x="29.5" y="16" width="5" height="12" rx="2" fill="#F4EFE5"/>
            <rect x="39" y="18" width="5" height="10" rx="2" fill="#F4EFE5"/>
            {/* flames */}
            <ellipse cx="22.5" cy="16" rx="3" ry="4" fill="#E8622A"/>
            <ellipse cx="22.5" cy="16" rx="1.5" ry="2.5" fill="#F4B44B"/>
            <ellipse cx="32" cy="14" rx="3" ry="4" fill="#E8622A"/>
            <ellipse cx="32" cy="14" rx="1.5" ry="2.5" fill="#F4B44B"/>
            <ellipse cx="41.5" cy="16" rx="3" ry="4" fill="#E8622A"/>
            <ellipse cx="41.5" cy="16" rx="1.5" ry="2.5" fill="#F4B44B"/>
            {/* dots decoration */}
            <circle cx="18" cy="43" r="2" fill="white" opacity="0.6"/>
            <circle cx="28" cy="47" r="2" fill="white" opacity="0.6"/>
            <circle cx="38" cy="43" r="2" fill="white" opacity="0.6"/>
            <circle cx="48" cy="47" r="2" fill="white" opacity="0.6"/>
          </svg>
        </div>
        <h2 className="font-display text-4xl uppercase text-salvaje-orange mb-2">
          ¡Feliz Cumpleaños!
        </h2>
        <p className="font-display text-2xl uppercase text-salvaje-dark mb-4">
          {firstName}
        </p>
        <p className="font-body text-salvaje-gray text-sm leading-relaxed mb-6">
          Toda la tribu SALVAJE te desea un año épico, lleno de fuerza, fuego y logros increíbles. ¡Hoy es tu día!
        </p>
        <button
          onClick={onClose}
          className="bg-salvaje-orange text-white font-display uppercase tracking-wide px-6 py-3 rounded-salvaje hover:bg-salvaje-fire transition-colors text-sm"
        >
          ¡Gracias, Tribu! 💪
        </button>
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0.2; }
        }
        @keyframes popIn {
          0%   { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  )
}
