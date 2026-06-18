import { useEffect, useState, useMemo } from 'react'
import {
  History, Users, Activity, Clock, Smartphone, Monitor, X,
  TrendingUp, Calendar,
} from 'lucide-react'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { fetchActivityLogs, summarizeLogs } from '../../services/activity.service'
import { getAllUsers } from '../../services/users.service'
import { getAllCoaches } from '../../services/coaches.service'

const PAGE_NAMES = {
  '/app': 'Inicio user', '/app/classes': 'Clases user', '/app/qr': 'Mi QR',
  '/app/progress': 'Progreso', '/app/membership': 'Membresía',
  '/app/referrals': 'Referidos', '/app/profile': 'Perfil user', '/app/history': 'Historial',
  '/coach': 'Inicio coach', '/coach/checkin': 'Check-in',
  '/coach/classes': 'Mis clases', '/coach/payroll': 'Mi nómina', '/coach/profile': 'Perfil coach',
  '/admin': 'Admin Dashboard', '/admin/users': 'Usuarios', '/admin/coaches': 'Coaches',
  '/admin/classes': 'Clases admin', '/admin/payroll': 'Nómina', '/admin/cashflow': 'Cashflow',
  '/admin/analytics': 'Analytics', '/admin/tracking': 'Tracking',
  '/admin/activity-log': 'Historial', '/admin/notifications': 'Notif',
  '/admin/settings': 'Config', '/admin/finances': 'Finanzas',
  '/admin/payments': 'Pagos', '/admin/memberships': 'Membresías', '/admin/weekly-plans': 'Planes',
}

const ACTION_LABEL = {
  page_enter: 'Entró a', page_exit: 'Salió de', session_end: 'Fin sesión',
  reserve_class: 'Reservó', cancel_reservation: 'Canceló reserva',
  scan_qr: 'Asistió', edit_profile: 'Editó perfil',
  purchase_initiated: 'Inició compra', view_qr: 'Vio QR',
}

const PERIODS = [
  { value: 1,  label: 'Hoy' },
  { value: 7,  label: '7 días' },
  { value: 30, label: '30 días' },
]

