import { useState, useEffect, useMemo } from 'react'
import {
  Calendar, Plus, ChevronLeft, ChevronRight, List, LayoutGrid,
  Users, Clock, Pencil, CheckCircle, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Timestamp } from 'firebase/firestore'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { Avatar } from '../../components/ui/Avatar'
import { AdminEditClassModal } from '../../components/admin/AdminEditClassModal'
import { WeeklyCalendarGrid } from '../../components/admin/WeeklyCalendarGrid'
import { MobileDayView } from '../../components/admin/MobileDayView'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useAuth } from '../../hooks/useAuth'
import { getAllClasses, createClass } from '../../services/classes.service'
import { getAllCoaches } from '../../services/coaches.service'
import { formatDateTime, formatTime, formatShortDate } from '../../utils/formatters'

const statusLabel = { scheduled: 'Programada', in_progress: 'En curso', completed: 'Completada', cancelled: 'Cancelada' }
const statusBadge = { scheduled: 'default', in_progress: 'orange', completed: 'success', cancelled: 'danger' }

function startOfWeek(d) {
  const x = new Date(d); x.setHours(0,0,0,0)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}
function endOfWeek(start) { const x = new Date(start); x.setDate(x.getDate() + 7); return x }

export function AdminClasses() {
  const { user } = useAuth()
  const isMobile = useMediaQuery('(max-width: 640px)')
  const [classes, setClasses] = useState([])
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('week') // 'week' | 'list' | 'completed'
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))

  // Unified filters (persist across tabs)
  const [coachFilter, setCoachFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [minOccupancy, setMinOccupancy] = useState(0)

  const [creating, setCreating] = useState(false)
  const [createModal, setCreateModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detailing, setDetailing] = useState(null)
  const [form, setForm] = useState({ name: '', coachId: '', date: '', startTime: '06:00', endTime: '07:00', maxCapacity: 15, level: 'all', wod: '' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [cls, cch] = await Promise.all([getAllClasses(60, 60), getAllCoaches()])
      setClasses(cls); setCoaches(cch)
    } catch (e) {
      console.error('AdminClasses fetchData failed:', e)
      toast.error('No pudimos cargar las clases: ' + (e?.message || 'error'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchData() }, [])

  // Apply unified filters to all classes
  const applyFilters = (list) => {
    let out = list
    if (coachFilter !== 'all')  out = out.filter((c) => c.coachId === coachFilter)
    if (statusFilter !== 'all') out = out.filter((c) => c.status === statusFilter)
    if (levelFilter !== 'all')  out = out.filter((c) => c.level === levelFilter)
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      out = out.filter((c) =>
        c.name?.toLowerCase().includes(q) ||
        c.wod?.toLowerCase().includes(q) ||
        c.coachName?.toLowerCase().includes(q)
      )
    }
    if (minOccupancy > 0) {
      out = out.filter((c) => {
        const cap = c.maxCapacity || 0
        const booked = c.currentBookings || c.attendeeList?.length || 0
        return cap > 0 && (booked / cap * 100) >= minOccupancy
      })
    }
    return out
  }

  // Tab data
  const weekClasses = useMemo(() => {
    const end = endOfWeek(weekStart)
    return applyFilters(classes.filter((c) => {
      const d = c.scheduledDate?.toDate ? c.scheduledDate.toDate() : new Date(c.scheduledDate)
      return d >= weekStart && d < end
    }))
  }, [classes, weekStart, coachFilter, statusFilter, levelFilter, searchQ, minOccupancy])

  const allFiltered = useMemo(() => applyFilters(classes), [classes, coachFilter, statusFilter, levelFilter, searchQ, minOccupancy])
  const completedFiltered = useMemo(() => applyFilters(classes.filter((c) => c.status === 'completed')), [classes, coachFilter, statusFilter, levelFilter, searchQ, minOccupancy])

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const handleCreate = async () => {
    if (!form.name || !form.coachId || !form.date) { toast.error('Completa los campos requeridos'); return }
    setCreating(true)
    try {
      const coach = coaches.find((c) => c.id === form.coachId)
      const [sh, sm] = form.startTime.split(':').map(Number)
      const [eh, em] = form.endTime.split(':').map(Number)
      const start = new Date(form.date); start.setHours(sh, sm, 0, 0)
      const end = new Date(form.date); end.setHours(eh, em, 0, 0)
      await createClass({
        name: form.name, coachId: form.coachId,
        coachName: coach?.displayName || '', coachPhotoURL: coach?.profilePhotoURL || '',
        scheduledDate: Timestamp.fromDate(start), endDate: Timestamp.fromDate(end),
        durationMinutes: (eh * 60 + em) - (sh * 60 + sm),
        maxCapacity: parseInt(form.maxCapacity), level: form.level, wod: form.wod,
        description: '', weeklyPlanId: null, payrollPeriod: null, createdBy: user.uid,
      })
      toast.success('Clase creada')
      setCreateModal(false); fetchData()
    } catch (e) { toast.error(e.message || 'Error') }
    finally { setCreating(false) }
  }

  return (
    <AdminShell title="Clases">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Calendar size={28} className="text-salvaje-orange" />
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Clases</h1>
          </div>
          <Button size="sm" onClick={() => setCreateModal(true)}>
            <Plus size={14} /> Nueva clase
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-salvaje w-fit">
          <TabBtn active={tab === 'week'}      onClick={() => setTab('week')}      icon={LayoutGrid}>Vista semanal</TabBtn>
          <TabBtn active={tab === 'list'}      onClick={() => setTab('list')}      icon={List}>Listado</TabBtn>
          <TabBtn active={tab === 'completed'} onClick={() => setTab('completed')} icon={CheckCircle}>Completadas</TabBtn>
        </div>

        {/* Unified filters */}
        <Card>
          <CardBody className="py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                <Search size={14} className="text-salvaje-gray" />
                <input
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Buscar nombre, WOD o coach..."
                  className="flex-1 px-2 py-1 rounded-lg border border-salvaje-cream font-body text-xs"
                />
              </div>
              <select value={coachFilter} onChange={(e) => setCoachFilter(e.target.value)} className="px-2 py-1 rounded-lg border border-salvaje-cream text-xs font-body">
                <option value="all">Todos los coaches</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1 rounded-lg border border-salvaje-cream text-xs font-body">
                <option value="all">Todos los estados</option>
                <option value="scheduled">Programadas</option>
                <option value="in_progress">En curso</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="px-2 py-1 rounded-lg border border-salvaje-cream text-xs font-body">
                <option value="all">Todos los niveles</option>
                <option value="all">Todos</option>
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
              <div className="flex items-center gap-1">
                <span className="font-body text-[10px] text-salvaje-gray">Ocupación ≥</span>
                <input type="number" min="0" max="100" value={minOccupancy} onChange={(e) => setMinOccupancy(parseInt(e.target.value) || 0)} className="w-12 px-1 py-1 rounded border border-salvaje-cream text-xs font-mono text-center" />
                <span className="font-body text-[10px] text-salvaje-gray">%</span>
              </div>
            </div>
            {tab === 'week' && (
              <div className="flex items-center gap-2 pt-1 border-t border-salvaje-cream">
                <button onClick={() => setWeekStart(new Date(weekStart.getTime() - 7*86400000))} className="p-1 rounded-lg hover:bg-salvaje-cream"><ChevronLeft size={14} /></button>
                <p className="font-display text-sm uppercase text-salvaje-dark">
                  Semana del {weekStart.getDate()} al {(() => { const e = endOfWeek(weekStart); e.setDate(e.getDate()-1); return e.getDate() })()} de {weekStart.toLocaleDateString('es-CO', { month: 'long' })}
                </p>
                <button onClick={() => setWeekStart(new Date(weekStart.getTime() + 7*86400000))} className="p-1 rounded-lg hover:bg-salvaje-cream"><ChevronRight size={14} /></button>
                <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="ml-1 px-2 py-0.5 rounded-lg text-[10px] font-body bg-salvaje-light hover:bg-salvaje-cream">Hoy</button>
              </div>
            )}
          </CardBody>
        </Card>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
        ) : tab === 'week' ? (
          weekClasses.length === 0 ? (
            <EmptyState icon={Calendar} title="Sin clases esta semana" description="Ajusta los filtros o cambia de semana" />
          ) : isMobile ? (
            <MobileDayView weekStart={weekStart} classes={weekClasses} onClickClass={setDetailing} />
          ) : (
            <WeeklyCalendarGrid weekStart={weekStart} classes={weekClasses} onClickClass={setDetailing} />
          )
        ) : tab === 'list' ? (
          allFiltered.length === 0 ? (
            <EmptyState icon={List} title="Sin clases que coincidan" description="Ajusta los filtros" />
          ) : (
            <ClassListTable classes={allFiltered} onSelect={setDetailing} onEdit={setEditing} />
          )
        ) : (
          completedFiltered.length === 0 ? (
            <EmptyState icon={CheckCircle} title="Sin clases completadas" description="Aparecerán cuando los coaches finalicen sus clases" />
          ) : (
            <CompletedClassList classes={completedFiltered} onSelect={setDetailing} />
          )
        )}
      </div>

      <AdminEditClassModal cls={editing} open={!!editing} onClose={() => setEditing(null)} onSaved={fetchData} />
      <ClassDetailDrawer cls={detailing} open={!!detailing} onClose={() => setDetailing(null)} onEdit={(c) => { setDetailing(null); setEditing(c) }} />

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nueva Clase">
        <div className="px-5 pb-5 space-y-3">
          <Input label="Nombre" value={form.name} onChange={set('name')} />
          <Select label="Coach" value={form.coachId} onChange={set('coachId')}>
            <option value="">Seleccionar coach...</option>
            {coaches.filter(c=>c.isActive!==false).map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </Select>
          <Input label="Fecha" type="date" value={form.date} onChange={set('date')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Hora inicio" type="time" value={form.startTime} onChange={set('startTime')} />
            <Input label="Hora fin" type="time" value={form.endTime} onChange={set('endTime')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Nivel" value={form.level} onChange={set('level')}>
              <option value="all">Todos</option>
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="advanced">Avanzado</option>
            </Select>
            <Input label="Capacidad" type="number" value={form.maxCapacity} onChange={set('maxCapacity')} />
          </div>
          <Textarea label="WOD" value={form.wod} onChange={set('wod')} rows={3} />
          <Button className="w-full" loading={creating} onClick={handleCreate}>Crear clase</Button>
        </div>
      </Modal>
    </AdminShell>
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
      <Icon size={14} />
      {children}
    </button>
  )
}

function ClassListTable({ classes, onSelect, onEdit }) {
  const sorted = [...classes].sort((a, b) => {
    const ad = a.scheduledDate?.toDate?.() || new Date(0)
    const bd = b.scheduledDate?.toDate?.() || new Date(0)
    return bd - ad
  })
  return (
    <Card>
      <CardBody className="py-2 overflow-x-auto">
        <table className="w-full text-xs font-body">
          <thead className="border-b border-salvaje-cream">
            <tr>
              <th className="text-left px-2 py-2 text-salvaje-gray">Fecha</th>
              <th className="text-left px-2 py-2 text-salvaje-gray">Clase</th>
              <th className="text-left px-2 py-2 text-salvaje-gray">Coach</th>
              <th className="text-left px-2 py-2 text-salvaje-gray">Nivel</th>
              <th className="text-right px-2 py-2 text-salvaje-gray">Aforo</th>
              <th className="text-right px-2 py-2 text-salvaje-gray">Asist.</th>
              <th className="text-left px-2 py-2 text-salvaje-gray">Estado</th>
              <th className="text-center px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const cap = c.maxCapacity || 0
              const booked = c.currentBookings || c.attendeeList?.length || 0
              const checkedIn = (c.attendeeList || []).filter((a) => a.checkedIn).length
              return (
                <tr key={c.id} className="border-b border-salvaje-cream/50 hover:bg-salvaje-light/30">
                  <td className="px-2 py-2 font-mono text-[10px]">{formatDateTime(c.scheduledDate)}</td>
                  <td className="px-2 py-2 font-semibold text-salvaje-dark">
                    <button onClick={() => onSelect(c)} className="hover:underline text-left">{c.name}</button>
                  </td>
                  <td className="px-2 py-2 text-salvaje-dark">{c.coachName}</td>
                  <td className="px-2 py-2 text-salvaje-gray">{c.level || '—'}</td>
                  <td className="text-right px-2 py-2 font-mono">{booked}/{cap}</td>
                  <td className="text-right px-2 py-2 font-mono">{checkedIn}</td>
                  <td className="px-2 py-2"><Badge variant={statusBadge[c.status]}>{statusLabel[c.status]}</Badge></td>
                  <td className="px-2 py-2 text-center">
                    <button onClick={() => onEdit(c)} className="p-1 rounded hover:bg-salvaje-orange/10 text-salvaje-gray hover:text-salvaje-orange" title="Editar"><Pencil size={12} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardBody>
    </Card>
  )
}

function CompletedClassList({ classes, onSelect }) {
  const sorted = [...classes].sort((a, b) => {
    const ad = a.scheduledDate?.toDate?.() || new Date(0)
    const bd = b.scheduledDate?.toDate?.() || new Date(0)
    return bd - ad
  })
  return (
    <div className="space-y-2">
      {sorted.map((c) => {
        const cap = c.maxCapacity || 0
        const booked = c.currentBookings || c.attendeeList?.length || 0
        const checkedIn = (c.attendeeList || []).filter((a) => a.checkedIn).length
        const occupancy = cap ? (booked / cap * 100) : 0
        const showupRate = booked ? (checkedIn / booked * 100) : 0
        return (
          <Card key={c.id}>
            <CardBody className="py-3">
              <button onClick={() => onSelect(c)} className="w-full text-left">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base uppercase text-salvaje-dark">{c.name}</p>
                    <p className="font-mono text-xs text-salvaje-gray">{formatDateTime(c.scheduledDate)} · {c.coachName}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-right">
                      <p className="text-[10px] font-body text-salvaje-gray">Aforo</p>
                      <p className="font-mono text-sm text-salvaje-dark">{booked}/{cap} ({occupancy.toFixed(0)}%)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-body text-salvaje-gray">Check-ins</p>
                      <p className="font-mono text-sm text-salvaje-orange font-semibold">{checkedIn} ({showupRate.toFixed(0)}%)</p>
                    </div>
                  </div>
                </div>
              </button>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}

function ClassDetailDrawer({ cls, open, onClose, onEdit }) {
  if (!cls) return null
  const attendees = cls.attendeeList || []
  const checkedIn = attendees.filter((a) => a.checkedIn)
  const cap = cls.maxCapacity || 1
  const occupancy = (attendees.length / cap) * 100

  return (
    <Modal open={open} onClose={onClose} title={cls.name} size="md">
      <div className="px-5 pb-5 space-y-4 max-h-[75vh] overflow-y-auto">
        <div className="bg-salvaje-light rounded-xl p-3 space-y-1 text-sm font-body">
          <div className="flex items-center gap-2"><Clock size={14} className="text-salvaje-orange" />{formatDateTime(cls.scheduledDate)} → {formatTime(cls.endDate)}</div>
          <div>Coach: <strong>{cls.coachName}</strong></div>
          <div>Estado: <Badge variant={statusBadge[cls.status]}>{statusLabel[cls.status]}</Badge></div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Inscritos" value={`${attendees.length}/${cap}`} />
          <MiniStat label="Check-ins" value={checkedIn.length} />
          <MiniStat label="Ocupación" value={`${occupancy.toFixed(0)}%`} />
        </div>

        {cls.wod && (
          <div className="bg-salvaje-dark rounded-xl p-3">
            <p className="text-[10px] font-mono text-salvaje-orange uppercase mb-1 tracking-widest">WOD</p>
            <pre className="font-mono text-xs text-white whitespace-pre-wrap">{cls.wod}</pre>
          </div>
        )}

        <div>
          <p className="text-xs font-body font-semibold uppercase tracking-widest text-salvaje-orange mb-2">Inscritos ({attendees.length})</p>
          {attendees.length === 0 ? (
            <p className="text-sm font-body text-salvaje-gray text-center py-3">Sin inscritos</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {attendees.map((a) => (
                <div key={a.userId} className="flex items-center justify-between text-sm font-body py-1.5 px-2 rounded-lg hover:bg-salvaje-light/30">
                  <div className="flex items-center gap-2">
                    <Avatar name={a.userName} size="xs" />
                    <span className="text-salvaje-dark">{a.userName}</span>
                  </div>
                  <Badge variant={a.checkedIn ? 'success' : 'default'}>{a.checkedIn ? 'Presente' : 'Reservado'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full" onClick={() => onEdit?.(cls)}>
          <Pencil size={14} /> Editar clase
        </Button>
      </div>
    </Modal>
  )
}

function MiniStat({ label, value }) {
  return (
    <Card>
      <CardBody className="py-2 text-center">
        <p className="text-[9px] font-body text-salvaje-gray uppercase tracking-widest">{label}</p>
        <p className="font-display text-xl text-salvaje-orange leading-tight">{value}</p>
      </CardBody>
    </Card>
  )
}
