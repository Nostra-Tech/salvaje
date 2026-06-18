import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Calendar, CreditCard, DollarSign, TrendingUp, TrendingDown,
  Activity, ClipboardList, AlertTriangle, Target, ScanLine, ArrowUpCircle,
  ArrowDownCircle, Trophy, Clock, X, CheckCircle2, UserCheck, Zap,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ComposedChart,
} from 'recharts'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { getAllUsers } from '../../services/users.service'
import { getAllClasses, subscribeToClass, autoFinalizeStaleClasses } from '../../services/classes.service'
import { Avatar } from '../../components/ui/Avatar'
import { motion, AnimatePresence } from 'framer-motion'
import { formatTime } from '../../utils/formatters'
import { getPendingPayments } from '../../services/membership.service'
import { fetchLastSixMonths, fetchCashflowRangeSummary } from '../../services/cashflow.service'
import { getRecommendations } from '../../services/recommendations.service'
import { useCachedQuery } from '../../hooks/useCachedQuery'
import { useLiveClasses } from '../../hooks/useLiveClasses'
import { usePayrollCutReminder } from '../../hooks/usePayrollCutReminder'
import { useAuth } from '../../hooks/useAuth'
import { formatCOP } from '../../utils/formatters'

const RANGES = [
  { value: 'today',   label: 'Hoy' },
  { value: 'week',    label: 'Semana' },
  { value: 'month',   label: 'Mes' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'custom',  label: 'Custom' },
]

function startOfRange(range, customFrom) {
  const now = new Date()
  if (range === 'today')   { const d = new Date(now); d.setHours(0,0,0,0); return d }
  if (range === 'week')    { const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); return d }
  if (range === 'month')   { const d = new Date(now.getFullYear(), now.getMonth(), 1); return d }
  if (range === 'quarter') { const d = new Date(now); d.setDate(d.getDate() - 90); d.setHours(0,0,0,0); return d }
  if (range === 'custom' && customFrom) return new Date(customFrom + 'T00:00:00')
  return new Date(0)
}

function endOfRange(range, customTo) {
  const now = new Date()
  if (range === 'today') { const d = new Date(now); d.setHours(23,59,59,999); return d }
  if (range === 'custom' && customTo) { const d = new Date(customTo + 'T23:59:59'); return d }
  return now
}

function toJSDate(d) {
  if (!d) return null
  if (d.toDate) return d.toDate()
  return new Date(d)
}

