import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { MessageCircle, Mail, Phone, MapPin, Clock, StickyNote, CheckCircle2 } from 'lucide-react'
import {
  CRM_ESTADOS, setCrmEstado, markContacted, setCrmNota, crmWhatsAppText, toMs, PAY_URL,
} from '../../../services/splashAdmin.service'

const FILTROS = ['Todos', 'Sin contactar', 'Sin pagar', 'Interesados', 'Pagaron']

const ESTADO_CHIP = {
  'Nuevo': 'bg-salvaje-gold/15 text-salvaje-gold',
  'Contactado': 'bg-salvaje-aqua/10 text-salvaje-aqua-deep',
  'Interesado': 'bg-salvaje-fire/10 text-salvaje-fire',
  'Pagó': 'bg-salvaje-success/15 text-salvaje-success',
  'Perdido': 'bg-salvaje-gray/15 text-salvaje-gray',
}

function waLink(phone, text) {
  let d = String(phone || '').replace(/\D/g, '')
  if (!d) return null
  if (d.length === 10 && d.startsWith('3')) d = '57' + d
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}

function fmtAgo(ts) {
  const ms = toMs(ts)
  if (!ms) return 'nunca'
  const h = Math.floor((Date.now() - ms) / 3600000)
  if (h < 1) return 'hace minutos'
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} día(s)`
}

export function TabCrm({ rows, stats }) {
  const [filtro, setFiltro] = useState('Sin contactar')
  const [busy, setBusy] = useState({})

  const estadoDe = (r) => r.paid ? 'Pagó' : (r.crmEstado || 'Nuevo')

  const list = useMemo(() => {
    let l = rows
    if (filtro === 'Sin contactar') l = rows.filter((r) => !r.paid && !r.crmLastContactAt && r.crmEstado !== 'Perdido')
    else if (filtro === 'Sin pagar') l = rows.filter((r) => !r.paid)
    else if (filtro === 'Interesados') l = rows.filter((r) => !r.paid && r.crmEstado === 'Interesado')
    else if (filtro === 'Pagaron') l = rows.filter((r) => r.paid)
    return l
  }, [rows, filtro])

  const mark = (id, v) => setBusy((b) => ({ ...b, [id]: v }))

  const contact = async (r, via) => {
    try { await markContacted(r.id, via) } catch (e) { console.error(e) }
  }

  const changeEstado = async (r, estado) => {
    mark(r.id, true)
    try { await setCrmEstado(r.id, estado) } catch (e) { console.error(e); toast.error('No se pudo actualizar') } finally { mark(r.id, false) }
  }

  const editNota = async (r) => {
    const nota = window.prompt('Nota de seguimiento:', r.crmNota || '')
    if (nota === null) return
    try { await setCrmNota(r.id, nota); toast.success('Nota guardada') } catch (e) { console.error(e); toast.error('No se pudo guardar') }
  }

  return (
    <div className="space-y-4">
      {/* Regla de oro */}
      <div className="rounded-xl border border-salvaje-orange/30 bg-salvaje-orange/5 px-4 py-3 font-body text-sm text-salvaje-dark">
        <b>Regla de oro:</b> todo lead se contacta en <b>menos de 15 minutos</b>. El botón de WhatsApp ya lleva el
        mensaje de venta con el precio vigente y el link de pago — un clic, enviar, marcar contactado.
        {stats.sinContactar > 0 && <span className="text-salvaje-danger font-semibold"> Tienes {stats.sinContactar} sin contactar.</span>}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`shrink-0 rounded-full px-4 py-1.5 font-body text-xs font-semibold transition ${filtro === f ? 'bg-salvaje-brown text-white' : 'bg-white border border-salvaje-cream text-salvaje-gray hover:bg-salvaje-light-alt'}`}>
            {f}
          </button>
        ))}
        <span className="ml-auto shrink-0 font-body text-xs text-salvaje-gray self-center">{list.length} registro(s)</span>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-salvaje p-8 text-center shadow-salvaje">
          <CheckCircle2 size={32} className="mx-auto text-salvaje-success" />
          <p className="font-display text-xl uppercase text-salvaje-dark mt-2">Nada pendiente en este filtro</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map((r) => {
            const estado = estadoDe(r)
            const wa = waLink(r.celular, crmWhatsAppText((r.nombre || '').split(' ')[0]))
            return (
              <div key={r.id} className="bg-white rounded-salvaje p-4 shadow-salvaje">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display text-lg uppercase text-salvaje-dark truncate">{r.nombre || 'Sin nombre'}</p>
                      <span className={`text-[10px] font-body font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${ESTADO_CHIP[estado]}`}>{estado}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-body text-xs text-salvaje-gray">
                      {r.celular && <span className="inline-flex items-center gap-1"><Phone size={12} />{r.celular}</span>}
                      {r.email && <span className="inline-flex items-center gap-1"><Mail size={12} />{r.email}</span>}
                      {r.ciudad && <span className="inline-flex items-center gap-1"><MapPin size={12} />{r.ciudad}</span>}
                      <span className="inline-flex items-center gap-1"><Clock size={12} />Último contacto: {fmtAgo(r.crmLastContactAt)}</span>
                    </div>
                    {r.crmNota && <p className="mt-1 font-body text-xs text-salvaje-brown bg-salvaje-gold/10 rounded px-2 py-1 inline-block">📝 {r.crmNota}</p>}
                  </div>

                  {!r.paid && (
                    <select
                      value={estado} disabled={busy[r.id]}
                      onChange={(e) => changeEstado(r, e.target.value)}
                      className="rounded-lg border border-salvaje-cream bg-salvaje-light px-2 py-1.5 font-body text-xs text-salvaje-dark outline-none"
                    >
                      {CRM_ESTADOS.filter((x) => x !== 'Pagó').map((x) => <option key={x}>{x}</option>)}
                    </select>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-salvaje-cream flex flex-wrap items-center gap-2">
                  {wa && !r.paid && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => contact(r, 'whatsapp')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-success px-3.5 py-1.5 text-xs font-body font-bold text-white hover:opacity-90 transition">
                      <MessageCircle size={14} /> WhatsApp de venta
                    </a>
                  )}
                  {r.email && !r.paid && (
                    <a
                      href={`mailto:${r.email}?subject=${encodeURIComponent('Tu cupo en Salvaje Splash te espera 🌊')}&body=${encodeURIComponent(crmWhatsAppText((r.nombre || '').split(' ')[0]) + '\n\nO entra a ' + PAY_URL)}`}
                      onClick={() => contact(r, 'email')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-orange/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-orange hover:bg-salvaje-orange/20 transition">
                      <Mail size={14} /> Email
                    </a>
                  )}
                  <button onClick={() => editNota(r)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-brown/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-brown hover:bg-salvaje-brown/20 transition">
                    <StickyNote size={14} /> Nota
                  </button>
                  {r.paid && (
                    <span className="ml-auto inline-flex items-center gap-1 font-body text-xs font-semibold text-salvaje-success">
                      <CheckCircle2 size={14} /> Entrada vendida — pídele referidos y una historia etiquetando
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
