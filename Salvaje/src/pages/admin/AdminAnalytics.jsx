import { useEffect, useState } from 'react'
import {
  BarChart3, Users, TrendingUp, TrendingDown, Trophy,
  AlertTriangle, Calendar, Target, DollarSign, Activity,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { KPIHeatmap } from '../../components/admin/KPIHeatmap'
import {
  fetchUserMetrics, fetchAttendanceHeatmap, fetchClassMetrics,
  fetchCoachPerformance, fetchRevenue, fetchConversion,
} from '../../services/analytics.service'
import { formatCOP } from '../../utils/formatters'

const COLORS = ['#D4521A', '#9D4014', '#E8B86F', '#A89684']

const PERIOD_OPTIONS = [
  { value: 7,  label: 'Última semana' },
  { value: 14, label: 'Últimas 2 semanas' },
  { value: 30, label: 'Último mes' },
  { value: 90, label: 'Últimos 3 meses' },
  { value: 180, label: 'Últimos 6 meses' },
]

export function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [periodDays, setPeriodDays] = useState(30)
  const [classDaysBack, setClassDaysBack] = useState(7)
  const [user, setUser] = useState(null)
  const [heatmap, setHeatmap] = useState(null)
  const [classes, setClasses] = useState(null)
  const [coaches, setCoaches] = useState([])
  const [revenue, setRevenue] = useState(null)
  const [conversion, setConversion] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchUserMetrics(),
      fetchAttendanceHeatmap(periodDays),
      fetchClassMetrics(classDaysBack),
      fetchCoachPerformance(periodDays),
      fetchRevenue(),
      fetchConversion(),
    ])
      .then(([u, h, c, co, r, cv]) => {
        setUser(u); setHeatmap(h); setClasses(c); setCoaches(co); setRevenue(r); setConversion(cv)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [periodDays, classDaysBack])

  const distData = user ? Object.entries(user.distribution).map(([k, v]) => ({
    name: { monthly: 'Mensual', ticketera: 'Ticketera', free_trial: 'Cortesía', none: 'Sin plan' }[k],
    value: v,
  })).filter((d) => d.value > 0) : []

  return (
    <AdminShell title="KPIs & Analytics">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <BarChart3 size={28} className="text-salvaje-orange" />
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Analytics</h1>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-salvaje p-1">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setPeriodDays(p.value); setClassDaysBack(Math.min(p.value, 30)) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
                  periodDays === p.value ? 'bg-salvaje-orange text-white' : 'text-salvaje-dark hover:bg-salvaje-cream/30'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4,5,6,7,8].map((i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Section 1: Behavior */}
            <Section title="Comportamiento de usuarios">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPI icon={Users} label="Activos este mes" value={user.activeUsers} sub={`de ${user.totalUsers} total`} />
                <KPI icon={Calendar} label="Clases esta semana" value={classes.total} sub={`${classes.totalCheckedIn} asistencias`} />
                <KPI icon={Target} label="Ocupación promedio" value={`${classes.occupancyRate.toFixed(0)}%`} sub="reservas / capacidad" />
                <KPI icon={Activity} label="Show-up rate" value={`${classes.showUpRate.toFixed(0)}%`} sub="check-ins / reservas" />
                <KPI
                  icon={user.growthRate >= 0 ? TrendingUp : TrendingDown}
                  label="Nuevos este mes"
                  value={user.newThisMonth}
                  sub={`${user.growthRate >= 0 ? '+' : ''}${user.growthRate.toFixed(0)}% vs mes anterior`}
                  trend={user.growthRate}
                />
                <KPI icon={Trophy} label="Coach top" value={coaches[0]?.name?.split(' ')[0] || '—'} sub={coaches[0] ? `${coaches[0].occupancyRate.toFixed(0)}% ocupación` : ''} />
              </div>
              {heatmap && <KPIHeatmap grid={heatmap.grid} totalAttendances={heatmap.totalAttendances} />}
            </Section>

            {/* Section 2: Retention & risk */}
            <Section title="Retención y riesgo">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <RiskCard
                  title="En riesgo"
                  count={user.atRisk.length}
                  description="Membresía activa sin asistir hace 14+ días"
                  icon={AlertTriangle}
                  color="text-salvaje-danger"
                  users={user.atRisk}
                />
                <RiskCard
                  title="Dormidos"
                  count={user.dormant.length}
                  description="Vencidos hace 7-30 días"
                  icon={Users}
                  color="text-salvaje-orange"
                  users={user.dormant}
                />
                <RiskCard
                  title="Vencen pronto"
                  count={user.expiringIn5.length}
                  description="Próximos 5 días"
                  icon={Calendar}
                  color="text-salvaje-gold"
                  users={user.expiringIn5}
                />
              </div>
            </Section>

            {/* Section 3: Conversion */}
            <Section title="Conversión y distribución">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Card>
                  <CardBody className="py-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={18} className="text-salvaje-orange" />
                      <p className="font-display text-base uppercase text-salvaje-dark">Trial → Pago</p>
                    </div>
                    <p className="font-display text-5xl text-salvaje-orange">{conversion.conversionRate.toFixed(0)}%</p>
                    <p className="font-body text-xs text-salvaje-gray mt-1">
                      {conversion.convertedCount} convertidos de {conversion.trialCount} cortesías
                    </p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="py-3">
                    <p className="font-display text-base uppercase text-salvaje-dark mb-2">Distribución membresías</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={distData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={(e) => `${e.name}: ${e.value}`}>
                          {distData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>
              </div>
            </Section>

            {/* Section 4: Revenue */}
            <Section title="Ingresos y pronóstico">
              <Card>
                <CardBody className="py-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <p className="font-display text-base uppercase text-salvaje-dark flex items-center gap-2">
                        <DollarSign size={18} className="text-salvaje-orange" />
                        Ingresos mensuales
                      </p>
                      <p className="font-body text-xs text-salvaje-gray">Últimos 6 meses</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-salvaje-gray uppercase">Mes actual</p>
                      <p className="font-display text-2xl text-salvaje-orange">{formatCOP(revenue.currentMonthRevenue)}</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenue.months}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8D9C0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="#A89684" />
                      <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} stroke="#A89684" />
                      <Tooltip
                        contentStyle={{ background: '#1A0F0A', border: 'none', borderRadius: 8, color: '#FAF6F0', fontSize: 12, fontFamily: 'DM Sans' }}
                        formatter={(v) => [formatCOP(v), 'Ingresos']}
                      />
                      <Bar dataKey="revenue" fill="#D4521A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <KPI
                  icon={Calendar}
                  label="Vencen este mes"
                  value={revenue.expiringThisMonthCount}
                  sub={`Potencial: ${formatCOP(revenue.projectedRenewalRevenue)}`}
                />
                <KPI icon={DollarSign} label="Total compras confirmadas" value={revenue.totalConfirmed} sub="histórico" />
              </div>
            </Section>

            {/* Section 5: Coach performance */}
            <Section title="Rendimiento de coaches (último mes)">
              {coaches.length === 0 ? (
                <Card><CardBody className="text-center py-6"><p className="font-body text-salvaje-gray">Sin datos suficientes aún</p></CardBody></Card>
              ) : (
                <div className="overflow-x-auto bg-white rounded-salvaje shadow-salvaje">
                  <table className="w-full text-sm font-body">
                    <thead className="bg-salvaje-light border-b border-salvaje-cream">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-salvaje-dark">Coach</th>
                        <th className="text-right px-3 py-2 text-salvaje-gray">Clases</th>
                        <th className="text-right px-3 py-2 text-salvaje-gray">Horas</th>
                        <th className="text-right px-3 py-2 text-salvaje-gray">Asistentes</th>
                        <th className="text-right px-3 py-2 text-salvaje-gray">Promedio</th>
                        <th className="text-right px-3 py-2 text-salvaje-gray">Ocupación</th>
                        <th className="text-right px-3 py-2 text-salvaje-gray">Tendencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coaches.map((c, idx) => (
                        <tr key={c.coachId} className={`border-b border-salvaje-cream hover:bg-salvaje-light/30 ${idx === 0 ? 'bg-salvaje-orange/5' : ''}`}>
                          <td className="px-4 py-2 font-semibold text-salvaje-dark">
                            {idx === 0 && <Trophy size={12} className="inline text-salvaje-orange mr-1" />}
                            {c.name}
                          </td>
                          <td className="text-right px-3 py-2 font-mono">{c.count}</td>
                          <td className="text-right px-3 py-2 font-mono">{c.hours.toFixed(1)}</td>
                          <td className="text-right px-3 py-2 font-mono">{c.attendees}</td>
                          <td className="text-right px-3 py-2 font-mono">{c.avgAttendance.toFixed(1)}</td>
                          <td className="text-right px-3 py-2 font-mono font-semibold text-salvaje-orange">{c.occupancyRate.toFixed(0)}%</td>
                          <td className="text-right px-3 py-2 font-mono text-xs">
                            {c.trend > 0 ? <span className="text-salvaje-success">▲ +{c.trend.toFixed(0)}%</span>
                             : c.trend < 0 ? <span className="text-salvaje-danger">▼ {c.trend.toFixed(0)}%</span>
                             : <span className="text-salvaje-gray">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </AdminShell>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-2xl uppercase text-salvaje-dark border-b-2 border-salvaje-cream pb-1">{title}</h2>
      {children}
    </div>
  )
}

function KPI({ icon: Icon, label, value, sub, trend }) {
  return (
    <Card>
      <CardBody className="py-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon size={16} className="text-salvaje-orange flex-shrink-0" />
          <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest leading-tight">{label}</p>
        </div>
        <p className="font-display text-3xl text-salvaje-dark leading-none">{value}</p>
        {sub && <p className="font-body text-xs text-salvaje-gray mt-1">{sub}</p>}
      </CardBody>
    </Card>
  )
}

function RiskCard({ title, count, description, icon: Icon, color, users }) {
  return (
    <Card>
      <CardBody className="py-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={16} className={color} />
          <p className="font-display text-base uppercase text-salvaje-dark">{title}</p>
        </div>
        <p className="font-display text-4xl text-salvaje-dark leading-none">{count}</p>
        <p className="font-body text-xs text-salvaje-gray mt-1 mb-3">{description}</p>
        {users.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto border-t border-salvaje-cream pt-2">
            {users.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center justify-between text-xs font-body py-1">
                <span className="text-salvaje-dark truncate">{u.displayName}</span>
                <span className="text-salvaje-gray text-[10px]">{u.email}</span>
              </div>
            ))}
            {users.length > 5 && <p className="text-[10px] font-mono text-salvaje-gray text-center pt-1">+ {users.length - 5} más</p>}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
