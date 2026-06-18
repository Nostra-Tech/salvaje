import { useState, useEffect, useMemo } from 'react'
import { UserPlus, Save, X, Info, CheckCircle, Mail, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { createUserDirectly } from '../../services/admin.service'
import { getMembershipCatalog } from '../../services/membership.service'
import { createLinkedMembers, validateMembersList } from '../../services/linked-members.service'
import { filterPlansForUser } from '../../utils/dateHelpers'

const GENDER_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
]

const EMPTY_FORM = {
  email: '', displayName: '', phone: '', dateOfBirth: '', gender: '',
  colegioMonteluna: false,
  createWithMembership: false, membershipId: '',
  startDate: new Date().toISOString().slice(0, 10), endDate: '',
  skipPaymentRequired: true, sendInviteEmail: true,
  // Linked-member entries (used when picked plan has familySize > 1).
  members: [],
}

const EMPTY_MEMBER = { email: '', displayName: '', phone: '', dateOfBirth: '', gender: '' }

export function AdminCreateUserModal({ open, onClose, onCreated }) {
  const { user, profile } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [catalog, setCatalog] = useState([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(EMPTY_FORM)
    setSuccess(null)
    getMembershipCatalog().then(setCatalog).catch(() => setCatalog([]))
  }, [open])

  const set = (field) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value
    setForm((f) => ({ ...f, [field]: value }))
  }

  // Currently-selected plan (or null).
  const selectedPlan = useMemo(
    () => catalog.find((c) => c.id === form.membershipId) || null,
    [catalog, form.membershipId]
  )
  // How many linked members this plan needs (familySize - 1). 0 for solo plans.
  const requiredLinkedCount = useMemo(() => {
    const size = parseInt(selectedPlan?.familySize) || 1
    return Math.max(0, size - 1)
  }, [selectedPlan])

  // Auto-calc end date based on selected membership.
  useEffect(() => {
    if (!form.createWithMembership || !form.membershipId || !form.startDate) return
    if (!selectedPlan) return
    const start = new Date(form.startDate)
    const days = selectedPlan.durationDays || selectedPlan.expiryDays || 30
    const end = new Date(start)
    end.setDate(end.getDate() + days)
    setForm((f) => ({ ...f, endDate: end.toISOString().slice(0, 10) }))
  }, [form.createWithMembership, form.membershipId, form.startDate, selectedPlan])

  // Keep the members[] array length in sync with the plan's familySize.
  // Growing: append empty members. Shrinking: drop trailing entries.
  useEffect(() => {
    setForm((f) => {
      const cur = Array.isArray(f.members) ? f.members : []
      if (cur.length === requiredLinkedCount) return f
      const next = cur.slice(0, requiredLinkedCount)
      while (next.length < requiredLinkedCount) next.push({ ...EMPTY_MEMBER })
      return { ...f, members: next }
    })
  }, [requiredLinkedCount])

  const updateMember = (idx, field) => (e) => {
    const value = e?.target?.value
    setForm((f) => {
      const next = [...(f.members || [])]
      next[idx] = { ...(next[idx] || EMPTY_MEMBER), [field]: value }
      return { ...f, members: next }
    })
  }

  const handleCreate = async () => {
    if (!form.email.trim() || !form.displayName.trim()) {
      toast.error('Email y nombre son obligatorios')
      return
    }
    // Multi-member plans require all member info upfront and emails distinct
    // from the titular's. The "no se podra cambiar los miembros" rule from the
    // product spec means we must collect this at creation time.
    if (requiredLinkedCount > 0) {
      const titularEmail = form.email.trim().toLowerCase()
      const validation = validateMembersList(form.members, requiredLinkedCount)
      if (!validation.valid) {
        toast.error(validation.errors[0])
        return
      }
      const clashes = (form.members || []).some((m) =>
        (m.email || '').trim().toLowerCase() === titularEmail
      )
      if (clashes) {
        toast.error('Los miembros vinculados deben tener un email distinto al del titular')
        return
      }
    }

    setSaving(true)
    try {
      const membershipPreset = form.createWithMembership && form.membershipId
        ? {
            membershipId: form.membershipId,
            startDate: form.startDate,
            endDate: form.endDate,
            skipPaymentRequired: form.skipPaymentRequired,
          }
        : null

      const result = await createUserDirectly({
        email: form.email.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        colegioMonteluna: form.colegioMonteluna,
        membershipPreset,
        sendInviteEmail: form.sendInviteEmail,
        createdByUid: user.uid,
        createdByName: profile?.displayName || 'Admin',
      })

      let createdMembers = []
      if (requiredLinkedCount > 0) {
        try {
          createdMembers = await createLinkedMembers({
            titularUid: result.uid,
            titularName: form.displayName.trim(),
            members: form.members.map((m) => ({
              email: m.email.trim().toLowerCase(),
              displayName: m.displayName.trim(),
              phone: (m.phone || '').trim(),
              dateOfBirth: m.dateOfBirth || null,
              gender: m.gender || '',
            })),
          })
        } catch (e) {
          // Titular already exists; surface the member error but don't roll back
          // the titular (admin can add the missing member later).
          toast.error(
            `Titular creado, pero falló un miembro: ${e.message || 'error'}. ` +
            'Edita al usuario para reintentar.'
          )
        }
      }

      setSuccess({
        ...result,
        sentEmail: form.sendInviteEmail,
        members: createdMembers,
      })
      toast.success(
        createdMembers.length > 0
          ? `Titular + ${createdMembers.length} miembro${createdMembers.length === 1 ? '' : 's'} creado${createdMembers.length === 1 ? '' : 's'}`
          : 'Usuario creado'
      )
      onCreated?.()
    } catch (e) {
      toast.error(e.message || 'Error al crear usuario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear Usuario" size="md">
      <div className="px-5 pb-5 space-y-4 max-h-[75vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-3 space-y-3">
            <div className="w-14 h-14 bg-salvaje-success/10 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-salvaje-success" />
            </div>
            <h3 className="font-display text-2xl uppercase text-salvaje-dark">¡Invitación enviada!</h3>
            <p className="font-body text-sm text-salvaje-gray">
              Pendiente de verificación: <strong>{success.email}</strong>
            </p>
            {success.sentEmail && (
              <div className="bg-salvaje-orange/5 border border-salvaje-orange/20 rounded-xl p-3 text-sm font-body text-salvaje-dark flex items-start gap-2 text-left">
                <Mail size={16} className="text-salvaje-orange flex-shrink-0 mt-0.5" />
                <span>
                  Le enviamos un correo al titular con el link para crear su contraseña. Cuando entre por primera vez, su perfil quedará activo en la tribu.
                </span>
              </div>
            )}
            {Array.isArray(success.members) && success.members.length > 0 && (
              <div className="bg-salvaje-light rounded-xl p-3 text-left">
                <p className="text-[11px] font-body font-semibold uppercase tracking-widest text-salvaje-orange mb-1">
                  Miembros vinculados invitados ({success.members.length})
                </p>
                <ul className="space-y-0.5">
                  {success.members.map((m) => (
                    <li key={m.uid} className="text-xs font-body text-salvaje-dark">
                      · {m.email}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] font-body text-salvaje-gray mt-2">
                  Cada uno recibe su propio correo para fijar contraseña.
                </p>
              </div>
            )}
            <Button onClick={onClose} className="w-full">Listo</Button>
          </div>
        ) : (
          <>
            <div className="bg-salvaje-orange/5 border border-salvaje-orange/20 rounded-xl p-3 flex gap-2">
              <Info size={16} className="text-salvaje-orange flex-shrink-0 mt-0.5" />
              <p className="text-xs font-body text-salvaje-dark">
                Mandamos un correo al usuario para que cree su contraseña. Su perfil completo (con QR y código de referido) se guarda apenas entre por primera vez — así no se llena la base de datos con cuentas sin verificar.
              </p>
            </div>

            <Section title="Datos básicos">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="usuario@correo.com" />
                <Input label="Nombre completo *" value={form.displayName} onChange={set('displayName')} />
                <Input label="Teléfono" value={form.phone} onChange={set('phone')} />
                <Input label="Fecha de nacimiento" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
                <SelectField label="Género" value={form.gender} onChange={set('gender')}>
                  {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </SelectField>
              </div>
              <CheckboxField
                label="¿Tiene hijos en el Colegio Monteluna? (habilita tarifas Papás / Papás e Hijos)"
                checked={form.colegioMonteluna}
                onChange={set('colegioMonteluna')}
              />
            </Section>

            <Section title="Membresía inicial (opcional)">
              <CheckboxField label="Activar membresía al crear" checked={form.createWithMembership} onChange={set('createWithMembership')} />
              {form.createWithMembership && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <SelectField label="Plan" value={form.membershipId} onChange={set('membershipId')}>
                    <option value="">Selecciona...</option>
                    {filterPlansForUser(catalog, { dateOfBirth: form.dateOfBirth, colegioMonteluna: form.colegioMonteluna })
                      .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </SelectField>
                  <Input label="Fecha inicio" type="date" value={form.startDate} onChange={set('startDate')} />
                  <Input label="Fecha fin (auto)" type="date" value={form.endDate} onChange={set('endDate')} />
                  <CheckboxField label="Sin requerir pago" checked={form.skipPaymentRequired} onChange={set('skipPaymentRequired')} />
                </div>
              )}
            </Section>

            {requiredLinkedCount > 0 && (
              <Section title={`Miembros vinculados (${requiredLinkedCount})`}>
                <div className="bg-salvaje-orange/5 border border-salvaje-orange/20 rounded-xl p-3 flex gap-2 mb-2">
                  <Users size={14} className="text-salvaje-orange flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-body text-salvaje-dark leading-relaxed">
                    Este plan cubre <strong>{selectedPlan?.familySize} personas</strong>. Registra ahora a {requiredLinkedCount === 1 ? 'la otra persona' : `los otros ${requiredLinkedCount}`}: cada quien recibe su propio correo para crear su contraseña y tendrá su propio QR. La asistencia, racha y logros se llevan por separado, pero todos comparten la membresía del titular. <strong>Una vez creados no se podrán cambiar.</strong>
                  </p>
                </div>
                {(form.members || []).map((m, idx) => (
                  <div key={idx} className="border border-salvaje-cream rounded-xl p-3 mb-2">
                    <p className="text-[11px] font-body font-semibold uppercase tracking-widest text-salvaje-orange mb-2">
                      Miembro {idx + 1}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Email *" type="email" value={m.email} onChange={updateMember(idx, 'email')} placeholder="miembro@correo.com" />
                      <Input label="Nombre completo *" value={m.displayName} onChange={updateMember(idx, 'displayName')} />
                      <Input label="Teléfono" value={m.phone} onChange={updateMember(idx, 'phone')} />
                      <Input label="Fecha de nacimiento" type="date" value={m.dateOfBirth} onChange={updateMember(idx, 'dateOfBirth')} />
                      <SelectField label="Género" value={m.gender} onChange={updateMember(idx, 'gender')}>
                        {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </SelectField>
                    </div>
                  </div>
                ))}
              </Section>
            )}

            <Section title="Acceso del usuario">
              <label className="flex items-start gap-2 cursor-pointer p-2 rounded-xl bg-salvaje-light/40">
                <input
                  type="checkbox"
                  checked={form.sendInviteEmail}
                  onChange={set('sendInviteEmail')}
                  className="w-4 h-4 rounded accent-salvaje-orange mt-0.5"
                />
                <div>
                  <p className="font-body text-sm text-salvaje-dark font-semibold">Enviar email para crear su contraseña</p>
                  <p className="font-body text-[11px] text-salvaje-gray">Recibirá un email de SALVAJE con un link para entrar.</p>
                </div>
              </label>
            </Section>

            <div className="flex gap-2 pt-2 border-t border-salvaje-cream">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                <X size={16} /> Cancelar
              </Button>
              <Button className="flex-1" loading={saving} onClick={handleCreate}>
                <Save size={16} /> Crear usuario
              </Button>
            </div>
          </>
        )}
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

function SelectField({ label, value, onChange, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">{label}</label>
      <select value={value} onChange={onChange} className="px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange">
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
