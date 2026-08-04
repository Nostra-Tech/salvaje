/**
 * Salvaje Splash Admin — servicio del centro de operaciones comercial.
 *
 * Fuentes de verdad:
 *  - Ventas/leads REALES: colección `mock_inscriptions` (los registros de la
 *    landing /splash; paid=true = entrada vendida).
 *  - Operación diaria: `splash_admin_days/{yyyy-mm-dd}` — métricas manuales de
 *    pauta (Meta/TikTok no exponen API sin backend), checklist del plan diario
 *    y notas. Solo admins (ver firestore.rules).
 *
 * Este archivo también contiene los "cerebros" del sistema:
 *  - computeStats: todas las métricas del dashboard.
 *  - computeSuggestions: motor de reglas (copiloto) que convierte datos en acciones.
 *  - buildDayPlan: playbook de campaña que genera el plan de cada día.
 */
import { collection, doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// ── Configuración de campaña ────────────────────────────────────────────────
export const EVENT_MS = new Date('2026-08-22T00:00:00-05:00').getTime()
export const META_ENTRADAS = 100
export const LANDING_URL = 'https://salvaje-app.web.app/splash'
export const PAY_URL = 'https://checkout.bold.co/payment/LNK_BRZ6H1YX3G'

export const STAGES = [
  { key: 'early', label: 'Splash Early', endMs: new Date('2026-08-01T00:00:00-05:00').getTime(), price: 59900 },
  { key: 'pass', label: 'Salvaje Pass', endMs: new Date('2026-08-12T00:00:00-05:00').getTime(), price: 69900 },
  { key: 'last', label: 'Last Wave', endMs: EVENT_MS, price: 84900 },
]
export const stageForMs = (ms) => STAGES.find((s) => ms < s.endMs) || STAGES[STAGES.length - 1]
export const currentStage = () => stageForMs(Date.now())

// ── Utilidades ──────────────────────────────────────────────────────────────
export const isSplash = (r) => r.source === 'landing-splash' || r.evento === 'Salvaje Splash'
export const toMs = (ts) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : (ts ? new Date(ts).getTime() : 0))

const _co = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' })
export const dayKey = (ms) => _co.format(new Date(ms))
export const todayKey = () => dayKey(Date.now())
export const fmtCOP = (n) => '$' + Math.round(n || 0).toLocaleString('es-CO')
export const shortDay = (key) => {
  const d = new Date(key + 'T12:00:00-05:00')
  return d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'short', day: 'numeric' })
}

// ── Suscripciones ───────────────────────────────────────────────────────────
export function subscribeSplashRows(onData, onError) {
  return onSnapshot(
    collection(db, 'mock_inscriptions'),
    (snap) => {
      const rows = []
      snap.forEach((d) => { const r = { id: d.id, ...d.data() }; if (isSplash(r)) rows.push(r) })
      rows.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
      onData(rows)
    },
    onError,
  )
}

export function subscribeDays(onData, onError) {
  return onSnapshot(
    collection(db, 'splash_admin_days'),
    (snap) => {
      const map = {}
      snap.forEach((d) => (map[d.id] = d.data()))
      onData(map)
    },
    onError,
  )
}

export async function saveDayMetrics(key, patch) {
  await setDoc(doc(db, 'splash_admin_days', key), { ...patch, updatedAt: serverTimestamp() }, { merge: true })
}

export async function toggleTask(key, taskId, done) {
  await setDoc(doc(db, 'splash_admin_days', key), { tasks: { [taskId]: done }, updatedAt: serverTimestamp() }, { merge: true })
}

// ── CRM (campos crm* sobre la inscripción) ──────────────────────────────────
export const CRM_ESTADOS = ['Nuevo', 'Contactado', 'Interesado', 'Pagó', 'Perdido']

