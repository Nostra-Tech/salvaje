/**
 * Webhook de pagos Bold para Salvaje Splash.
 *
 * Bold envía eventos (SALE_APPROVED, SALE_REJECTED, …) a este endpoint cuando
 * alguien paga con el link de pago. Al recibir un pago APROBADO:
 *   1. Se guarda el evento completo en `bold_payments` (auditoría).
 *   2. Se busca la inscripción de Salvaje Splash cuyo correo coincida con el
 *      del pagador y se marca paid:true con los datos del comprobante
 *      (id de pago Bold, monto, método, fecha).
 *   3. Si ningún registro coincide, el evento queda en `bold_payments` con
 *      matched:false para conciliación manual desde el panel de Bold.
 *
 * Seguridad: la URL exige ?token=<WEBHOOK_TOKEN>. Solo Bold la conoce (va
 * pegada en la configuración del webhook), así nadie puede marcar pagos falsos.
 */
const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')

admin.initializeApp()
const db = admin.firestore()

// Token secreto del endpoint (va en la URL configurada en Bold).
const WEBHOOK_TOKEN = 'slvj-splash-9f3k2m8q1xw7'

const norm = (s) => String(s || '').trim().toLowerCase()

/** Extrae el correo del pagador probando los campos que usa Bold. */
function payerEmail(data = {}) {
  return (
    data.payer_email || data.customer_email || data.user_email ||
    data.payer?.email || data.customer?.email || data.payment_data?.payer_email ||
    data.metadata?.customer_email || ''
  )
}

exports.boldWebhook = onRequest({ region: 'us-central1', cors: false }, async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('method not allowed')
    if ((req.query.token || '') !== WEBHOOK_TOKEN) return res.status(401).send('unauthorized')

    const event = req.body || {}
    const type = String(event.type || '').toUpperCase()
    const data = event.data || {}

    // 1) Auditoría: guarda TODO evento recibido.
    const auditRef = await db.collection('bold_payments').add({
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      type,
      raw: event,
      matched: null,
    })

    // Solo los pagos aprobados marcan inscripciones.
    if (!type.includes('SALE_APPROVED')) {
      await auditRef.update({ matched: 'ignored (not SALE_APPROVED)' })
      return res.status(200).send('ok (ignored)')
    }

    const email = norm(payerEmail(data))
    const paymentId = data.payment_id || data.id || event.subject || auditRef.id
    const amount = data.amount?.total ?? data.amount ?? null
    const method = data.payment_method || data.payment_data?.payment_method || ''

    // 2) Busca la inscripción por correo (comparación en minúsculas, en memoria:
    //    la colección es pequeña y Firestore no filtra case-insensitive).
    let matchedId = null
    if (email) {
      const snap = await db.collection('mock_inscriptions').get()
      const candidates = []
      snap.forEach((d) => {
        const r = d.data()
        const isSplash = r.source === 'landing-splash' || r.evento === 'Salvaje Splash'
        if (isSplash && norm(r.email) === email) candidates.push({ id: d.id, ...r })
      })
      // Prefiere una inscripción sin pagar; si todas están pagadas, toma la última.
      const toMs = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : 0)
      candidates.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
      const target = candidates.find((c) => !c.paid) || candidates[0]
      if (target) {
        matchedId = target.id
        await db.collection('mock_inscriptions').doc(target.id).update({
          paid: true,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          paidVia: 'bold-webhook',
          boldPaymentId: paymentId,
          boldAmount: amount,
          boldMethod: method,
          boldStatus: 'APPROVED',
        })
      }
    }

    await auditRef.update({ matched: matchedId || false, email, paymentId, amount, method })
    return res.status(200).send('ok')
  } catch (err) {
    console.error('boldWebhook error:', err)
    // 200 igualmente: si Bold recibe 5xx reintenta y podría duplicar procesamiento.
    return res.status(200).send('error logged')
  }
})
