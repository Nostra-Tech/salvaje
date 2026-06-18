import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3, Users, TrendingUp, Calendar, Star, Award, Activity,
} from 'lucide-react'
import {
  collection, query, where, getDocs, orderBy, limit, Timestamp,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { getAllUsers } from '../../services/users.service'
import { getAllCoaches } from '../../services/coaches.service'

const RANGES = [
  { value: 'today',   label: 'Hoy',     days: 0 },
  { value: 'week',    label: 'Semana',  days: 7 },
  { value: 'month',   label: 'Mes',     days: 30 },
  { value: 'quarter', label: 'Trim.',   days: 90 },
]

/**
 * V6 Ajuste 21 — SuperAdmin advanced analytics.
 *
 * Aggregates user / class / payment data into KPIs:
 *  - new users in period
 *  - active members
 *  - courtesy → paid conversion rate
 *  - per-coach: classes given, avg occupancy, satisfaction average
 */
export function SuperAdminAnalytics() {
  const [range, setRange] = useState('week')
  const [data, setData] = useState({ loading: true })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setData((d) => ({ ...d, loading: true }))
      try {
        const days = RANGES.find((r) => r.value === range)?.days ?? 7
        const since = new Date()
        if (days > 0) since.setDate(since.getDate() - days)
        else since.setHours(0, 0, 0, 0)
        const sinceTs = Timestamp.fromDate(since)

        const [users, coaches] = await Promise.all([getAllUsers(), getAllCoaches()])

        const newUsers = users.filter((u) => {
          const c = u.createdAt?.toDate?.()
          return c && c >= since
        })
        const activeMembers = users.filter((u) => u.membershipIsActive).length
        const usedCourtesy = users.filter((u) => u.hasUsedFreeTrial).length
        const paidUsers = users.filter((u) => u.hasUsedFreeTrial && u.membershipType && u.membershipType !== 'none' && u.membershipType !== 'free_trial').length
        const conversion = usedCourtesy > 0 ? Math.round((paidUsers / usedCourtesy) * 100) : 0

        // Classes since
        const cs = await getDocs(query(
          collection(db, 'classes'),
          where('scheduledDate', '>=', sinceTs),
          orderBy('scheduledDate', 'asc'),
          limit(500)
        ))
        const classes = cs.docs.map((d) => ({ id: d.id, ...d.data() }))
        const totalClasses = classes.length
        const completedClasses = classes.filter((c) => c.status === 'completed')
        let totalAttendance = 0, totalCapacity = 0
        completedClasses.forEach((c) => {
          totalAttendance += c.attendedCount || 0
          totalCapacity += c.maxCapacity || 0
        })
        const avgOccupancy = totalCapacity > 0 ? Math.round((totalAttendance / totalCapacity) * 100) : 0

        // Per-coach breakdown
        const perCoach = {}
        classes.forEach((c) => {
          const id = c.coachId
          if (!id) return
          if (!perCoach[id]) perCoach[id] = { coachId: id, coachName: c.coachName || '—', total: 0, completed: 0, attendance: 0, capacity: 0 }
          perCoach[id].total++
          if (c.status === 'completed') {
            perCoach[id].completed++
            perCoach[id].attendance += c.attendedCount || 0
            perCoach[id].capacity += c.maxCapacity || 0
          }
        })
        // Satisfaction by coach (last 200 feedback rows)
        const fs = await getDocs(query(
          collection(db, 'feedback'),
          orderBy('createdAt', 'desc'),
          limit(200)
        ))
        const ratings = {}
        fs.forEach((d) => {
          const f = d.data()
          if (!f.coachId) return
          if (!ratings[f.coachId]) ratings[f.coachId] = []
          ratings[f.coachId].push(f.averageRating || f.ratings?.coach || 0)
        })
        Object.keys(perCoach).forEach((id) => {
          const arr = ratings[id] || []
          perCoach[id].avgRating = arr.length > 0 ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : null
          perCoach[id].surveyCount = arr.length
        })

        if (!cancelled) {
          setData({
            loading: false,
            range,
            sinceLabel: since.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
            newUsers: newUsers.length,
            totalUsers: users.length,
            activeMembers,
            usedCourtesy,
            conversion,
            totalClasses,
            completedClasses: completedClasses.length,
            avgOccupancy,
            perCoach: Object.values(perCoach).sort((a, b) => b.completed - a.completed),
            totalCoaches: coaches.length,
          })
        }
      } catch (e) {
        console.error('SuperAdminAnalytics fetch failed:', e)
        if (!cancelled) setData({ loading: false, error: e.message })
      }
    }
    load()
    return () => { cancelled = true }
  }, [range])

  return (
    <AdminShell title="Analytics SuperAdmin">
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <BarChart3 size={28} className="text-salvaje-orange" />
            <div>
              <h1 className="font-display text-4xl uppercase text-salvaje-dark">Analytics</h1>
              <p className="font-body text-xs text-salvaje-gray">Métricas avanzadas de usuarios y coaches.</p>
            </div>
          </div>
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-salvaje">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
                  range === r.value ? 'bg-salvaje-orange text-white' : 'text-salvaje-dark hover:bg-salvaje-light'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {data.loading ? (
          <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
        ) : (
          <>
            {/* KPIs principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={Users} label="Nuevos en período" value={data.newUsers} sub={`${data.totalUsers} total`} />
              <Kpi icon={Activity} label="Miembros activos" value={data.activeMembers} sub={`${data.usedCourtesy} usaron cortesía`} />
              <Kpi icon={TrendingUp} label="Conversión cortesía → pago" value={`${data.conversion}%`} sub="histórico" accent="success" />
              <Kpi icon={Calendar} label="Aforo promedio" value={`${data.avgOccupancy}%`} sub={`${data.completedClasses}/${data.totalClasses} clases`} accent="orange" />
            </div>

            {/* Per-coach table */}
            <Card>
              <CardBody className="py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award size={16} className="text-salvaje-orange" />
                  <h2 className="font-display text-base uppercase text-salvaje-dark">Coaches en el período</h2>
                </div>
                {data.perCoach.length === 0 ? (
                  <p className="font-body text-sm text-salvaje-gray text-center py-4">Sin clases registradas en el período.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-body">
                      <thead className="text-[10px] uppercase tracking-widest text-salvaje-gray border-b border-salvaje-cream">
                        <tr>
                          <th className="text-left py-2">Coach</th>
                          <th className="text-right py-2">Programadas</th>
                          <th className="text-right py-2">Cerradas</th>
                          <th className="text-right py-2">Aforo</th>
                          <th className="text-right py-2 flex items-center justify-end gap-1"><Star size={10} /> Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.perCoach.map((c) => {
                          const occ = c.capacity > 0 ? Math.round((c.attendance / c.capacity) * 100) : 0
                          return (
                            <tr key={c.coachId} className="border-b border-salvaje-cream/40">
                              <td className="py-2 text-salvaje-dark font-semibold">{c.coachName}</td>
                              <td className="py-2 text-right font-mono">{c.total}</td>
                              <td className="py-2 text-right font-mono">{c.completed}</td>
                              <td className="py-2 text-right font-mono">{c.completed > 0 ? `${occ}%` : '—'}</td>
                              <td className="py-2 text-right font-mono">
                                {c.avgRating != null ? <>{c.avgRating}<span className="text-salvaje-gray"> / 5</span> <span className="text-[9px] text-salvaje-gray">({c.surveyCount})</span></> : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  )
}

function Kpi({ icon: Icon, label, value, sub, accent = 'brown' }) {
  const accents = {
    brown: 'bg-salvaje-brown',
    success: 'bg-salvaje-success',
    orange: 'bg-salvaje-orange',
  }
  return (
    <div className="bg-white rounded-salvaje p-4 shadow-salvaje">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-lg ${accents[accent]} text-white flex items-center justify-center`}>
          <Icon size={14} />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray truncate">{label}</p>
      </div>
      <p className="font-display text-3xl text-salvaje-dark leading-none mt-1">{value}</p>
      {sub && <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray mt-1">{sub}</p>}
    </div>
  )
}