export function AdminHome() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  // V5 Ajuste 11: payroll cut reminder on days 15/30/31 for admin too.
  usePayrollCutReminder(authUser?.uid, 'admin')
  const [range, setRange] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  // Cache-first dashboard data (TTL 2 min). Shows cached data instantly + refreshes in background.
  const { data: dashData, loading } = useCachedQuery(
    'admin_dashboard_v3',
    async () => {
      const [u, c, p, h, recs] = await Promise.all([
        getAllUsers(),
        getAllClasses(30, 30),
        getPendingPayments().catch(() => []),
        fetchLastSixMonths(),
        getRecommendations().catch(() => []),
      ])
      return { users: u, classes: c, pendingPayments: p, history: h, recommendations: recs }
    },
    { ttlMs: 2 * 60 * 1000 }
  )

  const users = dashData?.users || []
  const classes = dashData?.classes || []
  const pendingPayments = dashData?.pendingPayments || []
  const history = dashData?.history || []
  const recommendations = dashData?.recommendations || []
  const { classes: liveClasses } = useLiveClasses()
  const [liveClassDetail, setLiveClassDetail] = useState(null)

  // Sweep stale in_progress classes (coach started but never closed). Runs whenever
  // the live-classes subscription updates, so any class lingering past the
  // auto-finalize threshold gets cerrada in the background.
  useEffect(() => {
    if (!liveClasses?.length) return
    autoFinalizeStaleClasses(liveClasses).catch(() => {})
  }, [liveClasses])

  // Memoize start/end so they only change when the range inputs change
  const start = useMemo(() => startOfRange(range, customFrom), [range, customFrom])
  const end   = useMemo(() => endOfRange(range, customTo),    [range, customTo])

  // Financial summary reactive to the selected range
  const [rangedCashflow, setRangedCashflow] = useState({ income: 0, expense: 0, profit: 0 })
  useEffect(() => {
    fetchCashflowRangeSummary(start, end)
      .then(setRangedCashflow)
      .catch(() => {})
  }, [start, end])

  const filtered = useMemo(() => {
    const filteredClasses = classes.filter((c) => {
      const d = toJSDate(c.scheduledDate)
      return d && d >= start && d <= end
    })
    const filteredPending = pendingPayments.filter((p) => {
      const d = toJSDate(p.createdAt)
      return d && d >= start && d <= end
    })

    const checkedIns = filteredClasses.reduce((acc, c) =>
      acc + (c.attendeeList || []).filter((a) => a.checkedIn).length, 0)
    const reservations = filteredClasses.reduce((acc, c) =>
      acc + (c.currentBookings || c.attendeeList?.length || 0), 0)
    const totalCapacity = filteredClasses.reduce((acc, c) => acc + (c.maxCapacity || 0), 0)

    return {
      classes: filteredClasses,
      pendingPayments: filteredPending,
      checkedIns,
      reservations,
      totalCapacity,
      occupancyRate: totalCapacity ? (reservations / totalCapacity * 100) : 0,
      showUpRate: reservations ? (checkedIns / reservations * 100) : 0,
    }
  }, [classes, pendingPayments, start, end])

  // User-level KPIs (don't filter by date — these are current state)
  const activeUsers = users.filter((u) => u.membershipIsActive).length
  const newUsersInRange = users.filter((u) => {
    const d = toJSDate(u.createdAt)
    return d && d >= start && d <= end
  }).length

  const expiringIn5 = users.filter((u) => {
    const e = toJSDate(u.membershipEndDate)
    if (!e || !u.membershipIsActive) return false
    const days = Math.ceil((e - new Date()) / 86400000)
    return days >= 0 && days <= 5
  })

  const atRisk = users.filter((u) => {
    if (!u.membershipIsActive) return false
    const last = toJSDate(u.lastClassDate)
    return !last || last < new Date(Date.now() - 14 * 86400000)
  })

  // Coach with most attendance
  const coachAttendance = {}
  for (const c of filtered.classes) {
    if (!c.coachId) continue
    const ci = (c.attendeeList || []).filter((a) => a.checkedIn).length
    coachAttendance[c.coachId] = coachAttendance[c.coachId] || { id: c.coachId, name: c.coachName, count: 0 }
    coachAttendance[c.coachId].count += ci
  }
  const topCoach = Object.values(coachAttendance).sort((a, b) => b.count - a.count)[0]

  // Attendance per day-of-week
  const dowMap = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const dowData = Array(7).fill(0).map((_, i) => ({ day: dowMap[i], asistencia: 0 }))
  for (const c of filtered.classes) {
    const d = toJSDate(c.scheduledDate)
    if (d) dowData[d.getDay()].asistencia += (c.attendeeList || []).filter((a) => a.checkedIn).length
  }
  // Reorder Lun first
  const dowOrdered = [...dowData.slice(1), dowData[0]]

  return (
    <AdminShell title="Dashboard">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        {/* Header + range selector */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Dashboard</h1>
            <p className="font-body text-sm text-salvaje-gray">Visión global de SALVAJE</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-white rounded-xl shadow-salvaje p-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
                    range === r.value ? 'bg-salvaje-orange text-white' : 'text-salvaje-dark hover:bg-salvaje-cream/30'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {range === 'custom' && (
              <div className="flex gap-1">
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-2 py-1 rounded-lg border border-salvaje-cream text-xs font-mono" />
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-2 py-1 rounded-lg border border-salvaje-cream text-xs font-mono" />
              </div>
            )}
          </div>
        </div>

        {/* Range info */}
        <p className="font-body text-xs text-salvaje-gray">
          Período: <strong>{start.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</strong> →{' '}
          <strong>{end.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</strong>
        </p>

        {/* ── Two-column layout: KPIs+charts LEFT | sidebar RIGHT (xl+) ── */}
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-5 xl:items-start">

          {/* ── LEFT: main content ── */}
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1,2,3,4,5,6,7,8].map((i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* Financial KPIs */}
                <Section title="Finanzas">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <BigKPI icon={ArrowUpCircle} label="Ingresos período" value={formatCOP(rangedCashflow.income)} color="text-salvaje-success" onClick={() => navigate('/admin/cashflow')} />
                    <BigKPI icon={ArrowDownCircle} label="Egresos período" value={formatCOP(rangedCashflow.expense)} color="text-salvaje-danger" onClick={() => navigate('/admin/cashflow')} />
                    <BigKPI icon={DollarSign} label="Utilidad período" value={formatCOP(rangedCashflow.profit)} color={rangedCashflow.profit >= 0 ? 'text-salvaje-orange' : 'text-salvaje-danger'} bold />
                    <BigKPI icon={Calendar} label={range === 'today' ? 'Clases hoy' : 'Clases período'} value={filtered.classes.length} onClick={() => navigate('/admin/classes')} />
                  </div>
                </Section>

                {/* Members KPIs */}
                <Section title="Tribu">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <BigKPI icon={Users} label="Miembros activos" value={activeUsers} sub={`de ${users.length} total`} onClick={() => navigate('/admin/users')} />
                    <BigKPI icon={TrendingUp} label="Nuevos en período" value={newUsersInRange} />
                    <BigKPI icon={AlertTriangle} label="En riesgo" value={atRisk.length} sub="14+ días sin venir" color={atRisk.length > 0 ? 'text-salvaje-danger' : 'text-salvaje-gray'} onClick={() => navigate('/admin/tracking')} />
                    <BigKPI icon={Calendar} label="Vencen pronto" value={expiringIn5.length} sub="próximos 5 días" color="text-salvaje-gold" onClick={() => navigate('/admin/tracking')} />
                  </div>
                </Section>

                {/* Operations KPIs */}
                <Section title="Operación">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <BigKPI icon={Calendar} label="Clases en período" value={filtered.classes.length} onClick={() => navigate('/admin/classes')} />
                    <BigKPI icon={ScanLine} label="Asistencias" value={filtered.checkedIns} sub={`de ${filtered.reservations} reservas`} />
                    <BigKPI icon={Target} label="Ocupación promedio" value={`${filtered.occupancyRate.toFixed(0)}%`} />
                    <BigKPI icon={Activity} label="Show-up rate" value={`${filtered.showUpRate.toFixed(0)}%`} />
                  </div>
                </Section>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <Card>
                    <CardBody className="py-3">
                      <p className="font-display text-base uppercase text-salvaje-dark mb-2">Flujo 6 meses</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <ComposedChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E8D9C0" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} stroke="#A89684" />
                          <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} stroke="#A89684" />
                          <Tooltip contentStyle={{ background: '#1A0F0A', border: 'none', borderRadius: 8, color: '#FAF6F0', fontSize: 11 }} formatter={(v, name) => [formatCOP(v), { income: 'Ingresos', expense: 'Egresos', profit: 'Utilidad' }[name]]} />
                          <Bar dataKey="income" fill="#3F8E5C" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="expense" fill="#9D2A1F" radius={[3, 3, 0, 0]} />
                          <Line type="monotone" dataKey="profit" stroke="#D4521A" strokeWidth={2} dot={{ fill: '#D4521A', r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody className="py-3">
                      <p className="font-display text-base uppercase text-salvaje-dark mb-2">Asistencia por día (período)</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={dowOrdered}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E8D9C0" vertical={false} />
                          <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} stroke="#A89684" />
                          <YAxis tick={{ fontSize: 10 }} stroke="#A89684" />
                          <Tooltip contentStyle={{ background: '#1A0F0A', border: 'none', borderRadius: 8, color: '#FAF6F0', fontSize: 11 }} />
                          <Bar dataKey="asistencia" fill="#D4521A" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardBody>
                  </Card>
                </div>
              </>
            )}
          </div>

          {/* ── RIGHT: sidebar — stacks below on mobile, fixed right col on xl ── */}
          <div className="space-y-4 mt-4 xl:mt-0">
            {/* Live classes */}
            {liveClasses.length > 0 && (
              <Card>
                <CardBody className="py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-salvaje-success animate-pulse" />
                    <p className="font-display text-sm uppercase text-salvaje-success">Clases en vivo ({liveClasses.length})</p>
                  </div>
                  <div className="space-y-1.5">
                    {liveClasses.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => setLiveClassDetail(cls)}
                        className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-salvaje-light/50 hover:bg-salvaje-cream/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{cls.name}</p>
                          <p className="font-mono text-[10px] text-salvaje-gray">{cls.coachName} · {(cls.attendeeList || []).filter((a) => a.checkedIn).length}/{cls.maxCapacity} asistentes</p>
                        </div>
                        <Activity size={14} className="text-salvaje-success flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Smart recommendations */}
            {recommendations.length > 0 && (
              <div className="space-y-2">
                {recommendations.map((rec) => (
                  <RecommendationBanner key={rec.id} rec={rec} onAction={() => navigate('/admin/tracking')} />
                ))}
              </div>
            )}

            {/* Top coach */}
            {!loading && topCoach && (
              <Card>
                <CardBody className="py-3 flex items-center gap-3 bg-gradient-to-r from-salvaje-orange/5 to-transparent">
                  <div className="w-10 h-10 rounded-xl bg-salvaje-orange/15 flex items-center justify-center flex-shrink-0">
                    <Trophy size={18} className="text-salvaje-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest">Mejor coach (período)</p>
                    <p className="font-display text-lg uppercase text-salvaje-dark truncate">{topCoach.name}</p>
                  </div>
                  <p className="font-display text-2xl text-salvaje-orange flex-shrink-0">{topCoach.count}</p>
                </CardBody>
              </Card>
            )}

            {/* Quick actions */}
            {!loading && (
              <Section title="Acciones rápidas">
                <div className="grid grid-cols-2 gap-2">
                  <QuickAction icon={Calendar} label="Nueva clase" onClick={() => navigate('/admin/classes')} />
                  <QuickAction icon={CreditCard} label="Revisar pagos" onClick={() => navigate('/admin/payments')} />
                  <QuickAction icon={DollarSign} label="Generar nómina" onClick={() => navigate('/admin/payroll')} />
                  <QuickAction icon={ClipboardList} label="Planes pendientes" onClick={() => navigate('/admin/weekly-plans')} />
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>

      {/* Live class detail (subscribes in real time, transitions to "completed" state inline) */}
      <LiveClassDetailModal
        cls={liveClassDetail}
        open={!!liveClassDetail}
        onClose={() => setLiveClassDetail(null)}
      />
    </AdminShell>
  )
}

/**
 * Real-time live-class detail. Subscribes to the class doc, so when the coach
 * finalizes, the modal switches from "EN VIVO" to "Finalizada" with the closing
 * stats — no refresh needed.
 */
function LiveClassDetailModal({ cls: initialCls, open, onClose }) {
  const [cls, setCls] = useState(initialCls)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setCls(initialCls)
  }, [initialCls?.id])

  useEffect(() => {
    if (!initialCls?.id || !open) return
    const unsub = subscribeToClass(initialCls.id, (data) => { if (data) setCls(data) })
    return unsub
  }, [initialCls?.id, open])

  // Re-render every second so elapsed time updates.
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [open])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!cls) return null

  const start = cls.scheduledDate?.toDate?.() || new Date(cls.scheduledDate)
  const end = cls.endDate?.toDate?.() || new Date(cls.endDate || start)
  const actualStart = cls.actualStartTime?.toDate?.() || null
  const actualEnd = cls.actualEndTime?.toDate?.() || null
  const isLive = cls.status === 'in_progress'
  const isDone = cls.status === 'completed'
  const isCancelled = cls.status === 'cancelled'

  const attendeeList = Array.isArray(cls.attendeeList) ? cls.attendeeList : []
  const checkedIn = attendeeList.filter((a) => a.checkedIn)
  const reserved = attendeeList.filter((a) => !a.checkedIn)
  const cap = cls.maxCapacity || 0
  const occupancyPct = cap > 0 ? Math.round((checkedIn.length / cap) * 100) : 0

  // Elapsed time when live; final duration when done.
  const baseTime = actualStart || start
  const compareTime = isDone && actualEnd ? actualEnd : new Date()
  const elapsedMs = Math.max(0, compareTime - baseTime)
  const h = Math.floor(elapsedMs / 3600000)
  const m = Math.floor((elapsedMs % 3600000) / 60000)
  const s = Math.floor((elapsedMs % 60000) / 1000)
  const elapsed = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const headerGradient = isLive
    ? 'from-salvaje-success to-emerald-700'
    : isDone
    ? 'from-salvaje-brown to-salvaje-dark'
    : 'from-salvaje-danger to-red-800'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-salvaje-dark/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-salvaje-lg max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className={`bg-gradient-to-br ${headerGradient} text-white p-5`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {isLive && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/80 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                    </span>
                  )}
                  {isDone && <CheckCircle2 size={18} className="text-white" />}
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/90">
                    {isLive ? 'Clase EN VIVO' : isDone ? 'Clase finalizada' : isCancelled ? 'Clase cancelada' : 'Clase'}
                  </p>
                </div>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 transition-colors text-white/80 hover:text-white" aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
              <h2 className="font-display text-3xl uppercase leading-none mt-2">{cls.name}</h2>
              <p className="font-body text-sm text-white/80 mt-1">{cls.coachName}</p>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-white/60">Horario</p>
                  <p className="font-display text-sm uppercase mt-0.5">{formatTime(start)}–{formatTime(end)}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-white/60">{isDone ? 'Duración' : 'Transcurrido'}</p>
                  <p className="font-mono text-sm mt-0.5">{elapsed}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-white/60">Aforo</p>
                  <p className="font-display text-sm mt-0.5">{checkedIn.length}/{cap} <span className="text-white/60">({occupancyPct}%)</span></p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-2">
                <StatBox icon={UserCheck} value={checkedIn.length} label="Asistieron" />
                <StatBox icon={Clock} value={reserved.length} label={isDone ? 'No-shows' : 'Reservados'} />
                <StatBox icon={Users} value={attendeeList.length} label="Total" />
              </div>

              {/* Checked-in list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-sm uppercase text-salvaje-dark">
                    Asistentes registrados
                  </h3>
                  <span className="font-mono text-[10px] text-salvaje-gray">{checkedIn.length}</span>
                </div>
                {checkedIn.length === 0 ? (
                  <div className="bg-salvaje-light rounded-xl p-3 text-center">
                    <p className="font-body text-xs text-salvaje-gray">Aún sin registros</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {checkedIn.map((a) => (
                      <AttendeeRow key={a.userId} a={a} status="checked-in" />
                    ))}
                  </div>
                )}
              </div>

              {/* Reserved (no-show or pending) */}
              {reserved.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-sm uppercase text-salvaje-dark">
                      {isDone ? 'No vinieron' : 'Reservados sin entrar'}
                    </h3>
                    <span className="font-mono text-[10px] text-salvaje-gray">{reserved.length}</span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {reserved.map((a) => (
                      <AttendeeRow key={a.userId} a={a} status={isDone ? 'no-show' : 'pending'} />
                    ))}
                  </div>
                </div>
              )}

              {/* Done summary */}
              {isDone && (
                <div className="bg-salvaje-success/5 border border-salvaje-success/20 rounded-xl p-3">
                  <p className="font-display text-sm uppercase text-salvaje-success mb-1">Cierre de batalla</p>
                  <p className="font-body text-xs text-salvaje-dark leading-relaxed">
                    {cls.coachName} cerró esta clase. {checkedIn.length} salvaje{checkedIn.length === 1 ? '' : 's'} hicieron acto de presencia.
                    {cls.autoFinalized && ' (Cerrada automáticamente porque pasaron 10 min del fin programado.)'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function StatBox({ icon: Icon, value, label }) {
  return (
    <div className="bg-salvaje-light rounded-xl p-2.5 text-center">
      <Icon size={14} className="text-salvaje-orange mx-auto mb-0.5" />
      <p className="font-display text-xl text-salvaje-dark leading-none">{value}</p>
      <p className="font-mono text-[9px] uppercase tracking-widest text-salvaje-gray mt-0.5">{label}</p>
    </div>
  )
}

function AttendeeRow({ a, status }) {
  const dot = status === 'checked-in' ? 'bg-salvaje-success' : status === 'no-show' ? 'bg-salvaje-danger' : 'bg-salvaje-gold'
  return (
    <div className="flex items-center gap-3 bg-white border border-salvaje-cream rounded-xl px-3 py-2">
      <Avatar src={a.userPhotoURL} name={a.userName} size="xs" />
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium text-salvaje-dark truncate">{a.userName || 'Salvaje'}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
          <span className="font-mono text-[9px] uppercase tracking-widest text-salvaje-gray">
            {status === 'checked-in' && (a.qrScanned ? 'QR escaneado' : a.lateRegistration ? 'Tardío' : a.walkIn ? 'Walk-in' : 'Manual')}
            {status === 'pending' && 'Pendiente check-in'}
            {status === 'no-show' && 'No vino'}
          </span>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h2 className="font-display text-base uppercase text-salvaje-dark border-b border-salvaje-cream pb-1">{title}</h2>
      {children}
    </div>
  )
}

function BigKPI({ icon: Icon, label, value, sub, color = 'text-salvaje-orange', bold, onClick }) {
  return (
    <Card hover={!!onClick} onClick={onClick}>
      <CardBody className="py-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon size={14} className={color} />
          <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest leading-tight">{label}</p>
        </div>
        <p className={`font-display ${bold ? 'text-3xl' : 'text-2xl'} ${color} leading-tight`}>{value}</p>
        {sub && <p className="text-[10px] font-body text-salvaje-gray mt-0.5">{sub}</p>}
      </CardBody>
    </Card>
  )
}

function RecommendationBanner({ rec, onAction }) {
  const colors = {
    urgent: 'border-salvaje-danger/40 bg-salvaje-danger/5 text-salvaje-danger',
    warning: 'border-salvaje-gold/40 bg-salvaje-gold/5 text-salvaje-gold',
    info: 'border-salvaje-orange/40 bg-salvaje-orange/5 text-salvaje-orange',
  }
  const Icon = { Zap, TrendingDown, Calendar, AlertTriangle, ArrowUpCircle, ArrowDownCircle, DollarSign, Trophy }[rec.icon] || Activity
  return (
    <button
      onClick={onAction}
      className={`w-full text-left rounded-2xl border p-4 flex items-center gap-3 hover:opacity-90 transition-all ${colors[rec.severity] || colors.info}`}
    >
      <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm uppercase leading-tight">{rec.title}</p>
        <p className="font-body text-xs text-salvaje-dark mt-0.5">{rec.body}</p>
      </div>
      <span className="font-body text-xs font-semibold flex-shrink-0">{rec.ctaLabel} →</span>
    </button>
  )
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-salvaje px-4 py-3 flex items-center gap-2 hover:shadow-salvaje-md hover:bg-salvaje-cream/20 transition-all"
    >
      <Icon size={16} className="text-salvaje-orange" />
      <span className="font-body text-sm font-medium text-salvaje-dark">{label}</span>
    </button>
  )
}
