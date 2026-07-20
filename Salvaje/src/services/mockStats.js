/**
 * Datos del módulo "Salvaje Mock" para el panel de superadmin.
 * Lee la colección `mock_inscriptions` (la que escribe la landing /mock) y
 * gestiona las notificaciones de nuevo registro para los admins.
 */
import { collection, onSnapshot, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { db } from './firebase'

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
 * Adjunta el comprobante de pago a la inscripción.
 *
 * NOTA: el proyecto no tiene bucket de Firebase Storage aprovisionado (requiere
 * plan Blaze), así que la imagen se comprime en el navegador y se guarda como
 * data URL dentro del documento de Firestore (límite de doc: 1 MB).
 */
export async function uploadMockComprobante(id, file) {
  const dataUrl = await compressReceipt(file)
  await updateDoc(doc(db, 'mock_inscriptions', id), {
    comprobanteData: dataUrl,
    comprobanteName: file.name || 'comprobante',
    comprobanteAt: serverTimestamp(),
  })
  return dataUrl
}

/** Comprime una imagen a JPEG (máx 1200px) hasta que quepa en Firestore. */
function compressReceipt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        // Baja la calidad hasta caber holgado en el límite de 1 MB del documento.
        for (const q of [0.82, 0.7, 0.55, 0.4, 0.28]) {
          const out = canvas.toDataURL('image/jpeg', q)
          if (out.length < 700_000) return resolve(out)
        }
        reject(new Error('La imagen es demasiado grande. Usa una captura más pequeña.'))
      }
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Guarda un ENLACE externo como comprobante de la inscripción (p. ej. la URL
 * del recibo de Bold). Pasar url vacía elimina el enlace guardado.
 */
export async function setMockComprobanteLink(id, url) {
  const clean = String(url || '').trim()
  if (clean && !/^https?:\/\/.+/i.test(clean)) throw new Error('URL inválida')
  await updateDoc(doc(db, 'mock_inscriptions', id), {
    comprobanteLinkURL: clean || null,
    comprobanteLinkAt: clean ? serverTimestamp() : null,
  })
  return clean
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

/** Excel de inscritos a Salvaje Splash (columnas del formulario Splash). */
export function downloadSplashExcel(rows) {
  const COLS = [
    ['Nombre', 'nombre'],
    ['Correo', 'email'],
    ['Celular', 'celular'],
    ['Ciudad', 'ciudad'],
    ['Contacto autorizado', (r) => (r.contactoAutorizado ? 'Sí' : 'No')],
    ['Pagó', (r) => (r.paid ? 'Sí' : 'No')],
    ['Pago Bold (ID)', (r) => r.boldPaymentId || ''],
    ['Monto Bold', (r) => (r.boldAmount != null ? r.boldAmount : '')],
    ['Comprobante', (r) => (r.comprobanteData ? 'Adjunto (ver en panel)' : r.comprobanteURL ? r.comprobanteURL : '')],
    ['Enlace comprobante', (r) => (r.comprobanteLinkURL ? r.comprobanteLinkURL : '')],
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
    'th{background:#0E7C8B;color:#FFFFFF;font-weight:bold;text-align:left;}' +
    'tr:nth-child(even) td{background:#FAF6F0;}' +
    '</style></head><body>' +
    `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>` +
    '</body></html>'
  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `salvaje-splash-inscritos-${stamp}.xls`
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
  // Los registros nuevos vienen de la landing Salvaje Splash; los antiguos, del Mock.
  const isSplash = data.source === 'landing-splash' || data.evento === 'Salvaje Splash'
  await setDoc(doc(db, 'notifications', notifId), {
    recipientId: adminUid,
    recipientRole: 'admin',
    senderId: null,
    senderName: isSplash ? 'Salvaje Splash' : 'Salvaje Mock',
    senderRole: 'system',
    senderPhotoURL: null,
    type: 'mock_registration',
    title: isSplash ? 'Nueva inscripción · Salvaje Splash' : 'Nueva inscripción · Salvaje Mock',
    body: isSplash
      ? `${name} separó su cupo en Salvaje Splash.`
      : `${name} se inscribió a la Mock Competition (${data.formato || 'sin formato'}).`,
    relatedId: inscriptionId,
    relatedCollection: 'mock_inscriptions',
    actionType: 'view',
    actionUrl: isSplash ? '/superadmin/salvaje-splash' : '/superadmin/salvaje-mock',
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