export async function setCrmEstado(id, estado) {
  await updateDoc(doc(db, 'mock_inscriptions', id), { crmEstado: estado, crmUpdatedAt: serverTimestamp() })
}
export async function markContacted(id, via) {
  await updateDoc(doc(db, 'mock_inscriptions', id), {
    crmEstado: 'Contactado',
    crmLastContactAt: serverTimestamp(),
    crmLastVia: via,
    crmUpdatedAt: serverTimestamp(),
  })
}
export async function setCrmNota(id, nota) {
  await updateDoc(doc(db, 'mock_inscriptions', id), { crmNota: nota, crmUpdatedAt: serverTimestamp() })
}

/** Mensaje de WhatsApp de venta con la etapa/precio vigente. */
export function crmWhatsAppText(nombre) {
  const st = currentStage()
  const next = STAGES[STAGES.indexOf(st) + 1]
  const sube = next ? ` y el ${new Date(st.endMs).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long' })} sube a ${fmtCOP(next.price)}` : ''
  return (
    `¡Hola ${nombre || ''}! 🌊 Soy del equipo SALVAJE. Vi que separaste tu cupo para Salvaje Splash ` +
    `(sábado 22 de agosto): entrenamiento, DJ en vivo, pista jabonosa, inflable, comida y premios — no es un entrenamiento, es un parche. ` +
    `Tu entrada ${st.label} está en ${fmtCOP(st.price)}${sube}. ¿Te ayudo a completar el pago? Aquí el link directo: ${PAY_URL}`
  )
}

// ── Métricas del dashboard ──────────────────────────────────────────────────
export function computeStats(rows, daysMap) {
  const now = Date.now()
  const paid = rows.filter((r) => r.paid)
  const leads = rows.filter((r) => !r.paid)
  const daysLeft = Math.max(0, Math.ceil((EVENT_MS - now) / 86400000))
  const faltan = Math.max(0, META_ENTRADAS - paid.length)
  const paceNeeded = daysLeft > 0 ? faltan / daysLeft : faltan

  // Ventas por día (últimos 14 días) — usa paidAt si existe, si no createdAt.
  const ventasPorDia = {}
  for (const r of paid) {
    const k = dayKey(toMs(r.paidAt) || toMs(r.createdAt) || now)
    ventasPorDia[k] = (ventasPorDia[k] || 0) + 1
  }
  const registrosPorDia = {}
  for (const r of rows) {
    const k = dayKey(toMs(r.createdAt) || now)
    registrosPorDia[k] = (registrosPorDia[k] || 0) + 1
  }
  const last14 = []
  for (let i = 13; i >= 0; i--) {
    const k = dayKey(now - i * 86400000)
    last14.push({ key: k, ventas: ventasPorDia[k] || 0, registros: registrosPorDia[k] || 0 })
  }
  const ventas7 = last14.slice(-7).reduce((a, d) => a + d.ventas, 0)
  const ritmo7 = ventas7 / 7
  const ventasHoy = ventasPorDia[todayKey()] || 0
  const registrosHoy = registrosPorDia[todayKey()] || 0

  const conversion = rows.length ? paid.length / rows.length : 0
  const ingresos = paid.reduce((a, r) => a + (Number(r.boldAmount) || stageForMs(toMs(r.paidAt) || toMs(r.createdAt) || now).price), 0)

  // Pauta (manual): acumula todos los días registrados.
  let spend = 0, impressions = 0, clicks = 0
  for (const d of Object.values(daysMap || {})) {
    spend += Number(d.adSpend) || 0
    impressions += Number(d.adImpressions) || 0
    clicks += Number(d.adClicks) || 0
  }
  const ctr = impressions > 0 ? clicks / impressions : null
  const cpc = clicks > 0 ? spend / clicks : null
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : null
  const cpa = spend > 0 && paid.length > 0 ? spend / paid.length : null
  const roas = spend > 0 ? ingresos / spend : null

  // Semáforo por ritmo (ritmo real de la última semana vs necesario).
  const ratio = paceNeeded > 0 ? ritmo7 / paceNeeded : 1
  const semaforo = ratio >= 0.9 ? 'verde' : ratio >= 0.45 ? 'amarillo' : 'rojo'

  const sinContactar = leads.filter((l) => !l.crmLastContactAt && l.crmEstado !== 'Perdido').length

  return {
    now, daysLeft, meta: META_ENTRADAS, vendidas: paid.length, faltan, paceNeeded, ritmo7,
    ventasHoy, registrosHoy, leads: leads.length, sinContactar, conversion, ingresos,
    last14, spend, impressions, clicks, ctr, cpc, cpm, cpa, roas, semaforo, ratio,
    stage: currentStage(),
  }
}

