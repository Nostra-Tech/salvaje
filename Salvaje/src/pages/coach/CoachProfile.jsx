import { useState } from 'react'
import {
  User, LogOut, Camera, Lock, Mail, Phone, Building2,
  Dumbbell, FileText, Star, Award,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { updateCoach } from '../../services/coaches.service'
import { logout } from '../../services/auth.service'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../services/firebase'

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <AppShell title="Perfil">
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-salvaje shadow-salvaje p-6 lg:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-28 h-28 rounded-full bg-salvaje-cream animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-8 bg-salvaje-cream rounded-xl animate-pulse w-48" />
            <div className="h-4 bg-salvaje-cream rounded-xl animate-pulse w-32" />
            <div className="flex gap-3 mt-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 w-24 bg-salvaje-cream rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-salvaje shadow-salvaje p-6 space-y-3">
              <div className="h-5 bg-salvaje-cream rounded-xl animate-pulse w-32" />
              <div className="h-4 bg-salvaje-cream rounded-xl animate-pulse w-full" />
              <div className="h-4 bg-salvaje-cream rounded-xl animate-pulse w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}

// ─── Specialization tag ────────────────────────────────────────────────────────
function SpecTag({ label }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-salvaje-orange/10 border border-salvaje-orange/20 font-body text-xs font-semibold text-salvaje-orange">
      <Star size={10} className="flex-shrink-0" />
      {label}
    </span>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-salvaje-cream last:border-0">
      <div className="w-7 h-7 rounded-lg bg-salvaje-light flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-salvaje-gray" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[9px] uppercase tracking-widest text-salvaje-gray">{label}</p>
        <p className="font-body text-sm text-salvaje-dark truncate mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ─── Locked field (inside edit modal) ─────────────────────────────────────────
function LockedField({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-salvaje-gray">
          <Icon size={16} />
        </span>
        <input
          type="text"
          value={value}
          disabled
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-salvaje-cream bg-salvaje-light/40 font-body text-sm text-salvaje-gray cursor-not-allowed"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-salvaje-gray">
          <Lock size={14} />
        </span>
      </div>
      <p className="text-[10px] font-body text-salvaje-gray flex items-center gap-1">
        <Lock size={10} /> Para cambiarlo, contacta al administrador.
      </p>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export function CoachProfile() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ displayName: profile?.displayName || '', bio: profile?.bio || '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const handleSave = async () => {
    if (!form.displayName?.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      await updateCoach(user.uid, {
        displayName: form.displayName.trim(),
        bio: form.bio || '',
      })
      try {
        const { notifyAllAdmins } = await import('../../services/admin-notifications.service')
        await notifyAllAdmins({
          type: 'profile_updated',
          title: `${form.displayName.trim()} actualizó su perfil`,
          body: 'Cambió su nombre o bio',
          senderId: user.uid,
          senderName: form.displayName.trim(),
          senderRole: 'coach',
          senderPhotoURL: profile?.profilePhotoURL || null,
          actionType: 'view_user',
          actionUrl: '/admin/coaches',
        })
      } catch {}
      toast.success('Perfil actualizado')
      setEditing(false)
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const storageRef = ref(storage, `coaches/${user.uid}/profile/${Date.now()}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await updateCoach(user.uid, { profilePhotoURL: url })
      toast.success('Foto actualizada')
    } catch { toast.error('Error al subir foto') }
    finally { setUploading(false) }
  }

  const specializations = profile?.specializations || []
  const hourlyRateLabel = profile?.hourlyRate
    ? `$ ${profile.hourlyRate.toLocaleString('es-CO')}/h`
    : null

  if (!user) return <ProfileSkeleton />

  return (
    <AppShell title="Perfil">
      <div className="flex-1 p-4 pb-8 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* ── Hero card ─────────────────────────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="show"
            className="bg-salvaje-brown rounded-salvaje shadow-salvaje-lg overflow-hidden"
          >
            {/* Accent band */}
            <div className="h-1.5 bg-gradient-to-r from-salvaje-gold via-salvaje-orange to-salvaje-fire" />

            <div className="p-6 lg:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar + upload */}
              <div className="relative flex-shrink-0">
                <Avatar
                  src={profile?.profilePhotoURL}
                  name={profile?.displayName}
                  size="xl"
                  className="w-28 h-28 text-3xl ring-4 ring-white/10"
                />
                <label className="absolute bottom-0.5 right-0.5 w-9 h-9 bg-salvaje-orange hover:bg-salvaje-fire transition-colors rounded-full flex items-center justify-center cursor-pointer shadow-salvaje-md">
                  {uploading
                    ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera size={15} className="text-white" />
                  }
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
              </div>

              {/* Name + role badge + key info */}
              <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start gap-2">
                <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 sm:gap-3">
                  <h1 className="font-display text-3xl lg:text-4xl uppercase text-white leading-none">
                    {profile?.displayName || 'Coach'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-salvaje-gold/20 border border-salvaje-gold/30 font-body text-xs font-semibold text-salvaje-gold">
                    <Dumbbell size={11} /> Coach
                  </span>
                </div>
                <p className="font-body text-sm text-white/50">{user?.email}</p>

                {/* Specialization tags */}
                {specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {specializations.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 font-body text-xs text-white/70"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action button — visible on all screen sizes */}
              <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => setEditing(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-white/20 text-white font-display text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  <User size={14} /> Editar perfil
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Main grid ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Left — bio + specializations */}
            <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show">
              <Card className="h-full">
                <CardBody className="pt-5">
                  <p className="font-display text-base uppercase text-salvaje-dark mb-3 tracking-wide">
                    Sobre mí
                  </p>

                  {/* Bio */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-salvaje-light flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText size={14} className="text-salvaje-gray" />
                    </div>
                    <p className="font-body text-sm text-salvaje-dark leading-relaxed">
                      {profile?.bio || <span className="text-salvaje-gray italic">Sin bio</span>}
                    </p>
                  </div>

                  {/* Specializations list */}
                  {specializations.length > 0 && (
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-salvaje-gray mb-2">
                        Especializaciones
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {specializations.map((s) => (
                          <SpecTag key={s} label={s} />
                        ))}
                      </div>
                    </div>
                  )}
                  {specializations.length === 0 && (
                    <p className="font-body text-sm text-salvaje-gray italic">Sin especializaciones registradas</p>
                  )}

                </CardBody>
              </Card>
            </motion.div>

            {/* Right — contact info + tarifa + logout */}
            <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show" className="flex flex-col gap-4">

              {/* Contact info */}
              <Card>
                <CardBody className="pt-5">
                  <p className="font-display text-base uppercase text-salvaje-dark mb-3 tracking-wide">
                    Información
                  </p>
                  <InfoRow icon={Mail} label="Correo" value={user?.email} />
                  {profile?.phone && <InfoRow icon={Phone} label="Teléfono" value={profile.phone} />}
                  {hourlyRateLabel && <InfoRow icon={Building2} label="Tarifa por hora" value={hourlyRateLabel} />}
                  {!profile?.phone && !hourlyRateLabel && (
                    <p className="font-body text-sm text-salvaje-gray italic">
                      Edita tu perfil para agregar más información.
                    </p>
                  )}
                </CardBody>
              </Card>

              {/* Achievements placeholder — shows count if profile has them */}
              {(profile?.totalClassesTaught > 0 || profile?.achievements?.length > 0) && (
                <Card>
                  <CardBody className="pt-5 pb-4">
                    <p className="font-display text-base uppercase text-salvaje-dark mb-3 tracking-wide">
                      Logros
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-salvaje-gold/10 flex items-center justify-center">
                        <Award size={18} className="text-salvaje-gold" />
                      </div>
                      <div>
                        {profile?.totalClassesTaught > 0 && (
                          <p className="font-body text-sm text-salvaje-dark">
                            <span className="font-display text-xl text-salvaje-orange">{profile.totalClassesTaught}</span>
                            <span className="text-salvaje-gray ml-1.5">clases impartidas</span>
                          </p>
                        )}
                        {profile?.achievements?.length > 0 && (
                          <p className="font-body text-xs text-salvaje-gray">
                            {profile.achievements.length} logro{profile.achievements.length !== 1 ? 's' : ''} desbloqueado{profile.achievements.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Logout */}
              <Button
                variant="ghost"
                className="w-full border border-salvaje-cream hover:border-salvaje-danger/30 hover:text-salvaje-danger"
                onClick={async () => { await logout(); navigate('/login') }}
              >
                <LogOut size={16} />
                Cerrar sesión
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Edit profile modal ─────────────────────────────────────────────── */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Editar perfil">
        <div className="px-5 pb-5 space-y-4">
          <Input label="Nombre" value={form.displayName} onChange={set('displayName')} icon={User} />
          <Textarea label="Bio" value={form.bio} onChange={set('bio')} rows={3} placeholder="Cuéntale a tus atletas sobre ti..." />
          <LockedField icon={Mail} label="Correo electrónico" value={user?.email} />
          <LockedField icon={Phone} label="Teléfono" value={profile?.phone || '—'} />
          <LockedField icon={Building2} label="Tarifa por hora" value={hourlyRateLabel || '—'} />
          <Button className="w-full" loading={saving} onClick={handleSave}>
            Guardar cambios
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
