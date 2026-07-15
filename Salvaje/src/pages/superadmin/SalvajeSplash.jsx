import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Droplets, Users, Mail, Phone, MapPin, Calendar, MessageCircle,
  Download, Trash2, Paperclip, FileText, CheckCircle2, Circle, Loader2, ShieldCheck,
} from 'lucide-react'
import { AdminShell } from '../../components/layout/AdminShell'
import {
  subscribeMockInscriptions, setMockPaid, deleteMockInscription,
  uploadMockComprobante, downloadSplashExcel,
} from '../../services/mockStats'

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
  const [busy, setBusy] = useState({}) // id -> 'pay' | 'upload' | 'delete'
  const fileInputs = useRef({})

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

                    {r.comprobanteURL && (
                      <a href={r.comprobanteURL} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-gold/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-gold hover:bg-salvaje-gold/20 transition">
                        <FileText size={14} /> Ver comprobante
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
    </AdminShell>
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