// ── Copiloto: motor de reglas → acciones del día ───────────────────────────
export function computeSuggestions(s) {
  const out = []
  const add = (nivel, texto) => out.push({ nivel, texto })

  if (s.ratio < 0.5) {
    add('alta', `Vas a ${s.ritmo7.toFixed(1)} ventas/día y necesitas ${s.paceNeeded.toFixed(1)}/día para llegar a ${s.meta}. Plan de choque HOY: sube presupuesto de pauta, 2 UGC extra y barrido completo de WhatsApp en el CRM.`)
  } else if (s.ratio < 0.9) {
    add('alta', `Ritmo por debajo de lo necesario (${s.ritmo7.toFixed(1)} vs ${s.paceNeeded.toFixed(1)}/día). Refuerza el canal que más convierte y agrega 1 contenido extra hoy.`)
  }
  if (s.sinContactar > 0) {
    add('alta', `${s.sinContactar} lead(s) SIN CONTACTAR en el CRM. Son la venta más barata que tienes: escríbeles por WhatsApp ahora (botón listo con mensaje y link de pago).`)
  }
  if (s.vendidas > 0 && s.vendidas < 20) {
    add('media', `Tienes ${s.vendidas} compradores: actívalos como vendedores. Pídeles 1 historia etiquetando @salvaje y ofrece incentivo por referido (el "parche" se vende en grupo, no individual).`)
  }
  if (s.spend === 0) {
    add('media', 'No hay inversión de pauta registrada. Con 19 días y meta 100, el orgánico solo no alcanza: enciende Meta Ads (público lookalike de compradores + intereses fitness/festivales locales) y registra el gasto diario aquí.')
  }
  if (s.ctr != null && s.ctr < 0.01 && s.impressions > 1000) {
    add('alta', `CTR ${(s.ctr * 100).toFixed(2)}% (<1%): el creativo no engancha. Reemplázalo por UGC real (gente mojándose/riéndose) con hook "hace rato no hacía algo diferente con mis amigos".`)
  }
  if (s.conversion < 0.4 && s.leads >= 5) {
    add('media', `Conversión registro→pago ${(s.conversion * 100).toFixed(0)}%. Los leads se enfrían: contacto por WhatsApp máx. 15 min después del registro y recordatorio a las 24 h.`)
  }
  const daysToLast = Math.max(0, Math.ceil((STAGES[1].endMs - s.now) / 86400000))
  if (daysToLast > 0 && daysToLast <= 8) {
    add('media', `El precio sube a ${fmtCOP(STAGES[2].price)} en ${daysToLast} día(s) (Last Wave, 12 de agosto): úsalo como urgencia en TODO el contenido de esta semana.`)
  }
  if (s.registrosHoy === 0) {
    add('media', 'Hoy aún no entran registros: publica 1 historia con CTA directo a la landing y comparte el link en estados de WhatsApp del equipo.')
  }
  if (out.length === 0) add('ok', 'Ritmo sano. Mantén el sistema: contenido diario, leads contactados en <15 min y métricas registradas.')
  return out
}

