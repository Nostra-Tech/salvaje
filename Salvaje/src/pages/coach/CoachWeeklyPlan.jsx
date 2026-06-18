import { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, X, AlertCircle, Copy, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import {
  getCoachPlans, ensurePlanForWeek, publishClassFromPlan, removeClassFromPlan,
} from '../../services/weekly-plan.service'
import { CircuitBuilder } from '../../components/coach/CircuitBuilder'
import { getCoachClasses } from '../../services/classes.service'
import { getServiceHours, SERVICE_HOURS_DEFAULT } from '../../services/service-hours.service'
import { formatWeekLabel, getWeekStart } from '../../utils/dateHelpers'
import { addDays } from 'date-fns'
import { PLAN_STATUS, DAYS_ES, CLASS_STATUS } from '../../utils/constants'

const emptyClass = { name: '', startTime: '', endTime: '', wod: '', exercises: [], circuit: null, maxCapacity: 15, level: 'all' }
const DAYS_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Returns the configured class-time slots for a day as { start, end } pairs.
 * Falls back to hourly slots from startHour→endHour when no explicit slots saved.
 */
function buildSlotsForDay(dayKey, serviceHours) {
  const cfg = serviceHours?.[dayKey]
  if (!cfg || !cfg.active) return []
  if (cfg.slots?.length > 0) return cfg.slots.map((s) => ({ start: s.start, end: s.end }))
  // Legacy fallback: hourly slots
  const slots = []
  for (let h = cfg.startHour; h < cfg.endHour; h++) {
    slots.push({ start: `${pad2(h)}:00`, end: `${pad2(h + 1)}:00` })
  }
  return slots
}

export function CoachWeeklyPlan() {
  const { user, profile } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [plans, setPlans] = useState([])
  const [currentPlan, setCurrentPlan] = useState(null)
  const [weekClasses, setWeekClasses] = useState([])
  const [days, setDays] = useState({ monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] })
  const [addingClass, setAddingClass] = useState(null)
  const [newClass, setNewClass] = useState(emptyClass)
  const [publishing, setPublishing] = useState(false)
  const [serviceHours, setServiceHours] = useState(SERVICE_HOURS_DEFAULT)

  const weekStart = addDays(getWeekStart(new Date()), weekOffset * 7)
  const weekLabel = formatWeekLabel(weekStart)

  useEffect(() => {
    getCoachPlans(user.uid).then(setPlans)
    getServiceHours().then(setServiceHours).catch(() => {})
  }, [user.uid])

  // Slot options for the "add class" modal — { start, end, disabled } pairs.
  const slotOptions = useMemo(() => {
    if (addingClass === null || addingClass === undefined) return []
    const dayKey = DAYS_KEYS[addingClass]
    const all = buildSlotsForDay(dayKey, serviceHours)
    const taken = new Set((days[dayKey] || []).map((c) => c.startTime))
    return all.map((slot) => ({ ...slot, disabled: taken.has(slot.start) }))
  }, [addingClass, days, serviceHours])

  // Fetch all coach's classes that fall in the current week (source of truth).
  // Includes scheduled, in_progress, and completed — every class belongs to the plan.
  const fetchWeekClasses = async () => {
    try {
      // getCoachClasses uses days back/forward; we just want this week.
      const all = await getCoachClasses(user.uid, 0, 14)
      const weekEnd = addDays(weekStart, 7)
      const inWeek = (all || []).filter((c) => {
        if (c.status === CLASS_STATUS.CANCELLED) return false
        const d = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate)
        return d >= weekStart && d < weekEnd
      })
      setWeekClasses(inWeek)
    } catch (e) {
      console.warn('fetchWeekClasses failed:', e)
      setWeekClasses([])
    }
  }

  useEffect(() => {
    if (!user?.uid) return
    fetchWeekClasses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, weekOffset])

  // Build `days` from the live `classes/` data, not from plan.days[]. This way
  // any class scheduled for the coach this week shows in the plan, even if it
  // was created by the admin or via a different path.
  useEffect(() => {
    const plan = plans.find((p) => {
      const ps = p.weekStart?.toDate ? p.weekStart.toDate() : new Date(p.weekStart)
      return ps.toDateString() === weekStart.toDateString()
    })
    setCurrentPlan(plan || null)

    const fresh = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }
    for (const cls of weekClasses) {
      const d = cls.scheduledDate?.toDate?.() || new Date(cls.scheduledDate)
      const dayKey = DAYS_KEYS[(d.getDay() + 6) % 7] // monday-first
      const startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      const endD = cls.endDate?.toDate?.() || new Date(cls.endDate || d)
      const endTime = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`
      fresh[dayKey].push({
        id: cls.id,
        name: cls.name,
        startTime,
        endTime,
        wod: cls.wod || '',
        exercises: Array.isArray(cls.exercises) ? cls.exercises : [],
        maxCapacity: cls.maxCapacity,
        level: cls.level || 'all',
        status: cls.status,
        currentBookings: cls.currentBookings || 0,
        attendedCount: cls.attendedCount || 0,
        coachId: cls.coachId,
        weeklyPlanId: cls.weeklyPlanId || null,
        scheduledDate: cls.scheduledDate,
      })
    }
    // Sort each day by start time
    for (const k of DAYS_KEYS) {
      fresh[k].sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    setDays(fresh)
  }, [weekOffset, plans, weekClasses])

  const refreshPlans = async () => {
    const [p] = await Promise.all([getCoachPlans(user.uid), fetchWeekClasses()])
    setPlans(p)
  }

  // Live-publish: when coach adds a class, it lands in `classes/` immediately
  // and admin sees it. No need for "Save plan" step.
  const handleAddClass = async () => {
    if (addingClass === null || addingClass === undefined) return
    if (!newClass.name?.trim()) { toast.error('Ponle nombre a la clase'); return }
    if (!newClass.startTime) { toast.error('Selecciona la hora'); return }

    const dayIdx = addingClass
    const dayKey = DAYS_KEYS[dayIdx]

    // Block duplicate same-day same-hour client-side (server also rechecks).
    const startTakenLocally = (days[dayKey] || []).some((c) => c.startTime === newClass.startTime)
    if (startTakenLocally) {
      toast.error('Ya tienes una clase a esa hora ese día')
      return
    }

    // Default duration = 1h if the coach didn't pick an end. Otherwise honor
    // their choice — they may run 90-min specials, etc. End must be after start.
    const [sh] = newClass.startTime.split(':').map(Number)
    const computedEnd = `${pad2(sh + 1)}:00`
    if (!newClass.endTime) newClass.endTime = computedEnd
    if (newClass.endTime <= newClass.startTime) {
      toast.error('La hora de fin debe ser después de la hora de inicio')
      return
    }

    setPublishing(true)
    try {
      // 1) Ensure plan exists for this week
      const { planId, plan } = await ensurePlanForWeek({
        coachId: user.uid,
        coachName: profile?.displayName || '',
        coachPhotoURL: profile?.profilePhotoURL || '',
        weekStart,
      })

      // 2) Publish class immediately (creates classes/ doc + updates plan.days)
      await publishClassFromPlan({
        planId,
        coachId: user.uid,
        coachName: profile?.displayName || '',
        coachPhotoURL: profile?.profilePhotoURL || '',
        weekStart,
        dayIdx,
        dayKey,
        cls: newClass,
        isNewPlan: !plan,
      })

      // Publish succeeded — close modal + toast immediately.
      setNewClass(emptyClass)
      setAddingClass(null)
      toast.success('Clase publicada · ya es visible para el admin y los salvajes')

      // Refresh in background; if it fails (e.g. missing index), don't mask the success.
      refreshPlans().catch((e) => console.warn('refreshPlans after publish failed:', e))
    } catch (e) {
      console.error('publishClassFromPlan failed:', e)
      toast.error('No pudimos publicar la clase: ' + (e?.message || 'error desconocido'))
    } finally {
      setPublishing(false)
    }
  }

  const removeClass = async (dayIdx, classIdx) => {
    const dayKey = DAYS_KEYS[dayIdx]
    const cls = (days[dayKey] || [])[classIdx]
    if (!cls) return
    if (!currentPlan?.id) {
      // No plan yet — just clear local state (shouldn't happen with live publish)
      setDays((d) => ({ ...d, [dayKey]: d[dayKey].filter((_, i) => i !== classIdx) }))
      return
    }
    if (!confirm(`¿Cancelar "${cls.name}"? Si hay salvajes inscritos, recibirán aviso.`)) return

    setPublishing(true)
    try {
      await removeClassFromPlan({
        planId: currentPlan.id,
        classId: cls.id,
        dayKey,
        dayIdx,
        coachId: user.uid,
        coachName: profile?.displayName || '',
      })
      await refreshPlans()
      toast.success('Clase cancelada')
    } catch (e) {
      console.error('removeClassFromPlan failed:', e)
      toast.error('No pudimos cancelar: ' + (e?.message || ''))
    } finally {
      setPublishing(false)
    }
  }

  const totalClasses = DAYS_KEYS.reduce((acc, k) => acc + (days[k]?.length || 0), 0)

  const statusVariant = { draft: 'default', pending_approval: 'gold', approved: 'success', rejected: 'danger' }
  const statusLabel = { draft: 'En vivo', pending_approval: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }

  // Plan is editable unless approved (admin already locked it) or completed.
  const isEditable = !currentPlan || currentPlan.status !== PLAN_STATUS.APPROVED

  return (
    <AppShell title="Plan Semanal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-4">
        {/* Week selector */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl uppercase text-salvaje-dark">Plan Semanal</h1>
          {currentPlan && <Badge variant={statusVariant[currentPlan.status]}>{statusLabel[currentPlan.status]}</Badge>}
        </div>

        <div className="flex items-center gap-3">
          {/* V6 Ajuste 13: el coach solo navega entre semana actual (0) y siguiente (1). */}
          <button
            onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
            disabled={weekOffset <= 0}
            className="p-2 rounded-xl bg-white shadow-salvaje hover:shadow-salvaje-md transition-all text-salvaje-gray disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="flex-1 text-center font-mono text-sm text-salvaje-dark">
            {weekLabel}
            {weekOffset === 0 && <span className="ml-2 text-[10px] uppercase tracking-widest text-salvaje-orange">· Actual</span>}
            {weekOffset === 1 && <span className="ml-2 text-[10px] uppercase tracking-widest text-salvaje-orange">· Siguiente</span>}
          </p>
          <button
            onClick={() => setWeekOffset((o) => Math.min(1, o + 1))}
            disabled={weekOffset >= 1}
            className="p-2 rounded-xl bg-white shadow-salvaje hover:shadow-salvaje-md transition-all text-salvaje-gray disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Duplicate previous week (publishes all classes live) */}
        {isEditable && totalClasses === 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="ghost" disabled={publishing} onClick={async () => {
              const prev = plans.find((p) => {
                const ps = p.weekStart?.toDate ? p.weekStart.toDate() : new Date(p.weekStart)
                return ps.toDateString() === addDays(weekStart, -7).toDateString()
              })
              if (!prev) { toast.error('No tienes plan de la semana anterior'); return }
              if (!confirm('¿Publicar todas las clases de la semana anterior en esta semana?')) return

              setPublishing(true)
              const t = toast.loading('Publicando clases...')
              try {
                const { planId } = await ensurePlanForWeek({
                  coachId: user.uid,
                  coachName: profile?.displayName || '',
                  coachPhotoURL: profile?.profilePhotoURL || '',
                  weekStart,
                })
                let count = 0
                for (const dayKey of DAYS_KEYS) {
                  const arr = (prev.days?.[dayKey] || [])
                  const dayIdx = DAYS_KEYS.indexOf(dayKey)
                  for (const cls of arr) {
                    await publishClassFromPlan({
                      planId,
                      coachId: user.uid,
                      coachName: profile?.displayName || '',
                      coachPhotoURL: profile?.profilePhotoURL || '',
                      weekStart,
                      dayIdx,
                      dayKey,
                      cls,
                      isNewPlan: false,
                    })
                    count++
                  }
                }
                await refreshPlans()
                toast.success(`${count} clases publicadas`, { id: t })
              } catch (e) {
                console.error('duplicate week failed:', e)
                toast.error('Error al duplicar: ' + (e?.message || ''), { id: t })
              } finally {
                setPublishing(false)
              }
            }}>
              <Copy size={14} /> Duplicar semana anterior
            </Button>
          </div>
        )}

        {currentPlan?.status === PLAN_STATUS.REJECTED && currentPlan.rejectionReason && (
          <div className="flex items-start gap-2 px-4 py-3 bg-salvaje-danger/10 border border-salvaje-danger/20 rounded-xl">
            <AlertCircle size={16} className="text-salvaje-danger mt-0.5 flex-shrink-0" />
            <p className="text-sm font-body text-salvaje-danger">{currentPlan.rejectionReason}</p>
          </div>
        )}

        {/* Days grid */}
        <div className="space-y-3">
          {DAYS_KEYS.map((dayKey, dayIdx) => (
            <Card key={dayKey}>
              <CardBody className="py-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-lg uppercase text-salvaje-dark">{DAYS_ES[dayIdx]}</h3>
                  {isEditable && (
                    <button onClick={() => { setAddingClass(dayIdx); setNewClass(emptyClass) }} className="p-1.5 rounded-lg bg-salvaje-orange/10 hover:bg-salvaje-orange/20 transition-colors text-salvaje-orange">
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                {(days[dayKey] || []).length === 0 ? (
                  <p className="text-xs font-body text-salvaje-gray">Sin clases</p>
                ) : (
                  <div className="space-y-1.5">
                    {(days[dayKey] || []).map((cls, clsIdx) => {
                      const isCompleted = cls.status === CLASS_STATUS.COMPLETED
                      const isLive = cls.status === CLASS_STATUS.IN_PROGRESS
                      const statusBg = isLive
                        ? 'bg-salvaje-success/10 border border-salvaje-success/30'
                        : isCompleted
                        ? 'bg-salvaje-cream/30 border border-salvaje-cream/60'
                        : 'bg-salvaje-light'
                      const canRemove = isEditable && cls.status === CLASS_STATUS.SCHEDULED
                      return (
                      <div key={cls.id || clsIdx} className={`flex items-center justify-between rounded-xl px-3 py-2 ${statusBg}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-body text-sm font-semibold truncate ${isCompleted ? 'text-salvaje-gray' : 'text-salvaje-dark'}`}>{cls.name || 'Clase'}</p>
                            {isLive && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-salvaje-success text-white text-[8px] font-mono uppercase tracking-wider">
                                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                EN VIVO
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-1.5 py-0.5 rounded-full bg-salvaje-gray/20 text-salvaje-gray text-[8px] font-mono uppercase tracking-wider">
                                Cerrada
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-salvaje-gray">{cls.startTime} &ndash; {cls.endTime}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {Array.isArray(cls.exercises) && cls.exercises.length > 0 && (
                              <p className="font-mono text-[10px] text-salvaje-orange">{cls.exercises.length} ejercicio{cls.exercises.length === 1 ? '' : 's'}</p>
                            )}
                            {(cls.currentBookings > 0 || cls.attendedCount > 0) && (
                              <p className="font-mono text-[10px] text-salvaje-gray">
                                {isCompleted ? `${cls.attendedCount}/${cls.currentBookings} asistieron` : `${cls.currentBookings} reservados`}
                              </p>
                            )}
                          </div>
                        </div>
                        {canRemove && (
                          <button onClick={() => removeClass(dayIdx, clsIdx)} className="text-salvaje-danger/60 hover:text-salvaje-danger p-1 flex-shrink-0">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    )})}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Footer summary */}
        {totalClasses > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs font-body text-salvaje-success py-2">
            <CheckCircle2 size={14} />
            <span>{totalClasses} clase{totalClasses === 1 ? '' : 's'} publicada{totalClasses === 1 ? '' : 's'} esta semana</span>
          </div>
        )}
      </div>

      <Modal open={addingClass !== null} onClose={() => setAddingClass(null)} title={`Agregar clase \u2014 ${addingClass !== null ? DAYS_ES[addingClass] : ''}`}>
        <div className="px-5 pb-5 space-y-4">
          <Input label="Nombre de la clase" value={newClass.name} onChange={(e) => setNewClass((c) => ({ ...c, name: e.target.value }))} placeholder="WOD, Cardio, Barbell..." />
          {slotOptions.length === 0 ? (
            <div className="bg-salvaje-danger/10 border border-salvaje-danger/30 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-salvaje-danger flex-shrink-0 mt-0.5" />
              <p className="text-xs font-body text-salvaje-danger">
                Este d\u00eda no tiene franjas configuradas. Pide al admin que las agregue en Horarios.
              </p>
            </div>
          ) : (
            <Select
              label="Horario de clase"
              value={newClass.startTime}
              onChange={(e) => {
                const start = e.target.value
                const slot = slotOptions.find((s) => s.start === start)
                setNewClass((c) => ({ ...c, startTime: start, endTime: slot?.end || '' }))
              }}
            >
              <option value="">Selecciona una franja</option>
              {slotOptions.map(({ start, end, disabled }) => (
                <option key={start} value={start} disabled={disabled}>
                  {start} \u2013 {end}{disabled ? ' \u00b7 ocupada' : ''}
                </option>
              ))}
            </Select>
          )}
          {newClass.startTime && newClass.endTime && (() => {
            const [sh, sm] = newClass.startTime.split(':').map(Number)
            const [eh, em] = newClass.endTime.split(':').map(Number)
            const mins = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))
            const label = mins >= 60 ? `${(mins / 60).toFixed(mins % 60 === 0 ? 0 : 1)} h` : `${mins} min`
            return (
              <p className="font-mono text-[11px] text-salvaje-gray -mt-2">
                Duraci\u00f3n: {label}
              </p>
            )
          })()}
          <Select label="Nivel" value={newClass.level} onChange={(e) => setNewClass((c) => ({ ...c, level: e.target.value }))}>
            <option value="all">Todos</option>
            <option value="beginner">Principiante</option>
            <option value="intermediate">Intermedio</option>
            <option value="advanced">Avanzado</option>
          </Select>
          <Input label="Capacidad" type="number" value={newClass.maxCapacity} onChange={(e) => setNewClass((c) => ({ ...c, maxCapacity: parseInt(e.target.value) || 15 }))} />

          {/* Exercise list \u2014 one per line */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-salvaje-gray uppercase tracking-wide font-body">
              Ejercicios (uno por l\u00ednea)
            </label>
            <textarea
              value={(newClass.exercises || []).join('\n')}
              onChange={(e) => setNewClass((c) => ({ ...c, exercises: e.target.value.split('\n') }))}
              placeholder={'10 Burpees\n15 Air Squats\n20 Push Ups'}
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-salvaje-cream bg-white font-mono text-sm text-salvaje-dark resize-none focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange transition-all duration-200"
            />
            <p className="text-[11px] font-body text-salvaje-gray">
              {(newClass.exercises || []).filter((x) => x?.trim()).length} ejercicio(s)
            </p>
          </div>

          {/* V6 Ajuste 2 — Constructor de circuito estructurado (sets, reps, tiempo). */}
          <div className="border-t border-salvaje-cream pt-3">
            <label className="text-xs font-semibold text-salvaje-gray uppercase tracking-wide font-body mb-2 block">
              Circuito estructurado (opcional)
            </label>
            <CircuitBuilder
              value={newClass.circuit}
              onChange={(circuit) => setNewClass((c) => ({ ...c, circuit }))}
            />
          </div>

          <Textarea label="Notas / WOD" value={newClass.wod} onChange={(e) => setNewClass((c) => ({ ...c, wod: e.target.value }))} placeholder="Estructura, AMRAP, EMOM, tiempo..." rows={3} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" disabled={publishing} onClick={() => setAddingClass(null)}>Cancelar</Button>
            <Button className="flex-1" loading={publishing} onClick={handleAddClass}>Publicar clase</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
