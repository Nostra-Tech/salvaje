import { useState, useEffect } from 'react'
import { Save, X, Calendar, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Timestamp } from 'firebase/firestore'
import { updateClass, cancelClass } from '../../services/classes.service'
import { getAllCoaches } from '../../services/coaches.service'
import { notifyClassChange } from '../../services/notifications.service'
import { useAuth } from '../../hooks/useAuth'

const STATUS_OPTIONS = [
  { value: 'scheduled',   label: 'Programada' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed',   label: 'Completada' },
  { value: 'cancelled',   label: 'Cancelada' },
]

const LEVEL_OPTIONS = [
  { value: 'all',          label: 'Todos los niveles' },
  { value: 'beginner',     label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced',     label: 'Avanzado' },
]

function toLocalISO(d) {
  if (!d) return ''
  const date = d.toDate ? d.toDate() : new Date(d)
  if (isNaN(date.getTime())) return ''
  const off = date.getTimezoneOffset()
  const local = new Date(date.getTime() - off * 60000)
  return local.toISOString().slice(0, 16)
}

export function AdminEditClassModal({ cls, open, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({})
  const [coaches, setCoaches] = useState([])
  const [saving, setSaving] = useState(false)
  const [confirmNotif, setConfirmNotif] = useState(null) // {changes, action}
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    if (open) getAllCoaches().then(setCoaches)
  }, [open])

  useEffect(() => {
    if (!cls) return
    setForm({
      name: cls.name || '',
      coachId: cls.coachId || '',
      scheduledDate: toLocalISO(cls.scheduledDate),
      endDate: toLocalISO(cls.endDate),
      maxCapacity: cls.maxCapacity || 15,
      level: cls.level || 'all',
      wod: cls.wod || '',
      status: cls.status || 'scheduled',
    })
    setCancelReason(cls.cancellationReason || '')
  }, [cls])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const detectChanges = () => {
    const changes = []
    if (toLocalISO(cls.scheduledDate) !== form.scheduledDate || toLocalISO(cls.endDate) !== form.endDate) {
      changes.push({ type: 'SCHEDULE_CHANGED', label: 'Horario' })
    }
    if (cls.coachId !== form.coachId) {
      changes.push({ type: 'COACH_CHANGED', label: 'Coach asignado' })
    }
    if (form.status === 'cancelled' && cls.status !== 'cancelled') {
      changes.push({ type: 'CLASS_CANCELLED', label: 'Cancelación' })
    }
    return changes
  }

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!form.coachId) { toast.error('Selecciona un coach'); return }

    const changes = detectChanges()
    const inscritos = cls.attendeeList?.length || 0

    if (changes.length > 0 && inscritos > 0 && !confirmNotif) {
      setConfirmNotif({ changes, inscritos })
      return
    }

    setSaving(true)
    try {
      const newCoach = coaches.find((c) => c.id === form.coachId)
      const startD = new Date(form.scheduledDate)
      const endD = new Date(form.endDate)
      const durationMin = Math.max(15, Math.round((endD - startD) / 60000))

      const updates = {
        name: form.name.trim(),
        coachId: form.coachId,
        coachName: newCoach?.displayName || cls.coachName,
        coachPhotoURL: newCoach?.profilePhotoURL || '',
        scheduledDate: Timestamp.fromDate(startD),
        endDate: Timestamp.fromDate(endD),
        durationMinutes: durationMin,
        maxCapacity: parseInt(form.maxCapacity),
        level: form.level,
        wod: form.wod.trim(),
        status: form.status,
      }
      if (form.status === 'cancelled') {
        updates.cancellationReason = cancelReason || 'Cancelada por admin'
      }

      await updateClass(cls.id, updates)

      // Trigger notifications
      for (const change of changes) {
        await notifyClassChange(cls.id, change.type, user.uid, {
          oldCoachId: cls.coachId,
          newCoachId: form.coachId,
          newCoachName: newCoach?.displayName,
          newScheduledDate: startD,
        }).catch(console.error)
      }

      toast.success('Clase actualizada' + (changes.length ? ' + notificaciones enviadas' : ''))
      onSaved?.()
      onClose()
      setConfirmNotif(null)
    } catch (e) {
      console.error(e)
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!cls) return null

  return (
    <Modal open={open} onClose={onClose} title={`Editar: ${cls.name}`} size="md">
      <div className="px-5 pb-5 space-y-4 max-h-[75vh] overflow-y-auto">
        {confirmNotif ? (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 bg-salvaje-orange/10 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={28} className="text-salvaje-orange" />
            </div>
            <h3 className="font-display text-xl uppercase text-center text-salvaje-dark">Confirmar cambio</h3>
            <p className="text-sm font-body text-salvaje-gray text-center">
              Esta clase tiene <strong>{confirmNotif.inscritos} inscritos</strong>.
              Al guardar, se enviará una notificación a:
            </p>
            <ul className="bg-salvaje-light rounded-xl p-3 text-sm font-body text-salvaje-dark space-y-1">
              <li>• {confirmNotif.inscritos} usuarios inscritos</li>
              <li>• 1 coach asignado</li>
              {confirmNotif.changes.find((c) => c.type === 'COACH_CHANGED') && (
                <li>• Coach original (si cambió)</li>
              )}
            </ul>
            <p className="text-xs font-body text-salvaje-gray text-center">
              Cambios: {confirmNotif.changes.map((c) => c.label).join(', ')}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmNotif(null)}>Cancelar</Button>
              <Button className="flex-1" loading={saving} onClick={handleSave}>Guardar y notificar</Button>
            </div>
          </div>
        ) : (
          <>
            {cls.weeklyPlanId && (
              <div className="bg-salvaje-orange/5 border border-salvaje-orange/20 rounded-xl p-2 flex items-center gap-2">
                <Calendar size={14} className="text-salvaje-orange" />
                <p className="text-xs font-body text-salvaje-dark">
                  Esta clase fue generada desde el <strong>plan semanal del coach</strong>.
                </p>
              </div>
            )}
            <Input label="Nombre *" value={form.name} onChange={set('name')} />

            <SelectField
              label="Coach *"
              value={form.coachId}
              onChange={set('coachId')}
              options={[{ value: '', label: 'Selecciona...' }, ...coaches.filter(c=>c.isActive!==false).map((c) => ({ value: c.id, label: c.displayName }))]}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Inicio *" type="datetime-local" value={form.scheduledDate} onChange={set('scheduledDate')} />
              <Input label="Fin *" type="datetime-local" value={form.endDate} onChange={set('endDate')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Capacidad máx" type="number" value={form.maxCapacity} onChange={set('maxCapacity')} />
              <SelectField label="Nivel" value={form.level} onChange={set('level')} options={LEVEL_OPTIONS} />
            </div>

            <SelectField label="Estado" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">WOD</label>
              <textarea
                value={form.wod}
                onChange={set('wod')}
                rows={4}
                placeholder="Workout of the day"
                className="px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange resize-none font-mono"
              />
            </div>

            {form.status === 'cancelled' && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">Motivo cancelación</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  placeholder="Motivo..."
                  className="px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-danger/30 focus:border-salvaje-danger resize-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-salvaje-cream sticky bottom-0 bg-white -mx-5 px-5 pb-1 pt-3">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                <X size={16} /> Cancelar
              </Button>
              <Button className="flex-1" loading={saving} onClick={handleSave}>
                <Save size={16} /> Guardar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
