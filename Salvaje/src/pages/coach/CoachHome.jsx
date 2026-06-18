import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Clock, Users, Play, Calendar, DollarSign, ClipboardList,
  ChevronRight, AlertCircle, CheckCircle, ScanLine,
} from 'lucide-react'
import { usePayrollCutReminder } from '../../hooks/usePayrollCutReminder'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { getCoachClasses, autoFinalizeStaleClasses } from '../../services/classes.service'
import { periodForDate, getPayrollByPeriod } from '../../services/payroll.service'
import { getCoachPlans } from '../../services/weekly-plan.service'
import { CLASS_AUTO_FINALIZE_MIN } from '../../utils/constants'
import { formatTime, formatCOP } from '../../utils/formatters'

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function startOfWeek(d) {
  const x = new Date(d); x.setHours(0,0,0,0)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function addWeeks(d, n) { return addDays(d, n * 7) }

function parseEndTime(startDate, endTimeStr) {
  // endTime can be a Timestamp or 'HH:mm' or already-Date
  if (!endTimeStr) return null
  if (endTimeStr?.toDate) return endTimeStr.toDate()
  if (typeof endTimeStr === 'string') {
    const [h, m] = endTimeStr.split(':').map(Number)
    const d = new Date(startDate)
    d.setHours(h, m, 0, 0)
    return d
  }
  return new Date(endTimeStr)
}

const AUTO_FINALIZE_MS = CLASS_AUTO_FINALIZE_MIN * 60 * 1000

export function CoachHome() {
  const { profile, user } = useAuth()
  // V5 Ajuste 11: payroll cut reminder on days 15/30/31.
  usePayrollCutReminder(user?.uid, 'coach')
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [currentPayroll, setCurrentPayroll] = useState(null)
  const [nextWeekPlan, setNextWeekPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)

  // Tick every 30s so the NextClassCard re-evaluates the start window without reload.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    const load = async () => {
      const period = periodForDate(new Date()).period
      const [cls, payrolls, plans] = await Promise.all([
        getCoachClasses(user.uid, 1, 14).catch(() => []),
        getPayrollByPeriod(period).catch(() => []),
        getCoachPlans(user.uid).catch(() => []),
      ])
      // Silently close stale classes: scheduled never opened OR in_progress never closed.
      const synced = await autoFinalizeStaleClasses(cls)
      setClasses(synced)
      setCurrentPayroll(payrolls.find((p) => p.coachId === user.uid) || null)

      // Next week plan
      const nextWeek = addWeeks(startOfWeek(new Date()), 1)
      const nextPlan = plans.find((p) => {
        const ws = p.weekStart?.toDate ? p.weekStart.toDate() : new Date(p.weekStart)
        return Math.abs(ws - nextWeek) < 86400000
      })
      setNextWeekPlan(nextPlan || null)
      setLoading(false)
    }
    load()
  }, [user?.uid])

  const now = new Date()
  const firstName = profile?.displayName?.split(' ')[0] || 'Coach'

  // Find next class — skips classes whose end window already passed.
  // Auto-finalize runs in the background; this filter keeps the UI honest
  // between renders.
  const nextClass = useMemo(() => {
    return classes
      .filter((c) => {
        if (c.status !== 'scheduled' && c.status !== 'in_progress') return false
        const start = c.scheduledDate?.toDate ? c.scheduledDate.toDate() : new Date(c.scheduledDate)
        const end = parseEndTime(start, c.endDate || c.endTime)
        // Skip if class ended past the auto-finalize threshold (no point as "next")
        if (end && (now - end) > AUTO_FINALIZE_MS) return false
        return true
      })
      .sort((a, b) => {
        const ad = a.scheduledDate?.toDate?.() || new Date(0)
        const bd = b.scheduledDate?.toDate?.() || new Date(0)
        return ad - bd
      })[0] || null
  }, [classes, now.getTime()])

  // Week classes
  const weekStart = startOfWeek(now)
  const weekEnd = addDays(weekStart, 7)
  const weekClasses = useMemo(() =>
    classes.filter((c) => {
      const d = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate)
      return d >= weekStart && d < weekEnd
    })
  , [classes, weekStart, weekEnd])

  const weekByDay = useMemo(() => {
    const arr = Array(7).fill(0)
    for (const c of weekClasses) {
      const d = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate)
      const idx = (d.getDay() + 6) % 7 // monday-first
      arr[idx]++
    }
    return arr
  }, [weekClasses])

  const todayDate = now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  // Quincena range label: "1 al 15 de mayo 2025"
  const quincenaInfo = periodForDate(now)
  const quincenaLabel = (() => {
    const s = quincenaInfo.startDate
    const e = quincenaInfo.endDate
    const month = s.toLocaleDateString('es-CO', { month: 'long' })
    return `${s.getDate()} al ${e.getDate()} de ${month} ${s.getFullYear()}`
  })()

  return (
    <AppShell title="Coach">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="font-display text-4xl lg:text-5xl uppercase text-salvaje-dark leading-none">
            Hola, {firstName}
          </h1>
          <p className="font-body text-xs text-salvaje-gray mt-1 capitalize">{todayDate}</p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-40 bg-white rounded-2xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3].map((i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Próxima clase — full width, always prominent */}
            <NextClassCard cls={nextClass} navigate={navigate} />

            {/* Esta semana + Quincena: side by side on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Esta semana */}
              <Card className="h-full">
                <CardBody className="py-4 h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-salvaje-orange" />
                      <p className="font-display text-base uppercase text-salvaje-dark">Esta semana</p>
                    </div>
                    <button onClick={() => navigate('/coach/classes')} className="font-body text-xs text-salvaje-orange hover:underline flex items-center gap-1">
                      Ver mis clases <ChevronRight size={12} />
                    </button>
                  </div>
                  <p className="font-display text-3xl text-salvaje-orange leading-none">
                    {weekClasses.length} <span className="font-body text-sm text-salvaje-gray uppercase tracking-wider">clases programadas</span>
                  </p>
                  <div className="flex gap-1.5 mt-3">
                    {weekByDay.map((count, i) => (
                      <div key={i} className="flex-1 text-center">
                        <p className="font-mono text-[10px] text-salvaje-gray">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i]}</p>
                        <div className={`h-12 rounded-md flex items-center justify-center font-display text-sm ${
                          count > 0 ? 'bg-salvaje-orange/15 text-salvaje-orange' : 'bg-salvaje-light text-salvaje-gray'
                        }`}>
                          {count || ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              {/* Quincena actual */}
              <Card className="h-full">
                <CardBody className="py-4 h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} className="text-salvaje-orange" />
                      <p className="font-display text-base uppercase text-salvaje-dark">Quincena actual</p>
                    </div>
                    <button onClick={() => navigate('/coach/payroll')} className="font-body text-xs text-salvaje-orange hover:underline flex items-center gap-1">
                      Ver mi nómina <ChevronRight size={12} />
                    </button>
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-salvaje-gray mb-2 capitalize">{quincenaLabel}</p>
                  {currentPayroll ? (
                    <>
                      <p className="font-display text-4xl text-salvaje-orange leading-none">
                        {formatCOP(currentPayroll.totalEarned || 0)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs font-body text-salvaje-gray">
                        <span><Clock size={11} className="inline mr-1" />{(currentPayroll.hoursWorked || 0).toFixed(1)}h</span>
                        <span><Calendar size={11} className="inline mr-1" />{currentPayroll.classesGiven || 0} clases</span>
                        <Badge variant="orange">En curso</Badge>
                      </div>
                    </>
                  ) : (
                    <p className="font-body text-sm text-salvaje-gray">Sin clases finalizadas aún en este período</p>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Plan próxima semana — full width */}
            <Card>
              <CardBody className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={18} className="text-salvaje-orange" />
                    <p className="font-display text-base uppercase text-salvaje-dark">Plan próxima semana</p>
                  </div>
                  <button onClick={() => navigate('/coach/plan')} className="font-body text-xs text-salvaje-orange hover:underline flex items-center gap-1">
                    Ver plan <ChevronRight size={12} />
                  </button>
                </div>
                {nextWeekPlan ? (
                  <PlanStatus plan={nextWeekPlan} />
                ) : (
                  <div className="bg-salvaje-danger/5 border border-salvaje-danger/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={16} className="text-salvaje-danger mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-body text-sm font-semibold text-salvaje-danger">Sin plan para la próxima semana</p>
                      <p className="font-body text-xs text-salvaje-gray">Súbelo antes del sábado 4pm.</p>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function NextClassCard({ cls, navigate }) {
  if (!cls) {
    return (
      <Card>
        <CardBody className="py-6 text-center">
          <Calendar size={28} className="text-salvaje-cream mx-auto mb-2" />
          <p className="font-display text-base uppercase text-salvaje-dark">Sin próxima clase</p>
          <p className="font-body text-xs text-salvaje-gray mt-1">Aquí no hay nada todavía. Es tu turno.</p>
        </CardBody>
      </Card>
    )
  }

  const startTime = cls.scheduledDate?.toDate?.() || new Date(cls.scheduledDate)
  const endTime = parseEndTime(startTime, cls.endDate || cls.endTime)
  const now = new Date()
  const minutesUntilStart = (startTime - now) / 60000
  const minutesAfterEnd = endTime ? (now - endTime) / 60000 : -Infinity

  const isInProgress = cls.status === 'in_progress'
  // Allow start: 15 min before until 15 min after end
  const canStart = cls.status === 'scheduled' && minutesUntilStart <= 15 && minutesAfterEnd <= 15
  const isHighlighted = isInProgress || canStart

  // Smart date label: "Hoy" / "Mañana" / "vie 9 may"
  const today0 = new Date(); today0.setHours(0, 0, 0, 0)
  const tomorrow0 = new Date(today0); tomorrow0.setDate(tomorrow0.getDate() + 1)
  const start0 = new Date(startTime); start0.setHours(0, 0, 0, 0)
  const dateLabel = start0.getTime() === today0.getTime()
    ? 'Hoy'
    : start0.getTime() === tomorrow0.getTime()
    ? 'Mañana'
    : startTime.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

  let label = ''
  if (minutesUntilStart > 15) {
    label = `Disponible para iniciar en ${Math.ceil(minutesUntilStart - 15)} min`
  } else if (minutesAfterEnd > 15) {
    label = 'La clase ya pasó'
  } else if (minutesUntilStart < 0 && cls.status === 'scheduled') {
    label = `Empezó hace ${Math.abs(Math.floor(minutesUntilStart))} min · inicia ahora`
  }

  // VERDE: clase EN VIVO (in_progress)
  if (isInProgress) {
    return (
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <div className="bg-gradient-to-br from-salvaje-success to-emerald-700 rounded-salvaje p-5 text-white shadow-salvaje-md ring-4 ring-salvaje-success/25">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/80 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/90">Clase en vivo</p>
            <span className="ml-auto bg-white text-salvaje-success font-display text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full">EN VIVO</span>
          </div>
          <h2 className="font-display text-3xl uppercase leading-none mb-3">{cls.name}</h2>
          <div className="flex items-center gap-3 text-sm font-body text-white/90 mb-4 flex-wrap">
            <span className="flex items-center gap-1 capitalize"><Calendar size={13} />{dateLabel}</span>
            <span className="flex items-center gap-1"><Clock size={13} />{formatTime(cls.scheduledDate)} - {formatTime(cls.endDate)}</span>
            <span className="flex items-center gap-1"><Users size={13} />{cls.currentBookings || cls.attendeeList?.length || 0}/{cls.maxCapacity}</span>
          </div>
          <Button
            variant="secondary"
            className="w-full bg-white text-salvaje-success border-white hover:bg-salvaje-light"
            onClick={() => navigate(`/coach/classes/${cls.id}/active`)}
          >
            <Play size={16} /> Continuar clase
          </Button>
          <button
            onClick={() => navigate('/coach/checkin')}
            className="w-full mt-2 bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 text-sm font-body text-white flex items-center justify-center gap-2 transition-colors"
          >
            <ScanLine size={14} /> Registrar otro asistente
          </button>
        </div>
      </motion.div>
    )
  }

  // NARANJA: dentro de ventana de inicio
  if (canStart) {
    return (
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="bg-gradient-to-br from-salvaje-orange to-salvaje-fire rounded-salvaje p-5 text-white shadow-salvaje-md ring-4 ring-salvaje-orange/30">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/80 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/90">Listo para iniciar</p>
          </div>
          <h2 className="font-display text-3xl uppercase leading-none mb-3">{cls.name}</h2>
          <div className="flex items-center gap-3 text-sm font-body text-white/90 mb-4 flex-wrap">
            <span className="flex items-center gap-1 capitalize"><Calendar size={13} />{dateLabel}</span>
            <span className="flex items-center gap-1"><Clock size={13} />{formatTime(cls.scheduledDate)} - {formatTime(cls.endDate)}</span>
            <span className="flex items-center gap-1"><Users size={13} />{cls.currentBookings || cls.attendeeList?.length || 0}/{cls.maxCapacity}</span>
          </div>
          <Button
            variant="secondary"
            size="lg"
            className="w-full bg-white text-salvaje-orange border-white hover:bg-salvaje-light font-display uppercase tracking-wide"
            onClick={() => navigate(`/coach/classes/${cls.id}/active`)}
          >
            <Play size={18} /> Iniciar registro
          </Button>
        </div>
      </motion.div>
    )
  }

  // Default: próxima clase, sin destacar tanto
  return (
    <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <Card>
        <CardBody className="py-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray mb-1">
            Próxima clase
          </p>
          <h2 className="font-display text-2xl uppercase leading-none text-salvaje-dark mb-2">{cls.name}</h2>
          <div className="flex items-center gap-3 text-sm font-body text-salvaje-gray mb-3 flex-wrap">
            <span className="flex items-center gap-1 capitalize"><Calendar size={13} />{dateLabel}</span>
            <span className="flex items-center gap-1"><Clock size={13} />{formatTime(cls.scheduledDate)} - {formatTime(cls.endDate)}</span>
            <span className="flex items-center gap-1"><Users size={13} />{cls.currentBookings || cls.attendeeList?.length || 0}/{cls.maxCapacity}</span>
          </div>
          <div className="bg-salvaje-light rounded-xl p-3 text-center text-sm font-body text-salvaje-gray">
            {label || 'Aún no es hora'}
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
}

function PlanStatus({ plan }) {
  const totalClasses = Object.values(plan.days || {}).reduce((acc, d) => acc + (d?.length || 0), 0)
  const statusVariant = { draft: 'default', pending_approval: 'gold', approved: 'success', rejected: 'danger' }
  const statusLabel = { draft: 'Borrador', pending_approval: 'Pendiente aprobación', approved: 'Aprobado', rejected: 'Rechazado' }
  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant={statusVariant[plan.status]}>{statusLabel[plan.status]}</Badge>
      </div>
      <p className="font-body text-sm text-salvaje-dark">{totalClasses} clases en el plan</p>
    </>
  )
}
