/**
 * Motor de puntaje de Polla Mundialista Salvaje.
 *
 * Reglas (Estándar):
 *  - Marcador exacto ........ 5 pts
 *  - Resultado correcto ..... 2 pts (acierta ganador/empate pero no el marcador)
 *  - Clasificado correcto ... 3 pts (por cada selección que el usuario predijo
 *                                    que avanzaría y efectivamente avanzó)
 */

export const SCORING = {
  exact: 5,
  result: 2,
  qualifier: 3,
  champion: 25,
  runnerUp: 20,
  scorer: 15,
}

const norm = (s) => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Puntúa Campeón / Subcampeón / Goleador del Mundial. */
export function scoreFinals(prediction = {}, results = {}) {
  let points = 0
  const detail = { champion: false, runnerUp: false, scorer: false }
  if (results.champion && prediction.champion && norm(prediction.champion) === norm(results.champion)) {
    points += SCORING.champion; detail.champion = true
  }
  if (results.runnerUp && prediction.runnerUp && norm(prediction.runnerUp) === norm(results.runnerUp)) {
    points += SCORING.runnerUp; detail.runnerUp = true
  }
  if (results.scorer && prediction.scorer && norm(prediction.scorer) === norm(results.scorer)) {
    points += SCORING.scorer; detail.scorer = true
  }
  return { points, ...detail }
}

const sign = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0)

const hasScore = (s) =>
  s && s.a !== '' && s.b !== '' && s.a != null && s.b != null && !Number.isNaN(Number(s.a)) && !Number.isNaN(Number(s.b))

/**
 * Puntúa una predicción de marcador contra el resultado oficial.
 * @returns {{ points: number, exact: boolean, result: boolean }}
 */
export function scoreMatch(pred, actual) {
  if (!hasScore(pred) || !hasScore(actual)) return { points: 0, exact: false, result: false }
  const pa = Number(pred.a)
  const pb = Number(pred.b)
  const aa = Number(actual.a)
  const ab = Number(actual.b)

  if (pa === aa && pb === ab) return { points: SCORING.exact, exact: true, result: true }
  if (sign(pa - pb) === sign(aa - ab)) return { points: SCORING.result, exact: false, result: true }
  return { points: 0, exact: false, result: false }
}

/**
 * Conjunto de selecciones que AVANZAN a dieciseisavos según un set de pronóstico
 * o de resultados: los 1º y 2º de cada grupo + los mejores terceros elegidos.
 * @param {{ qualifiers?: Object, bestThirds?: string[] }} data
 * @returns {Set<string>}
 */
export function advancingSet({ qualifiers = {}, bestThirds = [] } = {}) {
  const s = new Set()
  for (const g of Object.values(qualifiers)) {
    if (g?.first) s.add(g.first)
    if (g?.second) s.add(g.second)
  }
  for (const t of bestThirds || []) if (t) s.add(t)
  return s
}

/**
 * Puntúa los clasificados a dieciseisavos (32 equipos: 1º + 2º de cada grupo +
 * 8 mejores terceros). Posición-independiente: vale acertar que el equipo avanza.
 * @param {{ qualifiers, bestThirds }} prediction
 * @param {{ qualifiers, bestThirds }} results
 */
export function scoreQualifiers(prediction = {}, results = {}) {
  const actual = advancingSet(results)
  if (actual.size === 0) return { points: 0, hits: 0 }
  const pred = advancingSet(prediction)
  let hits = 0
  for (const team of pred) if (actual.has(team)) hits += 1
  return { points: hits * SCORING.qualifier, hits }
}

/**
 * Calcula el puntaje total de un usuario.
 * @param {{ scores?: Object, qualifiers?: Object }} prediction
 * @param {{ scores?: Object, qualifiers?: Object }} results
 */
export function computeUserScore(prediction = {}, results = {}) {
  const predScores = prediction.scores || {}
  const actualScores = results.scores || {}

  let matchPoints = 0
  let exactCount = 0
  let resultCount = 0

  for (const [matchId, actual] of Object.entries(actualScores)) {
    const r = scoreMatch(predScores[matchId], actual)
    matchPoints += r.points
    if (r.exact) exactCount += 1
    else if (r.result) resultCount += 1
  }

  const q = scoreQualifiers(prediction, results)
  const f = scoreFinals(prediction, results)

  return {
    total: matchPoints + q.points + f.points,
    matchPoints,
    qualifierPoints: q.points,
    finalsPoints: f.points,
    exactCount,
    resultCount,
    qualifierHits: q.hits,
    finals: f,
  }
}
