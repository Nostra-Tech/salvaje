import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, Users, Calendar, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { formatTime } from '../../utils/formatters'

function startOfWeek(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

/**
 * V6 Ajuste 22 — Weekly projections dashboard for admin.
 * Shows aforo per class (booked/cap), occupancy %, classes at risk, and global KPIs.
 */
export function AdminWeeklyProjections() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset])
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const q = query(
          collection(db, 'classes'),
          where('scheduledDate', '>=', Timestamp.fromDate(weekStart)),
          where('scheduledDate', '<', Timestamp.fromDate(weekEnd)),
          orderBy('scheduledDate', 'asc')
        )
        const snap = await getDocs(q)
        if (!cancelled) setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (e) { console.warn('AdminWeeklyProjections fetch failed:', e) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [weekStart, weekEnd])

  const stats = useMemo(() => {
    const visible = classes.filter((c) => c.status !== 'cancelled')
    const total = visible.length
    const totalCap = visible.reduce((acc, c) => acc + (c.maxCapacity || 0), 0)
    const totalBooked = visible.reduce((acc, c) => acc + (c.currentBookings || 0), 0)
    const occPct = totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0
    const atRisk = visible.filter((c) => {
      const cap = c.maxCapacity || 1
      const booked = c.currentBookings || 0
      return (booked / cap) < 0.30
    }).length
    return { total, totalCap, totalBooked, occPct, atRisk }
  }, [classes])

  return (
    <AdminShell title="Proyecciones semanales">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <TrendingUp size={28} className="text-salvaje-orange" />
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Proyecciones</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset((o) => o - 1)} className="p-2 rounded-xl bg-white shadow-salvaje hover:shadow-salvaje-md text-salvaje-gray">
              <ChevronLeft size={16} />
            </button>
            <p className="font-mono text-sm text-salvaje-dark min-w-[180px] text-center">
              {weekStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} – {addDays(weekEnd, -1).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
              {weekOffset === 0 && <span className="ml-2 text-[10px] uppercase tracking-widest text-salvaje-orange">Esta semana</span>}
              {weekOffset === 1 && <span className="ml-2 text-[10px] uppercase tracking-widest text-salvaje-orange">Próxima</span>}
            </p>
            <button onClick={() => setWeekOffset((o) => o + 1)} className="p-2 rounded-xl bg-white shadow-salvaje hover:shadow-salvaje-md text-salvaje-gray">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={Calendar} label="Clases programadas" value={stats.total} accent="bg-salvaje-orange" />
          <Kpi icon={Users} label="Reservas / Capacidad" value={`${stats.totalBooked} / ${stats.totalCap}`} accent="bg-salvaje-brown" />
          <Kpi icon={TrendingUp} label="Ocupación promedio" value={`${stats.occPct}%`} accent="bg-salvaje-success" />
          <Kpi icon={AlertTriangle} label="Clases en riesgo" value={stats.atRisk} accent="bg-salvaje-danger" sub="< 30% aforo" />
        </div>

        {/* Class list */}
        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : classes.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <Calendar size={32} className="text-salvaje-cream mx-auto mb-2" />
              <p className="font-display text-lg uppercase text-salvaje-dark">Sin clases en esta semana</p>
              <p className="font-body text-sm text-salvaje-gray mt-1">Cuando los coaches publiquen sus planes aparecerán aquí.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {classes.map((c) => {
              const cap = c.maxCapacity || 1
              const booked = c.currentBookings || 0
              const pct = Math.min(100, Math.round((booked / cap) * 100))
              const tier = pct >= 80 ? 'success' : pct >= 50 ? 'orange' : pct >= 30 ? 'gold' : 'danger'
              const tierLabel = pct >= 80 ? 'Lleno' : pct >= 50 ? 'Bueno' : pct >= 30 ? 'Bajo' : 'En riesgo'
              const start = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate)
              const end = c.endDate?.toDate?.() || new Date(c.endDate || start)
              return (
                <Card key={c.id}>
                  <CardBody className="py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display text-base uppercase text-salvaje-dark">{c.name}</p>
                          <Badge variant={tier}>{tierLabel}</Badge>
                          {c.status === 'completed' && <Badge variant="default">Completada</Badge>}
                          {c.status === 'in_progress' && <Badge variant="orange">En vivo</Badge>}
                        </div>
                        <p className="font-mono text-[11px] text-salvaje-gray">
                          {start.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(start)}–{formatTime(end)} · {c.coachName || 'Coach'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-mono text-sm text-salvaje-dark">{booked}/{cap}</span>
                        <span className="font-display text-lg text-salvaje-orange w-12 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-salvaje-light mt-2 overflow-hidden">
                      <div
                        className={`h-full ${tier === 'success' ? 'bg-salvaje-success' : tier === 'orange' ? 'bg-salvaje-orange' : tier === 'gold' ? 'bg-salvaje-gold' : 'bg-salvaje-danger'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AdminShell>
  )
}

function Kpi({ icon: Icon, label, value, accent, sub }) {
  return (
    <div className="bg-white rounded-salvaje p-4 shadow-salvaje">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-lg ${accent} text-white flex items-center justify-center`}>
          <Icon size={14} />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">{label}</p>
      </div>
      <p className="font-display text-3xl text-salvaje-dark leading-none mt-1">{value}</p>
      {sub && <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray mt-1">{sub}</p>}
    </div>
  )
}
