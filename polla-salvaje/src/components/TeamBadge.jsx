import { getBadge, WC_FALLBACK_BADGE } from '../data/worldCupBadges'

/** Escudo + nombre de selección. Cae al escudo de reserva si la imagen falla. */
export function TeamBadge({ name, size = 26, showName = true, className = '', reverse = false }) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${reverse ? 'flex-row-reverse' : ''} ${className}`}
    >
      <img
        src={getBadge(name)}
        alt={name}
        width={size}
        height={size}
        className="object-contain shrink-0"
        style={{ width: size, height: size }}
        loading="lazy"
        onError={(e) => {
          if (e.currentTarget.src !== WC_FALLBACK_BADGE) e.currentTarget.src = WC_FALLBACK_BADGE
        }}
      />
      {showName && <span className="truncate">{name}</span>}
    </span>
  )
}
