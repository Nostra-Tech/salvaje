import { useState, useEffect } from 'react'
import { Star, Plus, Calendar, MapPin, Users, Trash2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { Timestamp } from 'firebase/firestore'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input, Textarea } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { Avatar } from '../../components/ui/Avatar'
import {
  subscribeToAllEvents, createEvent, updateEvent, deleteEvent,
  publishEvent, unpublishEvent,
} from '../../services/events.service'
import { formatDateTime } from '../../utils/formatters'

const emptyForm = {
  title: '', description: '', date: '', endDate: '',
  location: '', capacity: 20, price: 0,
}

function toInputDatetime(ts) {
  if (!ts) return ''
  const d = ts?.toDate?.() || new Date(ts)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function AdminEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    const unsub = subscribeToAllEvents((data) => {
      setEvents(data)
      setLoading(false)
    })
    return unsub
  }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setCreateModal(true)
  }

  const openEdit = (ev) => {
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      date: toInputDatetime(ev.date),
      endDate: toInputDatetime(ev.endDate),
      location: ev.location || '',
      capacity: ev.capacity ?? 20,
      price: ev.price ?? 0,
    })
    setEditModal(ev)
  }

  const handleCreate = async () => {
    if (!form.title.trim() || !form.date) { toast.error('Título y fecha son obligatorios'); return }
    setSaving(true)
    try {
      await createEvent({
        title: form.title.trim(),
        description: form.description.trim(),
        date: Timestamp.fromDate(new Date(form.date)),
        endDate: form.endDate ? Timestamp.fromDate(new Date(form.endDate)) : null,
        location: form.location.trim(),
        capacity: Number(form.capacity),
        price: Number(form.price),
      })
      toast.success('Evento creado')
      setCreateModal(false)
    } catch (e) { toast.error(e.message || 'Error al crear') }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!form.title.trim() || !form.date) { toast.error('Título y fecha son obligatorios'); return }
    setSaving(true)
    try {
      await updateEvent(editModal.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        date: Timestamp.fromDate(new Date(form.date)),
        endDate: form.endDate ? Timestamp.fromDate(new Date(form.endDate)) : null,
        location: form.location.trim(),
        capacity: Number(form.capacity),
        price: Number(form.price),
      })
      toast.success('Evento actualizado')
      setEditModal(null)
    } catch (e) { toast.error(e.message || 'Error al actualizar') }
    setSaving(false)
  }

  const handlePublishToggle = async (ev) => {
    try {
      if (ev.status === 'published') {
        await unpublishEvent(ev.id)
        toast.success('Evento vuelto a borrador')
      } else {
        await publishEvent(ev.id)
        toast.success('Evento publicado — notificaciones enviadas')
      }
      setEditModal(null)
    } catch (e) { toast.error(e.message || 'Error') }
  }

  const handleDelete = async (ev) => {
    if (!window.confirm(`¿Eliminar "${ev.title}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteEvent(ev.id)
      toast.success('Evento eliminado')
      setEditModal(null)
    } catch (e) { toast.error(e.message || 'Error al eliminar') }
  }

  return (
    <AdminShell title="Eventos">
      <div className="px-4 xl:px-6 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Star size={24} className="text-salvaje-orange" />
            <h1 className="font-display text-3xl uppercase text-salvaje-dark">Eventos</h1>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} /> Nuevo Evento
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
        ) : events.length === 0 ? (
          <EmptyState icon={Star} title="Sin eventos" description="Crea el primer evento para la tribu" />
        ) : (
          <div className="space-y-2">
            {events.map((ev) => <EventRow key={ev.id} ev={ev} onEdit={openEdit} />)}
          </div>
        )}
      </div>

      <EventFormModal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Nuevo Evento"
        form={form}
        setForm={setForm}
        onSubmit={handleCreate}
        saving={saving}
      />

      <EventFormModal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title="Editar Evento"
        form={form}
        setForm={setForm}
        onSubmit={handleUpdate}
        saving={saving}
        event={editModal}
        onPublishToggle={() => handlePublishToggle(editModal)}
        onDelete={() => handleDelete(editModal)}
      />
    </AdminShell>
  )
}

function EventRow({ ev, onEdit }) {
  const date = ev.date?.toDate?.() || new Date(ev.date)
  const spots = (ev.capacity || 0) - (ev.registeredCount || 0)
  return (
    <Card>
      <button className="w-full text-left hover:bg-salvaje-light/30 transition-colors rounded-salvaje" onClick={() => onEdit(ev)}>
        <CardBody className="py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-base uppercase text-salvaje-dark">{ev.title}</p>
              <Badge variant={ev.status === 'published' ? 'success' : 'default'}>
                {ev.status === 'published' ? 'Publicado' : 'Borrador'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs font-body text-salvaje-gray mt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><Calendar size={11} />{formatDateTime(date)}</span>
              {ev.location && <span className="flex items-center gap-1"><MapPin size={11} />{ev.location}</span>}
              <span className="flex items-center gap-1"><Users size={11} />{ev.registeredCount || 0}/{ev.capacity || 0} inscritos · {spots} disponibles</span>
            </div>
          </div>
        </CardBody>
      </button>
    </Card>
  )
}

function EventFormModal({ open, onClose, title, form, setForm, onSubmit, saving, event, onPublishToggle, onDelete }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <div className="px-5 pb-5 space-y-3">
        <Input label="Título" value={form.title} onChange={set('title')} placeholder="Nombre del evento" />
        <Textarea label="Descripción" value={form.description} onChange={set('description')} rows={3} placeholder="Descripción del evento..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha inicio" type="datetime-local" value={form.date} onChange={set('date')} />
          <Input label="Fecha fin (opcional)" type="datetime-local" value={form.endDate} onChange={set('endDate')} />
        </div>
        <Input label="Lugar" value={form.location} onChange={set('location')} placeholder="Ubicación o dirección" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Capacidad" type="number" value={form.capacity} onChange={set('capacity')} min={1} />
          <Input label="Precio (0 = gratis)" type="number" value={form.price} onChange={set('price')} min={0} />
        </div>

        <Button onClick={onSubmit} loading={saving} className="w-full">
          {event ? 'Guardar cambios' : 'Crear evento'}
        </Button>

        {event && (
          <>
            <Button
              variant={event.status === 'published' ? 'secondary' : 'primary'}
              onClick={onPublishToggle}
              className="w-full"
            >
              {event.status === 'published' ? (
                <><EyeOff size={14} /> Volver a borrador</>
              ) : (
                <><Eye size={14} /> Publicar y notificar</>
              )}
            </Button>

            {event.registeredList?.length > 0 && (
              <div>
                <p className="font-display text-sm uppercase text-salvaje-dark mb-2">
                  Inscritos ({event.registeredList.length})
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {event.registeredList.map((r) => (
                    <div key={r.userId} className="flex items-center gap-2 bg-salvaje-light rounded-xl px-3 py-2">
                      <Avatar src={r.userPhotoURL} name={r.userName} size="xs" />
                      <p className="font-body text-sm text-salvaje-dark">{r.userName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button variant="danger" onClick={onDelete} className="w-full">
              <Trash2 size={14} /> Eliminar evento
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
