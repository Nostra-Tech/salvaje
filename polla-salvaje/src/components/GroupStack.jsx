import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { QualifierGroupCard } from './QualifierGroupCard'

/**
 * Vista rápida de Clasificados: stack vertical de tarjetas (una por grupo).
 * Se navega con la rueda, arrastrando o con los puntos / flechas.
 */
export function GroupStack({ groupLetters, groups, qualifiers, setQual, bestThirds, toggleThird, thirdsFull, results, disabled = false }) {
  const [idx, setIdx] = useState(0)
  const total = groupLetters.length
  const lastNav = useRef(0)
  const wrapRef = useRef(null)

  const navigate = useCallback(
    (dir) => {
      const now = Date.now()
      if (now - lastNav.current < 340) return
      lastNav.current = now
      setIdx((p) => Math.max(0, Math.min(total - 1, p + dir)))
    },
    [total],
  )

  // Rueda del mouse — solo dentro del stack (no afecta el scroll de la página).
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > 18) {
        e.preventDefault()
        navigate(e.deltaY > 0 ? 1 : -1)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [navigate])

  const onDragEnd = (_, info) => {
    if (info.offset.y < -50) navigate(1)
    else if (info.offset.y > 50) navigate(-1)
  }

  const styleFor = (i) => {
    const d = i - idx
    if (d === 0) return { y: 0, scale: 1, opacity: 1, zIndex: 5 }
    if (d === -1) return { y: -132, scale: 0.84, opacity: 0.55, zIndex: 4 }
    if (d === -2) return { y: -232, scale: 0.72, opacity: 0.28, zIndex: 3 }
    if (d === 1) return { y: 132, scale: 0.84, opacity: 0.55, zIndex: 4 }
    if (d === 2) return { y: 232, scale: 0.72, opacity: 0.28, zIndex: 3 }
    return { y: d > 0 ? 360 : -360, scale: 0.6, opacity: 0, zIndex: 0 }
  }
  const visible = (i) => Math.abs(i - idx) <= 2

  return (
    <div>
      <div
        ref={wrapRef}
        className="relative flex h-[420px] touch-pan-y items-center justify-center overflow-hidden sm:h-[460px]"
        style={{ perspective: '1200px' }}
      >
        {/* Flecha arriba */}
        <button
          onClick={() => navigate(-1)}
          disabled={idx === 0}
          className="absolute top-1 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white text-salvaje-brown shadow-salvaje transition hover:bg-salvaje-light-alt disabled:opacity-30"
          aria-label="Grupo anterior"
        >
          <ChevronUp size={18} />
        </button>

        {groupLetters.map((g, i) => {
          if (!visible(i)) return null
          const st = styleFor(i)
          const current = i === idx
          return (
            <motion.div
              key={g}
              className="absolute"
              animate={st}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag={current ? 'y' : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={current ? onDragEnd : undefined}
              style={{ zIndex: st.zIndex }}
            >
              <div className={`w-[84vw] max-w-[330px] ${current ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}>
                <QualifierGroupCard
                  group={g}
                  teams={groups[g]}
                  value={qualifiers[g] || {}}
                  onChange={(v) => setQual(g, v)}
                  thirds={bestThirds}
                  onToggleThird={toggleThird}
                  thirdsFull={thirdsFull}
                  official={results.qualifiers?.[g] || null}
                  officialThirds={results.bestThirds || null}
                  disabled={disabled}
                />
              </div>
            </motion.div>
          )
        })}

        {/* Flecha abajo */}
        <button
          onClick={() => navigate(1)}
          disabled={idx === total - 1}
          className="absolute bottom-1 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white text-salvaje-brown shadow-salvaje transition hover:bg-salvaje-light-alt disabled:opacity-30"
          aria-label="Grupo siguiente"
        >
          <ChevronDown size={18} />
        </button>

        {/* Puntos (grupos) */}
        <div className="absolute right-1 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5">
          {groupLetters.map((g, i) => (
            <button
              key={g}
              onClick={() => setIdx(i)}
              aria-label={`Grupo ${g}`}
              className={`rounded-full transition-all ${i === idx ? 'h-5 w-2 bg-salvaje-orange' : 'h-2 w-2 bg-salvaje-gray/30 hover:bg-salvaje-gray/60'}`}
            />
          ))}
        </div>

        {/* Contador */}
        <div className="absolute left-1 top-1/2 z-20 -translate-y-1/2 text-center">
          <div className="display text-3xl tabular-nums text-salvaje-brown">{String(idx + 1).padStart(2, '0')}</div>
          <div className="mx-auto my-1 h-px w-6 bg-salvaje-gray/30" />
          <div className="text-xs tabular-nums text-salvaje-gray">{String(total).padStart(2, '0')}</div>
        </div>
      </div>

      <p className="mt-1 text-center text-xs text-salvaje-gray">
        Grupo <strong className="text-salvaje-brown">{groupLetters[idx]}</strong> · arrastra, usa la rueda o los puntos
      </p>
    </div>
  )
}
