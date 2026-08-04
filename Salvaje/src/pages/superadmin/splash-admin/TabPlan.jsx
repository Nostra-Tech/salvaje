import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronLeft, ChevronRight, Video, Send, Megaphone, Users, BarChart3, Mail, Star, Zap, Wrench, StickyNote, Save } from 'lucide-react'
import { buildDayPlan, toggleTask, saveDayMetrics, todayKey, dayKey, shortDay, EVENT_MS } from '../../../services/splashAdmin.service'

const CAT_ICON = {
  Grabar: Video, Publicar: Send, Pauta: Megaphone, CRM: Users, Medir: BarChart3,
  Email: Mail, Influencers: Star, 'Activación': Zap, Optimizar: Wrench,
}
const SLOTS = ['Mañana', 'Tarde', 'Noche']
const PHASE_CHIP = {
  volumen: 'bg-salvaje-aqua/10 text-salvaje-aqua-deep',
  urgencia: 'bg-salvaje-gold/15 text-salvaje-gold',
  cierre: 'bg-salvaje-danger/10 text-salvaje-danger',
}

export function TabPlan({ stats, suggestions, daysMap }) {
  const [key, setKey] = useState(todayKey())
  const plan = useMemo(() => buildDayPlan(key, stats), [key, stats])
  const dayDoc = daysMap?.[key] || {}
  const done = dayDoc.tasks || {}
  const total = plan.tasks.length
  const completed = plan.tasks.filter((t) => done[t.id]).length
  const pct = total ? Math.round((completed / total) * 100) : 0
  const isToday = key === todayKey()

  const move = (dir) => {
    const ms = new Date(key + 'T12:00:00-05:00').getTime() + dir * 86400000
    if (ms > EVENT_MS) return
    if (ms < Date.now() - 30 * 86400000) return
    setKey(dayKey(ms))
  }

  const onToggle = async (t) => {
    try { await toggleTask(key, t.id, !done[t.id]) }
    catch (e) { console.error(e); toast.error('No se pudo guardar el check') }
  }

  return (
    <div className="space-y-4">
      {/* Selector de día + progreso */}
      <div className="bg-white rounded-salvaje p-5 shadow-salvaje">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={() => move(-1)} className="h-9 w-9 rounded-lg border border-salvaje-cream text-salvaje-gray hover:bg-salvaje-light-alt transition flex items-center justify-center"><ChevronLeft size={16} /></button>
            <div className="text-center min-w-[150px]">
              <p className="font-display text-2xl uppercase text-salvaje-dark leading-none">{shortDay(key)} {isToday && '· HOY'}</p>
              <p className="font-body text-[11px] text-salvaje-gray">{plan.daysLeft} días para el evento</p>
            </div>
            <button onClick={() => move(1)} className="h-9 w-9 rounded-lg border border-salvaje-cream text-salvaje-gray hover:bg-salvaje-light-alt transition flex items-center justify-center"><ChevronRight size={16} /></button>
            {!isToday && (
              <button onClick={() => setKey(todayKey())} className="font-body text-xs font-semibold text-salvaje-orange hover:text-salvaje-fire">Ir a hoy</button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 font-display text-xs uppercase tracking-widest ${PHASE_CHIP[plan.phase]}`}>Fase {plan.phase}</span>
            <div className="text-right">
              <p className="font-display text-2xl text-salvaje-orange leading-none">{completed}/{total}</p>
              <p className="font-body text-[10px] uppercase tracking-wide text-salvaje-gray">tareas · {pct}%</p>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-salvaje-light-alt overflow-hidden">
          <div className="h-full rounded-full bg-salvaje-success transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 font-body text-sm text-salvaje-dark bg-salvaje-light rounded-xl px-4 py-3 border-l-4 border-salvaje-orange">{plan.focus}</p>
      </div>

      {/* Sugerencias del copiloto para hoy */}
      {isToday && suggestions.filter((s) => s.nivel === 'alta').length > 0 && (
        <div className="rounded-xl border border-salvaje-danger/30 bg-salvaje-danger/5 px-4 py-3">
          <p className="font-body text-xs font-bold uppercase tracking-wide text-salvaje-danger mb-1">Prioridad del copiloto hoy</p>
          {suggestions.filter((s) => s.nivel === 'alta').map((s, i) => (
            <p key={i} className="font-body text-sm text-salvaje-dark mb-1">• {s.texto}</p>
          ))}
        </div>
      )}

      {/* Checklist por franja */}
      {SLOTS.map((slot) => {
        const items = plan.tasks.filter((t) => t.slot === slot)
        if (!items.length) return null
        return (
          <div key={slot} className="bg-white rounded-salvaje p-5 shadow-salvaje">
            <p className="font-display text-lg uppercase text-salvaje-dark mb-2">{slot}</p>
            <div className="space-y-1.5">
              {items.map((t) => {
                const Icon = CAT_ICON[t.cat] || Zap
                const checked = !!done[t.id]
                return (
                  <label key={t.id} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition ${checked ? 'border-salvaje-success/30 bg-salvaje-success/5' : 'border-salvaje-cream bg-salvaje-light hover:bg-salvaje-light-alt'}`}>
                    <input type="checkbox" checked={checked} onChange={() => onToggle(t)} className="mt-0.5 h-4 w-4 accent-salvaje-success" />
                    <Icon size={16} className={`mt-0.5 shrink-0 ${checked ? 'text-salvaje-success' : 'text-salvaje-orange'}`} />
                    <span className={`font-body text-sm ${checked ? 'text-salvaje-gray line-through' : 'text-salvaje-dark'}`}>
                      <b className="font-semibold">{t.cat}:</b> {t.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}

      <DayNote key={key} dayKeyStr={key} initial={dayDoc.nota || ''} />
    </div>
  )
}

function DayNote({ dayKeyStr, initial }) {
  const [nota, setNota] = useState(initial)
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try { await saveDayMetrics(dayKeyStr, { nota }); toast.success('Nota guardada') }
    catch (e) { console.error(e); toast.error('No se pudo guardar') } finally { setSaving(false) }
  }
  return (
    <div className="bg-white rounded-salvaje p-5 shadow-salvaje">
      <div className="flex items-center gap-2 mb-2">
        <StickyNote size={16} className="text-salvaje-gold" />
        <p className="font-body text-sm font-semibold text-salvaje-dark">Notas del día (aprendizajes, resultados, bloqueos)</p>
      </div>
      <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3}
        placeholder="Ej: el reel del inflable hizo 4x el alcance normal — repetir mañana con otro ángulo…"
        className="w-full rounded-xl border border-salvaje-cream bg-salvaje-light px-3 py-2.5 font-body text-sm text-salvaje-dark outline-none focus:border-salvaje-orange resize-y" />
      <button onClick={save} disabled={saving}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-salvaje-brown px-4 py-2 font-display text-sm uppercase tracking-widest text-white hover:bg-salvaje-orange transition disabled:opacity-50">
        <Save size={14} /> Guardar nota
      </button>
    </div>
  )
}
