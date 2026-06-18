import { useState, useEffect } from 'react'
import { Shield, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { activateMembershipManually } from '../../services/admin.service'
import { getMembershipCatalog } from '../../services/membership.service'
import { formatCOP } from '../../utils/formatters'
import { filterPlansForUser } from '../../utils/dateHelpers'

const PAYMENT_METHODS = [
  { value: 'cash',      label: 'Efectivo' },
  { value: 'nequi',     label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'transfer',  label: 'Transferencia bancaria' },
  { value: 'admin',     label: 'Cortesía / Manual' },
]

export function AdminActivateMembershipModal({ user, open, onClose, onSaved }) {
  const { user: adminUser, profile } = useAuth()
  const [catalog, setCatalog] = useState([])
  const [form, setForm] = useState({
    membershipId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    discountPercent: 0,
    paymentMethod: 'cash',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) getMembershipCatalog().then(setCatalog)
  }, [open])

  const selectedPlan = catalog.find((c) => c.id === form.membershipId)
  const basePrice = selectedPlan?.priceAsCOP || selectedPlan?.price || 0
  const discountAmount = Math.round(basePrice * (parseInt(form.discountPercent) || 0) / 100)
  const finalPrice = basePrice - discountAmount

  // Auto-calc end date
  useEffect(() => {
    if (!selectedPlan || !form.startDate) return
    const start = new Date(form.startDate)
    const days = selectedPlan.durationDays || selectedPlan.expiryDays || 30
    const end = new Date(start)
    end.setDate(end.getDate() + days)
    setForm((f) => ({ ...f, endDate: end.toISOString().slice(0, 10) }))
  }, [selectedPlan, form.startDate])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleActivate = async () => {
    if (!selectedPlan) {
      toast.error('Selecciona un plan')
      return
    }
    setSaving(true)
    try {
      await activateMembershipManually({
        userId: user.id,
        userEmail: user.email,
        userName: user.displayName,
        membershipId: selectedPlan.id,
        membershipType: selectedPlan.type === 'monthly' ? 'monthly'
                       : selectedPlan.type === 'ticketera' ? 'ticketera'
                       : 'free_trial',
        catalogName: selectedPlan.name,
        amountPaid: finalPrice,
        startDate: new Date(form.startDate + 'T00:00:00'),
        endDate: form.endDate ? new Date(form.endDate + 'T00:00:00') : null,
        paymentMethod: form.paymentMethod,
        ticketeraTotal: selectedPlan.type === 'ticketera' ? (selectedPlan.classesTotal || selectedPlan.classesIncluded || 10) : 0,
        notes: form.notes,
        adminUid: adminUser.uid,
        adminName: profile?.displayName || 'Admin',
      })
      toast.success('Membresía activada y pago registrado')
      onSaved?.()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Error al activar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <Modal open={open} onClose={onClose} title={`Activar membresía: ${user.displayName}`} size="md">
      <div className="px-5 pb-5 space-y-4 max-h-[75vh] overflow-y-auto">
        <div className="bg-salvaje-orange/5 border border-salvaje-orange/20 rounded-xl p-3 flex gap-2">
          <Shield size={16} className="text-salvaje-orange flex-shrink-0 mt-0.5" />
          <p className="text-xs font-body text-salvaje-dark">
            Esto activará la membresía inmediatamente y registrará el pago como confirmado en el flujo de caja.
          </p>
        </div>

        <SelectField
          label="Plan *"
          value={form.membershipId}
          onChange={set('membershipId')}
          options={[
            { value: '', label: 'Selecciona...' },
            ...filterPlansForUser(catalog, user)
              .map((c) => ({ value: c.id, label: `${c.name} — ${formatCOP(c.priceAsCOP || c.price || 0)}` })),
          ]}
        />

        {selectedPlan && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Fecha inicio *" type="date" value={form.startDate} onChange={set('startDate')} />
              <Input label="Fecha fin" type="date" value={form.endDate} onChange={set('endDate')} />
            </div>

            <Input
              label="% descuento (opcional)"
              type="number"
              min="0"
              max="100"
              value={form.discountPercent}
              onChange={set('discountPercent')}
            />

            <SelectField label="Método de pago" value={form.paymentMethod} onChange={set('paymentMethod')} options={PAYMENT_METHODS} />

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">Notas (opcional)</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={2}
                placeholder="Ej: cortesía por inauguración, pago parcial, etc."
                className="px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange resize-none"
              />
            </div>

            <div className="bg-salvaje-light rounded-xl p-3 space-y-1">
              <Row label="Precio base"     value={formatCOP(basePrice)} />
              {discountAmount > 0 && <Row label={`Descuento (${form.discountPercent}%)`} value={`- ${formatCOP(discountAmount)}`} highlight />}
              <div className="border-t border-salvaje-cream pt-2 mt-2">
                <Row label="Total a registrar" value={formatCOP(finalPrice)} bold />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2 border-t border-salvaje-cream">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            <X size={16} /> Cancelar
          </Button>
          <Button className="flex-1" loading={saving} onClick={handleActivate} disabled={!selectedPlan}>
            <Save size={16} /> Activar membresía
          </Button>
        </div>
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

function Row({ label, value, bold, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm font-body">
      <span className={highlight ? 'text-salvaje-success' : 'text-salvaje-gray'}>{label}</span>
      <span className={`${bold ? 'font-display text-lg text-salvaje-orange' : 'font-mono text-salvaje-dark'} ${highlight ? 'text-salvaje-success' : ''}`}>
        {value}
      </span>
    </div>
  )
}
