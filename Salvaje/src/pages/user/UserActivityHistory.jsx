import { useEffect, useState } from 'react'
import { History, Activity, Clock, Calendar } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { useAuth } from '../../hooks/useAuth'
import { fetchMyActivity } from '../../services/activity.service'

const PAGE_NAMES = {
  '/app': 'Inicio',
  '/app/classes': 'Clases',
  '/app/qr': 'Mi QR',
  '/app/progress': 'Progreso',
  '/app/membership': 'Membresía',
  '/app/referrals': 'Referidos',
  '/app/profile': 'Perfil',
  '/app/history': 'Historial',
}

const ACTION_LABELS = {
  page_enter: { label: 'Visitaste', icon: Activity },
  reserve_class: { label: 'Reservaste clase', icon: Calendar },
  cancel_reservation: { label: 'Cancelaste reserva', icon: Calendar },
  scan_qr: { label: 'Asististe a clase', icon: Activity },
  view_qr: { label: 'Mostraste tu QR', icon: Activity },
  edit_profile: { label: 'Editaste perfil', icon: Activity },
  purchase_initiated: { label: 'Iniciaste compra', icon: Activity },
}

function relativeTime(d) {
  const now = Date.now()
  const t = d.getTime()
  const diff = Math.floor((now - t) / 1000)
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)}d`
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function UserActivityHistory() {
  const { user, profile } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    fetchMyActivity(user.uid, 50).then((l) => { setLogs(l); setLoading(false) })
  }, [user?.uid])

  // Stats: classes attended this week, total time in app
  const now = Date.now()
  const weekAgo = now - 7 * 86400000
  const thisWeek = logs.filter((l) => {
    const t = l.timestamp?.toDate?.()
    return t && t.getTime() >= weekAgo
  })
  const classesAttended = thisWeek.filter((l) => l.action === 'scan_qr').length
  const totalSeconds = thisWeek.filter((l) => l.action === 'page_exit' && l.metadata?.duration)
    .reduce((acc, l) => acc + l.metadata.duration, 0)
  const activeDays = new Set(thisWeek.map((l) => l.timestamp?.toDate?.().toDateString()).filter(Boolean)).size

  const actionableLogs = logs.filter((l) => ACTION_LABELS[l.action] && l.action !== 'page_enter')

  return (
    <AppShell title="Mi Actividad">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center gap-3">
          <History size={24} className="text-salvaje-orange" />
          <h1 className="font-display text-3xl uppercase text-salvaje-dark">Mi Actividad</h1>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat icon={Calendar} label="Clases" value={classesAttended} sub="esta semana" />
              <Stat icon={Clock}    label="Tiempo" value={totalSeconds >= 60 ? `${Math.round(totalSeconds / 60)}m` : `${totalSeconds}s`} sub="en la app" />
              <Stat icon={Activity} label="Días activo" value={activeDays} sub="esta semana" />
            </div>

            <div>
              <h2 className="font-display text-lg uppercase text-salvaje-dark mb-2">Historial reciente</h2>
              {actionableLogs.length === 0 && logs.length === 0 ? (
                <Card>
                  <CardBody className="text-center py-8">
                    <Activity size={32} className="text-salvaje-cream mx-auto mb-2" />
                    <p className="font-body text-sm text-salvaje-gray">Aún no tienes actividad registrada</p>
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-1.5">
                  {(actionableLogs.length > 0 ? actionableLogs : logs).slice(0, 50).map((l) => {
                    const t = l.timestamp?.toDate?.() || new Date()
                    const def = ACTION_LABELS[l.action] || { label: l.action.replace(/_/g, ' '), icon: Activity }
                    const Icon = def.icon
                    return (
                      <Card key={l.id}>
                        <CardBody className="py-2.5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-salvaje-orange/10 flex items-center justify-center flex-shrink-0">
                            <Icon size={14} className="text-salvaje-orange" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-sm text-salvaje-dark">
                              {def.label}{l.metadata?.page ? ` · ${PAGE_NAMES[l.metadata.page] || l.metadata.page}` : ''}
                            </p>
                            <p className="font-mono text-[10px] text-salvaje-gray">{relativeTime(t)}</p>
                          </div>
                        </CardBody>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardBody className="py-3 text-center">
        <Icon size={14} className="text-salvaje-orange mx-auto mb-1" />
        <p className="text-[9px] font-body text-salvaje-gray uppercase tracking-widest">{label}</p>
        <p className="font-display text-xl text-salvaje-dark leading-tight">{value}</p>
        {sub && <p className="font-body text-[10px] text-salvaje-gray mt-0.5">{sub}</p>}
      </CardBody>
    </Card>
  )
}
