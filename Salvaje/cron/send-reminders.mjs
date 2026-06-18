/**
 * SALVAJE — Cron de recordatorios y alertas (Spark plan friendly)
 *
 * Se ejecuta externamente (GitHub Actions, Cloudflare Workers cron, o tarea programada local).
 * Verifica el día/hora de Bogotá (no del servidor) y dispara:
 *   - Sábados ≥ 4pm Bogotá: recordatorio a coaches sin plan para la próxima semana
 *   - Día 15 del mes: notif al admin que la quincena Q1 está lista para aprobar
 *   - Último día del mes: notif al admin que la quincena Q2 está lista
 *
 * Uso:
 *   node cron/send-reminders.mjs
 *
 * Configuración GitHub Actions (.github/workflows/cron.yml):
 *   on:
 *     schedule:
 *       - cron: '0 * * * *'  // cada hora
 *   jobs:
 *     send-reminders:
 *       runs-on: ubuntu-latest
 *       steps:
 *         - uses: actions/checkout@v3
 *         - uses: actions/setup-node@v3
 *           with: { node-version: 20 }
 *         - run: node cron/send-reminders.mjs
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const https = require('https')

const API_KEY    = process.env.SALVAJE_API_KEY    || 'AIzaSyCVAmWO1xnvbKJT14rAtRPe48Ee0x4mqII'
const PROJECT_ID = process.env.SALVAJE_PROJECT    || 'salvaje-app'
const ADMIN_EMAIL = process.env.SALVAJE_ADMIN_EMAIL || 'admin@salvaje.app'
const ADMIN_PASS  = process.env.SALVAJE_ADMIN_PASS  || 'Salvaje2026*'

// ── Bogotá time helpers ─────────────────────────────────────────────────────
function bogotaNow() {
  // Bogotá is UTC-5 (no DST)
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc - 5 * 60 * 60 * 1000)
}

function startOfNextWeek(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = x.getDay() // 0=Sun, 1=Mon
  const daysUntilNextMon = day === 0 ? 1 : (8 - day)
  x.setDate(x.getDate() + daysUntilNextMon)
  return x
}

function endOfNextWeek(start) {
  const x = new Date(start); x.setDate(x.getDate() + 7)
  return x
}

function isLastDayOfMonth(d) {
  const tomorrow = new Date(d); tomorrow.setDate(d.getDate() + 1)
  return tomorrow.getMonth() !== d.getMonth()
}

// ── HTTP helpers ────────────────────────────────────────────────────────────
function request(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : ''
    const u = new URL(url)
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
    const req = https.request(opts, (res) => {
      let d = ''
      res.on('data', c => (d += c))
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }) }
        catch { resolve({ status: res.statusCode, body: d }) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function signIn(email, password) {
  const r = await request('POST',
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { email, password, returnSecureToken: true }
  )
  if (r.status !== 200) throw new Error(`signIn failed: ${JSON.stringify(r.body)}`)
  return r.body
}

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

async function listDocs(col, token) {
  const r = await request('GET', `${BASE}/${col}?pageSize=200`, null, token)
  if (r.status !== 200) throw new Error(`list ${col} failed: ${JSON.stringify(r.body)}`)
  return r.body.documents || []
}

async function addDoc(col, fields, token) {
  const r = await request('POST', `${BASE}/${col}`, { fields }, token)
  if (r.status !== 200) throw new Error(`addDoc ${col} failed: ${JSON.stringify(r.body)}`)
}

const sv = (s) => ({ stringValue: String(s) })
const bv = (b) => ({ booleanValue: Boolean(b) })
const tv = () => ({ timestampValue: new Date().toISOString() })

function getStr(doc, field) { return doc.fields?.[field]?.stringValue ?? null }

async function createNotification(token, { recipientId, recipientRole, type, title, body, relatedId = null }) {
  await addDoc('notifications', {
    recipientId: sv(recipientId),
    recipientRole: sv(recipientRole),
    type: sv(type),
    title: sv(title),
    body: sv(body),
    relatedId: relatedId ? sv(relatedId) : { nullValue: null },
    relatedCollection: { nullValue: null },
    isRead: bv(false),
    sentAt: tv(),
    readAt: { nullValue: null },
    createdAt: tv(),
  }, token)
}

// ── Job: Saturday 4pm reminder for coaches without plan ─────────────────────
async function jobSaturdayPlanReminder(token, now) {
  if (now.getDay() !== 6 || now.getHours() < 16) {
    return { skipped: 'Not Saturday ≥4pm Bogotá' }
  }
  console.log('[Job] Saturday plan reminder running...')
  const nextMon = startOfNextWeek(now)
  const nextSun = endOfNextWeek(nextMon)
  console.log(`Next week: ${nextMon.toISOString()} → ${nextSun.toISOString()}`)

  // Get all active coaches
  const coachDocs = await listDocs('coaches', token)
  const activeCoaches = coachDocs.filter((d) => d.fields?.isActive?.booleanValue !== false)

  // Get all weekly_plans
  const planDocs = await listDocs('weekly_plans', token)
  const coachesWithPlan = new Set()
  for (const p of planDocs) {
    const weekStartStr = p.fields?.weekStart?.timestampValue
    if (!weekStartStr) continue
    const wStart = new Date(weekStartStr)
    if (wStart >= nextMon && wStart < nextSun) {
      coachesWithPlan.add(getStr(p, 'coachId'))
    }
  }

  let reminded = 0
  for (const c of activeCoaches) {
    const coachId = c.name.split('/').pop()
    if (coachesWithPlan.has(coachId)) continue
    const name = getStr(c, 'displayName') || 'Coach'
    await createNotification(token, {
      recipientId: coachId,
      recipientRole: 'coach',
      type: 'weekly_plan_reminder',
      title: '⏰ Recuerda subir tu plan semanal',
      body: `${name.split(' ')[0]}, no tienes plan para la semana del ${nextMon.toLocaleDateString('es-CO')}. Súbelo hoy antes de las 4pm para que los usuarios puedan reservar.`,
    })
    console.log(`✓ Reminded: ${name}`)
    reminded++
  }
  return { reminded, total: activeCoaches.length, withPlan: coachesWithPlan.size }
}

// ── Job: Day 15 of month — Q1 payroll ready for approval ────────────────────
async function jobMonthlyPayrollAlert(token, now) {
  const day = now.getDate()
  const isQ1Day = day === 15
  const isQ2Day = isLastDayOfMonth(now) && day >= 28

  if (!isQ1Day && !isQ2Day) {
    return { skipped: `Not payroll day (today=${day})` }
  }

  // Find the admin uid
  const adminDocs = await listDocs('admins', token)
  if (!adminDocs.length) return { skipped: 'no admin found' }
  const adminUid = adminDocs[0].name.split('/').pop()
  const quincena = isQ1Day ? 'Q1 (días 1-15)' : 'Q2 (días 16-fin de mes)'

  await createNotification(token, {
    recipientId: adminUid,
    recipientRole: 'admin',
    type: 'payroll_due',
    title: '💰 Nómina lista para aprobar',
    body: `Hoy se cierra la nómina ${quincena}. Revisa y aprueba para procesar el pago a coaches.`,
  })
  console.log(`✓ Admin notified about ${quincena}`)
  return { notified: 1, quincena }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== SALVAJE Cron ===')
  const now = bogotaNow()
  console.log(`Bogotá now: ${now.toISOString()} (day=${now.getDay()}, hour=${now.getHours()}, date=${now.getDate()})`)

  const session = await signIn(ADMIN_EMAIL, ADMIN_PASS)
  const token = session.idToken

  const r1 = await jobSaturdayPlanReminder(token, now)
  console.log('Job1:', JSON.stringify(r1))

  const r2 = await jobMonthlyPayrollAlert(token, now)
  console.log('Job2:', JSON.stringify(r2))

  console.log('=== Done ===')
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
