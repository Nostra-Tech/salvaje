import { useEffect, useState } from 'react'
import { Tag, Plus, Trash2, Save, Power, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import {
  listDiscountCodes, upsertDiscountCode, setDiscountCodeActive, deleteDiscountCode,
} from '../../services/discount-codes.service'
import { formatCOP } from '../../utils/formatters'

const emptyForm = {
  code: '', type: 'fixed', value: 0, maxUses: '', assignedToUserId: '',
  validFrom: '', validUntil: '', isActive: true, notes: '',
}

function toDateInput(d) {
  if (!d) return ''
  const date = d?.toDate ? d.toDate() : new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function AdminDiscountCodes() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | code object
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try { setItems(await listDiscountCodes()) }
    catch (e) { console.error(e); toast.error('No pudimos cargar los códigos') }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])

  const startNew = () => {
    setForm(emptyForm)
    setEditing('new')
  }

  const startEdit = (c) => {
    setForm({
      code: c.id,
      type: c.type || 'fixed',
      value: c.value || 0,
      maxUses: c.maxUses ?? '',
      assignedToUserId: c.assignedToUserId || '',
      validFrom: toDateInput(c.validFrom),
      validUntil: toDateInput(c.validUntil),
      isActive: c.isActive !== false,
      notes: c.notes || '',
    })
    setEditing(c)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await upsertDiscountCode(form.code, {
        type: form.type,
        value: Number(form.value),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        assignedToUserId: form.assignedToUserId?.trim() || null,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
        isActive: form.isActive,
        notes: form.notes,
      }, user.uid)
      toast.success('Código guardado')
      setEditing(null)
      await refresh()
    } catch (e) {
      toast.error(e.message || 'No pudimos guardar')
    } finally { setSaving(false) }
  }

  const handleToggle = async (c) => {
    try {
      await setDiscountCodeActive(c.id, !c.isActive)
      toast.success(c.isActive ? 'Código desactivado' : 'Código activado')
      await refresh()
    } catch (e) { toast.error('Error al cambiar estado') }
  }

  const handleDelete = async (c) => {
    if (!confirm(`¿Eliminar el código "${c.id}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteDiscountCode(c.id)
      toast.success('Código eliminado')
      await refresh()
    } catch (e) { toast.error('Error al eliminar') }
  }

  return (
    <AdminShell title="Códigos de descuento">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Tag size={28} className="text-salvaje-orange" />
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Códigos de descuento</h1>
          </div>
          <Button size="sm" onClick={startNew}>
            <Plus size={14} /> Nuevo código
          </Button>
        </div>

        <p className="font-body text-sm text-salvaje-gray">
          Crea promos puntuales (% o monto fijo). El usuario las aplica al pagar una membresía. Limita por usos máximos, vigencia o asignación a un usuario específico.
        </p>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <Card>
            <CardBody className="py-10 text-center">
              <Tag size={32} className="text-salvaje-cream mx-auto mb-2" />
              <p className="font-display text-lg uppercase text-salvaje-dark">Aún no hay códigos</p>
              <p className="font-body text-sm text-salvaje-gray mt-1 mb-4">Crea el primero para empezar a dar promos.</p>
              <Button size="sm" onClick={startNew}><Plus size={14} /> Crear código</Button>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <Card key={c.id}>
                <CardBody className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-base font-bold text-salvaje-dark uppercase">{c.id}</p>
                      <Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? 'Activo' : 'Inactivo'}</Badge>
                      <span className="text-xs font-mono text-salvaje-gray">
                        {c.type === 'fixed' ? `-${formatCOP(c.value)}` : `-${c.value}%`}
                      </span>
                    </div>
                    <p className="text-xs font-body text-salvaje-gray mt-0.5">
                      Usos: {c.usedCount || 0}{c.maxUses ? ` / ${c.maxUses}` : ' · ilimitados'}
                      {c.validUntil && <> · vence {toDateInput(c.validUntil)}</>}
                      {c.assignedToUserId && <> · solo para 1 usuario</>}
                    </p>
                    {c.notes && <p className="font-body text-xs text-salvaje-dark mt-1 italic">{c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleToggle(c)} className="p-2 rounded-lg text-salvaje-gray hover:text-salvaje-orange hover:bg-salvaje-orange/10" title={c.isActive ? 'Desactivar' : 'Activar'}>
                      <Power size={14} />
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>Editar</Button>
                    <button onClick={() => handleDelete(c)} className="p-2 rounded-lg text-salvaje-gray hover:text-salvaje-danger hover:bg-salvaje-danger/10" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nuevo código' : `Editar ${editing?.id || ''}`} size="md">
        <div className="px-5 pb-5 space-y-3">
          <Input
            label="Código (mayúsculas, sin espacios)"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="SALV20"
            disabled={editing !== 'new'}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="fixed">Monto fijo (COP)</option>
              <option value="percentage">Porcentaje (%)</option>
            </Select>
            <Input
              label={form.type === 'fixed' ? 'Monto en COP' : 'Porcentaje (1-100)'}
              type="number"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vigente desde" type="date" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} />
            <Input label="Vence el (opcional)" type="date" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Usos máximos (vacío = ilimitado)" type="number" value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))} />
            <Input label="UID asignado (opcional)" value={form.assignedToUserId} onChange={(e) => setForm((f) => ({ ...f, assignedToUserId: e.target.value }))} placeholder="Solo para 1 usuario" />
          </div>
          <Input label="Notas internas" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Promo de septiembre, etc." />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="accent-salvaje-orange" />
            <span className="text-sm font-body text-salvaje-dark">Código activo</span>
          </label>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}><Save size={14} /> Guardar</Button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  )
}
