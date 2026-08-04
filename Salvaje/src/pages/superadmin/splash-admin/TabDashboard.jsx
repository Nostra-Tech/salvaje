import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  CalendarDays, Ticket, Target, TrendingUp, Users, Percent, DollarSign,
  Megaphone, Save, AlertTriangle, CheckCircle2, Info,
} from 'lucide-react'
import { fmtCOP, shortDay, todayKey, saveDayMetrics, MEDIR_HOY } from '../../../services/splashAdmin.service'

const NIVEL = {
  alta: { icon: AlertTriangle, cls: 'border-salvaje-danger/30 bg-salvaje-danger/5 text-salvaje-danger' },
  media: { icon: Info, cls: 'border-salvaje-gold/40 bg-salvaje-gold/10 text-salvaje-brown' },
  ok: { icon: CheckCircle2, cls: 'border-salvaje-success/30 bg-salvaje-success/5 text-salvaje-success' },
}

export function TabDashboard({ stats, suggestions, daysMap }) {
  const s = stats
  const pct = Math.min(100, Math.round((s.vendidas / s.meta) * 100))
  const maxBar = Math.max(1, ...s.last14.map((d) => Math.max(d.ventas, d.registros)))

  return (
    <div className="space-y-4">
      {/* Acciones sugeridas (copiloto) */}
      <div className="space-y-2">
        {suggestions.slice(0, 3).map((sg, i) => {
          const N = NIVEL[sg.nivel] || NIVEL.media
          const Icon = N.icon
          return (
            <div key={i} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-body ${N.cls}`}>
              <Icon size={17} className="mt-0.5 shrink-0" />
              <p className="text-salvaje-dark">{sg.texto}</p>
            </div>
          )
        })}
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={CalendarDays} label="Días restantes" value={s.daysLeft} sub="hasta el 22 de agosto" />
        <Kpi icon={Ticket} label="Vendidas" value={`${s.vendidas}/${s.meta}`} sub={`${pct}% de la meta`} accent="text-salvaje-orange" />
        <Kpi icon={Target} label="Faltan" value={s.faltan} sub={`${s.paceNeeded.toFixed(1)}/día necesarias`} accent="text-salvaje-danger" />
        <Kpi icon={TrendingUp} label="Ritmo actual" value={`${s.ritmo7.toFixed(1)}/día`} sub={`hoy: ${s.ventasHoy} venta(s)`} accent={s.ratio >= 0.9 ? 'text-salvaje-success' : 'text-salvaje-danger'} />
      </div>

      {/* Progreso hacia la meta */}
      <div className="bg-white rounded-salvaje p-5 shadow-salvaje">
        <div className="flex items-center justify-between mb-2">
          <p className="font-body text-sm font-semibold text-salvaje-dark">Progreso hacia {s.meta} entradas</p>
          <p className="font-display text-2xl text-salvaje-orange">{pct}%</p>
        </div>
        <div className="h-3 rounded-full bg-salvaje-light-alt overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-salvaje-orange to-salvaje-fire transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 font-body text-xs text-salvaje-gray">
          Ingresos: <b className="text-salvaje-dark">{fmtCOP(s.ingresos)}</b> · Etapa vigente: <b className="text-salvaje-dark">{s.stage.label} ({fmtCOP(s.stage.price)})</b>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Ventas por día */}
        <div className="bg-white rounded-salvaje p-5 shadow-salvaje">
          <p className="font-body text-sm font-semibold text-salvaje-dark mb-3">Últimos 14 días · registros vs ventas</p>
          <div className="flex items-end gap-1 h-32">
            {s.last14.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full" title={`${d.key}: ${d.registros} registros · ${d.ventas} ventas`}>
                <div className="w-full max-w-[14px] rounded-t bg-salvaje-gold/40" style={{ height: `${(d.registros / maxBar) * 100}%` }} />
                <div className="w-full max-w-[14px] rounded-t bg-salvaje-orange" style={{ height: `${Math.max(2, (d.ventas / maxBar) * 100)}%` }} />
                <span className="font-mono text-[8px] text-salvaje-gray leading-none">{shortDay(d.key).split(' ')[1]}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-4 font-body text-[11px] text-salvaje-gray">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-salvaje-gold/40" /> Registros</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-salvaje-orange" /> Ventas</span>
          </div>
        </div>

        {/* Embudo */}
        <div className="bg-white rounded-salvaje p-5 shadow-salvaje">
          <p className="font-body text-sm font-semibold text-salvaje-dark mb-3">Embudo</p>
          <Funnel label="Registros (leads + ventas)" value={s.leads + s.vendidas} max={Math.max(1, s.leads + s.vendidas)} color="bg-salvaje-gold" />
          <Funnel label="Leads contactados" value={s.leads - s.sinContactar + s.vendidas} max={Math.max(1, s.leads + s.vendidas)} color="bg-salvaje-fire" />
          <Funnel label="Pagaron" value={s.vendidas} max={Math.max(1, s.leads + s.vendidas)} color="bg-salvaje-success" />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <MiniStat icon={Users} label="Leads activos" value={s.leads} />
            <MiniStat icon={AlertTriangle} label="Sin contactar" value={s.sinContactar} danger={s.sinContactar > 0} />
            <MiniStat icon={Percent} label="Conversión" value={`${(s.conversion * 100).toFixed(0)}%`} />
          </div>
        </div>
      </div>

      {/* Pauta */}
      <div className="bg-white rounded-salvaje p-5 shadow-salvaje">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone size={18} className="text-salvaje-orange" />
          <p className="font-body text-sm font-semibold text-salvaje-dark">Pauta (Meta / TikTok) — acumulado de campaña</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <MiniStat icon={DollarSign} label="Inversión" value={fmtCOP(s.spend)} />
          <MiniStat icon={DollarSign} label="CPA (por venta)" value={s.cpa != null ? fmtCOP(s.cpa) : '—'} />
          <MiniStat icon={TrendingUp} label="ROAS" value={s.roas != null ? s.roas.toFixed(2) + 'x' : '—'} danger={s.roas != null && s.roas < 1} />
          <MiniStat icon={Percent} label="CTR" value={s.ctr != null ? (s.ctr * 100).toFixed(2) + '%' : '—'} />
          <MiniStat icon={DollarSign} label="CPC" value={s.cpc != null ? fmtCOP(s.cpc) : '—'} />
          <MiniStat icon={DollarSign} label="CPM" value={s.cpm != null ? fmtCOP(s.cpm) : '—'} />
        </div>
        <MetricsForm daysMap={daysMap} />
      </div>

      {/* Qué medir hoy */}
      <div className="bg-white rounded-salvaje p-5 shadow-salvaje">
        <p className="font-body text-sm font-semibold text-salvaje-dark mb-2">Qué medir hoy</p>
        <ul className="space-y-1.5">
          {MEDIR_HOY.map((m, i) => (
            <li key={i} className="flex items-start gap-2 font-body text-sm text-salvaje-gray">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-salvaje-success" /> {m}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Captura manual de métricas de pauta del día (Meta/TikTok no exponen API sin backend). */
function MetricsForm({ daysMap }) {
  const key = todayKey()
  const today = daysMap?.[key] || {}
  const [spend, setSpend] = useState(today.adSpend ?? '')
  const [imp, setImp] = useState(today.adImpressions ?? '')
  const [clicks, setClicks] = useState(today.adClicks ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await saveDayMetrics(key, {
        adSpend: Number(spend) || 0,
        adImpressions: Number(imp) || 0,
        adClicks: Number(clicks) || 0,
      })
      toast.success('Métricas de hoy guardadas')
    } catch (e) { console.error(e); toast.error('No se pudieron guardar') } finally { setSaving(false) }
  }

  const input = 'w-full rounded-lg border border-salvaje-cream bg-salvaje-light px-3 py-2 font-body text-sm text-salvaje-dark outline-none focus:border-salvaje-orange'
  return (
    <div className="mt-4 pt-4 border-t border-salvaje-cream">
      <p className="font-body text-xs font-semibold uppercase tracking-wide text-salvaje-gray mb-2">
        Registrar métricas de HOY ({key}) — cópialas del administrador de anuncios (2 min)
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
        <label className="block"><span className="font-body text-[11px] text-salvaje-gray">Gasto (COP)</span>
          <input type="number" min="0" value={spend} onChange={(e) => setSpend(e.target.value)} className={input} placeholder="0" /></label>
        <label className="block"><span className="font-body text-[11px] text-salvaje-gray">Impresiones</span>
          <input type="number" min="0" value={imp} onChange={(e) => setImp(e.target.value)} className={input} placeholder="0" /></label>
        <label className="block"><span className="font-body text-[11px] text-salvaje-gray">Clics</span>
          <input type="number" min="0" value={clicks} onChange={(e) => setClicks(e.target.value)} className={input} placeholder="0" /></label>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-salvaje-orange px-4 py-2 font-display text-sm uppercase tracking-widest text-white hover:bg-salvaje-fire transition disabled:opacity-50">
          <Save size={14} /> Guardar
        </button>
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, accent = 'text-salvaje-dark' }) {
  return (
    <div className="bg-white rounded-salvaje p-4 shadow-salvaje">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={17} className="text-salvaje-orange" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">{label}</p>
      </div>
      <p className={`font-display text-3xl leading-none ${accent}`}>{value}</p>
      {sub && <p className="font-body text-[11px] text-salvaje-gray mt-1">{sub}</p>}
    </div>
  )
}

function Funnel({ label, value, max, color }) {
  const w = Math.max(4, Math.round((value / max) * 100))
  return (
    <div className="mb-2">
      <div className="flex justify-between font-body text-xs text-salvaje-gray mb-0.5">
        <span>{label}</span><b className="text-salvaje-dark">{value}</b>
      </div>
      <div className="h-2.5 rounded-full bg-salvaje-light-alt overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, danger }) {
  return (
    <div className="rounded-xl border border-salvaje-cream bg-salvaje-light px-2 py-2.5 text-center">
      <Icon size={14} className={`mx-auto mb-1 ${danger ? 'text-salvaje-danger' : 'text-salvaje-gray'}`} />
      <p className={`font-display text-lg leading-none ${danger ? 'text-salvaje-danger' : 'text-salvaje-dark'}`}>{value}</p>
      <p className="font-body text-[10px] text-salvaje-gray mt-0.5">{label}</p>
    </div>
  )
}
