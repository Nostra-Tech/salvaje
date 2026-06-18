import { asset } from '../lib/asset'

const LOGO_DARK = asset('Favicon.png') // marca café — para fondos claros
const LOGO_LIGHT = asset('salvaje-white.png') // marca blanca — para fondos oscuros

// `light` → usa el logo blanco (para fondos oscuros, p. ej. el panel del countdown).
export function Logo({ size = 40, className = '', light = false }) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-label="SALVAJE"
    >
      <img
        src={light ? LOGO_LIGHT : LOGO_DARK}
        alt="SALVAJE"
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
        draggable={false}
      />
    </span>
  )
}

export function LogoLockup({ size = 48, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={size} />
      <div className="leading-none">
        <div className="display text-salvaje-cream" style={{ fontSize: size * 0.62, letterSpacing: '0.08em' }}>
          POLLA MUNDIALISTA SALVAJE
        </div>
        <div
          className="font-body uppercase text-salvaje-gold"
          style={{ fontSize: size * 0.2, letterSpacing: '0.35em' }}
        >
          Mundial 2026
        </div>
      </div>
    </div>
  )
}
