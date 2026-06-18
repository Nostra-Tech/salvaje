import { useState, useEffect } from 'react'
import { Save, X, AlertTriangle, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'

const TYPE_OPTIONS = [
  { value: 'monthly',     label: 'Mensual ilimitado' },
  { value: 'ticketera',   label: 'Ticketera (paquete de clases)' },
  { value: 'free_trial',  label: 'Cortesía (clase gratis)' },
]

export function AdminMembershipModal({ plan, open, onClose, onSaved, mode = 'edit' }) {
  const isCreate = mode === 'create'
  const [form, setForm] = useState({})
  const [features, setFeatures] = useState([])
  const [newFeature, setNewFeature] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmingMassChange, setConfirmingMassChange] = useState(false)
  const [applyToActives, setApplyToActives] = useState(true)

  useEffect(() => {
    if (!open) return
    if (isCreate) {
      setForm({
        id: '',
        name: '',
        description: '',
        type: 'monthly',
        price: 0,
        originalPrice: 0,
        classesIncluded: -1,
        durationDays: 30,
        isActive: true,
        isHighlighted: false,
        sortOrder: 99,
      })
      setFeatures([])
    } else if (plan) {
      setForm({
        id: plan.id,
        name: plan.name || '',
        description: plan.description || '',
        type: plan.type || 'monthly',
        price: plan.price || plan.priceAsCOP || 0,
        originalPrice: plan.originalPrice || 0,
        classesIncluded: plan.classesTotal || plan.classesIncluded || -1,
        durationDays: plan.durationDays || plan.expiryDays || 30,
        isActive: plan.isActive !== false,
        isHighlighted: !!plan.isHighlighted,
        sortOrder: plan.sortOrder || 99,
      })
      setFeatures(plan.features || [])
    }
  }, [open, plan, isCreate])

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [field]: value }))
  }

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()])
      setNewFeature('')
    }
  }

  const removeFeature = (i) => {
    setFeatures(features.filter((_, idx) => idx !== i))
  }

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('El nombre es obligatorio'); return }
    if (isCreate && !form.id?.trim()) { toast.error('El ID es obligatorio'); return }

    const priceChanged = !isCreate && plan && plan.price !== parseInt(form.price)
    if (priceChanged && applyToActives && !confirmingMassChange) {
      setConfirmingMassChange(true)
      return
    }

    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        price: parseInt(form.price) || 0,
        originalPrice: parseInt(form.originalPrice) || 0,
        priceAsCOP: parseInt(form.price) || 0,
        classesTotal: form.type === 'ticketera' ? parseInt(form.classesIncluded) : null,
        classesIncluded: parseInt(form.classesIncluded),
        durationDays: parseInt(form.durationDays) || 30,
        expiryDays: parseInt(form.durationDays) || 30,
        features: features,
        isActive: form.isActive,
        isHighlighted: form.isHighlighted,
        sortOrder: parseInt(form.sortOrder) || 99,
        updatedAt: serverTimestamp(),
        applyToExistingOnRenewal: applyToActives,
      }

      if (isCreate) {
        await setDoc(doc(db, 'memberships_catalog', form.id.trim()), {
          ...data,
          createdAt: serverTimestamp(),
        })
        toast.success('Membresía creada')
      } else {
        await setDoc(doc(db, 'memberships_catalog', plan.id), data, { merge: true })
        toast.success('Membresía actualizada' + (priceChanged ? ' (aplica al renovar)' : ''))
      }
      onSaved?.()
      onClose()
      setConfirmingMassChange(false)
    } catch (e) {
      console.error(e)
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={isCreate ? 'Nueva Membresía' : `Editar: ${plan?.name}`} size="md">
      <div className="px-5 pb-5 space-y-4 max-h-[75vh] overflow-y-auto">
        {confirmingMassChange ? (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 bg-salvaje-orange/10 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={28} className="text-salvaje-orange" />
            </div>
            <h3 className="font-display text-xl uppercase text-center text-salvaje-dark">Cambio de precio</h3>
            <p className="text-sm font-body text-salvaje-gray text-center">
              Cambiarás el precio de <strong>{plan.name}</strong>.
              <br /><br />
              Por defecto: aplica solo a <strong>nuevas compras</strong> y <strong>renovaciones</strong>.
              Las membresías activas mantienen su precio hasta vencer.
            </p>
            <label className="flex items-start gap-2 cursor-pointer p-3 rounded-xl bg-salvaje-light/50 border border-salvaje-cream">
              <input
                type="checkbox"
                checked={applyToActives}
                onChange={(e) => setApplyToActives(e.target.checked)}
                className="w-4 h-4 rounded accent-salvaje-orange mt-0.5"
              />
              <span className="font-body text-xs text-salvaje-dark">
                Aplicar nuevo precio en próxima renovación de las activas (recomendado)
              </span>
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmingMassChange(false)}>Cancelar</Button>
              <Button className="flex-1" loading={saving} onClick={handleSave}>Confirmar</Button>
            </div>
          </div>
        ) : (
          <>
            {isCreate && (
              <Input label="ID único * (slug)" value={form.id} onChange={set('id')} placeholder="monthly_premium" />
            )}
            <Input label="Nombre *" value={form.name} onChange={set('name')} />
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">Descripción</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={2}
                className="px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange resize-none"
              />
            </div>

            <SelectField label="Tipo *" value={form.type} onChange={set('type')} options={TYPE_OPTIONS} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Precio (COP) *" type="number" value={form.price} onChange={set('price')} />
              <Input label="Precio original tachado" type="number" value={form.originalPrice} onChange={set('originalPrice')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={form.type === 'ticketera' ? '# de clases' : '# de clases (-1 = ilimitado)'}
                type="number"
                value={form.classesIncluded}
                onChange={set('classesIncluded')}
              />
              <Input label="Duración (días)" type="number" value={form.durationDays} onChange={set('durationDays')} />
            </div>

            {/* Features */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body mb-2">Beneficios</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {features.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-salvaje-light text-xs font-body text-salvaje-dark">
                    {f}
                    <button onClick={() => removeFeature(i)} className="hover:text-salvaje-danger">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  placeholder="Ej: Acceso ilimitado"
                  className="flex-1 px-3 py-2 rounded-xl border border-salvaje-cream bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
                />
                <Button size="sm" onClick={addFeature}>+ Agregar</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Orden de display" type="number" value={form.sortOrder} onChange={set('sortOrder')} />
              <div className="flex flex-col gap-1.5">
                <CheckboxField label="Plan activo (visible para usuarios)" checked={form.isActive} onChange={set('isActive')} />
                <CheckboxField label={<span className="flex items-center gap-1"><Star size={12} className="text-salvaje-orange" />Destacar como recomendado</span>} checked={form.isHighlighted} onChange={set('isHighlighted')} />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-salvaje-cream sticky bottom-0 bg-white -mx-5 px-5 pb-1 pt-3">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                <X size={16} /> Cancelar
              </Button>
              <Button className="flex-1" loading={saving} onClick={handleSave}>
                <Save size={16} /> {isCreate ? 'Crear' : 'Guardar'}
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

function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-salvaje-light/50">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded accent-salvaje-orange" />
      <span className="font-body text-sm text-salvaje-dark">{label}</span>
    </label>
  )
}
