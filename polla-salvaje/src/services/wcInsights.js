import { WC_STATS } from '../data/wcStats'

// Probabilidad de empate base (tasa típica en Mundiales).
const DRAW_BASE = 0.22
// Puntos por partido histórico como medida de "fuerza"; debutante = 1.0 neutro.
const ppg = (t) => (t ? (t.win * 3 + t.draw) / Math.max(1, t.played) : 1.0)

/** Resumen histórico de una selección en Mundiales (o null si es debutante). */
export function teamSummary(name) {
  const t = WC_STATS.teams[name]
  if (!t) return null
  return { ...t, winPct: Math.round((t.win / Math.max(1, t.played)) * 100) }
}

/**
 * Insight de un partido: récords, head-to-head (orientado a teamA), probabilidad
 * de victoria estimada (histórica) y marcador típico.
 */
export function matchInsight(teamA, teamB) {
  const A = WC_STATS.teams[teamA] || null
  const B = WC_STATS.teams[teamB] || null

  const [x, y] = [teamA, teamB].sort()
  const raw = WC_STATS.h2h[`${x}__${y}`] || null
  let h2h = null
  if (raw) {
    const aIsX = teamA === x
    h2h = {
      played: raw.played,
      aWins: aIsX ? raw.w1 : raw.w2,
      draws: raw.draws,
      bWins: aIsX ? raw.w2 : raw.w1,
      top: raw.top.map(({ s, c }) => {
        const [p, q] = s.split('-')
        return { s: aIsX ? `${p}-${q}` : `${q}-${p}`, c }
      }),
    }
  }

  // Probabilidad: fuerza histórica relativa, mezclada con el head-to-head.
  const sA = ppg(A)
  const sB = ppg(B)
  let pA = (1 - DRAW_BASE) * (sA / (sA + sB))
  let pB = (1 - DRAW_BASE) * (sB / (sA + sB))
  let pD = DRAW_BASE
  if (h2h && h2h.played >= 3) {
    const tot = h2h.played
    pA = 0.6 * pA + 0.4 * (h2h.aWins / tot)
    pB = 0.6 * pB + 0.4 * (h2h.bWins / tot)
    pD = 0.6 * pD + 0.4 * (h2h.draws / tot)
    const s = pA + pB + pD
    pA /= s
    pB /= s
    pD /= s
  }
  let a = Math.round(pA * 100)
  const d = Math.round(pD * 100)
  const b = Math.round(pB * 100)
  a += 100 - (a + d + b) // cuadrar a 100

  const ga = A ? Math.round(A.gf / Math.max(1, A.played)) : 1
  const gb = B ? Math.round(B.gf / Math.max(1, B.played)) : 1

  return {
    a: teamSummary(teamA),
    b: teamSummary(teamB),
    h2h,
    prob: { a, d, b },
    likely: `${ga}-${gb}`,
  }
}
