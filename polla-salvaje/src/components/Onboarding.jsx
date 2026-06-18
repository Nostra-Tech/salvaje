import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Target, Flag, BarChart3, ChevronRight, Check, X } from 'lucide-react'
import { safeStorage } from '../services/safeStorage'
import { asset } from '../lib/asset'

const KEY = 'polla_onboarding_done'

const STEPS = [
  {
    icon: Trophy,
    title: 'SALVAJE',
    label: 'Polla Mundialista Salvaje',
    text: 'Mundial 2026 · Bienvenido',
    desc: 'La polla mundialista de la comunidad Salvaje. Regístrate, haz tus pronósticos del Mundial 2026 y compite por la cima del ranking. ¡Que gane el más salvaje!',
    img: '/ONBOARDING/salvaje.jpg',
    grad: 'from-salvaje-fire to-salvaje-brown',
  },
  {
    icon: Target,
    title: 'MARCADORES',
    label: 'Pronostica',
    text: '72 partidos · Exacto +5 · Resultado +2',
    desc: 'Predice el marcador de los 72 partidos de fase de grupos. Marcador exacto = 5 puntos. Si solo aciertas quién gana (o el empate) = 2 puntos.',
    img: '/ONBOARDING/marcadores.jpg',
    grad: 'from-salvaje-orange to-salvaje-brown',
  },
  {
    icon: Flag,
    title: 'CLASIFICADOS',
    label: 'Elige los 32',
    text: '1º · 2º · 8 mejores terceros · +3 c/u',
    desc: 'Elige los 32 que avanzan a dieciseisavos: el 1º y 2º de cada grupo más los 8 mejores terceros. Cada selección que acertaste que clasifica = 3 puntos.',
    img: '/ONBOARDING/clasificados.jpg',
    grad: 'from-salvaje-gold to-salvaje-orange',
  },
  {
    icon: BarChart3,
    title: 'RANKING',
    label: 'Compite',
    text: 'Suma puntos y escala posiciones',
    desc: 'Tus aciertos suman automáticamente cuando se cargan los resultados oficiales. Sube en la tabla y mídete contra todos los participantes en tiempo real.',
    img: '/ONBOARDING/ranking.jpg',
    grad: 'from-salvaje-brown to-salvaje-fire',
  },
]

const CARD_FACE = 'overflow-hidden rounded-3xl bg-salvaje-dark shadow-salvaje-lg ring-1 ring-white/10 [backface-visibility:hidden]'
const PILL = 'inline-flex shrink-0 items-center gap-1 rounded-full bg-salvaje-cream px-4 py-2 text-sm font-semibold text-salvaje-dark transition hover:bg-white'

function StepCard({ step, front }) {
  const { icon: Icon, title, label, text, desc, img, grad } = step
  const [open, setOpen] = useState(false)

  return (
    <div className="[perspective:1500px]">
      <div
        className={`relative transition-transform duration-500 ease-out [transform-style:preserve-3d] ${
          open ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* ── Frente ── */}
        <div className={CARD_FACE}>
          {/* Cabecera: imagen (banner) o degradado con título */}
          <div className="relative h-40 overflow-hidden sm:h-48">
            {img ? (
              <img src={asset(img)} alt={title} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${grad}`}>
                <Icon size={130} className="absolute right-4 top-4 text-white/10" strokeWidth={1.5} />
                <div className="flex w-full items-center gap-2 px-4 sm:gap-3 sm:px-6">
                  <span className="h-px flex-1 bg-white/40" />
                  <span className="display whitespace-nowrap text-2xl tracking-wide text-white drop-shadow sm:text-3xl">
                    {title}
                  </span>
                  <span className="h-px flex-1 bg-white/40" />
                </div>
              </div>
            )}
          </div>
          {/* Pie */}
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <div className="font-bold text-salvaje-cream">{label}</div>
              <div className="truncate text-xs uppercase tracking-wide text-salvaje-cream/50">{text}</div>
            </div>
            {front && (
              <button onClick={() => setOpen(true)} className={PILL}>
                Ver <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ── Reverso (info) ── */}
        <div className={`absolute inset-0 flex flex-col [transform:rotateY(180deg)] ${CARD_FACE}`}>
          <div className="flex items-center gap-2 px-5 pt-5 text-salvaje-gold">
            <Icon size={18} />
            <span className="display text-xl tracking-wide text-salvaje-cream">{title}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-3">
            <p className="text-sm leading-relaxed text-salvaje-cream/90">{desc}</p>
          </div>
          <div className="flex justify-end px-5 pb-4">
            {front && (
              <button onClick={() => setOpen(false)} className={PILL}>
                Cerrar <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Onboarding() {
  const [open, setOpen] = useState(() => safeStorage.getItem(KEY) !== '1')
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const finish = () => {
    safeStorage.setItem(KEY, '1')
    setOpen(false)
  }
  const next = () => (index < STEPS.length - 1 ? setIndex((i) => i + 1) : finish())

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-4">
      {/* Fondo: el inicio, borroso */}
      <img src={asset('intro.jpg')} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl" />
      <div className="absolute inset-0 bg-salvaje-dark/80" />

      {/* Saltar */}
      <button
        onClick={finish}
        className="absolute right-5 top-5 z-10 text-xs font-semibold uppercase tracking-widest text-salvaje-cream/60 transition-colors hover:text-salvaje-cream"
      >
        Saltar
      </button>

      {/* Stack de tarjetas */}
      <div className="relative z-10 h-[300px] w-full max-w-md">
        <AnimatePresence initial={false}>
          {STEPS.map((s, i) => {
            const offset = i - index
            if (offset < 0 || offset > 2) return null
            return (
              <motion.div
                key={i}
                className="absolute inset-x-0 top-0"
                style={{ zIndex: 10 - offset }}
                initial={{ y: -offset * 18 - 40, scale: 1 - offset * 0.05, opacity: 0 }}
                animate={{ y: -offset * 18, scale: 1 - offset * 0.05, opacity: 1 }}
                exit={{ y: 160, opacity: 0, rotate: -4, transition: { duration: 0.4 } }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              >
                <StepCard step={s} front={offset === 0} />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Indicadores + botón principal */}
      <div className="relative z-10 mt-10 flex flex-col items-center gap-5">
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Paso ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-7 bg-salvaje-orange' : 'w-2 bg-salvaje-cream/30 hover:bg-salvaje-cream/50'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="group/button relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-salvaje-orange px-7 py-3 font-semibold text-white shadow-salvaje-md transition-all hover:bg-salvaje-fire hover:shadow-salvaje-glow"
        >
          <span>{index < STEPS.length - 1 ? 'Siguiente' : 'Empezar a jugar'}</span>
          {index < STEPS.length - 1 ? <ChevronRight size={18} /> : <Check size={18} />}
          <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-120%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(120%)]">
            <div className="relative h-full w-10 bg-white/25" />
          </div>
        </button>
      </div>
    </div>
  )
}
