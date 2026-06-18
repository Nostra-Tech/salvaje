function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  return (parts.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase()
}

/** Avatar: muestra la foto si existe, sino las iniciales sobre un círculo. */
export function Avatar({ src, name, size = 32, className = '' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-salvaje-orange/15 font-bold text-salvaje-orange ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials(name)}
    </span>
  )
}
