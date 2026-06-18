export function formatCOP(amount) {
  if (amount === undefined || amount === null) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date, options = {}) {
  if (!date) return ''
  const d = date?.toDate ? date.toDate() : new Date(date)
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    ...options,
  }).format(d)
}

export function formatDateTime(date) {
  return formatDate(date, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(date) {
  return formatDate(date, { hour: '2-digit', minute: '2-digit' })
}

export function formatShortDate(date) {
  return formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatRelative(date) {
  if (!date) return ''
  const d = date?.toDate ? date.toDate() : new Date(date)
  const now = new Date()
  const diff = now - d
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes}m`
  if (hours < 24) return `hace ${hours}h`
  if (days < 7) return `hace ${days}d`
  return formatShortDate(date)
}

export function formatPhone(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export function pluralize(count, singular, plural) {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`
}
