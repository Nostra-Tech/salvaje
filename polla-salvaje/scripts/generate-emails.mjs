/**
 * Genera los correos personalizados de la Polla Mundialista Salvaje.
 * Lee Firestore (polla_users, polla_predictions, polla_results), calcula
 * posición en el ranking, marcadores faltantes y partidos de HOY pendientes,
 * y produce:
 *   - emails/_template.html      → plantilla para EmailJS (con {{variables}})
 *   - emails/recipients.json     → params por usuario para EmailJS
 *   - emails/<correo>.html       → correo ya personalizado (preview/registro)
 */
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { GROUP_MATCHES } from '../src/data/worldCup.js'
import { computeUserScore } from '../src/services/scoring.js'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'emails')
mkdirSync(OUT, { recursive: true })

// ── Fecha objetivo para "partidos de hoy" ──────────────────────────────
const HOY_LABEL = '12 de junio' // partidos del 12/06/2026
const HOY_FECHA_TXT = '12 de junio de 2026'
const CTA_URL = 'https://salvaje-app.web.app/pollamundialistasalvaje/'
const LOGO = 'https://salvaje-app.web.app/pollamundialistasalvaje/salvaje-logo-white.png'
const BANNER = 'https://salvaje-app.web.app/pollamundialistasalvaje/email-banner.png'

const app = initializeApp({
  apiKey: 'AIzaSyCVAmWO1xnvbKJT14rAtRPe48Ee0x4mqII',
  authDomain: 'salvaje-app.firebaseapp.com',
  projectId: 'salvaje-app',
  storageBucket: 'salvaje-app.firebasestorage.app',
  messagingSenderId: '862256463582',
  appId: '1:862256463582:web:fb233538fb6557ae6a8c4f',
})
const db = getFirestore(app)

const hasScore = (s) => s && s.a !== '' && s.a != null && s.b !== '' && s.b != null
const safe = (s) => String(s || '').replace(/[^a-zA-Z0-9._-]/g, '_')

const [usersSnap, predsSnap, resDoc] = await Promise.all([
  getDocs(collection(db, 'polla_users')),
  getDocs(collection(db, 'polla_predictions')),
  getDoc(doc(db, 'polla_results', 'current')),
])
const users = {}; usersSnap.forEach((d) => (users[d.id] = d.data()))
const preds = {}; predsSnap.forEach((d) => (preds[d.id] = d.data()))
const results = resDoc.exists() ? resDoc.data() : { scores: {}, qualifiers: {}, bestThirds: [] }

// Ranking
const ranking = Object.keys(users).map((id) => {
  const u = users[id]
  const pred = preds[id] || { scores: {}, qualifiers: {}, bestThirds: [] }
  const breakdown = computeUserScore(pred, results)
  const scoresFilled = GROUP_MATCHES.filter((m) => hasScore(pred.scores?.[m.id])).length
  return { id, name: u.fullName || id, email: u.email || '', phone: u.phone || '', pred, score: breakdown.total, scoresFilled }
}).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))

const total = ranking.length
const matchesHoy = GROUP_MATCHES.filter((m) => (m.date || '').includes(HOY_LABEL))

// ── Plantilla branded (tabla, inline styles, email-safe) ────────────────
function render(v) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:#EDE6D8;font-family:'DM Sans',Arial,Helvetica,sans-serif;color:#2C1810;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDE6D8;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FAF6F0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(44,24,16,.15);">

  <!-- Banner (solo imagen) -->
  <tr><td style="padding:0;font-size:0;line-height:0;">
    <img src="${BANNER}" width="600" alt="SALVAJE — Polla Mundialista" style="display:block;width:100%;max-width:600px;height:auto;border:0;"/>
  </td></tr>

  <!-- Saludo -->
  <tr><td style="padding:28px 28px 6px;">
    <div style="font-family:'Bebas Neue',Arial Black,sans-serif;font-size:30px;letter-spacing:1px;color:#2C1810;">Hola, ${v.nombre}</div>
    <p style="font-size:15px;line-height:1.6;color:#6B5C52;margin:8px 0 0;">Así vas en la <strong style="color:#2C1810;">Polla Mundialista Salvaje</strong>:</p>
  </td></tr>

  <!-- Posición -->
  <tr><td style="padding:18px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A0F0A;border-radius:14px;">
      <tr>
        <td style="padding:20px 22px;">
          <div style="color:#C9A227;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Tu posición</div>
          <div style="font-family:'Bebas Neue',Arial Black,sans-serif;color:#FAF6F0;font-size:46px;line-height:1;">#${v.posicion} <span style="font-size:18px;color:#8a7a6c;">de ${v.total}</span></div>
        </td>
        <td align="right" style="padding:20px 22px;">
          <div style="color:#C9A227;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Puntos</div>
          <div style="font-family:'Bebas Neue',Arial Black,sans-serif;color:#E8732A;font-size:46px;line-height:1;">${v.puntos}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Faltantes -->
  <tr><td style="padding:16px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #F0E6D2;border-radius:14px;">
      <tr><td style="padding:18px 22px;">
        <div style="font-size:13px;color:#6B5C52;">Marcadores pronosticados</div>
        <div style="font-family:'Bebas Neue',Arial Black,sans-serif;font-size:26px;color:#2C1810;">${v.puestos} <span style="font-size:15px;color:#9b8b7c;">/ 72</span></div>
        ${v.faltanLine}
      </td></tr>
    </table>
  </td></tr>

  <!-- Partidos de hoy -->
  <tr><td style="padding:16px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${v.hoyPend ? '#FDEEE6' : '#EAF5EE'};border:1px solid ${v.hoyPend ? '#F3C9B3' : '#BFE3CD'};border-radius:14px;">
      <tr><td style="padding:18px 22px;">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${v.hoyPend ? '#D4521A' : '#2D7A4F'};font-weight:700;">Partidos de hoy · ${HOY_FECHA_TXT}</div>
        <div style="margin-top:6px;font-size:15px;line-height:1.6;color:#2C1810;">${v.hoyMsg}</div>
      </td></tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td align="center" style="padding:26px 28px 8px;">
    <a href="${v.cta_url}" style="display:inline-block;background:#D4521A;color:#fff;text-decoration:none;font-family:'Bebas Neue',Arial Black,sans-serif;font-size:18px;letter-spacing:2px;text-transform:uppercase;padding:15px 34px;border-radius:999px;">Pronosticar ahora →</a>
  </td></tr>
  <tr><td align="center" style="padding:0 28px 24px;">
    <p style="font-size:12px;color:#9b8b7c;margin:8px 0 0;">Recuerda: cada marcador se puede editar hasta 5 minutos antes del inicio del partido.</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#1A0F0A;padding:18px 24px;text-align:center;">
    <div style="font-family:'Bebas Neue',Arial Black,sans-serif;color:#FAF6F0;font-size:18px;letter-spacing:3px;">SALVAJE · VIDA DEPORTIVA</div>
    <div style="color:#6B5C52;font-size:11px;margin-top:4px;">Sin excusas. Sin límites.</div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}

