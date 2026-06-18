import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Users, Clock, ScanLine, CheckCircle2, History,
  Activity, UserPlus, Dumbbell, ListChecks, ChevronRight, FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { subscribeToCoachClasses } from '../../services/classes.service'
import { addLateRegistration } from '../../services/attendance.service'
import { searchUserByPhone } from '../../services/users.service'
import { formatTime, formatShortDate } from '../../utils/formatters'

const statusBadge = { scheduled: 'default', in_progress: 'orange', completed: 'success', cancelled: 'danger' }
const statusLabel = { scheduled: 'Programada', in_progress: 'En curso', completed: 'Completada', cancelled: 'Cancelada' }

export function CoachClasses() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('upcoming')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [lateModalCls, setLateModalCls] = useState(null)
  const [detailCls, setDetailCls] = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    setLoading(true)
    const unsub = subscribeToCoachClasses(user.uid, (data) => {
      setClasses(data)
      setLoading(false)
    }, 30, 30)
    return unsub
  }, [user?.uid])

  const upcoming = useMemo(() => {
    const now = new Date()
    return classes
      .filter((c) => c.status === 'scheduled' || c.status === 'in_progress')
      // Hide classes whose end already passed (15 min grace).
      // The admin still sees them in /admin/classes.
      .filter((c) => {
        const start = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate)
        const end = c.endDate?.toDate?.() || new Date(c.endDate || start)
        return !end || (now - end) <= 15 * 60 * 1000
      })
      .sort((a, b) => {
        const ad = a.scheduledDate?.toDate?.() || new Date(0)
        const bd = b.scheduledDate?.toDate?.() || new Date(0)
        return ad - bd
      })
  }, [classes])

  const completed = useMemo(() => {
    return classes
      .filter((c) => c.status === 'completed')
      .sort((a, b) => {
        const ad = a.scheduledDate?.toDate?.() || new Date(0)
        const bd = b.scheduledDate?.toDate?.() || new Date(0)
        return bd - ad
      })
  }, [classes])

  // Group by date
  const groupByDay = (list) => {
    const groups = {}
    for (const c of list) {
      const d = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate)
      const key = d.toISOString().slice(0, 10)
      if (!groups[key]) groups[key] = { date: d, classes: [] }
      groups[key].classes.push(c)
    }
    return Object.values(groups)
  }

  const upcomingGrouped = groupByDay(upcoming)
  const completedGrouped = groupByDay(completed)

  return (
    <AppShell title="Mis Clases">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Calendar size={24} className="text-salvaje-orange" />
            <h1 className="font-display text-3xl uppercase text-salvaje-dark">Mis Clases</h1>
          </div>
          <Button size="sm" onClick={() => navigate('/coach/checkin')}>
            <ScanLine size={14} /> Registrar
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-salvaje w-fit">
          <TabBtn active={tab === 'upcoming'} onClick={() => setTab('upcoming')} icon={Activity}>Programadas</TabBtn>
          <TabBtn active={tab === 'completed'} onClick={() => setTab('completed')} icon={History}>Histórico</TabBtn>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
        ) : tab === 'upcoming' ? (
          upcomingGrouped.length === 0 ? (
            <EmptyState icon={Calendar} title="Sin clases programadas" description="Aquí no hay nada todavía. Es tu turno." />
          ) : (
            <DayGroups groups={upcomingGrouped} navigate={navigate} variant="upcoming" onShowDetail={setDetailCls} />
          )
        ) : (
          completedGrouped.length === 0 ? (
            <EmptyState icon={History} title="Sin histórico aún" description="Las clases completadas aparecerán aquí" />
          ) : (
            <DayGroups groups={completedGrouped} navigate={navigate} variant="completed" onLateAdd={setLateModalCls} onShowDetail={setDetailCls} />
          )
        )}
      </div>

      <LateRegistrationModal
        cls={lateModalCls}
        open={!!lateModalCls}
        onClose={() => setLateModalCls(null)}
        coachUid={user?.uid}
        onSaved={() => {}}
      />

      <ClassDetailModal cls={detailCls} open={!!detailCls} onClose={() => setDetailCls(null)} />
    </AppShell>
  )
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

