/**
 * Lógica y datos de la Polla Mundialista Salvaje para el panel de superadmin.
 * Lee las colecciones `polla_users`, `polla_predictions`, `polla_results`
 * (las mismas que usa la app de la polla) y calcula ranking y estadísticas.
 */
import { collection, getDocs, doc, getDoc, onSnapshot, setDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { db } from './firebase'

/** Marca un inscrito de la polla como pagado / no pagado. */
export async function setPollaPaid(userId, paid) {
  await setDoc(doc(db, 'polla_users', userId), { paid: !!paid }, { merge: true })
}

/** Elimina un inscrito de la polla (su registro y su pronóstico). */
export async function deletePollaUser(userId) {
  await Promise.all([
    deleteDoc(doc(db, 'polla_users', userId)),
    deleteDoc(doc(db, 'polla_predictions', userId)).catch(() => {}),
  ])
}

export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

// 72 partidos de fase de grupos (id g1..g72) — mismo orden que la app de la polla.
// prettier-ignore
const RAW = [
  ['A','México','Sudáfrica'],['A','República de Corea','Rep. Checa'],['B','Canadá','Bosnia'],['D','Estados Unidos','Paraguay'],
  ['B','Catar','Suiza'],['C','Brasil','Marruecos'],['C','Haití','Escocia'],['D','Australia','Turquía'],
  ['E','Alemania','Curazao'],['F','Países Bajos','Japón'],['E','Costa de Marfil','Ecuador'],['F','Suecia','Túnez'],
  ['H','España','Islas de Cabo Verde'],['G','Bélgica','Egipto'],['H','Arabia Saudí','Uruguay'],['G','RI de Irán','Nueva Zelanda'],
  ['I','FRANCIA','Senegal'],['I','Irak','Noruega'],['J','Argentina','Argelia'],['J','Austria','Jordania'],
  ['K','Portugal','RD Congo'],['L','Inglaterra','Croacia'],['L','Ghana','Panamá'],['K','Uzbekistán','Colombia'],
  ['A','Rep. Checa','Sudáfrica'],['B','Suiza','Bosnia'],['B','Canadá','Catar'],['A','México','República de Corea'],
  ['D','Estados Unidos','Australia'],['C','Escocia','Marruecos'],['C','Brasil','Haití'],['D','Turquía','Paraguay'],
  ['F','Países Bajos','Suecia'],['E','Alemania','Costa de Marfil'],['E','Ecuador','Curazao'],['F','Túnez','Japón'],
  ['H','España','Arabia Saudí'],['G','Bélgica','RI de Irán'],['H','Uruguay','Islas de Cabo Verde'],['G','Nueva Zelanda','Egipto'],
  ['J','Argentina','Austria'],['I','FRANCIA','Irak'],['I','Noruega','Senegal'],['J','Jordania','Argelia'],
  ['K','Portugal','Uzbekistán'],['L','Inglaterra','Ghana'],['L','Panamá','Croacia'],['K','Colombia','RD Congo'],
  ['B','Suiza','Canadá'],['B','Bosnia','Catar'],['C','Brasil','Escocia'],['C','Marruecos','Haití'],
  ['A','Rep. Checa','México'],['A','Sudáfrica','República de Corea'],['E','Curazao','Costa de Marfil'],['E','Ecuador','Alemania'],
  ['F','Japón','Suecia'],['F','Túnez','Países Bajos'],['D','Turquía','Estados Unidos'],['D','Paraguay','Australia'],
  ['I','Noruega','FRANCIA'],['I','Senegal','Irak'],['H','Islas de Cabo Verde','Arabia Saudí'],['H','Uruguay','España'],
  ['G','Egipto','RI de Irán'],['G','Nueva Zelanda','Bélgica'],['L','Panamá','Inglaterra'],['L','Croacia','Ghana'],
  ['K','Colombia','Portugal'],['K','RD Congo','Uzbekistán'],['J','Argelia','Austria'],['J','Jordania','Argentina'],
]

export const GROUP_MATCHES = RAW.map(([group, teamA, teamB], i) => ({ id: `g${i + 1}`, group, teamA, teamB }))
const MATCH_BY_ID = Object.fromEntries(GROUP_MATCHES.map((m) => [m.id, m]))

// Fase eliminatoria por rondas (mismo orden e ids que la app de la polla). Se
// pronostican y puntúan igual que la fase de grupos.
export const KNOCKOUT_ROUNDS = [
  {
    key: 'R32', label: 'Dieciseisavos de final', short: '1/16',
    matches: [
      ['k1', 'Sudáfrica', 'Canadá', 'Dom 28 jun · 14:00'],
      ['k2', 'Brasil', 'Japón', 'Lun 29 jun · 12:00'],
      ['k5', 'Alemania', 'Paraguay', 'Lun 29 jun · 15:30'],
      ['k3', 'Países Bajos', 'Marruecos', 'Lun 29 jun · 20:00'],
      ['k6', 'Costa de Marfil', 'Noruega', 'Mar 30 jun · 12:00'],
      ['k7', 'FRANCIA', 'Suecia', 'Mar 30 jun · 16:00'],
      ['k10', 'México', 'Ecuador', 'Mar 30 jun · 20:00'],
      ['k11', 'Inglaterra', 'RD Congo', 'Mié 1 jul · 11:00'],
      ['k12', 'Bélgica', 'Senegal', 'Mié 1 jul · 15:00'],
      ['k4', 'Estados Unidos', 'Bosnia', 'Mié 1 jul · 19:00'],
      ['k13', 'España', 'Austria', 'Jue 2 jul · 14:00'],
      ['k14', 'Portugal', 'Croacia', 'Jue 2 jul · 18:00'],
      ['k15', 'Suiza', 'Argelia', 'Jue 2 jul · 22:00'],
      ['k8', 'Australia', 'Egipto', 'Vie 3 jul · 13:00'],
      ['k9', 'Argentina', 'Islas de Cabo Verde', 'Vie 3 jul · 17:00'],
      ['k16', 'Colombia', 'Ghana', 'Vie 3 jul · 20:30'],
    ],
  },
  {
    key: 'R16', label: 'Octavos de final', short: '1/8',
    matches: [
      ['o1', 'Canadá', 'Marruecos', 'Sáb 4 jul · 12:00'],
      ['o2', 'Paraguay', 'FRANCIA', 'Sáb 4 jul · 16:00'],
      ['o3', 'Brasil', 'Noruega', 'Dom 5 jul · 15:00'],
      ['o4', 'México', 'Inglaterra', 'Dom 5 jul · 19:00'],
      ['o6', 'Portugal', 'España', 'Lun 6 jul · 14:00'],
      ['o5', 'Estados Unidos', 'Bélgica', 'Lun 6 jul · 19:00'],
      ['o7', 'Argentina', 'Egipto', 'Mar 7 jul · 11:00'],
      ['o8', 'Suiza', 'Colombia', 'Mar 7 jul · 15:00'],
    ],
  },
  {
    key: 'R8', label: 'Cuartos de final', short: '1/4',
    matches: [
      ['q1', 'FRANCIA', 'Marruecos', 'Jue 9 jul · 15:00'],
      ['q2', 'España', 'Bélgica', 'Vie 10 jul · 14:00'],
      ['q3', 'Noruega', 'Inglaterra', 'Sáb 11 jul · 16:00'],
    ],
  },
].map((r) => ({ ...r, matches: r.matches.map(([id, teamA, teamB, when]) => ({ id, teamA, teamB, when })) }))

export const KNOCKOUT_MATCHES = KNOCKOUT_ROUNDS.flatMap((r) => r.matches)
export const KNOCKOUT_ROUND_LABEL = KNOCKOUT_ROUNDS[0].label

export const SCORING = { exact: 5, result: 2, qualifier: 3, champion: 25, runnerUp: 20, scorer: 15 }

const sign = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0)
const hasScore = (s) => s && s.a !== '' && s.a != null && s.b !== '' && s.b != null
const normName = (s) => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function advancingSet({ qualifiers = {}, bestThirds = [] } = {}) {
  const s = new Set()
  for (const g of Object.values(qualifiers)) {
    if (g?.first) s.add(g.first)
    if (g?.second) s.add(g.second)
  }
  for (const t of bestThirds || []) if (t) s.add(t)
  return s
}

