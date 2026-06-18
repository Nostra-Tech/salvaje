import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { computeUserScore } from './scoring'
import { local } from './localBackend'
import { safeStorage } from './safeStorage'

const USERS = 'polla_users'
const PREDICTIONS = 'polla_predictions'
const RESULTS = 'polla_results'
const RESULTS_DOC = 'current'

const K_LOCAL = 'polla_use_local'

// ── Modo local (demo) ───────────────────────────────────────────────────────
// Si Firestore no está disponible (reglas sin aplicar, sin permisos o sin red),
// la app cae automáticamente a localStorage para que el flujo siga funcionando.
// IMPORTANTE: el modo local es SOLO de sesión (en memoria). No se persiste: así,
// al recargar, la app siempre reintenta Firestore. Persistirlo hacía que un
// usuario que tocó el demo (o tuvo un timeout) quedara atrapado escribiendo a
// localStorage para siempre, sin que sus datos llegaran al panel de admin.
// Solo el botón de demo activa modo local explícito (también de sesión).
let LOCAL = false

// Limpia cualquier bandera persistida de versiones anteriores que dejara a un
// usuario "pegado" en modo local.
safeStorage.removeItem(K_LOCAL)

function goLocal(reason) {
  if (!LOCAL) {
    LOCAL = true
    // eslint-disable-next-line no-console
    console.warn('[Polla Mundialista Salvaje] Modo demo local activado:', reason?.message || reason)
  }
}

/** True si la app está operando contra localStorage en vez de Firestore. */
export function isLocalMode() {
  return LOCAL
}

/** Fuerza el modo local (usado por el botón de demo). */
export function forceLocalMode() {
  goLocal('forzado por demo')
}

const FIRESTORE_TIMEOUT_MS = 4500

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), ms))
}

/**
 * Ejecuta una operación contra Firestore; si falla (permisos/red) o se cuelga,
 * activa el modo local y ejecuta el equivalente offline.
 */
async function withFallback(firestoreFn, localFn) {
  if (LOCAL) return localFn()
  try {
    return await Promise.race([firestoreFn(), timeout(FIRESTORE_TIMEOUT_MS)])
  } catch (err) {
    goLocal(err)
    return localFn()
  }
}

/** Normaliza el correo para usarlo como ID de documento. */
export function emailKey(email) {
  return (email || '').trim().toLowerCase()
}

/** Lista de correos admin desde el .env (VITE_POLLA_ADMINS, separados por coma). */
export function isAdmin(email) {
  const raw = import.meta.env.VITE_POLLA_ADMINS || ''
  const admins = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  // En modo demo, la cuenta demo también es admin para poder probar el panel.
  if (isLocalMode() && emailKey(email) === 'demo@salvaje.app') return true
  return admins.includes(emailKey(email))
}

/**
 * Registra un usuario nuevo o devuelve el existente (login por correo).
 */
export async function registerOrLogin({ fullName, email, phone }) {
  const id = emailKey(email)
  if (!id) throw new Error('Correo inválido')

  return withFallback(
    async () => {
      const ref = doc(db, USERS, id)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const existing = snap.data()
        const patch = {}
        if (fullName && fullName !== existing.fullName) patch.fullName = fullName
        if (phone && phone !== existing.phone) patch.phone = phone
        if (Object.keys(patch).length) await setDoc(ref, patch, { merge: true })
        return {
          id,
          fullName: patch.fullName || existing.fullName,
          email: id,
          phone: patch.phone || existing.phone,
          avatar: existing.avatar || '',
          isNew: false,
        }
      }
      await setDoc(ref, {
        fullName: fullName || '',
        email: id,
        phone: phone || '',
        createdAt: serverTimestamp(),
      })
      return { id, fullName, email: id, phone, avatar: '', isNew: true }
    },
    () => local.registerOrLogin({ fullName, email, phone }),
  )
}

/** Login por correo: devuelve el usuario o null si no está registrado. */
export async function loginByEmail(email) {
  const id = emailKey(email)
  if (!id) return null
  return withFallback(
    async () => {
      const snap = await getDoc(doc(db, USERS, id))
      if (!snap.exists()) return null
      const d = snap.data()
      return { id, fullName: d.fullName, email: id, phone: d.phone, avatar: d.avatar || '', isNew: false }
    },
    () => local.loginByEmail(email),
  )
}