function DayGroups({ groups, navigate, variant, onLateAdd, onShowDetail }) {
  const today = new Date(); today.setHours(0,0,0,0)
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const isToday = g.date.toDateString() === today.toDateString()
        const dayLabel = isToday ? 'Hoy' : g.date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })
        return (
          <div key={g.date.toISOString()}>
            <p className="font-display text-xs uppercase tracking-widest text-salvaje-orange mb-2 capitalize">— {dayLabel} —</p>
            <div className="space-y-2">
              {g.classes.map((c) => (
                <ClassRow key={c.id} cls={c} navigate={navigate} variant={variant} onLateAdd={onLateAdd} onShowDetail={onShowDetail} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ClassRow({ cls, navigate, variant, onLateAdd, onShowDetail }) {
  const checkedIn = (cls.attendeeList || []).filter((a) => a.checkedIn).length
  const cap = cls.maxCapacity || 0
  const occupancy = cap ? (cls.currentBookings / cap * 100) : 0
  const exerciseCount = Array.isArray(cls.exercises) ? cls.exercises.length : 0
  const hasContent = exerciseCount > 0 || !!cls.wod?.trim()

  return (
    <Card>
      <button
        onClick={() => onShowDetail?.(cls)}
        className="w-full text-left hover:bg-salvaje-light/30 transition-colors rounded-salvaje"
      >
        <CardBody className="py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-display text-base uppercase text-salvaje-dark">{cls.name}</p>
              <ChevronRight size={14} className="text-salvaje-gray flex-shrink-0" />
            </div>
            <div className="flex items-center gap-3 text-xs font-body text-salvaje-gray mt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><Clock size={11} />{formatTime(cls.scheduledDate)}</span>
              {variant === 'upcoming' ? (
                <span className="flex items-center gap-1"><Users size={11} />{cls.currentBookings || 0}/{cap} inscritos</span>
              ) : (
                <span className="flex items-center gap-1"><Users size={11} />{checkedIn}/{cls.currentBookings || 0} asistieron · {occupancy.toFixed(0)}% aforo</span>
              )}
              {hasContent && (
                <span className="flex items-center gap-1 text-salvaje-orange">
                  <Dumbbell size={11} />
                  {exerciseCount > 0 ? `${exerciseCount} ejercicio${exerciseCount === 1 ? '' : 's'}` : 'Ver WOD'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={statusBadge[cls.status]}>{statusLabel[cls.status]}</Badge>
            {variant === 'upcoming' && cls.status === 'in_progress' && (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/coach/classes/${cls.id}/active`) }}>Continuar</Button>
            )}
            {variant === 'completed' && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onLateAdd?.(cls) }}
                className="p-2 rounded-lg text-salvaje-gray hover:text-salvaje-orange hover:bg-salvaje-orange/10 transition-colors"
                title="Agregar registro tardío"
              >
                <UserPlus size={14} />
              </button>
            )}
          </div>
        </CardBody>
      </button>
    </Card>
  )
}

function ClassDetailModal({ cls, open, onClose }) {
  if (!cls) return null
  const start = cls.scheduledDate?.toDate?.() || new Date(cls.scheduledDate)
  const end = cls.endDate?.toDate?.() || new Date(cls.endDate || start)
  const exercises = Array.isArray(cls.exercises) ? cls.exercises.filter((x) => x?.trim()) : []
  const dateLabel = start.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const cap = cls.maxCapacity || 0
  const checkedIn = (cls.attendeeList || []).filter((a) => a.checkedIn).length

  return (
    <Modal open={open} onClose={onClose} title={cls.name} size="lg">
      <div className="px-5 pb-5 space-y-4">
        {/* Header info */}
        <div className="bg-salvaje-light rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-body text-salvaje-dark capitalize">
            <Calendar size={14} className="text-salvaje-orange" />
            <span>{dateLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-body text-salvaje-dark">
            <Clock size={14} className="text-salvaje-orange" />
            <span>{formatTime(start)} – {formatTime(end)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-body text-salvaje-dark">
            <Users size={14} className="text-salvaje-orange" />
            <span>{checkedIn} de {cls.currentBookings || 0} asistieron · {cap} cupos</span>
          </div>
          <div className="pt-1">
            <Badge variant={statusBadge[cls.status]}>{statusLabel[cls.status]}</Badge>
          </div>
        </div>

        {/* Exercises */}
        {exercises.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ListChecks size={16} className="text-salvaje-orange" />
              <h3 className="font-display text-base uppercase text-salvaje-dark">
                Ejercicios <span className="text-salvaje-gray text-sm normal-case">({exercises.length})</span>
              </h3>
            </div>
            <ol className="space-y-1.5">
              {exercises.map((ex, i) => (
                <li key={i} className="flex items-start gap-3 bg-white border border-salvaje-cream rounded-xl px-3 py-2">
                  <span className="font-display text-salvaje-orange text-base leading-none w-6 flex-shrink-0 pt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-body text-sm text-salvaje-dark leading-snug">{ex}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="text-center py-4 text-salvaje-gray">
            <Dumbbell size={24} className="mx-auto mb-2 text-salvaje-cream" />
            <p className="font-body text-sm">Sin ejercicios definidos</p>
          </div>
        )}

        {/* WOD / notes */}
        {cls.wod?.trim() && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-salvaje-orange" />
              <h3 className="font-display text-base uppercase text-salvaje-dark">Notas / WOD</h3>
            </div>
            <div className="bg-salvaje-orange/5 border border-salvaje-orange/20 rounded-xl p-3">
              <p className="font-body text-sm text-salvaje-dark whitespace-pre-wrap leading-relaxed">{cls.wod}</p>
            </div>
          </div>
        )}

        {/* Level */}
        {cls.level && cls.level !== 'all' && (
          <div className="text-xs font-mono uppercase tracking-widest text-salvaje-gray">
            Nivel: <span className="text-salvaje-dark">{cls.level === 'beginner' ? 'Principiante' : cls.level === 'intermediate' ? 'Intermedio' : cls.level === 'advanced' ? 'Avanzado' : cls.level}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

function LateRegistrationModal({ cls, open, onClose, coachUid, onSaved }) {
  const [phone, setPhone] = useState('')
  const [searching, setSearching] = useState(false)
  const [foundUser, setFoundUser] = useState(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!open) { setPhone(''); setFoundUser(null) }
  }, [open])

  const search = async () => {
    if (!phone.trim()) { toast.error('Número inválido. Mínimo 7 dígitos.'); return }
    setSearching(true)
    try {
      const u = await searchUserByPhone(phone.trim())
      if (!u) {
        toast.error('Este número no está en la tribu')
        setFoundUser(null)
      } else {
        setFoundUser(u)
      }
    } catch { toast.error('No pudimos buscar. Reintenta.') }
    setSearching(false)
  }

  const confirm = async () => {
    if (!foundUser || !cls) return
    setAdding(true)
    try {
      await addLateRegistration(cls.id, foundUser.id, coachUid)
      toast.success(`${foundUser.displayName} agregado · marcado como tardío`)
      onSaved?.()
      onClose()
    } catch (e) { toast.error(e.message || 'No pudimos agregarlo') }
    setAdding(false)
  }

  if (!cls) return null
  return (
    <Modal open={open} onClose={onClose} title="Agregar registro tardío" size="md">
      <div className="px-5 pb-5 space-y-3">
        <div className="bg-salvaje-orange/5 border border-salvaje-orange/30 rounded-xl p-3">
          <p className="text-xs font-body text-salvaje-dark">
            Esta clase ya fue finalizada. Agregar a alguien queda registrado como <strong>registro tardío</strong> en el log.
          </p>
        </div>
        <Input label="Número de celular" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="3001234567" maxLength={10} />
        <Button onClick={search} loading={searching} className="w-full">Buscar</Button>

        {foundUser && (
          <Card>
            <CardBody className="py-3 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-salvaje-success" />
              <div className="flex-1">
                <p className="font-body text-sm font-semibold text-salvaje-dark">{foundUser.displayName}</p>
                <p className="font-body text-xs text-salvaje-gray">{foundUser.email}</p>
              </div>
            </CardBody>
          </Card>
        )}

        <Button onClick={confirm} disabled={!foundUser} loading={adding} className="w-full">
          <UserPlus size={14} /> Confirmar registro
        </Button>
      </div>
    </Modal>
  )
}