export function computeUserScore(prediction = {}, results = {}) {
  const predScores = prediction.scores || {}
  const actualScores = results.scores || {}
  let matchPoints = 0
  let exactCount = 0
  let resultCount = 0
  for (const [matchId, actual] of Object.entries(actualScores)) {
    const pred = predScores[matchId]
    if (!hasScore(pred) || !hasScore(actual)) continue
    const pa = +pred.a, pb = +pred.b, aa = +actual.a, ab = +actual.b
    if (pa === aa && pb === ab) { matchPoints += SCORING.exact; exactCount++ }
    else if (sign(pa - pb) === sign(aa - ab)) { matchPoints += SCORING.result; resultCount++ }
  }
  const actualAdv = advancingSet(results)
  let qualifierHits = 0
  if (actualAdv.size) {
    const predAdv = advancingSet(prediction)
    for (const t of predAdv) if (actualAdv.has(t)) qualifierHits++
  }
  // Finales: Campeón (+25), Subcampeón (+20), Goleador (+15)
  let finalsPoints = 0
  if (results.champion && prediction.champion && normName(prediction.champion) === normName(results.champion)) finalsPoints += SCORING.champion
  if (results.runnerUp && prediction.runnerUp && normName(prediction.runnerUp) === normName(results.runnerUp)) finalsPoints += SCORING.runnerUp
  if (results.scorer && prediction.scorer && normName(prediction.scorer) === normName(results.scorer)) finalsPoints += SCORING.scorer
  return { total: matchPoints + qualifierHits * SCORING.qualifier + finalsPoints, exactCount, resultCount, qualifierHits, finalsPoints }
}

