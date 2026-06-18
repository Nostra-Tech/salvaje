import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const recipients = JSON.parse(readFileSync(join(__dirname, '..', 'emails', 'recipients.json'), 'utf8'))

const SERVICE_ID = 'service_xvcfamx'
const TEMPLATE_ID = 'template_rt4ncdt'
const PUBLIC_KEY = '9x8B2s3IZA6MAtuJe'
const SUBJECT = 'Polla Mundialista Salvaje — Tu posición y pendientes'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let ok = 0
const fails = []

for (let i = 0; i < recipients.length; i++) {
  const r = recipients[i]
  if (!r.email) { fails.push(`#${i + 1} sin email`); continue }
  const params = {
    email: r.email,
    to_email: r.email,
    subject: SUBJECT,
    nombre: r.nombre || (r.nombre_completo || '').split(' ')[0],
    posicion: r.posicion,
    total: r.total,
    puntos: r.puntos,
    marcadores_puestos: r.marcadores_puestos,
    faltan: r.faltan,
    partidos_hoy_msg: r.partidos_hoy_msg,
    cta_url: r.cta_url,
  }
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'https://salvaje-app.web.app' },
      body: JSON.stringify({ service_id: SERVICE_ID, template_id: TEMPLATE_ID, user_id: PUBLIC_KEY, template_params: params }),
    })
    const txt = await res.text()
    if (res.status === 200) { ok++; console.log(`OK  ${String(i + 1).padStart(2, '0')}  ${r.email}`) }
    else { fails.push(`${r.email} → ${res.status} ${txt}`); console.log(`ERR ${String(i + 1).padStart(2, '0')}  ${r.email} → ${res.status} ${txt}`) }
  } catch (e) {
    fails.push(`${r.email} → ${e.message}`)
    console.log(`ERR ${String(i + 1).padStart(2, '0')}  ${r.email} → ${e.message}`)
  }
  await sleep(700) // respeta el rate-limit de EmailJS
}

console.log(`\nEnviados OK: ${ok}/${recipients.length}`)
if (fails.length) console.log('Fallidos:\n' + fails.join('\n'))