const recipients = []
for (let i = 0; i < ranking.length; i++) {
  const r = ranking[i]
  const pred = r.pred
  const pendHoy = matchesHoy.filter((m) => !hasScore(pred.scores?.[m.id]))
  const hoyPend = pendHoy.length > 0
  const listaHoy = matchesHoy.map((m) => `${m.teamA} vs ${m.teamB}`).join(' · ')
  const hoyMsg = matchesHoy.length === 0
    ? 'No hay partidos programados para hoy.'
    : hoyPend
      ? `⚠ Aún te falta pronosticar: <strong>${pendHoy.map((m) => `${m.teamA} vs ${m.teamB}`).join(', ')}</strong>. ¡No te quedes sin puntos!`
      : `✓ ¡Ya pronosticaste los partidos de hoy (${listaHoy})!`

  const faltan = 72 - r.scoresFilled
  const faltanLine = faltan > 0
    ? `<div style="margin-top:6px;font-size:14px;color:#D4521A;font-weight:700;">Te faltan ${faltan} marcadores por pronosticar.</div>`
    : `<div style="margin-top:6px;font-size:14px;color:#2D7A4F;font-weight:700;">¡Tienes los 72 marcadores completos! 💪</div>`
  const v = {
    nombre: (r.name || '').split(' ')[0] || r.name,
    posicion: i + 1,
    total,
    puntos: r.score,
    puestos: r.scoresFilled,
    faltan,
    faltanLine,
    hoyPend,
    hoyMsg,
    cta_url: CTA_URL,
  }
  const hoyMsgTxt = matchesHoy.length === 0
    ? 'No hay partidos programados para hoy.'
    : hoyPend
      ? `Aún te falta pronosticar: ${pendHoy.map((m) => `${m.teamA} vs ${m.teamB}`).join(', ')}. ¡No te quedes sin puntos!`
      : `¡Ya pronosticaste los partidos de hoy (${listaHoy})!`

  recipients.push({
    email: r.email,
    nombre: v.nombre,
    nombre_completo: r.name,
    telefono: r.phone,
    posicion: v.posicion,
    total: v.total,
    puntos: v.puntos,
    marcadores_puestos: v.puestos,
    faltan: v.faltan,
    partidos_hoy: matchesHoy.map((m) => `${m.teamA} vs ${m.teamB}`),
    partidos_hoy_pendientes: pendHoy.map((m) => `${m.teamA} vs ${m.teamB}`),
    partidos_hoy_msg: hoyMsgTxt,
    cta_url: CTA_URL,
  })

  writeFileSync(join(OUT, `${String(i + 1).padStart(2, '0')}_${safe(r.email || r.name)}.html`), render(v), 'utf8')
}

// Plantilla EmailJS (variables de texto)
const tplVars = {
  nombre: '{{nombre}}', posicion: '{{posicion}}', total: '{{total}}', puntos: '{{puntos}}',
  puestos: '{{marcadores_puestos}}',
  faltanLine: '<div style="margin-top:6px;font-size:14px;color:#D4521A;font-weight:700;">Te faltan {{faltan}} marcadores por pronosticar.</div>',
  hoyPend: true, hoyMsg: '{{partidos_hoy_msg}}', cta_url: '{{cta_url}}',
}
writeFileSync(join(OUT, '_template-emailjs.html'), render(tplVars), 'utf8')
writeFileSync(join(OUT, 'recipients.json'), JSON.stringify(recipients, null, 2), 'utf8')

console.log(`OK · ${ranking.length} correos generados en /emails`)
console.log(`Partidos de hoy (${HOY_LABEL}): ${matchesHoy.map((m) => `${m.teamA} vs ${m.teamB}`).join(', ') || '—'}`)
process.exit(0)
