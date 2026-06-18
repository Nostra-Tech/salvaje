import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { ListChecks, Target, Flag, Trophy, Gift, Crown } from 'lucide-react'

function DockIcon({ item, mouseX, active, onClick }) {
  const ref = useRef(null)
  const Icon = item.icon

  // Magnificación según la distancia del cursor (estilo macOS) — solo desktop.
  const distance = useTransform(mouseX, (val) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - b.x - b.width / 2
  })
  const sizeSync = useTransform(distance, [-110, 0, 110], [48, 66, 48])
  const size = useSpring(sizeSync, { mass: 0.1, stiffness: 150, damping: 12 })

  return (
    <button onClick={onClick} className="group relative flex items-end justify-center" aria-label={item.name}>
      <motion.div
        ref={ref}
        style={{ width: size, height: size }}
        whileTap={{ scale: 0.9 }}
        className={`flex aspect-square items-center justify-center rounded-2xl shadow-salvaje transition-colors ${
          active ? 'bg-salvaje-orange text-white' : 'bg-white text-salvaje-brown hover:text-salvaje-orange'
        }`}
      >
        <Icon size={22} />
      </motion.div>

      {/* Tooltip (desktop) */}
      <span className="pointer-events-none absolute -top-9 hidden whitespace-nowrap rounded-md bg-salvaje-dark/90 px-2 py-1 text-xs text-salvaje-cream opacity-0 transition-opacity group-hover:opacity-100 sm:block">
        {item.name}
      </span>

      {/* Punto de activo */}
      <span
        className={`absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-salvaje-orange transition-opacity ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </button>
  )
}

export function Dock() {
  const mouseX = useMotionValue(Infinity)
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const tab = new URLSearchParams(search).get('tab') // null | 'scores' | 'qualifiers'
  const onPredict = pathname === '/predict'

  const items = [
    { id: 'pronosticos', name: 'Mis pronósticos', icon: ListChecks, to: '/predict', active: onPredict && tab !== 'scores' && tab !== 'qualifiers' && tab !== 'finales' },
    { id: 'marcadores', name: 'Marcadores', icon: Target, to: '/predict?tab=scores', active: onPredict && tab === 'scores' },
    { id: 'clasificados', name: 'Clasificados', icon: Flag, to: '/predict?tab=qualifiers', active: onPredict && tab === 'qualifiers' },
    { id: 'finales', name: 'Finales', icon: Crown, to: '/predict?tab=finales', active: onPredict && tab === 'finales' },
    { id: 'ranking', name: 'Ranking', icon: Trophy, to: '/ranking', active: pathname === '/ranking' },
    { id: 'premios', name: 'Premios', icon: Gift, to: '/premios', active: pathname === '/premios' },
  ]

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="pointer-events-auto flex items-end gap-3 rounded-3xl border border-black/10 bg-salvaje-light/85 px-3 py-2.5 shadow-salvaje-lg backdrop-blur"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
      >
        {items.map((item) => (
          <DockIcon key={item.id} item={item} mouseX={mouseX} active={item.active} onClick={() => navigate(item.to)} />
        ))}
      </motion.div>
    </div>
  )
}
