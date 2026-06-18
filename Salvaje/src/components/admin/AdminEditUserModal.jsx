import { useState, useEffect } from 'react'
import { Save, UserX, UserCheck, X, Info, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { updateUser, blockUser, unblockUser, getUserById } from '../../services/users.service'
import { getMembershipCatalog } from '../../services/membership.service'
import { getLinkedMembers } from '../../services/linked-members.service'
import { filterPlansForUser } from '../../utils/dateHelpers'
import { Timestamp } from 'firebase/firestore'

const MEMBERSHIP_OPTIONS = [
  { value: 'none', label: 'Sin plan' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'ticketera', label: 'Ticketera' },
  { value: 'free_trial', label: 'Cortesía (Free trial)' },
]

const GENDER_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
]

function toDateInput(d) {
  if (!d) return ''
  const date = d.toDate ? d.toDate() : new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function fromDateInput(s) {
  if (!s) return null
  return Timestamp.fromDate(new Date(s + 'T00:00:00'))
}

export function AdminEditUserModal({ user, open, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [catalog, setCatalog] = useState([])

  useEffect(() => {
    if (!open) return
    getMembershipCatalog().then(setCatalog).catch(() => setCatalog([]))
  }, [open])

  // Pull the linked-members context for this user: members underneath them
  // and/or the titular they link up to.
  const [linkedMembers, setLinkedMembers] = useState([])
  const [titularInfo, setTitularInfo] = useState(null)
  useEffect(() => {
    if (!open || !user?.id) {
      setLinkedMembers([])
      setTitularInfo(null)
      return
    }
    if (user.linkedTo) {
      getUserById(user.linkedTo).then(setTitularInfo).catch(() => setTitularInfo(null))
      setLinkedMembers([])
    } else {
      getLinkedMembers(user.id).then(setLinkedMembers).catch(() => setLinkedMembers([]))
      setTitularInfo(null)
    }
  }, [open, user?.id, user?.linkedTo])

  useEffect(() => {
    if (!user) return
    setForm({
      displayName: user.displayName || '',
      phone: user.phone || '',
      dateOfBirth: toDateInput(user.birthDate || user.dateOfBirth),
      gender: user.gender || '',
      colegioMonteluna: !!user.colegioMonteluna,
      emergencyContact: user.emergencyContact || '',
      emergencyPhone: user.emergencyPhone || '',
      // Membresía
      membershipId: user.activeMembershipPurchaseId ? '' : '', // catalog-id picker is independent
      membershipType: user.membershipType || 'none',
      membershipStartDate: toDateInput(user.membershipStartDate),
      membershipEndDate: toDateInput(user.membershipEndDate),
      membershipIsActive: !!user.membershipIsActive,
      // Ticketera
      ticketeraBalance: user.ticketeraBalance ?? 0,
      // Stats
      classesAttended: user.classesAttended ?? 0,
      currentStreak: user.currentStreak ?? 0,
      // Referidos
      referralDiscountActive: !!user.referralDiscountActive,
      referralDiscountPercent: user.referralDiscountPercent ?? 0,
      // Estado
      isActive: user.isActive !== false,
      isBlocked: !!user.isBlocked,
      // V5 Ajuste 12: special plans enabled for this user
      specialPlans: Array.isArray(user.specialPlans) ? user.specialPlans : [],
    })
    setBlockReason(user.blockReason || '')
  }, [user])

  // When admin picks a plan from the catalog, mirror what AdminCreateUserModal
  // does: prefill type, dates, ticketera balance based on the selected plan.
  const handlePickPlan = (planId) => {
    setForm((f) => ({ ...f, membershipId: planId }))
    if (!planId) return
    const plan = catalog.find((c) => c.id === planId)
    if (!plan) return
    const today = new Date().toISOString().slice(0, 10)
    const start = form.membershipStartDate || today
    const startDateObj = new Date(start + 'T00:00:00')
    const days = plan.durationDays || plan.expiryDays || 30
    const end = new Date(startDateObj.getTime() + days * 86400000)
    setForm((f) => ({
      ...f,
      membershipId: planId,
      membershipType: plan.type === 'monthly' ? 'monthly'
                    : plan.type === 'ticketera' ? 'ticketera'
                    : 'free_trial',
      membershipStartDate: start,
      membershipEndDate: end.toISOString().slice(0, 10),
      membershipIsActive: plan.type !== 'ticketera', // ticketera uses ticketeraBalance instead
      ticketeraBalance: plan.type === 'ticketera'
        ? (plan.classesTotal || plan.classesIncluded || 12)
        : f.ticketeraBalance,
    }))
  }

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.displayName?.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      await updateUser(user.id, {
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: fromDateInput(form.dateOfBirth),
        birthDate: fromDateInput(form.dateOfBirth),
        gender: form.gender,
        colegioMonteluna: !!form.colegioMonteluna,
        emergencyContact: form.emergencyContact.trim(),
        emergencyPhone: form.emergencyPhone.trim(),
        membershipType: form.membershipType,
        membershipStartDate: fromDateInput(form.membershipStartDate),
        membershipEndDate: fromDateInput(form.membershipEndDate),
        membershipIsActive: form.membershipIsActive,
        ticketeraBalance: parseInt(form.ticketeraBalance) || 0,
        classesAttended: parseInt(form.classesAttended) || 0,
        currentStreak: parseInt(form.currentStreak) || 0,
        referralDiscountActive: form.referralDiscountActive,
        referralDiscountPercent: parseInt(form.referralDiscountPercent) || 0,
        isActive: form.isActive,
        specialPlans: Array.isArray(form.specialPlans) ? form.specialPlans : [],
      })
      toast.success('Usuario actualizado')
      onSaved?.()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Error al guardar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const [blockType, setBlockType] = useState('non_payment')

  const handleToggleBlock = async () => {
    setBlocking(true)
    try {
      if (user.isBlocked) {
        await unblockUser(user.id)
        toast.success('Usuario desbloqueado')
      } else {
        if (!blockReason.trim()) { toast.error('Indica el motivo del bloqueo'); setBlocking(false); return }
        await blockUser(user.id, blockReason.trim(), blockType)
        toast.success('Usuario bloqueado')
      }
      onSaved?.()
      onClose()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setBlocking(false)
    }
  }

  if (!user) return null

  return (
    <Modal open={open} onClose={onClose} title={`Editar: ${user.displayName || user.email}`} size="lg">
      <div className="px-5 pb-5 space-y-5 max-h-[75vh] overflow-y-auto">
        {/* Personal */}
        <Section title="Información personal">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Nombre completo *" value={form.displayName} onChange={set('displayName')} />
            <Input label="Teléfono" value={form.phone} onChange={set('phone')} placeholder="3001234567" />
            <Input label="Fecha de nacimiento" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            <SelectField label="Género" value={form.gender} onChange={set('gender')} options={GENDER_OPTIONS} />
            <Input label="Contacto de emergencia" value={form.emergencyContact} onChange={set('emergencyContact')} />
            <Input label="Teléfono de emergencia" value={form.emergencyPhone} onChange={set('emergencyPhone')} />
          </div>
          <CheckboxField
            label="¿Tiene hijos en el Colegio Monteluna? (habilita tarifas Papás / Papás e Hijos)"
            checked={form.colegioMonteluna}
            onChange={set('colegioMonteluna')}
          />
          <ReadOnlyField label="Email (no editable)" value={user.email} />
        </Section>

        {/* Membresía — mismas opciones que el modal de crear usuario */}
        <Section title="Membresía">
          <div className="bg-salvaje-orange/5 border border-salvaje-orange/20 rounded-xl p-3 flex gap-2 mb-2">
            <Info size={14} className="text-salvaje-orange flex-shrink-0 mt-0.5" />
            <p className="text-xs font-body text-salvaje-dark">
              Elige un plan del catálogo (se autocompletan tipo, fechas y saldo) o ajusta los campos manualmente abajo.
            </p>
          </div>
          <SelectField
            label="Plan del catálogo"
            value={form.membershipId}
            onChange={(e) => handlePickPlan(e.target.value)}
            options={[
              { value: '', label: 'Sin cambio · usar campos manuales' },
              ...filterPlansForUser(catalog, { dateOfBirth: form.dateOfBirth, colegioMonteluna: form.colegioMonteluna })
                .map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <SelectField label="Tipo" value={form.membershipType} onChange={set('membershipType')} options={MEMBERSHIP_OPTIONS} />
            <CheckboxField label="Membresía activa" checked={form.membershipIsActive} onChange={set('membershipIsActive')} />
            <Input label="Fecha inicio" type="date" value={form.membershipStartDate} onChange={set('membershipStartDate')} />
            <Input label="Fecha fin" type="date" value={form.membershipEndDate} onChange={set('membershipEndDate')} />
            <Input label="Saldo ticketera (clases)" type="number" value={form.ticketeraBalance} onChange={set('ticketeraBalance')} />
          </div>
        </Section>

        {/* Linked-member relationships */}
        {(linkedMembers.length > 0 || user.linkedTo) && (
          <Section title="Plan multi-miembro">
            {user.linkedTo ? (
              <div className="bg-salvaje-light/40 border border-salvaje-cream rounded-xl p-3 flex items-start gap-2">
                <Users size={14} className="text-salvaje-orange flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-body text-xs text-salvaje-gray">Vinculado al plan de</p>
                  <p className="font-body text-sm font-semibold text-salvaje-dark truncate">
                    {titularInfo?.displayName || user.titularName || '(titular)'}
                  </p>
                  {titularInfo?.email && (
                    <p className="font-mono text-[10px] text-salvaje-gray truncate">{titularInfo.email}</p>
                  )}
                  <p className="font-body text-[11px] text-salvaje-gray mt-1">
                    {titularInfo?.membershipIsActive
                      ? 'El titular tiene membresía vigente → este usuario puede entrar a clases.'
                      : 'El titular NO tiene membresía vigente → este usuario no puede entrar.'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-body text-salvaje-gray mb-2">
                  Miembros vinculados a este titular ({linkedMembers.length}). Comparten su membresía. Para cambiarlos, edita directamente al miembro.
                </p>
                <div className="space-y-1.5">
                  {linkedMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-salvaje-light/40 border border-salvaje-cream rounded-xl px-3 py-2">
                      <div className="min-w-0">
                        <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{m.displayName}</p>
                        <p className="font-mono text-[10px] text-salvaje-gray truncate">{m.email}</p>
                      </div>
                      {m.isBlocked && (
                        <span className="px-2 py-0.5 rounded-full bg-salvaje-danger/10 text-salvaje-danger text-[9px] font-mono uppercase tracking-widest">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Stats */}
        <Section title="Estadísticas (corrección manual)">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Clases asistidas" type="number" value={form.classesAttended} onChange={set('classesAttended')} />
            <Input label="Racha actual (días)" type="number" value={form.currentStreak} onChange={set('currentStreak')} />
          </div>
        </Section>

        {/* Referidos */}
        <Section title="Referidos">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxField label="Tiene descuento por referido pendiente" checked={form.referralDiscountActive} onChange={set('referralDiscountActive')} />
            <Input label="% descuento" type="number" value={form.referralDiscountPercent} onChange={set('referralDiscountPercent')} />
          </div>
        </Section>

        {/* V5 Ajuste 12 — Planes especiales que sólo este usuario ve */}
        <Section title="Planes especiales habilitados">
          <p className="text-xs font-body text-salvaje-gray mb-2">
            Marca los planes especiales que este usuario verá en su catálogo. El resto no los ve.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: 'colegios_papa_hijo', label: 'Colegios · Papá e Hijo' },
              { id: 'colegios_papa', label: 'Colegios · Papá' },
              { id: 'pareja', label: 'Plan Pareja' },
              { id: 'familiar', label: 'Plan Familiar' },
              { id: 'corporativo', label: 'Plan Corporativo' },
              { id: 'campaign_promo', label: 'Campaña / Promo activa' },
            ].map((sp) => {
              const enabled = form.specialPlans?.includes(sp.id)
              return (
                <label key={sp.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all ${
                  enabled ? 'border-salvaje-orange bg-salvaje-orange/5' : 'border-salvaje-cream'
                }`}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        specialPlans: e.target.checked
                          ? [...(f.specialPlans || []), sp.id]
                          : (f.specialPlans || []).filter((x) => x !== sp.id),
                      }))
                    }}
                    className="accent-salvaje-orange"
                  />
                  <span className="text-sm font-body text-salvaje-dark">{sp.label}</span>
                </label>
              )
            })}
          </div>
        </Section>

        {/* Estado */}
        <Section title="Estado de cuenta">
          <CheckboxField label="Cuenta activa" checked={form.isActive} onChange={set('isActive')} />
          <div className="mt-3">
            {!user.isBlocked ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {[
                    { value: 'non_payment', label: 'Mora / No pago' },
                    { value: 'other', label: 'Otro motivo' },
                  ].map((opt) => (
                    <label key={opt.value} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 cursor-pointer text-xs font-body font-semibold transition-all ${
                      blockType === opt.value
                        ? 'border-salvaje-danger bg-salvaje-danger/10 text-salvaje-danger'
                        : 'border-salvaje-cream text-salvaje-gray'
                    }`}>
                      <input type="radio" className="hidden" value={opt.value} checked={blockType === opt.value} onChange={() => setBlockType(opt.value)} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Describe el motivo del bloqueo..."
                  className="w-full px-3 py-2 rounded-xl border border-salvaje-cream text-sm font-body focus:outline-none focus:ring-2 focus:ring-salvaje-danger/30 resize-none h-16"
                />
                <Button variant="danger" className="w-full" loading={blocking} onClick={handleToggleBlock}>
                  <UserX size={14} /> Bloquear usuario
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="px-3 py-2 rounded-xl bg-salvaje-danger/10 border border-salvaje-danger/20">
                  <p className="text-xs font-body text-salvaje-danger font-semibold mb-0.5">
                    {user.blockType === 'non_payment' ? 'Bloqueado por mora' : 'Bloqueado'}
                  </p>
                  <p className="text-sm font-body text-salvaje-dark">{user.blockReason || '(sin motivo)'}</p>
                </div>
                <Button variant="success" className="w-full" loading={blocking} onClick={handleToggleBlock}>
                  <UserCheck size={14} /> Desbloquear usuario
                </Button>
              </div>
            )}
          </div>
        </Section>

        {/* Save */}
        <div className="flex gap-2 pt-2 border-t border-salvaje-cream sticky bottom-0 bg-white -mx-5 px-5 pb-1 pt-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            <X size={16} /> Cancelar
          </Button>
          <Button className="flex-1" loading={saving} onClick={handleSave}>
            <Save size={16} /> Guardar cambios
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-body font-semibold uppercase tracking-widest text-salvaje-orange mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
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
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded accent-salvaje-orange"
      />
      <span className="font-body text-sm text-salvaje-dark">{label}</span>
    </label>
  )
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col gap-1 mt-2">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">{label}</label>
      <div className="px-3 py-2.5 rounded-xl border border-salvaje-cream bg-salvaje-light/50 font-mono text-xs text-salvaje-gray">{value}</div>
    </div>
  )
}
