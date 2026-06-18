import { useEffect, useState } from 'react'
import { Clock, Save, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { getServiceHours, saveServiceHours } from '../../services/service-hours.service'
import { logAdminActivity } from '../../services/activity-log.service'

const DAY_LABELS = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
}
const ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function pad2(n) { return String(n).padStart(2, '0') }

function SlotRow({ slot, onRemove }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2.5 bg-salvaje-light rounded-xl">
      <span className="font-mono text-sm text-salvaje-dark flex-1">
        {slot.start} <span className="text-salvaje-gray">–</span> {slot.end}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded-lg text-salvaje-danger/60 hover:text-salvaje-danger hover:bg-salvaje-danger/10 transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function AddSlotForm({ onAdd }) {
  const [start, setStart] = useState('06:00')
  const [end, setEnd] = useState('07:00')

  const handleAdd = () => {
    if (!start || !end) { toast.error('Completa las horas'); return }
    if (end <= start) { toast.error('La hora de fin debe ser después de la de inicio'); return }
    onAdd({ start, end })
    // Auto-advance: next slot starts where this one ends
    setStart(end)
    const [h, m] = end.split(':').map(Number)
    const nextH = h + 1
    if (nextH <= 23) setEnd(`${pad2(nextH)}:${pad2(m)}`)
  }

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <label className="font-mono text-[10px] text-salvaje-gray uppercase">Inicio</label>
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="w-28 px-2 py-1.5 rounded-lg border border-salvaje-cream font-mono text-sm"
        />
      </div>
      <span className="text-salvaje-gray font-mono">–</span>
      <div className="flex items-center gap-1.5">
        <label className="font-mono text-[10px] text-salvaje-gray uppercase">Fin</label>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="w-28 px-2 py-1.5 rounded-lg border border-salvaje-cream font-mono text-sm"
        />
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-salvaje-orange/10 text-salvaje-orange hover:bg-salvaje-orange/20 transition-colors font-body text-xs font-semibold"
      >
        <Plus size={13} /> Agregar
      </button>
    </div>
  )
}

export function ConfigServiceHours() {
  const { user } = useAuth()
  const [hours, setHours] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getServiceHours().then(setHours).catch(() => toast.error('No pudimos cargar los horarios'))
  }, [])

  const updateDay = (day, patch) =>
    setHours((h) => ({ ...h, [day]: { ...h[day], ...patch } }))

  const addSlot = (day, slot) => {
    const existing = hours[day].slots || []
    if (existing.some((s) => s.start === slot.start)) {
      toast.error('Ya existe una franja con ese horario de inicio')
      return
    }
    const sorted = [...existing, slot].sort((a, b) => a.start.localeCompare(b.start))
    updateDay(day, { slots: sorted })
  }

  const removeSlot = (day, idx) => {
    const updated = (hours[day].slots || []).filter((_, i) => i !== idx)
    updateDay(day, { slots: updated })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const before = await getServiceHours()
      await saveServiceHours(hours, user.uid)
      await logAdminActivity({
        actorId: user.uid,
        actorName: user.displayName || user.email,
        actorRole: 'superadmin',
        action: 'update_service_hours',
        entity: 'config',
        entityId: 'serviceHours',
        before, after: hours,
      }).catch(() => {})
      toast.success('Horarios actualizados')
    } catch (e) { toast.error('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  if (!hours) {
    return (
      <AdminShell title="Horarios de servicio">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Horarios de servicio">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <Clock size={28} className="text-salvaje-orange" />
          <div>
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Horarios</h1>
            <p className="font-body text-xs text-salvaje-gray">
              Define los días y franjas horarias disponibles. Los coaches solo pueden crear clases en estas franjas.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {ORDER.map((day) => {
            const cfg = hours[day]
            const slots = cfg.slots || []
            return (
              <Card key={day}>
                <CardBody className="py-3 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cfg.active}
                        onChange={(e) => updateDay(day, { active: e.target.checked })}
                        className="accent-salvaje-orange w-4 h-4"
                      />
                      <span className="font-display text-base uppercase text-salvaje-dark">
                        {DAY_LABELS[day]}
                      </span>
                    </label>
                    {!cfg.active && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">
                        Sin servicio
                      </span>
                    )}
                    {cfg.active && slots.length > 0 && (
                      <span className="font-mono text-[10px] text-salvaje-gray">
                        {slots.length} franja{slots.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  {cfg.active && (
                    <>
                      {/* Slots list */}
                      {slots.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {slots.map((slot, idx) => (
                            <SlotRow
                              key={slot.start}
                              slot={slot}
                              onRemove={() => removeSlot(day, idx)}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="font-body text-xs text-salvaje-gray italic">
                          Sin franjas — agrega al menos una para que los coaches puedan crear clases este día.
                        </p>
                      )}

                      {/* Add slot form */}
                      <AddSlotForm onAdd={(slot) => addSlot(day, slot)} />
                    </>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>

        <Button className="w-full" size="lg" loading={saving} onClick={handleSave}>
          <Save size={16} /> Guardar horarios
        </Button>
      </div>
    </AdminShell>
  )
}
