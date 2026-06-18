import { useEffect, useState } from 'react'
import { TrendingUp, Users, Dumbbell, DollarSign, AlertCircle, ChevronRight, Bell, Clock } from 'lucide-react'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { fetchUserMetrics, fetchCoachPerformance, fetchRevenue } from '../../services/analytics.service'
import { getCoachClasses } from '../../services/classes.service'
import { getAllCoaches } from '../../services/coaches.service'
import { createNotification } from '../../services/notifications.service'
import { formatCOP, formatShortDate } from '../../utils/formatters'

const FILTERS = [
  { value: 'all',      label: 'Todos' },
  { value: 'active',   label: 'Activos' },
  { value: 'atRisk',   label: 'En riesgo' },
  { value: 'expiring', label: 'Vencen pronto' },
  { value: 'expired',  label: 'Vencidos' },
]

export function AdminTracking() {
  const [tab, setTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState(null)
  const [coaches, setCoaches] = useState([])
  const [revenue, setRevenue] = useState(null)
  const [filter, setFilter] = useState('all')
  const [coachWeekly, setCoachWeekly] = useState([])

  useEffect(() => {
    Promise.all([
      fetchUserMetrics(),
      fetchCoachPerformance(30),
      fetchRevenue(),
      getAllCoaches(),
    ]).then(async ([m, perf, rev, allCoaches]) => {
      setMetrics(m); setCoaches(perf); setRevenue(rev)

      // For each active coach, get this week's planned + accumulated payroll
      const { periodForDate, getPayrollByPeriod } = await import('../../services/payroll.service')
      const currentPeriod = periodForDate(new Date()).period
      const periodPayrolls = await getPayrollByPeriod(currentPeriod).catch(() => [])

      const coachClassPromises = allCoaches.filter((c) => c.isActive !== false).map(async (c) => {
        const cls = await getCoachClasses(c.id, 0, 7).catch(() => [])
        const futureHours = cls
          .filter((x) => x.status !== 'completed' && x.status !== 'cancelled')
          .reduce((acc, x) => acc + (x.durationMinutes || 60) / 60, 0)
        const futureProjected = futureHours * (c.hourlyRate || 0)
        // Accumulated this period from payroll docs
        const myPayroll = periodPayrolls.find((p) => p.coachId === c.id)
        const accumulated = myPayroll?.totalEarned || 0
        return {
          coach: c,
          classes: cls,
          hours: futureHours,
          accumulated,
          projectedQuincena: accumulated + futureProjected,
        }
      })
      const cw = await Promise.all(coachClassPromises)
      setCoachWeekly(cw)
      setLoading(false)
    })
  }, [])

  const filteredUsers = (() => {
    if (!metrics) return []
    const now = new Date()
    switch (filter) {
      case 'active':   return metrics.users.filter((u) => u.membershipIsActive)
      case 'atRisk':   return metrics.atRisk
      case 'expiring': return metrics.expiringIn5
      case 'expired':  return metrics.users.filter((u) => {
        const end = u.membershipEndDate?.toDate ? u.membershipEndDate.toDate() : null
        return end && end < now
      })
      default:         return metrics.users
    }
  })()

  const handleSendReminder = async (user) => {
    await createNotification({
      recipientId: user.id,
      recipientRole: 'user',
      type: 'reminder',
      title: '¡Te extrañamos en SALVAJE!',
      body: `${user.displayName?.split(' ')[0]}, hace tiempo no asistes. La tribu te espera. ¡Nos vemos en clase!`,
    })
    alert('Notificación enviada')
  }

  return (
    <AdminShell title="Seguimiento">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <TrendingUp size={28} className="text-salvaje-orange" />
          <h1 className="font-display text-4xl uppercase text-salvaje-dark">Seguimiento</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-salvaje w-fit">
          <TabBtn active={tab === 'users'}    onClick={() => setTab('users')}    icon={Users}>Usuarios</TabBtn>
          <TabBtn active={tab === 'coaches'}  onClick={() => setTab('coaches')}  icon={Dumbbell}>Coaches</TabBtn>
          <TabBtn active={tab === 'forecast'} onClick={() => setTab('forecast')} icon={DollarSign}>Pronóstico</TabBtn>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
        ) : tab === 'users' ? (
          <>
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all ${
                    filter === f.value
                      ? 'bg-salvaje-orange text-white'
                      : 'bg-white text-salvaje-dark hover:bg-salvaje-cream/50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Side panel forecast */}
            <Card>
              <CardBody className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Stat label="Vencen esta semana" value={metrics.expiringIn5.length} sub="próximos 5 días" />
                <Stat label="Vencen este mes" value={revenue.expiringThisMonthCount} sub={`Potencial ${formatCOP(revenue.projectedRenewalRevenue)}`} />
                <Stat label="En riesgo" value={metrics.atRisk.length} sub="14+ días sin asistir" />
              </CardBody>
            </Card>

            {/* User table */}
            <div className="overflow-x-auto bg-white rounded-salvaje shadow-salvaje">
              <table className="w-full text-sm font-body">
                <thead className="bg-salvaje-light border-b border-salvaje-cream">
                  <tr>
                    <th className="text-left px-3 py-2 text-salvaje-dark">Usuario</th>
                    <th className="text-left px-3 py-2 text-salvaje-gray">Plan</th>
                    <th className="text-right px-3 py-2 text-salvaje-gray">Vence</th>
                    <th className="text-right px-3 py-2 text-salvaje-gray">Sin asistir</th>
                    <th className="text-right px-3 py-2 text-salvaje-gray">Total clases</th>
                    <th className="text-center px-3 py-2 text-salvaje-gray">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const end = u.membershipEndDate?.toDate ? u.membershipEndDate.toDate() : null
                    const last = u.lastClassDate?.toDate ? u.lastClassDate.toDate() : null
                    const daysSince = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : null
                    return (
                      <tr key={u.id} className="border-b border-salvaje-cream hover:bg-salvaje-light/30">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Avatar src={u.profilePhotoURL} name={u.displayName} size="sm" />
                            <div>
                              <p className="font-semibold text-salvaje-dark">{u.displayName}</p>
                              <p className="text-[10px] text-salvaje-gray">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={u.membershipIsActive ? 'success' : 'gray'}>
                            {u.membershipType || 'sin plan'}
                          </Badge>
                        </td>
                        <td className="text-right px-3 py-2 font-mono text-xs">{end ? formatShortDate(end) : '—'}</td>
                        <td className="text-right px-3 py-2 font-mono text-xs">
                          {daysSince === null ? '—' : (
                            <span className={daysSince > 14 ? 'text-salvaje-danger font-semibold' : ''}>{daysSince}d</span>
                          )}
                        </td>
                        <td className="text-right px-3 py-2 font-mono text-xs">{u.classesAttended || 0}</td>
                        <td className="text-center px-3 py-2">
                          <button
                            onClick={() => handleSendReminder(u)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-body text-salvaje-orange hover:bg-salvaje-orange/10"
                            title="Enviar recordatorio"
                          >
                            <Bell size={12} /> Recordar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={6} className="text-center px-3 py-6 text-salvaje-gray">Sin resultados con este filtro</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === 'coaches' ? (
          <div className="space-y-3">
            {coachWeekly.map(({ coach, classes, hours, accumulated, projectedQuincena }) => (
              <Card key={coach.id}>
                <CardBody className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={coach.profilePhotoURL} name={coach.displayName} size="md" />
                      <div>
                        <p className="font-display text-lg uppercase text-salvaje-dark">{coach.displayName}</p>
                        <p className="font-body text-xs text-salvaje-gray">{coach.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] text-salvaje-gray uppercase">Proyección quincena</p>
                      <p className="font-display text-2xl text-salvaje-orange">{formatCOP(projectedQuincena)}</p>
                      <p className="font-body text-[10px] text-salvaje-gray">acumulado + planeado</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-salvaje-cream">
                    <Stat label="Acumulado" value={formatCOP(accumulated)} small />
                    <Stat label="Próx. clases" value={classes.filter(x=>x.status!=='completed'&&x.status!=='cancelled').length} small />
                    <Stat label="Horas pendientes" value={hours.toFixed(1)} small />
                    <Stat label="Tarifa/h" value={formatCOP(coach.hourlyRate || 0)} small />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          // Forecast
          <div className="space-y-3">
            <Card>
              <CardBody className="py-5">
                <p className="font-display text-base uppercase text-salvaje-dark mb-3">Pronóstico financiero</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <BigStat label="Ingresos mes actual" value={formatCOP(revenue.currentMonthRevenue)} color="text-salvaje-success" />
                  <BigStat label="Renovaciones potenciales" value={formatCOP(revenue.projectedRenewalRevenue)} color="text-salvaje-orange" />
                  <BigStat
                    label="Nómina proyectada quincena"
                    value={formatCOP(coachWeekly.reduce((acc, c) => acc + c.projectedQuincena, 0))}
                    color="text-salvaje-danger"
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-xs font-body text-salvaje-gray uppercase tracking-widest mb-2">Punto de equilibrio (mes)</p>
                <div className="text-sm font-body text-salvaje-dark space-y-1">
                  {(() => {
                    const nominaMes = coachWeekly.reduce((acc, c) => acc + c.projectedQuincena * 2, 0)
                    const precioPromedio = 180000
                    const memNecesarias = Math.ceil(nominaMes / precioPromedio)
                    const activas = metrics.activeUsers
                    const ok = activas >= memNecesarias
                    return (
                      <>
                        <p>Para cubrir nómina mensual necesitas: <strong>{memNecesarias} membresías mensuales</strong> (~{formatCOP(memNecesarias * precioPromedio)})</p>
                        <p>Membresías activas actuales: <strong>{activas}</strong></p>
                        <p className={ok ? 'text-salvaje-success font-semibold' : 'text-salvaje-danger font-semibold'}>
                          {ok ? 'Superas el punto de equilibrio' : `Te faltan ${memNecesarias - activas} membresías`}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </AdminShell>
  )
}

function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm font-medium transition-all ${
        active ? 'bg-salvaje-orange text-white' : 'text-salvaje-dark hover:bg-salvaje-cream/30'
      }`}
    >
      <Icon size={14} />
      {children}
    </button>
  )
}

function Stat({ label, value, sub, small }) {
  return (
    <div>
      <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest">{label}</p>
      <p className={`font-display text-salvaje-dark leading-tight ${small ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      {sub && <p className="font-body text-[10px] text-salvaje-gray mt-0.5">{sub}</p>}
    </div>
  )
}

function BigStat({ label, value, color }) {
  return (
    <div>
      <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-display text-3xl leading-tight ${color || 'text-salvaje-dark'}`}>{value}</p>
    </div>
  )
}
