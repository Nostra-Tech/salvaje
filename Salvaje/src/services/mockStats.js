/**
 * Datos del módulo "Salvaje Mock" para el panel de superadmin.
 * Lee la colección `mock_inscriptions` (la que escribe la landing /mock) y
 * gestiona las notificaciones de nuevo registro para los admins.
 */
import { collection, onSnapshot, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage, auth } from './firebase'

/** Marca una inscripción como pagada / no pagada. */
export async function setMockPaid(id, paid) {
  await updateDoc(doc(db, 'mock_inscriptions', id), {
    paid: !!paid,
    paidAt: paid ? serverTimestamp() : null,
  })
}

/** Elimina una inscripción. */
export async function deleteMockInscription(id) {
  await deleteDoc(doc(db, 'mock_inscriptions', id))
}

/**
 * Sube el comprobante de pago y guarda su URL en la inscripción.
 * Usa la ruta `payment_receipts/{adminUid}/...` ya permitida por las storage.rules
 * vigentes (write si el uid de la ruta == uid autenticado; los admins pueden leer).
 */
export async function uploadMockComprobante(id, file) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('No autenticado')
  const safe = (file.name || 'comprobante').replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `payment_receipts/${uid}/mock_${id}_${Date.now()}_${safe}`
  const r = ref(storage, path)
  await uploadBytes(r, file)
  const url = await getDownloadURL(r)
  await updateDoc(doc(db, 'mock_inscriptions', id), {
    comprobanteURL: url,
    comprobanteName: file.name || 'comprobante',
    comprobanteAt: serverTimestamp(),
  })
  return url
}

const fmtExcelDate = (ts) => {
  if (!ts) return ''
  let d
  if (typeof ts.toDate === 'function') d = ts.toDate()
  else if (ts.seconds) d = new Date(ts.seconds * 1000)
  else d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Descarga un Excel (.xls vía HTML) con una tabla organizada y con bordes.
 * No requiere dependencias: Excel abre el HTML respetando los estilos de borde.
 */
export function downloadMockExcel(rows) {
  const COLS = [
    ['Nombre', 'nombre'],
    ['Correo', 'email'],
    ['Celular', 'celular'],
    ['Ciudad', 'ciudad'],
    ['Formato', 'formato'],
    ['Categoría', 'categoria'],
    ['Preparación / objetivo', 'preparacion'],
    ['Pagó', (r) => (r.paid ? 'Sí' : 'No')],
    ['Comprobante', (r) => (r.comprobanteURL ? r.comprobanteURL : '')],
    ['Fecha y hora', (r) => fmtExcelDate(r.createdAt)],
  ]
  const head = COLS.map(([h]) => `<th>${esc(h)}</th>`).join('')
  const body = rows.map((r) => {
    const tds = COLS.map(([, key]) => {
      const val = typeof key === 'function' ? key(r) : r[key]
      return `<td>${esc(val)}</td>`
    }).join('')
    return `<tr>${tds}</tr>`
  }).join('')

  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="UTF-8" />' +
    '<style>' +
    'table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt;}' +
    'th,td{border:1px solid #000000;padding:6px 10px;vertical-align:top;}' +
    'th{background:#D4521A;color:#FFFFFF;font-weight:bold;text-align:left;}' +
    'tr:nth-child(even) td{background:#FAF6F0;}' +
    '</style></head><body>' +
    `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>` +
    '</body></html>'

  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `salvaje-mock-inscritos-${stamp}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Suscripción en tiempo real a las inscripciones del Mock. Llama a `onData`
 * con un array de inscripciones (ordenadas por fecha desc) cada vez que cambia.
 * Devuelve la función para cancelar la suscripción.
 */
export function subscribeMockInscriptions(onData, onError) {
  return onSnapshot(
    collection(db, 'mock_inscriptions'),
    (snap) => {
      const rows = []
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }))
      rows.sort((a, b) => (toMs(b.createdAt) - toMs(a.createdAt)))
      onData(rows)
    },
    onError,
  )
}

function toMs(ts) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (ts.seconds) return ts.seconds * 1000
  const t = new Date(ts).getTime()
  return Number.isNaN(t) ? 0 : t
}

// ── Notificaciones de NUEVA INSCRIPCIÓN al Mock ──────────────────────────────
// La landing /mock es sin auth y no puede escribir en `notifications`. Como no
// hay Cloud Functions, el aviso lo genera la sesión del admin (autenticada):
// un listener en vivo sobre `mock_inscriptions` crea una notificación nativa
// por cada inscripción NUEVA, deduplicada con un id determinístico.

async function createMockNotif(adminUid, inscriptionId, data) {
  const safe = String(inscriptionId).replace(/[^a-zA-Z0-9_-]/g, '_')
  const notifId = `mockreg_${safe}_${adminUid}`
  const name = data.nombre || data.email || 'Nuevo inscrito'
  await setDoc(doc(db, 'notifications', notifId), {
    recipientId: adminUid,
    recipientRole: 'admin',
    senderId: null,
    senderName: 'Salvaje Mock',
    senderRole: 'system',
    senderPhotoURL: null,
    type: 'mock_registration',
    title: 'Nueva inscripción · Salvaje Mock',
    body: `${name} se inscribió a la Mock Competition (${data.formato || 'sin formato'}).`,
    relatedId: inscriptionId,
    relatedCollection: 'mock_inscriptions',
    actionType: 'view',
    actionUrl: '/superadmin/salvaje-mock',
    isRead: false,
    sentAt: serverTimestamp(),
    readAt: null,
    createdAt: serverTimestamp(),
  })
}

/**
 * Observa `mock_inscriptions` y dispara una notificación al `adminUid` por cada
 * inscripción nueva. Semilla: lee las notificaciones que el admin ya tiene para
 * no repetir ni spamear el historial. Devuelve la función para cancelar.
 */
export function watchMockRegistrations(adminUid, onError) {
  if (!adminUid) return () => {}
  const notified = new Set()

  const seedReady = getDocs(query(collection(db, 'notifications'), where('recipientId', '==', adminUid)))
    .then((snap) => {
      snap.forEach((d) => {
        const n = d.data()
        if (n.type === 'mock_registration' && n.relatedId) notified.add(n.relatedId)
      })
    })
    .catch((e) => console.warn('[mock reg] no se pudo leer notifs previas:', e?.code, e?.message))

  return onSnapshot(
    collection(db, 'mock_inscriptions'),
    async (snap) => {
      await seedReady
      const added = snap.docChanges().filter((c) => c.type === 'added')
      for (const c of added) {
        const id = c.doc.id
        if (notified.has(id)) continue
        notified.add(id)
        try {
          await createMockNotif(adminUid, id, c.doc.data())
        } catch (e) {
          console.warn('[mock reg notif] no se pudo crear:', e?.code, e?.message)
          notified.delete(id)
        }
      }
    },
    onError,
  )
}
