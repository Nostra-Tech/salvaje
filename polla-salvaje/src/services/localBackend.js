/**
 * Backend LOCAL (modo demo) — respaldo en localStorage.
 *
 * Se usa automáticamente cuando Firestore no está disponible (reglas sin aplicar,
 * sin permisos o sin conexión). Permite probar TODO el flujo en el navegador.
 * Viene sembrado con una cuenta de prueba y participantes para que el ranking
 * y los resultados oficiales se vean poblados.
 *
 * Cuenta de prueba sembrada:  demo@salvaje.app
 */

import { GROUPS, GROUP_LETTERS, GROUP_MATCHES } from '../data/worldCup'
import { safeStorage } from './safeStorage'

const K_USERS = 'polla_local_users'
const K_PREDS = 'polla_local_predictions'
const K_RESULTS = 'polla_local_results'
const K_SEEDED = 'polla_local_seeded_v3'

const read = (k, fallback) => {
  try {
    const v = safeStorage.getItem(k)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
const write = (k, v) => safeStorage.setItem(k, JSON.stringify(v))

const emailKey = (email) => (email || '').trim().toLowerCase()

// ── Generación determinística de pronósticos de demo ────────────────────────
function genQualifiers(offset) {
  const q = {}
  GROUP_LETTERS.forEach((g, gi) => {
    const teams = GROUPS[g]
    const first = teams[(offset + gi) % 4]
    let second = teams[(offset + gi + 1) % 4]
    if (second === first) second = teams[(offset + gi + 2) % 4]
    q[g] = { first, second }
  })
  return q
}

function genScores(offset, count) {
  const s = {}
  for (let i = 0; i < count; i++) {
    const m = GROUP_MATCHES[i]
    s[m.id] = { a: String((offset + i) % 4), b: String((offset + i * 2 + 1) % 3) }
  }
  return s
}

// 8 mejores terceros de demo: el 3er equipo (índice distinto a 1º/2º) de 8 grupos.
function genThirds(offset) {
  const thirds = []
  for (let gi = 0; gi < 8; gi++) {
    const g = GROUP_LETTERS[gi]
    thirds.push(GROUPS[g][(offset + gi + 2) % 4])
  }
  return thirds
}

// Nombres de relleno (inventados) para ver bien el podio y la paginación del ranking.
const DEMO_NAMES = [
  'Carlos Ramírez', 'Valentina Ortiz', 'Andrés Gómez', 'Laura Méndez', 'Juan Díaz',
  'Camila Torres', 'Mateo Rojas', 'Daniela Castro', 'Sebastián Vargas', 'Sofía Herrera',
  'Nicolás Pérez', 'Mariana López', 'Felipe Morales', 'Gabriela Ruiz', 'Santiago Niño',
  'Isabella Cardona', 'Alejandro Suárez', 'Paula Restrepo', 'Diego Mejía', 'Carolina Salazar',
  'Tomás Aguirre', 'Manuela Ríos', 'David Quintero', 'Natalia Franco', 'Esteban Pardo',
  'Lucía Bernal', 'Samuel Gallego',
]

const SEED_USERS = [
  { id: 'demo@salvaje.app', fullName: 'Demo Salvaje', email: 'demo@salvaje.app', phone: '3000000000', off: 0, scores: 30 },
  ...DEMO_NAMES.map((name, i) => {
    const id = `demo${i + 1}@salvaje.app`
    return {
      id,
      fullName: name,
      email: id,
      phone: `30${String(10000000 + i * 137).slice(0, 8)}`,
      off: i % 4,
      scores: 40 + (i % 5) * 8,
    }
  }),
]

/**
 * Resultados oficiales del demo: VACÍO.
 * El Mundial aún no inicia, así que no hay resultados oficiales y los pronósticos
 * quedan totalmente editables (no se bloquean). El admin puede cargarlos desde
 * el panel /admin para probar el bloqueo y el puntaje.
 */
function seedResults() {
  return { scores: {}, qualifiers: {}, bestThirds: [] }
}

function ensureSeeded() {
  if (read(K_SEEDED, false)) return
  const users = {}
  const preds = {}
  SEED_USERS.forEach((u) => {
    users[u.id] = { fullName: u.fullName, email: u.email, phone: u.phone, createdAt: Date.now() }
    preds[u.id] = {
      scores: genScores(u.off, u.scores),
      qualifiers: genQualifiers(u.off),
      bestThirds: genThirds(u.off),
    }
  })
  write(K_USERS, users)
  write(K_PREDS, preds)
  write(K_RESULTS, seedResults())
  write(K_SEEDED, true)
}

// ── API equivalente a polla.service ─────────────────────────────────────────
export const local = {
  isSeededDemoEmail: (email) => SEED_USERS.some((u) => u.id === emailKey(email)),

  async registerOrLogin({ fullName, email, phone }) {
    ensureSeeded()
    const id = emailKey(email)
    if (!id) throw new Error('Correo inválido')
    const users = read(K_USERS, {})
    const isNew = !users[id]
    users[id] = {
      fullName: fullName || users[id]?.fullName || '',
      email: id,
      phone: phone || users[id]?.phone || '',
      avatar: users[id]?.avatar || '',
      createdAt: users[id]?.createdAt || Date.now(),
    }
    write(K_USERS, users)
    return { id, fullName: users[id].fullName, email: id, phone: users[id].phone, avatar: users[id].avatar, isNew }
  },

  async loginByEmail(email) {
    ensureSeeded()
    const id = emailKey(email)
    const users = read(K_USERS, {})
    if (!users[id]) return null
    return { id, fullName: users[id].fullName, email: id, phone: users[id].phone, avatar: users[id].avatar || '', isNew: false }
  },

  async updateProfile(userId, { fullName, phone, avatar }) {
    ensureSeeded()
    const users = read(K_USERS, {})
    if (!users[userId]) users[userId] = { email: userId }
    if (fullName !== undefined) users[userId].fullName = fullName
    if (phone !== undefined) users[userId].phone = phone
    if (avatar !== undefined) users[userId].avatar = avatar
    write(K_USERS, users)
  },

  async getPrediction(userId) {
    ensureSeeded()
    const preds = read(K_PREDS, {})
    const p = preds[userId]
    return { scores: p?.scores || {}, qualifiers: p?.qualifiers || {}, bestThirds: p?.bestThirds || [] }
  },

  async savePrediction(userId, { scores, qualifiers, bestThirds }) {
    ensureSeeded()
    const preds = read(K_PREDS, {})
    preds[userId] = { scores: scores || {}, qualifiers: qualifiers || {}, bestThirds: bestThirds || [] }
    write(K_PREDS, preds)
  },

  async getResults() {
    ensureSeeded()
    return read(K_RESULTS, { scores: {}, qualifiers: {}, bestThirds: [] })
  },

  async saveResults({ scores, qualifiers, bestThirds }) {
    ensureSeeded()
    write(K_RESULTS, { scores: scores || {}, qualifiers: qualifiers || {}, bestThirds: bestThirds || [] })
  },

  /** Datos crudos para construir el ranking. */
  async getLeaderboardData() {
    ensureSeeded()
    const users = read(K_USERS, {})
    const preds = read(K_PREDS, {})
    const results = read(K_RESULTS, { scores: {}, qualifiers: {} })
    return { users, preds, results }
  },
}
