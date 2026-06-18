/**
 * Smart recommendations for the admin.
 * Computed client-side from existing data, cached 1h in sessionStorage.
 */
import { fetchUserMetrics, fetchConversion } from './analytics.service'

const CACHE_KEY = 'salvaje_recommendations_v1'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1h

export async function getRecommendations(force = false) {
  if (!force) {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (raw) {
        const { ts, data } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL_MS) return data
      }
    } catch {}
  }

  const recs = []
  const userMetrics = await fetchUserMetrics().catch(() => null)
  if (!userMetrics) return []

  // 1. Users at risk (no attendance 14+ days)
  if (userMetrics.atRisk.length >= 3) {
    recs.push({
      id: 'at_risk',
      severity: 'warning',
      icon: 'Zap',
      title: `${userMetrics.atRisk.length} usuarios en riesgo de abandono`,
      body: `Llevan 14+ días sin asistir. Te sugerimos enviarles un mensaje "Vuelve a la tribu".`,
      ctaLabel: 'Crear mensaje',
      ctaSegment: 'at_risk',
      ctaCount: userMetrics.atRisk.length,
    })
  }

  // 2. Memberships expiring soon
  if (userMetrics.expiringIn5.length >= 2) {
    recs.push({
      id: 'expiring',
      severity: 'urgent',
      icon: 'TrendingDown',
      title: `${userMetrics.expiringIn5.length} membresías vencen pronto`,
      body: `Próximos 5 días. Considera ofrecer descuento de renovación.`,
      ctaLabel: 'Ver lista',
      ctaSegment: 'expiring_soon',
      ctaCount: userMetrics.expiringIn5.length,
    })
  }

  // 3. Trial conversion low
  const conv = await fetchConversion().catch(() => null)
  if (conv && conv.trialCount >= 5 && conv.conversionRate < 30) {
    recs.push({
      id: 'low_conversion',
      severity: 'info',
      icon: 'UserPlus',
      title: `Tasa de conversión trial→pago en ${conv.conversionRate.toFixed(0)}%`,
      body: `${conv.trialCount - conv.convertedCount} usuarios probaron pero no compraron. Ofréceles bienvenida especial.`,
      ctaLabel: 'Estrategia',
      ctaSegment: 'unconverted_trial',
      ctaCount: conv.trialCount - conv.convertedCount,
    })
  }

  // 4. Many dormant users
  if (userMetrics.dormant.length >= 3) {
    recs.push({
      id: 'dormant',
      severity: 'info',
      icon: 'Calendar',
      title: `${userMetrics.dormant.length} usuarios vencidos recientemente`,
      body: `Vencieron hace 7-30 días. Últimas oportunidad de reactivar antes de que sea tarde.`,
      ctaLabel: 'Ver lista',
      ctaSegment: 'dormant',
      ctaCount: userMetrics.dormant.length,
    })
  }

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: recs }))
  } catch {}

  return recs
}

export function clearRecommendationsCache() {
  try { sessionStorage.removeItem(CACHE_KEY) } catch {}
}
