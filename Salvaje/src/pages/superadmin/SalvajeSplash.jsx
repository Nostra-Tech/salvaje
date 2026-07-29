import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import {
  Droplets, Users, Mail, Phone, MapPin, Calendar, MessageCircle,
  Download, Trash2, Paperclip, FileText, CheckCircle2, Circle, Loader2, ShieldCheck, Link2, X,
  Ticket, QrCode, AlertTriangle,
} from 'lucide-react'
import { AdminShell } from '../../components/layout/AdminShell'
import {
  subscribeMockInscriptions, setMockPaid, deleteMockInscription,
  uploadMockComprobante, setMockComprobanteLink, setMockCheckedIn, downloadSplashExcel,
} from '../../services/mockStats'

// URL que codifica el QR de cada entrada: al escanearlo, un admin logueado
// aterriza en este panel con la validación abierta.
const TICKET_BASE = 'https://salvaje-app.web.app/superadmin/salvaje-splash?ticket='

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

// Un registro pertenece a Salvaje Splash si viene de la landing nueva.
const isSplash = (r) => r.source === 'landing-splash' || r.evento === 'Salvaje Splash'

function fmtDate(ts) {
  if (!ts) return '—'
  let d
  if (typeof ts.toDate === 'function') d = ts.toDate()
  else if (ts.seconds) d = new Date(ts.seconds * 1000)
  else d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Link de WhatsApp desde un celular colombiano. */
function waLink(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (!d) return null
  if (d.length === 10 && d.startsWith('3')) d = '57' + d
  return `https://wa.me/${d}`
}

export function SalvajeSplash() {
  const [state, setState] = useState({ loading: true, rows: [] })
  const [busy, setBusy] = useState({}) // id -> 'pay' | 'upload' | 'delete' | 'link' | 'checkin'
  const [viewing, setViewing] = useState(null) // inscrito cuyo comprobante se muestra
  const [ticketFor, setTicketFor] = useState(null) // inscrito cuya entrada se genera
  const [validating, setValidating] = useState(null) // { row } | { missingId } al escanear un QR
  const ticketHandled = useRef(false)
  const fileInputs = useRef({})

  // Validación por QR: si la URL trae ?ticket=<id>, abre el verificador.
  useEffect(() => {
    if (ticketHandled.current || state.loading) return
    const t = new URLSearchParams(window.location.search).get('ticket')
    ticketHandled.current = true
    if (!t) return
    const row = state.rows.find((r) => r.id === t)
    setValidating(row ? { row } : { missingId: t })
    window.history.replaceState(null, '', window.location.pathname)
  }, [state])

  const handleCheckIn = async (r) => {
    try {
      await setMockCheckedIn(r.id)
      toast.success('Ingreso registrado')
      setValidating(null)
    } catch (e) {
      console.error(e)
      toast.error('No se pudo registrar el ingreso')
    }
  }

  useEffect(() => {
    const unsub = subscribeMockInscriptions(
      (rows) => setState({ loading: false, rows: rows.filter(isSplash) }),
      (e) => {
        console.error('SalvajeSplash subscription failed:', e)
        setState({ loading: false, rows: [], error: e?.message || 'Error al leer las inscripciones' })
      },
    )
    return unsub
  }, [])

  const { rows, loading, error } = state
  const total = rows.length
  const pagados = rows.filter((r) => r.paid).length
  const autorizados = rows.filter((r) => r.contactoAutorizado).length
  const ciudades = new Set(rows.map((r) => (r.ciudad || '').trim().toLowerCase()).filter(Boolean)).size

  const mark = (id, v) => v ? setBusy((b) => ({ ...b, [id]: v })) : setBusy((b) => { const n = { ...b }; delete n[id]; return n })

  const handlePaid = async (r) => {
    mark(r.id, 'pay')
    try { await setMockPaid(r.id, !r.paid) } catch (e) { toast.error('No se pudo actualizar el pago') } finally { mark(r.id, null) }
  }

  const handleDelete = async (r) => {
    if (!window.confirm(`¿Eliminar la inscripción de ${r.nombre || 'este inscrito'}? Esta acción no se puede deshacer.`)) return
    mark(r.id, 'delete')
    try { await deleteMockInscription(r.id); toast.success('Inscripción eliminada') }
    catch (e) { toast.error('No se pudo eliminar') } finally { mark(r.id, null) }
  }

  const handleFile = async (r, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    mark(r.id, 'upload')
    try { await uploadMockComprobante(r.id, file); toast.success('Comprobante adjuntado') }
    catch (err) { console.error(err); toast.error('No se pudo subir el comprobante') } finally { mark(r.id, null) }
  }

  const handleLink = async (r) => {
    const url = window.prompt(
      'Pega el enlace del comprobante (p. ej. el recibo de Bold).\nDeja vacío y acepta para quitar el enlace.',
      r.comprobanteLinkURL || '',
    )
    if (url === null) return // canceló
    mark(r.id, 'link')
    try {
      await setMockComprobanteLink(r.id, url)
      toast.success(url.trim() ? 'Enlace de comprobante guardado' : 'Enlace eliminado')
    } catch (err) {
      console.error(err)
      toast.error(err?.message === 'URL inválida' ? 'La URL debe empezar por http:// o https://' : 'No se pudo guardar el enlace')
    } finally { mark(r.id, null) }
  }

  return (
    <AdminShell title="Salvaje Splash">
      <motion.div variants={container} initial="hidden" animate="visible" className="max-w-5xl mx-auto px-4 pt-4 pb-8 space-y-5">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Droplets size={28} className="text-salvaje-orange" />
            <div>
              <h1 className="font-display text-4xl uppercase text-salvaje-dark leading-none">Salvaje Splash</h1>
              <p className="font-body text-sm text-salvaje-gray">Registros del formulario "Separa tu cupo" de la landing /splash.</p>
            </div>
          </div>
          <button
            onClick={() => downloadSplashExcel(rows)}
            disabled={total === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-salvaje-success px-4 py-2.5 font-display uppercase tracking-widest text-sm text-white hover:opacity-90 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={16} /> Descargar Excel
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Registrados" value={total} tint="text-salvaje-orange bg-salvaje-orange/10" />
          <StatCard icon={CheckCircle2} label="Pagados" value={pagados} tint="text-salvaje-success bg-salvaje-success/10" />
          <StatCard icon={ShieldCheck} label="Contacto autorizado" value={autorizados} tint="text-salvaje-gold bg-salvaje-gold/10" />
          <StatCard icon={MapPin} label="Ciudades" value={ciudades} tint="text-salvaje-brown bg-salvaje-brown/10" />
        </motion.div>

        {error && (
          <motion.p variants={item} className="text-sm text-salvaje-danger font-body bg-salvaje-danger/5 px-3 py-2 rounded-lg">{error}</motion.p>
        )}

        {loading ? (
          <motion.p variants={item} className="text-center text-salvaje-gray font-body py-10">Cargando registros…</motion.p>
        ) : total === 0 ? (
          <motion.div variants={item} className="rounded-salvaje border border-salvaje-cream bg-white p-10 text-center">
            <Droplets size={40} className="mx-auto text-salvaje-orange/60" />
            <p className="font-display text-2xl uppercase text-salvaje-dark mt-3">Aún no hay registros</p>
            <p className="font-body text-sm text-salvaje-gray mt-1">Los cupos separados en la landing /splash aparecerán aquí en tiempo real.</p>
          </motion.div>
        ) : (
          <motion.div variants={item} className="space-y-3">
            {rows.map((r) => {
              const b = busy[r.id]
              const wa = waLink(r.celular)
              return (
                <div key={r.id} className="rounded-salvaje border border-salvaje-cream bg-white p-4 shadow-salvaje">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display text-xl uppercase text-salvaje-dark truncate">{r.nombre || 'Sin nombre'}</p>
                        <span className={`text-[10px] font-body font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${r.paid ? 'bg-salvaje-success/15 text-salvaje-success' : 'bg-salvaje-danger/10 text-salvaje-danger'}`}>{r.paid ? 'Pagó' : 'Sin pagar'}</span>
                        {r.paidVia === 'bold-webhook' && (
                          <span className="text-[10px] font-body font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-salvaje-success/15 text-salvaje-success">Verificado Bold</span>
                        )}
                        {r.checkedIn && (
                          <span className="text-[10px] font-body font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-salvaje-brown/15 text-salvaje-brown">Ingresó</span>
                        )}
                        {r.contactoAutorizado && (
                          <span className="text-[10px] font-body font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-salvaje-gold/15 text-salvaje-gold">Contacto autorizado</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-body text-salvaje-gray">
                        {r.email && <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 hover:text-salvaje-orange transition-colors"><Mail size={14} />{r.email}</a>}
                        {r.celular && <span className="inline-flex items-center gap-1.5"><Phone size={14} />{r.celular}</span>}
                        {r.ciudad && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{r.ciudad}</span>}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-body text-salvaje-gray whitespace-nowrap"><Calendar size={14} />{fmtDate(r.createdAt)}</span>
                  </div>

                  {/* Comprobante Bold (adjuntado automáticamente por el webhook) */}
                  {r.boldPaymentId && (
                    <div className="mt-3 pt-3 border-t border-salvaje-cream">
                      <p className="text-[11px] font-body font-semibold uppercase tracking-wide text-salvaje-gray">Comprobante Bold</p>
                      <p className="font-body text-sm text-salvaje-dark mt-0.5">
                        ID <span className="font-mono">{r.boldPaymentId}</span>
                        {r.boldAmount ? ` · $${Number(r.boldAmount).toLocaleString('es-CO')}` : ''}
                        {r.boldMethod ? ` · ${r.boldMethod}` : ''}
                        {r.paidAt ? ` · ${fmtDate(r.paidAt)}` : ''}
                      </p>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="mt-3 pt-3 border-t border-salvaje-cream flex flex-wrap items-center gap-2">
                    {wa && (
                      <a
                        href={wa} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-success/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-success hover:bg-salvaje-success/20 transition"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}

                    {r.paid && (
                      <button
                        onClick={() => setTicketFor(r)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-gold/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-gold hover:bg-salvaje-gold/20 transition"
                      >
                        <Ticket size={14} /> Entrada
                      </button>
                    )}

                    <button
                      onClick={() => handlePaid(r)} disabled={!!b}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-body font-semibold transition disabled:opacity-50 ${r.paid ? 'bg-salvaje-gray/10 text-salvaje-gray hover:bg-salvaje-gray/20' : 'bg-salvaje-success/10 text-salvaje-success hover:bg-salvaje-success/20'}`}
                    >
                      {b === 'pay' ? <Loader2 size={14} className="animate-spin" /> : (r.paid ? <Circle size={14} /> : <CheckCircle2 size={14} />)}
                      {r.paid ? 'Marcar sin pagar' : 'Marcar pagado'}
                    </button>

                    <button
                      onClick={() => fileInputs.current[r.id]?.click()} disabled={!!b}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-orange/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-orange hover:bg-salvaje-orange/20 transition disabled:opacity-50"
                    >
                      {b === 'upload' ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                      {r.comprobanteURL ? 'Reemplazar comprobante' : 'Adjuntar comprobante'}
                    </button>
                    <input
                      ref={(el) => (fileInputs.current[r.id] = el)} type="file" accept="image/png,image/jpeg,image/webp"
                      className="hidden" onChange={(e) => handleFile(r, e)}
                    />

                    {r.comprobanteData ? (
                      <button
                        onClick={() => setViewing(r)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-gold/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-gold hover:bg-salvaje-gold/20 transition"
                      >
                        <FileText size={14} /> Ver comprobante
                      </button>
                    ) : r.comprobanteURL ? (
                      <a href={r.comprobanteURL} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-gold/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-gold hover:bg-salvaje-gold/20 transition">
                        <FileText size={14} /> Ver comprobante
                      </a>
                    ) : null}

                    <button
                      onClick={() => handleLink(r)} disabled={!!b}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-brown/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-brown hover:bg-salvaje-brown/20 transition disabled:opacity-50"
                    >
                      {b === 'link' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                      {r.comprobanteLinkURL ? 'Editar enlace' : 'Enlace de comprobante'}
                    </button>

                    {r.comprobanteLinkURL && (
                      <a href={r.comprobanteLinkURL} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-gold/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-gold hover:bg-salvaje-gold/20 transition">
                        <Link2 size={14} /> Ver enlace
                      </a>
                    )}

                    <button
                      onClick={() => handleDelete(r)} disabled={!!b}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-danger/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-danger hover:bg-salvaje-danger/20 transition disabled:opacity-50 ml-auto"
                    >
                      {b === 'delete' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Visor de comprobante (imagen guardada en el registro) */}
      {viewing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative z-10 max-h-[88vh] w-full max-w-lg overflow-auto rounded-salvaje bg-white p-4 shadow-salvaje-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-display text-xl uppercase text-salvaje-dark truncate">Comprobante · {viewing.nombre || 'Inscrito'}</p>
              <button onClick={() => setViewing(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-salvaje-gray hover:bg-salvaje-light-alt transition">
                <X size={18} />
              </button>
            </div>
            <img src={viewing.comprobanteData} alt="Comprobante de pago" className="w-full rounded-lg" />
            <a
              href={viewing.comprobanteData}
              download={`comprobante-${(viewing.nombre || 'inscrito').replace(/\s+/g, '_')}.jpg`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-salvaje-orange/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-orange hover:bg-salvaje-orange/20 transition"
            >
              <Download size={14} /> Descargar
            </a>
          </div>
        </div>
      )}

      {/* Generador de entrada (PNG brandeado con QR) */}
      {ticketFor && <TicketModal row={ticketFor} onClose={() => setTicketFor(null)} />}

      {/* Validación de entrada (llegada por QR: ?ticket=<id>) */}
      {validating && (
        <ValidationModal data={validating} onClose={() => setValidating(null)} onCheckIn={handleCheckIn} />
      )}
    </AdminShell>
  )
}

/** Dibuja la entrada oficial en VERTICAL (1000×1600) y la descarga como PDF. */
function TicketModal({ row, onClose }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    const loadImage = (src) =>
      new Promise((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = reject
        i.src = src
      })

    ;(async () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const W = 1000, H = 1600
      try { await document.fonts.ready } catch {}

      // Fondo blanco
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, W, H)

      // ── Mitad superior oscura (marca) ──
      ctx.fillStyle = '#120A06'
      ctx.fillRect(0, 0, W, 860)

      // Logo grande centrado
      try {
        const logo = await loadImage('/splash/salvajesplashlogo.png')
        const lw = 560, lh = lw * (logo.height / logo.width)
        ctx.drawImage(logo, (W - lw) / 2, 60, lw, lh)
      } catch {}

      // Fecha + tagline
      ctx.textAlign = 'center'
      ctx.fillStyle = '#7FE3EF'
      ctx.font = 'bold 46px "Bebas Neue", Arial'
      ctx.fillText('SÁBADO 22 DE AGOSTO · 2026', W / 2, 730)
      ctx.fillStyle = '#F5ECD7'
      ctx.font = '26px Arial'
      ctx.fillText('La fiesta más refrescante del verano', W / 2, 775)

      // Divisor punteado horizontal tipo boleta (con muescas laterales)
      ctx.strokeStyle = '#C9A227'
      ctx.lineWidth = 3
      ctx.setLineDash([16, 12])
      ctx.beginPath(); ctx.moveTo(40, 860); ctx.lineTo(W - 40, 860); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#F0E8D8'
      ctx.beginPath(); ctx.arc(0, 860, 26, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(W, 860, 26, 0, Math.PI * 2); ctx.fill()

      // ── Mitad inferior: datos del asistente ──
      ctx.fillStyle = '#D4521A'
      ctx.font = 'bold 30px Arial'
      ctx.fillText('E N T R A D A   O F I C I A L', W / 2, 930)

      // Nombre (reduce la fuente si es muy largo)
      const nombre = (row.nombre || 'Asistente').toUpperCase()
      let size = 74
      ctx.font = `bold ${size}px "Bebas Neue", Arial`
      while (ctx.measureText(nombre).width > W - 120 && size > 34) {
        size -= 4
        ctx.font = `bold ${size}px "Bebas Neue", Arial`
      }
      ctx.fillStyle = '#2C1810'
      ctx.fillText(nombre, W / 2, 1010)

      ctx.fillStyle = '#6B5C52'
      ctx.font = '28px Arial'
      ctx.fillText(row.email || '', W / 2, 1055)

      ctx.font = 'bold 20px Arial'
      ctx.fillText('ID DE ENTRADA', W / 2, 1105)
      ctx.font = '22px Courier New'
      ctx.fillStyle = '#2C1810'
      ctx.fillText(row.id, W / 2, 1135)

      // QR de validación (apunta al panel admin con ?ticket=<id>)
      const qrData = await QRCode.toDataURL(TICKET_BASE + row.id, {
        width: 320, margin: 1, color: { dark: '#120A06', light: '#FFFFFF' },
      })
      const qrImg = await loadImage(qrData)
      const qx = (W - 300) / 2, qy = 1165
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(qx, qy, 300, 300)
      ctx.strokeStyle = '#12B5C9'
      ctx.lineWidth = 6
      ctx.strokeRect(qx, qy, 300, 300)
      ctx.drawImage(qrImg, qx + 10, qy + 10, 280, 280)

      ctx.fillStyle = '#0E7C8B'
      ctx.font = 'bold 24px Arial'
      ctx.fillText('ESCANEA PARA VALIDAR', W / 2, 1508)
      ctx.fillStyle = '#6B5C52'
      ctx.font = '20px Arial'
      ctx.fillText('Válido para una (1) persona · intransferible', W / 2, 1542)

      // Barras de acento inferiores
      ctx.fillStyle = '#12B5C9'
      ctx.fillRect(0, H - 26, W, 8)
      ctx.fillStyle = '#D4521A'
      ctx.fillRect(0, H - 18, W, 18)

      if (alive) setReady(true)
    })()
    return () => { alive = false }
  }, [row])

  const downloadPdf = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = canvas.toDataURL('image/png')
    // PDF vertical con la misma proporción del lienzo (1000×1600 → 500×800 px).
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [500, 800] })
    pdf.addImage(img, 'PNG', 0, 0, 500, 800)
    pdf.save(`entrada-salvaje-splash-${(row.nombre || 'asistente').trim().replace(/\s+/g, '-').toLowerCase()}.pdf`)
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col rounded-salvaje bg-white p-5 shadow-salvaje-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-display text-xl uppercase text-salvaje-dark truncate">Entrada · {row.nombre}</p>
          <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-salvaje-gray hover:bg-salvaje-light-alt transition"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <canvas ref={canvasRef} width={1000} height={1600} className="mx-auto w-full max-w-[340px] rounded-xl border border-salvaje-cream" />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="font-body text-xs text-salvaje-gray">El QR abre la validación en este panel (requiere sesión de admin).</p>
          <button
            onClick={downloadPdf} disabled={!ready}
            className="inline-flex items-center gap-2 rounded-xl bg-salvaje-orange px-5 py-2.5 font-display uppercase tracking-widest text-sm text-white hover:opacity-90 active:scale-95 transition disabled:opacity-40"
          >
            <Download size={16} /> Descargar PDF
          </button>
        </div>
      </div>
    </div>
  )
}

/** Verificador de entradas: se abre al escanear el QR (?ticket=<id>). */
function ValidationModal({ data, onClose, onCheckIn }) {
  const r = data.row
  const valid = r && r.paid && !r.checkedIn
  const already = r && r.paid && r.checkedIn
  const fmtIn = (ts) => {
    if (!ts) return ''
    const d = typeof ts.toDate === 'function' ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts)
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }
  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-salvaje bg-white p-6 text-center shadow-salvaje-lg sm:p-8" onClick={(e) => e.stopPropagation()}>
        {!r ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-salvaje-danger/10 text-salvaje-danger"><AlertTriangle size={30} /></div>
            <h3 className="mt-4 font-display text-3xl uppercase text-salvaje-danger">Entrada no encontrada</h3>
            <p className="mt-2 font-body text-sm text-salvaje-gray">No existe ningún registro con el ID<br /><span className="font-mono text-salvaje-dark">{data.missingId}</span></p>
          </>
        ) : (
          <>
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${valid ? 'bg-salvaje-success/15 text-salvaje-success' : already ? 'bg-salvaje-gold/15 text-salvaje-gold' : 'bg-salvaje-danger/10 text-salvaje-danger'}`}>
              {valid ? <CheckCircle2 size={32} /> : already ? <QrCode size={30} /> : <AlertTriangle size={30} />}
            </div>
            <h3 className={`mt-4 font-display text-3xl uppercase ${valid ? 'text-salvaje-success' : already ? 'text-salvaje-gold' : 'text-salvaje-danger'}`}>
              {valid ? 'Entrada válida' : already ? 'Ya registró ingreso' : 'Entrada no válida'}
            </h3>
            <p className="mt-1 font-body text-xs uppercase tracking-wide text-salvaje-gray">
              {valid ? 'Pago confirmado · puede ingresar' : already ? `Ingreso: ${fmtIn(r.checkedInAt)}` : 'No tiene pago registrado'}
            </p>
            <div className="mt-4 rounded-xl border border-salvaje-cream bg-salvaje-light p-4 text-left">
              <p className="font-display text-2xl uppercase leading-none text-salvaje-dark">{r.nombre || 'Sin nombre'}</p>
              <p className="mt-1 font-body text-sm text-salvaje-gray">{r.email}</p>
              {r.celular && <p className="font-body text-sm text-salvaje-gray">{r.celular}</p>}
            </div>
            {valid && (
              <button
                onClick={() => onCheckIn(r)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-salvaje-success px-6 py-3.5 font-display text-base uppercase tracking-widest text-white hover:opacity-90 active:scale-95 transition"
              >
                <CheckCircle2 size={18} /> Registrar ingreso
              </button>
            )}
          </>
        )}
        <button onClick={onClose} className="mt-4 text-sm font-semibold text-salvaje-gray hover:text-salvaje-brown transition-colors">Cerrar</button>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="rounded-salvaje border border-salvaje-cream bg-white p-4 shadow-salvaje">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${tint}`}><Icon size={18} /></div>
      <p className="font-display text-3xl text-salvaje-dark leading-none">{value}</p>
      <p className="font-body text-xs text-salvaje-gray uppercase tracking-wide mt-1">{label}</p>
    </div>
  )
}