export function AdminActivityLog() {
  const [days, setDays] = useState(7)
  const [tab, setTab] = useState('user') // 'user' | 'coach' | 'admin'
  const [logs, setLogs] = useState([])
  const [people, setPeople] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAllUsers(), getAllCoaches()]).then(([u, c]) => {
      setPeople([
        ...u.map((x) => ({ ...x, role: 'user' })),
        ...c.map((x) => ({ ...x, role: 'coach' })),
      ])
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchActivityLogs({ days, role: tab, max: 2000 })
      .then((l) => { setLogs(l) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days, tab])

  // Group by userId
  const byPerson = useMemo(() => {
    const m = {}
    for (const l of logs) {
      if (!m[l.userId]) {
        m[l.userId] = {
          userId: l.userId,
          userName: l.userName,
          userRole: l.userRole,
          actionsCount: 0,
          sessions: new Set(),
          lastActivity: l.timestamp,
          totalDurationSec: 0,
          actions: [],
          pageVisits: {},
        }
      }
      const p = m[l.userId]
      p.actionsCount++
      p.actions.push(l)
      if (l.sessionId) p.sessions.add(l.sessionId)
      if (l.timestamp?.toMillis?.() > l.lastActivity?.toMillis?.()) p.lastActivity = l.timestamp
      if (l.metadata?.duration) p.totalDurationSec += l.metadata.duration
      if (l.action === 'page_enter' && l.metadata?.page) {
        p.pageVisits[l.metadata.page] = (p.pageVisits[l.metadata.page] || 0) + 1
      }
    }
    return Object.values(m)
      .sort((a, b) => (b.lastActivity?.toMillis?.() || 0) - (a.lastActivity?.toMillis?.() || 0))
  }, [logs])

  const summary = summarizeLogs(logs)

  // Enrich with user photo from people list
  const enriched = byPerson.map((p) => {
    const profile = people.find((x) => x.id === p.userId)
    return { ...p, photoURL: profile?.profilePhotoURL, email: profile?.email }
  })

  return (
    <AdminShell title="Historial de Actividad">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <History size={28} className="text-salvaje-orange" />
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Actividad</h1>
          </div>
          <div className="flex bg-white rounded-xl shadow-salvaje p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
                  days === p.value ? 'bg-salvaje-orange text-white' : 'text-salvaje-dark hover:bg-salvaje-cream/30'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI icon={Users} label="Personas activas" value={summary.uniqueUsers} />
          <KPI icon={Activity} label="Sesiones" value={summary.sessions} />
          <KPI icon={History} label="Acciones" value={summary.totalActions} />
          <KPI icon={Clock} label="Hora pico" value={`${summary.peakHour}:00`} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-salvaje w-fit">
          <TabBtn active={tab === 'user'} onClick={() => setTab('user')} icon={Users}>Usuarios</TabBtn>
          <TabBtn active={tab === 'coach'} onClick={() => setTab('coach')} icon={Users}>Coaches</TabBtn>
          <TabBtn active={tab === 'admin'} onClick={() => setTab('admin')} icon={Users}>Admins</TabBtn>
        </div>

        {/* Persons */}
        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : enriched.length === 0 ? (
          <Card>
            <CardBody className="text-center py-10">
              <Activity size={36} className="text-salvaje-cream mx-auto mb-2" />
              <p className="font-body text-salvaje-gray">Sin actividad en este período</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {enriched.map((p) => (
              <button key={p.userId} onClick={() => setSelected(p)} className="w-full text-left">
                <Card hover>
                  <CardBody className="py-3 flex items-center gap-3">
                    <Avatar src={p.photoURL} name={p.userName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{p.userName}</p>
                      <p className="font-mono text-[10px] text-salvaje-gray">
                        {p.actionsCount} acciones · {Math.round(p.totalDurationSec / 60)} min · última {relativeTime(p.lastActivity?.toDate?.())}
                      </p>
                    </div>
                    <Badge variant={p.userRole === 'admin' ? 'orange' : p.userRole === 'coach' ? 'success' : 'default'}>
                      {p.userRole}
                    </Badge>
                  </CardBody>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <PersonActivityDrawer person={selected} onClose={() => setSelected(null)} />
    </AdminShell>
  )
}

function PersonActivityDrawer({ person, onClose }) {
  if (!person) return null

  // Top pages
  const topPages = Object.entries(person.pageVisits || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Timeline ordered by time desc
  const timeline = [...person.actions]
    .filter((a) => a.action !== 'page_exit')
    .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
    .slice(0, 50)

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div onClick={(e) => e.stopPropagation()} className="ml-auto relative w-full max-w-md bg-white shadow-salvaje-lg overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-salvaje-cream px-5 py-4 flex items-center justify-between">
          <button onClick={onClose} className="text-salvaje-gray hover:text-salvaje-dark"><X size={18} /></button>
          <h2 className="font-display text-lg uppercase text-salvaje-dark">{person.userName}</h2>
          <div className="w-6" />
        </div>

        <div className="p-5 space-y-4">
          {/* Summary */}
          <div className="bg-salvaje-light rounded-xl p-3 space-y-1">
            <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest">Resumen</p>
            <ul className="text-sm font-body text-salvaje-dark space-y-0.5">
              <li>{Math.round(person.totalDurationSec / 60)} min en la app</li>
              <li>{person.actionsCount} acciones</li>
              <li>{person.sessions.size} sesiones</li>
              <li>Última: {relativeTime(person.lastActivity?.toDate?.())}</li>
            </ul>
          </div>

          {/* Top pages */}
          {topPages.length > 0 && (
            <div>
              <p className="text-xs font-body font-semibold uppercase tracking-widest text-salvaje-orange mb-2">Páginas más visitadas</p>
              <div className="space-y-1">
                {topPages.map(([page, n], i) => (
                  <div key={page} className="flex items-center justify-between text-sm font-body py-1 border-b border-salvaje-cream last:border-0">
                    <span className="text-salvaje-dark"><span className="font-mono text-xs text-salvaje-gray mr-1">{i + 1}.</span> {PAGE_NAMES[page] || page}</span>
                    <span className="font-mono text-salvaje-orange font-semibold">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs font-body font-semibold uppercase tracking-widest text-salvaje-orange mb-2">Acciones recientes</p>
            <div className="space-y-1.5">
              {timeline.map((l) => {
                const t = l.timestamp?.toDate?.() || new Date()
                const verb = ACTION_LABEL[l.action] || l.action.replace(/_/g, ' ')
                const target = PAGE_NAMES[l.metadata?.page] || l.metadata?.page || ''
                return (
                  <div key={l.id} className="flex items-baseline gap-2 text-xs font-body">
                    <span className="font-mono text-[10px] text-salvaje-gray w-12 flex-shrink-0">
                      {t.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-salvaje-dark flex-1">
                      {verb} {target && <span className="font-semibold">"{target}"</span>}
                      {l.metadata?.duration && <span className="text-salvaje-gray"> · {l.metadata.duration}s</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function relativeTime(d) {
  if (!d) return '—'
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}

function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body font-medium transition-all ${
        active ? 'bg-salvaje-orange text-white' : 'text-salvaje-dark hover:bg-salvaje-cream/30'
      }`}
    >
      <Icon size={14} />{children}
    </button>
  )
}

function KPI({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardBody className="py-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={14} className="text-salvaje-orange" />
          <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest">{label}</p>
        </div>
        <p className="font-display text-2xl text-salvaje-dark leading-tight">{value}</p>
      </CardBody>
    </Card>
  )
}
