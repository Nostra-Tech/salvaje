import { useState, useEffect } from 'react'
import { Bell, Send, Users, Dumbbell, History as HistoryIcon, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { getAllUsers } from '../../services/users.service'
import { getAllCoaches } from '../../services/coaches.service'
import { createNotification } from '../../services/notifications.service'

const TARGET_OPTIONS = [
  { value: 'all_users',          label: 'Todos los usuarios',  icon: Users },
  { value: 'active_users',       label: 'Usuarios activos',    icon: Users },
  { value: 'inactive_users',     label: 'Usuarios inactivos',  icon: Users },
  { value: 'all_coaches',        label: 'Todos los coaches',   icon: Dumbbell },
]

export function AdminNotifications() {
  const { user, profile } = useAuth()
  const [target, setTarget] = useState('all_users')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sentHistory, setSentHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    // Get last 30 admin-broadcast notifications grouped by sentBatch (rough: same title+body+createdAt within 5min)
    fetchSentHistory().then((h) => { setSentHistory(h); setLoadingHistory(false) })
  }, [])

  const fetchSentHistory = async () => {
    const q = query(
      collection(db, 'notifications'),
      where('type', 'in', ['admin_broadcast', 'admin_broadcast_active', 'admin_broadcast_inactive', 'admin_broadcast_coaches']),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    try {
      const snap = await getDocs(q)
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      // Group by title+body
      const grouped = {}
      for (const n of all) {
        const key = `${n.title}|${n.body}|${n.type}`
        if (!grouped[key]) grouped[key] = { ...n, count: 0 }
        grouped[key].count++
      }
      return Object.values(grouped).slice(0, 20)
    } catch (e) {
      console.warn('History query failed (might need index):', e)
      return []
    }
  }

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Título y mensaje son obligatorios')
      return
    }
    setSending(true)
    try {
      // Get recipients
      let recipients = []
      let recipientRole = 'user'
      if (target === 'all_users') {
        recipients = await getAllUsers()
        recipientRole = 'user'
      } else if (target === 'active_users') {
        recipients = (await getAllUsers()).filter((u) => u.membershipIsActive)
        recipientRole = 'user'
      } else if (target === 'inactive_users') {
        recipients = (await getAllUsers()).filter((u) => !u.membershipIsActive)
        recipientRole = 'user'
      } else if (target === 'all_coaches') {
        recipients = (await getAllCoaches()).filter((c) => c.isActive !== false)
        recipientRole = 'coach'
      }

      if (recipients.length === 0) {
        toast.error('Sin destinatarios para esta selección')
        setSending(false)
        return
      }

      const type = target === 'all_coaches' ? 'admin_broadcast_coaches'
                : target === 'active_users' ? 'admin_broadcast_active'
                : target === 'inactive_users' ? 'admin_broadcast_inactive'
                : 'admin_broadcast'

      // Send in batches
      await Promise.all(recipients.map((r) =>
        createNotification({
          recipientId: r.id || r.uid,
          recipientRole,
          type,
          title: title.trim(),
          body: body.trim(),
          relatedId: null,
          relatedCollection: null,
        }).catch((e) => console.warn('Failed for', r.id, e))
      ))

      toast.success(`Notificación enviada a ${recipients.length} ${recipientRole === 'coach' ? 'coaches' : 'usuarios'}`)
      setTitle('')
      setBody('')
      setTimeout(() => fetchSentHistory().then(setSentHistory), 500)
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <AdminShell title="Notificaciones">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <Bell size={28} className="text-salvaje-orange" />
          <h1 className="font-display text-4xl uppercase text-salvaje-dark">Notificaciones</h1>
        </div>

        <p className="font-body text-sm text-salvaje-gray">
          Envía notificaciones in-app masivas a tus usuarios o coaches. Las verán en su campanita 🔔
        </p>

        {/* Compose */}
        <Card>
          <CardBody className="py-5 space-y-4">
            <div>
              <p className="text-[10px] font-body font-semibold uppercase tracking-widest text-salvaje-orange mb-2">¿A quién?</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TARGET_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTarget(opt.value)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        target === opt.value
                          ? 'bg-salvaje-orange text-white shadow-salvaje'
                          : 'bg-salvaje-light text-salvaje-dark hover:bg-salvaje-cream'
                      }`}
                    >
                      <Icon size={18} className="mx-auto mb-1" />
                      <span className="font-body text-xs font-medium leading-tight">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <Input label="Título del mensaje *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: ¡Promo de febrero!" />
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">Mensaje *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Escribe tu mensaje..."
                className="px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange resize-none"
              />
              <p className="text-[10px] font-mono text-salvaje-gray text-right">{body.length} caracteres</p>
            </div>

            <Button className="w-full" size="lg" loading={sending} onClick={handleSend}>
              <Send size={16} /> Enviar notificación
            </Button>
          </CardBody>
        </Card>

        {/* History */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HistoryIcon size={18} className="text-salvaje-orange" />
            <h2 className="font-display text-2xl uppercase text-salvaje-dark">Envíos recientes</h2>
          </div>
          {loadingHistory ? (
            <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
          ) : sentHistory.length === 0 ? (
            <Card>
              <CardBody className="text-center py-6">
                <Bell size={28} className="text-salvaje-cream mx-auto mb-2" />
                <p className="font-body text-sm text-salvaje-gray">Aún no has enviado notificaciones masivas</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-2">
              {sentHistory.map((n) => (
                <Card key={n.id}>
                  <CardBody className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-semibold text-salvaje-dark">{n.title}</p>
                        <p className="font-body text-xs text-salvaje-gray mt-0.5 line-clamp-2">{n.body}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="default">{n.count} envíos</Badge>
                        <p className="font-mono text-[10px] text-salvaje-gray mt-1">
                          {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