// ── Playbook: plan diario de campaña ────────────────────────────────────────
const WD = (key) => new Date(key + 'T12:00:00-05:00').getDay() // 0=dom
export function buildDayPlan(key, s) {
  const daysLeft = Math.max(0, Math.ceil((EVENT_MS - new Date(key + 'T12:00:00-05:00').getTime()) / 86400000))
  const phase = daysLeft > 10 ? 'volumen' : daysLeft > 3 ? 'urgencia' : 'cierre'
  const wd = WD(key)

  const focus = {
    volumen: 'FASE VOLUMEN — Sembrar el "parche": UGC diario, prueba social y todos los leads contactados. Hoy el objetivo es que más gente ENTRE al embudo.',
    urgencia: `FASE URGENCIA — El precio sube el 12 de agosto (Last Wave ${fmtCOP(STAGES[2].price)}). Todo el contenido de hoy gira en torno a "quedan pocos días al precio actual".`,
    cierre: 'FASE CIERRE — Últimos días. Countdown en todo, lives desde el lugar, remarketing a todo el que tocó la marca y barrido final de WhatsApp.',
  }[phase]

  const t = []
  const add = (slot, cat, label) => t.push({ id: `${key}-${t.length}`, slot, cat, label })

  // Núcleo diario (no negociable)
  add('Mañana', 'Grabar', 'Grabar 1 video UGC (participante o equipo): hook "no es un entrenamiento, es un parche" / "hace rato no hacía algo diferente con mis amigos"')
  add('Mañana', 'Publicar', 'Publicar 3 historias IG: (1) contenido del evento, (2) encuesta/sticker interactivo, (3) CTA con link a la landing')
  add('Mañana', 'Publicar', 'Publicar 1 Reel en IG y cruzarlo a TikTok y Facebook')
  add('Tarde', 'CRM', 'Contactar TODOS los leads nuevos por WhatsApp (CRM → botón WhatsApp) + 10 seguimientos de leads viejos')
  add('Tarde', 'Pauta', 'Revisar Meta Ads: apagar anuncios con CTR <1%, escalar el ganador (+20% presupuesto)')
  add('Noche', 'Publicar', 'Historia de cierre del día con urgencia (precio sube el 12 de agosto) + CTA')
  add('Noche', 'Medir', 'Registrar métricas del día en el Dashboard (gasto pauta, impresiones, clics) — 2 minutos')

  // Extras por día de semana
  if (wd === 1) add('Mañana', 'Email', 'Enviar email a la base: recordatorio + prueba social (plantilla en emails/)')
  if (wd === 3) add('Tarde', 'Influencers', 'Activar/cobrar 1 colaboración: entrada gratis a micro-influencer local a cambio de 2 historias + 1 reel')
  if (wd === 5) add('Tarde', 'Activación', 'Empujar "parche completo": mensaje a compradores para que armen su grupo (incentivo por traer 3+ amigos)')
  if (wd === 0) add('Noche', 'Optimizar', 'Retro semanal: qué canal vendió más, qué contenido rindió, plan de la semana siguiente')

  // Extras por fase
  if (phase === 'volumen') add('Tarde', 'Grabar', 'Grabar 1 testimonio de comprador ("por qué voy a Splash") para banco de contenido')
  if (phase === 'urgencia') add('Mañana', 'Publicar', 'Historia countdown: "X días al precio actual" con sticker de cuenta regresiva')
  if (phase === 'cierre') {
    add('Tarde', 'Publicar', 'Live corto desde el lugar del evento mostrando el montaje (pista, inflable, tarima)')
    add('Tarde', 'CRM', 'Barrido total: WhatsApp a TODO lead no perdido con "últimas entradas"')
  }
  return { focus, phase, daysLeft, tasks: t }
}

// ── Qué medir hoy (fijo) ────────────────────────────────────────────────────
export const MEDIR_HOY = [
  'Ventas del día (automático aquí)',
  'Registros nuevos y % contactados en <15 min',
  'Gasto de pauta, impresiones, clics (registrarlos en Dashboard)',
  'Contenido publicado: alcance del mejor reel/historia',
  'Respuesta de WhatsApp: cuántos contestaron / cuántos pagaron',
]
