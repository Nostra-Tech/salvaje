import { useState } from 'react'

/**
 * Input con línea de luz que sigue el mouse (estilo Salvaje).
 * Acepta `icon` (a la izquierda) y reenvía el resto de props al <input>.
 */
export function AppInput({ icon, className = '', ...rest }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(false)

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  const glow = (offset) => ({
    background: `radial-gradient(34px circle at ${pos.x}px ${offset}px, #D4521A 0%, transparent 70%)`,
  })

  return (
    <div className="relative w-full">
      {icon && (
        <div className="pointer-events-none absolute left-3.5 top-1/2 z-20 -translate-y-1/2 text-salvaje-gray">
          {icon}
        </div>
      )}
      <input
        className={`peer relative z-10 h-12 w-full rounded-xl border-2 border-salvaje-gray/20 bg-white ${
          icon ? 'pl-11' : 'px-4'
        } pr-4 text-salvaje-brown shadow-sm outline-none transition-all duration-200 ease-in-out placeholder:text-salvaje-gray/60 focus:border-salvaje-orange/60 focus:bg-salvaje-light ${className}`}
        onMouseMove={onMove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        {...rest}
      />
      {hover && (
        <>
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-[2px] overflow-hidden rounded-t-md" style={glow(0)} />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-[2px] overflow-hidden rounded-b-md" style={glow(2)} />
        </>
      )}
    </div>
  )
}
