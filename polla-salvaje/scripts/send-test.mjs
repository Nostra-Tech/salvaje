const SERVICE_ID = 'service_xvcfamx'
const TEMPLATE_ID = 'template_rt4ncdt'
const PUBLIC_KEY = '9x8B2s3IZA6MAtuJe'
const SUBJECT = 'Polla Mundialista Salvaje — Tu posición y pendientes'

// Usuario de PRUEBA (no existe en la polla) con datos random.
const params = {
  email: 'cristianechavarriaz@gmail.com',
  to_email: 'cristianechavarriaz@gmail.com',
  subject: SUBJECT,
  nombre: 'Cristian',
  posicion: 7,
  total: 21,
  puntos: 8,
  marcadores_puestos: 45,
  faltan: 27,
  partidos_hoy_msg: 'Aún te falta pronosticar: Canadá vs Bosnia, Estados Unidos vs Paraguay. ¡No te quedes sin puntos!',
  cta_url: 'https://salvaje-app.web.app/pollamundialistasalvaje/',
}

const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', origin: 'https://salvaje-app.web.app' },
  body: JSON.stringify({ service_id: SERVICE_ID, template_id: TEMPLATE_ID, user_id: PUBLIC_KEY, template_params: params }),
})
console.log('status:', res.status)
console.log('resp:', await res.text())