/** Actualiza el perfil (nombre, celular y/o foto) del usuario. */
export async function updateProfile(userId, { fullName, phone, avatar }) {
  const patch = {}
  if (fullName !== undefined) patch.fullName = fullName
  if (phone !== undefined) patch.phone = phone
  if (avatar !== undefined) patch.avatar = avatar
  return withFallback(
    async () => {
      await setDoc(doc(db, USERS, userId), { ...patch, updatedAt: serverTimestamp() }, { merge: true })
    },
    () => local.updateProfile(userId, { fullName, phone, avatar }),
  )
}

/** Devuelve la predicción guardada del usuario, o un objeto vacío. */
export async function getPrediction(userId) {
  return withFallback(
    async () => {
      const snap = await getDoc(doc(db, PREDICTIONS, userId))
      if (!snap.exists()) return { scores: {}, qualifiers: {}, bestThirds: [] }
      const d = snap.data()
      return {
        scores: d.scores || {}, qualifiers: d.qualifiers || {}, bestThirds: d.bestThirds || [],
        champion: d.champion || '', runnerUp: d.runnerUp || '', scorer: d.scorer || '', scorerTeam: d.scorerTeam || '',
      }
    },
    () => local.getPrediction(userId),
  )
}

/** Guarda (merge) la predicción del usuario. */
export async function savePrediction(userId, { scores, qualifiers, bestThirds, champion, runnerUp, scorer, scorerTeam }) {
  return withFallback(
    async () => {
      await setDoc(
        doc(db, PREDICTIONS, userId),
        {
          scores: scores || {},
          qualifiers: qualifiers || {},
          bestThirds: bestThirds || [],
          champion: champion || '',
          runnerUp: runnerUp || '',
          scorer: scorer || '',
          scorerTeam: scorerTeam || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    },
    () => local.savePrediction(userId, { scores, qualifiers, bestThirds, champion, runnerUp, scorer, scorerTeam }),
  )
}

/** Resultados oficiales (cargados por admin). */
export async function getResults() {
  return withFallback(
    async () => {
      const snap = await getDoc(doc(db, RESULTS, RESULTS_DOC))
      if (!snap.exists()) return { scores: {}, qualifiers: {}, bestThirds: [] }
      const d = snap.data()
      return {
        scores: d.scores || {}, qualifiers: d.qualifiers || {}, bestThirds: d.bestThirds || [],
        champion: d.champion || '', runnerUp: d.runnerUp || '', scorer: d.scorer || '', scorerTeam: d.scorerTeam || '',
      }
    },
    () => local.getResults(),
  )
}

/** Guarda (merge) los resultados oficiales. */
export async function saveResults({ scores, qualifiers, bestThirds, champion, runnerUp, scorer, scorerTeam }) {
  const payload = { updatedAt: serverTimestamp() }
  if (scores !== undefined) payload.scores = scores || {}
  if (qualifiers !== undefined) payload.qualifiers = qualifiers || {}
  if (bestThirds !== undefined) payload.bestThirds = bestThirds || []
  if (champion !== undefined) payload.champion = champion || ''
  if (runnerUp !== undefined) payload.runnerUp = runnerUp || ''
  if (scorer !== undefined) payload.scorer = scorer || ''
  if (scorerTeam !== undefined) payload.scorerTeam = scorerTeam || ''
  return withFallback(
    async () => { await setDoc(doc(db, RESULTS, RESULTS_DOC), payload, { merge: true }) },
    () => local.saveResults({ scores, qualifiers, bestThirds, champion, runnerUp, scorer, scorerTeam }),
  )
}

function buildRows(usersObj, predsMap, results) {
  const rows = []
  for (const [id, data] of Object.entries(usersObj)) {
    const prediction = predsMap[id] || { scores: {}, qualifiers: {} }
    const breakdown = computeUserScore(prediction, results)
    rows.push({
      id,
      name: data.fullName || id,
      phone: data.phone || '',
      avatar: data.avatar || '',
      hasPredicted: !!predsMap[id],
      score: breakdown.total,
      breakdown,
    })
  }
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  return rows
}

/**
 * Tabla de posiciones recalculada contra los resultados oficiales actuales.
 */
export async function getLeaderboard() {
  return withFallback(
    async () => {
      const [usersSnap, predsSnap, results] = await Promise.all([
        getDocs(collection(db, USERS)),
        getDocs(collection(db, PREDICTIONS)),
        getResults(),
      ])
      const usersObj = {}
      usersSnap.forEach((u) => (usersObj[u.id] = u.data()))
      const predsMap = {}
      predsSnap.forEach((p) => (predsMap[p.id] = p.data()))
      return buildRows(usersObj, predsMap, results)
    },
    async () => {
      const { users, preds, results } = await local.getLeaderboardData()
      return buildRows(users, preds, results)
    },
  )
}