/** Trae todos los datos de la polla desde Firestore. */
export async function fetchPolla() {
  const [usersSnap, predsSnap, resDoc] = await Promise.all([
    getDocs(collection(db, 'polla_users')),
    getDocs(collection(db, 'polla_predictions')),
    getDoc(doc(db, 'polla_results', 'current')),
  ])
  const users = {}
  usersSnap.forEach((d) => (users[d.id] = d.data()))
  const preds = {}
  predsSnap.forEach((d) => (preds[d.id] = d.data()))
  const results = resDoc.exists() ? resDoc.data() : { scores: {}, qualifiers: {}, bestThirds: [] }
  return { users, preds, results }
}

/**
 * Suscripción en TIEMPO REAL a los datos de la polla. Llama a `onData` con
 * `{ users, preds, results }` cada vez que cambia cualquier colección.
 * Devuelve una función para cancelar las tres suscripciones.
 */
export function subscribePolla(onData, onError) {
  const cache = { users: {}, preds: {}, results: { scores: {}, qualifiers: {}, bestThirds: [] } }
  let ready = 0 // emite solo cuando los 3 listeners han entregado su primer snapshot
  const emit = () => onData({ users: { ...cache.users }, preds: { ...cache.preds }, results: cache.results })
  const fail = (e) => onError && onError(e)

  const unsubUsers = onSnapshot(
    collection(db, 'polla_users'),
    (snap) => { cache.users = {}; snap.forEach((d) => (cache.users[d.id] = d.data())); ready |= 1; if (ready === 7) emit() },
    fail,
  )
  const unsubPreds = onSnapshot(
    collection(db, 'polla_predictions'),
    (snap) => { cache.preds = {}; snap.forEach((d) => (cache.preds[d.id] = d.data())); ready |= 2; if (ready === 7) emit() },
    fail,
  )
  const unsubResults = onSnapshot(
    doc(db, 'polla_results', 'current'),
    (d) => { cache.results = d.exists() ? d.data() : { scores: {}, qualifiers: {}, bestThirds: [] }; ready |= 4; if (ready === 7) emit() },
    fail,
  )
  return () => { unsubUsers(); unsubPreds(); unsubResults() }
}

// ── Notificaciones de NUEVO REGISTRO a la polla ──────────────────────────────
// La app de la polla es sin auth y no puede escribir en `notifications`. Como no
// hay Cloud Functions, el aviso lo genera la sesión del admin (que sí está
// autenticada): un listener en vivo sobre `polla_users` crea una notificación
// nativa por cada registro NUEVO. Solo registros — los pronósticos no avisan.

async function createRegistrationNotif(adminUid, pollaId, data) {
  const safe = pollaId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const notifId = `pollareg_${safe}_${adminUid}`
  const name = data.fullName || data.email || 'Nuevo participante'
  // ID determinístico → si dos pestañas del mismo admin lo procesan, no duplica.
  await setDoc(doc(db, 'notifications', notifId), {
    recipientId: adminUid,
    recipientRole: 'admin',
    senderId: null,
    senderName: 'Polla Mundialista Salvaje',
    senderRole: 'system',
    senderPhotoURL: data.avatar || null,
    type: 'polla_registration',
    title: 'Nuevo registro en la Polla Mundialista Salvaje',
    body: `${name} se registró en la polla mundialista.`,
    relatedId: pollaId,
    relatedCollection: 'polla_users',
    actionType: 'view',
    actionUrl: '/superadmin/polla-mundialista-salvaje',
    isRead: false,
    sentAt: serverTimestamp(),
    readAt: null,
    createdAt: serverTimestamp(),
  })
}

/**
 * Observa `polla_users` y dispara una notificación al `adminUid` por cada
 * registro nuevo (SOLO registros). Deduplica leyendo las notificaciones que el
 * admin ya tiene: arma el set de registros ya avisados y notifica una sola vez
 * por participante. Así:
 *   - no repite si la notificación ya existe (incluso en otro dispositivo),
 *   - captura registros ocurridos mientras el admin estaba desconectado,
 *   - no spamea el historial (los ya avisados quedan registrados como notifs).
 * Devuelve la función para cancelar la suscripción.
 */
