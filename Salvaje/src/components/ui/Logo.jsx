/**
 * SALVAJE Logo — V6.1: switched to brand image (Favicon.png) per request.
 *
 * Public path: `/Favicon.png`. Same `size` / `className` / `bg` API as before
 * so call sites don't need to change.
 *
 * Use `<LogoFull />` when you also want the "SALVAJE / Vida Deportiva" wordmark.
 */
const LOGO_SRC = '/Favicon.png'

export function Logo({ size = 40, className = '', bg = 'transparent' }) {
  const wrapStyle = bg !== 'transparent'
    ? { width: size, height: size, background: bg, borderRadius: Math.round(size * 0.16) }
    : { width: size, height: size }
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden ${className}`}
      style={wrapStyle}
      aria-label="SALVAJE"
    >
      <img
        src={LOGO_SRC}
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

/**
 * LogoFull — brand image + "SALVAJE / VIDA DEPORTIVA" wordmark.
 * Used in the Login page; the slogan is preserved exactly per request.
 */
export function LogoFull({ width = 280, className = '', color = '#4A2818' }) {
  const iconSize = Math.round(width * 0.45)
  return (
    <div
      className={`flex flex-col items-center ${className}`}
      style={{ width }}
    >
      <img
        src={LOGO_SRC}
        alt="SALVAJE"
        width={iconSize}
        height={iconSize}
        className="object-contain"
        draggable={false}
      />
      <p
        className="font-display uppercase mt-2"
        style={{ color, fontSize: Math.round(width * 0.18), letterSpacing: '6px', lineHeight: 1, fontWeight: 900 }}
      >
        SALVAJE
      </p>
      <p
        className="font-body uppercase mt-1"
        style={{ color, fontSize: Math.round(width * 0.05), letterSpacing: '6px', opacity: 0.75 }}
      >
        Vida Deportiva
      </p>
    </div>
  )
}
