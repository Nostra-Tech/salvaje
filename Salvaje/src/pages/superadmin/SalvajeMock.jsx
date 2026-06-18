import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Flame, Users, UserCheck, UsersRound, Mail, Phone, MapPin, Calendar,
  Download, Trash2, Paperclip, FileText, CheckCircle2, Circle, Loader2,
} from 'lucide-react'
import { AdminShell } from '../../components/layout/AdminShell'
import {
  subscribeMockInscriptions, setMockPaid, deleteMockInscription,
  uploadMockComprobante, downloadMockExcel,
} from '../../services/mockStats'

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

function fmtDate(ts) {
  if (!ts) return '—'
  let d
  if (typeof ts.toDate === 'function') d = ts.toDate()
  else if (ts.seconds) d = new Date(ts.seconds * 1000)
  else d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function SalvajeMock() {
  const [state, setState] = useState({ loading: true, rows: [] })
  const [busy, setBusy] = useState({}) // id -> 'pay' | 'upload' | 'delete'
  const fileInputs = useRef({})

  useEffect(() => {
    const unsub = subscribeMockInscriptions(
      (rows) => setState({ loading: false, rows }),
      (e) => {
        console.error('SalvajeMock subscription failed:', e)
        setState({ loading: false, rows: [], error: e?.message || 'Error al leer las inscripciones' })
      },
    )
    return unsub
  }, [])

  const { rows, loading, error } = state
  const total = rows.length
  const individuales = rows.filter((r) => r.formato === 'Individual').length
  const equipos = rows.filter((r) => r.formato === 'Equipos').length
  const pagados = rows.filter((r) => r.paid).length

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
    <AdminShell title="Salvaje Mock">
      <motion.div variants={container} initial="hidden" animate="visible" className="max-w-5xl mx-auto px-4 pt-4 pb-8 space-y-5">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Flame size={28} className="text-salvaje-orange" />
            <div>
              <h1 className="font-display text-4xl uppercase text-salvaje-dark leading-none">Salvaje Mock</h1>
              <p className="font-body text-sm text-salvaje-gray">Inscripciones a la Mock Competition</p>
            </div>
          </div>
          <button
            onClick={() => downloadMockExcel(rows)}
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
          <StatCard icon={UserCheck} label="Individual" value={individuales} tint="text-salvaje-gold bg-salvaje-gold/10" />
          <StatCard icon={UsersRound} label="Equipos" value={equipos} tint="text-salvaje-brown bg-salvaje-brown/10" />
        </motion.div>

        {error && (
          <motion.p variants={item} className="text-sm text-salvaje-danger font-body bg-salvaje-danger/5 px-3 py-2 rounded-lg">{error}</motion.p>
        )}

        {loading ? (
          <motion.p variants={item} className="text-center text-salvaje-gray font-body py-10">Cargando inscripciones…</motion.p>
        ) : total === 0 ? (
          <motion.div variants={item} className="rounded-salvaje border border-salvaje-cream bg-white p-10 text-center">
            <p className="font-display text-2xl uppercase text-salvaje-dark">Aún no hay inscritos</p>
            <p className="font-body text-sm text-salvaje-gray mt-1">Las inscripciones de la landing aparecerán aquí en tiempo real.</p>
          </motion.div>
        ) : (
          <motion.div variants={item} className="space-y-3">
            {rows.map((r) => {
              const b = busy[r.id]
              return (
                <div key={r.id} className="rounded-salvaje border border-salvaje-cream bg-white p-4 shadow-salvaje">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display text-xl uppercase text-salvaje-dark truncate">{r.nombre || 'Sin nombre'}</p>
                        <span className={`text-[10px] font-body font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${r.formato === 'Equipos' ? 'bg-salvaje-success/15 text-salvaje-success' : 'bg-salvaje-gold/15 text-salvaje-gold'}`}>{r.formato || '—'}</span>
                        <span className={`text-[10px] font-body font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${r.paid ? 'bg-salvaje-success/15 text-salvaje-success' : 'bg-salvaje-danger/10 text-salvaje-danger'}`}>{r.paid ? 'Pagó' : 'Sin pagar'}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-body text-salvaje-gray">
                        {r.email && <span className="inline-flex items-center gap-1.5"><Mail size={14} />{r.email}</span>}
                        {r.celular && <span className="inline-flex items-center gap-1.5"><Phone size={14} />{r.celular}</span>}
                        {r.ciudad && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{r.ciudad}</span>}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-body text-salvaje-gray whitespace-nowrap"><Calendar size={14} />{fmtDate(r.createdAt)}</span>
                  </div>

                  {(r.categoria || r.preparacion) && (
                    <div className="mt-3 pt-3 border-t border-salvaje-cream grid sm:grid-cols-2 gap-3">
                      {r.categoria && (<div><p className="text-[11px] font-body font-semibold uppercase tracking-wide text-salvaje-gray">Categoría</p><p className="font-body text-sm text-salvaje-dark">{r.categoria}</p></div>)}
                      {r.preparacion && (<div><p className="text-[11px] font-body font-semibold uppercase tracking-wide text-salvaje-gray">Preparación / objetivo</p><p className="font-body text-sm text-salvaje-dark">{r.preparacion}</p></div>)}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="mt-3 pt-3 border-t border-salvaje-cream flex flex-wrap items-center gap-2">
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