export function watchPollaRegistrations(adminUid, onError) {
  if (!adminUid) return () => {}
  const notified = new Set()

  // Semilla: qué participantes ya tienen notificación de registro para este admin.
  const seedReady = getDocs(query(collection(db, 'notifications'), where('recipientId', '==', adminUid)))
    .then((snap) => {
      snap.forEach((d) => {
        const n = d.data()
        if (n.type === 'polla_registration' && n.relatedId) notified.add(n.relatedId)
      })
    })
    .catch((e) => console.warn('[polla reg] no se pudo leer notifs previas:', e?.code, e?.message))

  return onSnapshot(
    collection(db, 'polla_users'),
    async (snap) => {
      await seedReady
      const added = snap.docChanges().filter((c) => c.type === 'added')
      for (const c of added) {
        const id = c.doc.id
        if (notified.has(id)) continue
        notified.add(id) // marca antes para que snapshots concurrentes no dupliquen
        try {
          await createRegistrationNotif(adminUid, id, c.doc.data())
        } catch (e) {
          console.warn('[polla reg notif] no se pudo crear:', e?.code, e?.message)
          notified.delete(id) // permite reintentar en el próximo snapshot
        }
      }
    },
    onError,
  )
}

const scoreFilled = (scores = {}) =>
  GROUP_MATCHES.filter((m) => hasScore(scores[m.id])).length

/** Calcula ranking + todas las estadísticas para el panel. */
export function analyzePolla({ users, preds, results }) {
  const userIds = Object.keys(users)
  const ranking = userIds
    .map((id) => {
      const u = users[id]
      const pred = preds[id] || { scores: {}, qualifiers: {}, bestThirds: [] }
      const breakdown = computeUserScore(pred, results)
      return {
        id,
        name: u.fullName || id,
        avatar: u.avatar || '',
        phone: u.phone || '',
        email: u.email || '',
        paid: !!u.paid,
        hasPredicted: !!preds[id],
        scoresFilled: scoreFilled(pred.scores),
        qualsFilled: GROUP_LETTERS.filter((g) => pred.qualifiers?.[g]?.first && pred.qualifiers?.[g]?.second).length,
        thirds: (pred.bestThirds || []).length,
        score: breakdown.total,
        breakdown,
      }
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))

  // Agregados sobre todas las predicciones
  const winCounts = {} // selección -> nº de victorias que le dan los usuarios
  const advanceCounts = {} // selección -> nº de usuarios que la eligen para clasificar
  const championGroupCounts = {} // selección -> veces elegida 1º de grupo
  let homeW = 0, drawW = 0, awayW = 0
  let totalScorelines = 0
  let totalGoals = 0

  for (const id of userIds) {
    const pred = preds[id]
    if (!pred) continue
    // Marcadores → victorias por selección + distribución de resultado
    for (const m of GROUP_MATCHES) {
      const s = pred.scores?.[m.id]
      if (!hasScore(s)) continue
      totalScorelines++
      const a = +s.a, b = +s.b
      totalGoals += a + b
      if (a > b) { homeW++; winCounts[m.teamA] = (winCounts[m.teamA] || 0) + 1 }
      else if (b > a) { awayW++; winCounts[m.teamB] = (winCounts[m.teamB] || 0) + 1 }
      else drawW++
    }
    // Clasificados elegidos
    GROUP_LETTERS.forEach((g) => {
      const q = pred.qualifiers?.[g]
      if (q?.first) { advanceCounts[q.first] = (advanceCounts[q.first] || 0) + 1; championGroupCounts[q.first] = (championGroupCounts[q.first] || 0) + 1 }
      if (q?.second) advanceCounts[q.second] = (advanceCounts[q.second] || 0) + 1
    })
    ;(pred.bestThirds || []).forEach((t) => t && (advanceCounts[t] = (advanceCounts[t] || 0) + 1))
  }

  const toSorted = (obj, key = 'value') =>
    Object.entries(obj)
      .map(([team, v]) => ({ team, [key]: v }))
      .sort((x, y) => y[key] - x[key])

  return {
    ranking,
    totals: {
      participants: userIds.length,
      withPredictions: userIds.filter((id) => !!preds[id]).length,
      totalScorelines,
      totalGoals,
      avgGoals: totalScorelines ? totalGoals / totalScorelines : 0,
      totalAdvancePicks: Object.values(advanceCounts).reduce((a, b) => a + b, 0),
      tournamentStarted: ranking.some((r) => r.score > 0),
    },
    topWinFavorites: toSorted(winCounts, 'wins'),
    topAdvance: toSorted(advanceCounts, 'picks'),
    topChampions: toSorted(championGroupCounts, 'picks'),
    resultDistribution: [
      { name: 'Gana local', value: homeW },
      { name: 'Empate', value: drawW },
      { name: 'Gana visita', value: awayW },
    ],
  }
}
