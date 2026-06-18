import { useState, useEffect } from 'react'
import { Save, X, Lock, Building2, Mail, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { createCoachDirectly } from '../../services/admin.service'

const COLOMBIAN_BANKS = [
  '', 'Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA Colombia',
  'Banco Popular', 'Banco Agrario', 'Scotiabank Colpatria', 'Nequi',
  'Daviplata', 'Banco W', 'Banco Mundo Mujer', 'Otro',
]

const ACCOUNT_TYPES = [
  { value: 'ahorros', label: 'Ahorros' },
  { value: 'corriente', label: 'Corriente' },
]

const SPECIALIZATION_PRESETS = [
  'CrossFit Level 1', 'CrossFit Level 2', 'Olympic Lifting',
  'Strength', 'Gymnastics', 'Endurance', 'Mobility', 'Nutrition',
]

const EMPTY_FORM = {
  email: '', displayName: '', phone: '', bio: '',
  specializations: [], certifications: [], hourlyRate: '',
  bankName: '', bankAccount: '', bankAccountType: 'ahorros', bankAccountHolder: '',
  isActive: true, sendInviteEmail: true,
}

export function AdminCoachModal({ coach, open, onClose, onSaved, mode = 'edit' }) {
  const { user, profile } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null) // { uid, email }

  const isCreate = mode === 'create'

  useEffect(() => {
    if (!open) return
    setSuccess(null)
    if (isCreate) {
      setForm(EMPTY_FORM)
    } else if (coach) {
      setForm({
        ...EMPTY_FORM,
        displayName: coach.displayName || '',
        phone: coach.phone || '',
        bio: coach.bio || '',
        specializations: coach.specializations || [],
        certifications: coach.certifications || [],
        hourlyRate: coach.hourlyRate || '',
        bankName: coach.bankInfo?.bankName || '',
        bankAccount: coach.bankInfo?.bankAccount || '',
        bankAccountType: coach.bankInfo?.bankAccountType || 'ahorros',
        bankAccountHolder: coach.bankInfo?.bankAccountHolder || '',
        isActive: coach.isActive !== false,
      })
    }
  }, [open, coach, isCreate])

  const set = (field) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value
    setForm((f) => ({ ...f, [field]: value }))
  }

  const toggleSpec = (s) => {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter((x) => x !== s)
        : [...f.specializations, s],
    }))
  }

  const handleSave = async () => {
    if (!form.displayName?.trim()) { toast.error('El nombre es obligatorio'); return }
    if (isCreate && !form.email?.trim()) { toast.error('El email es obligatorio'); return }
    if (!form.hourlyRate || parseInt(form.hourlyRate) <= 0) { toast.error('La tarifa por hora es obligatoria'); return }

    setSaving(true)
    try {
      const bankInfo = (form.bankName || form.bankAccount) ? {
        bankName: form.bankName,
        bankAccount: form.bankAccount,
        bankAccountType: form.bankAccountType,
        bankAccountHolder: form.bankAccountHolder || form.displayName,
      } : null

      if (isCreate) {
        const result = await createCoachDirectly({
          email: form.email,
          displayName: form.displayName,
          phone: form.phone,
          bio: form.bio,
          specializations: form.specializations,
          certifications: form.certifications,
          hourlyRate: parseInt(form.hourlyRate),
          bankInfo,
          sendInviteEmail: form.sendInviteEmail,
          createdByUid: user.uid,
          createdByName: profile?.displayName || 'Admin',
        })
        setSuccess({ ...result, sentEmail: form.sendInviteEmail })
        toast.success('Coach creado')
        onSaved?.()
      } else {
        await updateDoc(doc(db, 'coaches', coach.id), {
          displayName: form.displayName.trim(),
          phone: form.phone.trim(),
          bio: form.bio.trim(),
          specializations: form.specializations,
          certifications: form.certifications,
          hourlyRate: parseInt(form.hourlyRate),
          bankInfo,
          isActive: form.isActive,
          updatedAt: serverTimestamp(),
        })
        toast.success('Coach actualizado')
        onSaved?.()
        onClose()
      }
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCreate ? 'Crear Coach' : `Editar: ${coach?.displayName || ''}`}
      size="lg"
    >
      <div className="px-5 pb-5 space-y-5 max-h-[75vh] overflow-y-auto">
        {success ? (
          <SuccessView result={success} onClose={onClose} />
        ) : (
          <>
            <Section title="Información personal">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isCreate && <Input label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="coach@correo.com" />}
                <Input label="Nombre completo *" value={form.displayName} onChange={set('displayName')} />
                <Input label="Teléfono" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={set('bio')}
                  rows={2}
                  placeholder="Descripción profesional"
                  className="px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange resize-none"
                />
              </div>
            </Section>

            <Section title="Especializaciones">
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATION_PRESETS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleSpec(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-body transition-all ${
                      form.specializations.includes(s)
                        ? 'bg-salvaje-orange text-white'
                        : 'bg-salvaje-light text-salvaje-dark hover:bg-salvaje-cream'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Información de pago" lock>
              <Input label="Tarifa por hora (COP) *" type="number" value={form.hourlyRate} onChange={set('hourlyRate')} placeholder="25000" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectField label="Banco" value={form.bankName} onChange={set('bankName')}>
                  <option value="">Selecciona banco</option>
                  {COLOMBIAN_BANKS.filter(Boolean).map((b) => <option key={b} value={b}>{b}</option>)}
                </SelectField>
                <SelectField label="Tipo de cuenta" value={form.bankAccountType} onChange={set('bankAccountType')}>
                  {ACCOUNT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </SelectField>
                <Input label="Número de cuenta" value={form.bankAccount} onChange={set('bankAccount')} />
                <Input label="Titular" value={form.bankAccountHolder} onChange={set('bankAccountHolder')} placeholder="Si difiere del nombre" />
              </div>
              <p className="text-[11px] font-body text-salvaje-gray flex items-center gap-1 pt-1">
                <Lock size={11} /> Confidencial. Solo visible para administradores.
              </p>
            </Section>

            {isCreate && (
              <Section title="Acceso del coach">
                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-xl bg-salvaje-light/40">
                  <input
                    type="checkbox"
                    checked={form.sendInviteEmail}
                    onChange={set('sendInviteEmail')}
                    className="w-4 h-4 rounded accent-salvaje-orange mt-0.5"
                  />
                  <div>
                    <p className="font-body text-sm text-salvaje-dark font-semibold">Enviar email para que cree su contraseña</p>
                    <p className="font-body text-[11px] text-salvaje-gray">El coach recibirá un email de SALVAJE con un link para crear su contraseña y acceder.</p>
                  </div>
                </label>
              </Section>
            )}

            {!isCreate && (
              <Section title="Estado">
                <CheckboxField label="Coach activo" checked={form.isActive} onChange={set('isActive')} />
              </Section>
            )}

            <div className="flex gap-2 pt-2 border-t border-salvaje-cream sticky bottom-0 bg-white -mx-5 px-5 pb-1 pt-3">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                <X size={16} /> Cancelar
              </Button>
              <Button className="flex-1" loading={saving} onClick={handleSave}>
                <Save size={16} /> {isCreate ? 'Crear coach' : 'Guardar cambios'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function SuccessView({ result, onClose }) {
  return (
    <div className="text-center py-3 space-y-3">
      <div className="w-14 h-14 bg-salvaje-success/10 rounded-2xl flex items-center justify-center mx-auto">
        <CheckCircle size={28} className="text-salvaje-success" />
      </div>
      <h3 className="font-display text-2xl uppercase text-salvaje-dark">¡Coach creado!</h3>
      <p className="font-body text-sm text-salvaje-gray">
        Cuenta creada para <strong>{result.email}</strong>
      </p>
      {result.sentEmail && (
        <div className="bg-salvaje-orange/5 border border-salvaje-orange/20 rounded-xl p-3 text-sm font-body text-salvaje-dark flex items-start gap-2">
          <Mail size={16} className="text-salvaje-orange flex-shrink-0 mt-0.5" />
          <span>Le enviamos un email con instrucciones para crear su contraseña.</span>
        </div>
      )}
      <Button onClick={onClose} className="w-full">Listo</Button>
    </div>
  )
}

function Section({ title, lock, children }) {
  return (
    <div>
      <p className="text-xs font-body font-semibold uppercase tracking-widest text-salvaje-orange mb-2 flex items-center gap-1">
        {lock && <Lock size={11} />}{title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function SelectField({ label, value, onChange, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
      >
        {children}
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
