import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, LogOut, Camera, Lock, History,
  CheckCircle2, Calendar, Snowflake, ChevronRight, Shield,
  Flame, Award, Clock,
} from 'lucide-react'
import { collection, orderBy, getDocs, query, limit, where } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { formatShortDate, formatTime } from '../../utils/formatters'
import toast from 'react-hot-toast'
import { updateProfile } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { motion } from 'framer-motion'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { updateUser, requestFreeze, subscribeToUser } from '../../services/users.service'
import { getLinkedMembers } from '../../services/linked-members.service'
import { notifyAllAdmins } from '../../services/admin-notifications.service'
import { createNotification } from '../../services/notifications.service'
import { logout } from '../../services/auth.service'
import { storage, auth } from '../../services/firebase'

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
      <div className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Hero skeleton */}
        <div className="bg-white rounded-salvaje shadow-salvaje p-6 lg:p-8 flex flex-col lg:flex-row items-center lg:items-start gap-6">
          <div className="w-28 h-28 rounded-full bg-salvaje-cream animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-8 bg-salvaje-cream rounded-xl animate-pulse w-48" />
            <div className="h-4 bg-salvaje-cream rounded-xl animate-pulse w-32" />
            <div className="flex gap-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 w-24 bg-salvaje-cream rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

// ─── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, accent = false }) {
  const isLong = String(value).length > 6
  return (
    <div className={`flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl min-w-[68px] ${accent ? 'bg-salvaje-orange/10 border border-salvaje-orange/20' : 'bg-salvaje-light border border-salvaje-cream'}`}>
      <Icon size={15} className={accent ? 'text-salvaje-orange' : 'text-salvaje-gray'} />
      <span className={`leading-none font-semibold text-center ${isLong ? 'font-body text-xs' : 'font-display text-lg'} ${accent ? 'text-salvaje-orange' : 'text-salvaje-dark'}`}>{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-widest text-salvaje-gray text-center leading-tight">{label}</span>
    </div>
  )
}

// ─── Membership badge ─────────────────────────────────────────────────────────
function MembershipBadge({ profile }) {
  if (profile?.isFrozen) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 border border-blue-200 font-body text-xs font-semibold text-blue-700">
        <Snowflake size={11} /> Congelada
      </span>
    )
  }
  if (profile?.membershipIsActive) {
    const type = profile.membershipType === 'monthly' ? 'Mensual' : profile.membershipType === 'ticketera' ? 'Ticketera' : 'Activa'
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-salvaje-success/10 border border-salvaje-success/20 font-body text-xs font-semibold text-salvaje-success">
        <Shield size={11} /> {type}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-salvaje-cream border border-salvaje-gray/20 font-body text-xs font-semibold text-salvaje-gray">
      Sin membresía activa
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
      <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body flex items-center gap-1">
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
export function UserProfile() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [showAttendanceHistory, setShowAttendanceHistory] = useState(false)
  const [showFreezeModal, setShowFreezeModal] = useState(false)
  const [freezeReason, setFreezeReason] = useState('')
  const [freezeDays, setFreezeDays] = useState(7)
  const [freezing, setFreezing] = useState(false)
  const [attendanceList, setAttendanceList] = useState([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  // V6 Ajuste 11: lazy-load attendance history when modal opens.
  useEffect(() => {
    if (!showAttendanceHistory || !user?.uid) return
    let cancelled = false
    const load = async () => {
      setLoadingAttendance(true)
      try {
        const snap = await getDocs(query(
          collection(db, 'classes'),
          orderBy('scheduledDate', 'desc'),
          limit(300)
        ))
        if (cancelled) return
        const mine = []
        snap.forEach((d) => {
          const data = d.data()
          const att = (data.attendeeList || []).find((a) => a.userId === user.uid && a.checkedIn)
          if (att) {
            mine.push({
              id: d.id,
              className: data.name || 'Clase',
              coachName: data.coachName || '',
              scheduledDate: data.scheduledDate,
              checkedInAt: att.checkedInAt,
              method: att.lateRegistration ? 'Tardío' : att.qrScanned ? 'QR' : att.walkIn ? 'Walk-in' : 'Manual',
            })
          }
        })
        setAttendanceList(mine)
      } catch (e) { console.warn('attendance history fetch failed:', e) }
      finally { if (!cancelled) setLoadingAttendance(false) }
    }
    load()
    return () => { cancelled = true }
  }, [showAttendanceHistory, user?.uid])

  const [form, setForm] = useState({ displayName: profile?.displayName || '' })
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Linked-member relationship state.
  // If profile.linkedTo is set → this user is a member; load the titular.
  // Otherwise load whoever points at this user as titular (may be empty).
  const [linkedMembers, setLinkedMembers] = useState([])
  const [titular, setTitular] = useState(null)
  useEffect(() => {
    if (!user?.uid) return
    if (profile?.linkedTo) {
      const unsub = subscribeToUser(profile.linkedTo, (t) => setTitular(t || null))
      return () => unsub?.()
    }
    setTitular(null)
    getLinkedMembers(user.uid).then(setLinkedMembers).catch(() => setLinkedMembers([]))
  }, [user?.uid, profile?.linkedTo])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleRequestFreeze = async () => {
    setFreezing(true)
    try {
      await requestFreeze(user.uid, freezeReason.trim(), freezeDays)
      notifyAllAdmins({
        type: 'freeze_requested',
        title: `${profile?.displayName || 'Un usuario'} solicita congelar su membresía`,
        body: `${freezeDays} días${freezeReason.trim() ? `. Motivo: ${freezeReason.trim()}` : '.'}`,
        senderId: user.uid,
        senderName: profile?.displayName || 'Usuario',
        senderRole: 'user',
        senderPhotoURL: profile?.profilePhotoURL || null,
        relatedId: user.uid,
        relatedCollection: 'users',
        actionType: 'view_user',
        actionUrl: '/admin/users',
      }).catch((e) => console.warn('[freeze] admin notif failed:', e))
      createNotification({
        recipientId: user.uid,
        recipientRole: 'user',
        type: 'freeze_requested',
        title: 'Solicitud de congelamiento enviada',
        body: 'El administrador revisará tu solicitud y te notificará cuando la procese.',
        senderRole: 'system',
        senderName: 'SALVAJE',
      }).catch(() => {})
      toast.success('Solicitud enviada. El admin te avisará.')
      setShowFreezeModal(false)
      setFreezeReason('')
    } catch {
      toast.error('No pudimos enviar la solicitud')
    }
    setFreezing(false)
  }

  const handleSave = async () => {
    if (!form.displayName?.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      await updateUser(user.uid, { displayName: form.displayName.trim() })
      await updateProfile(auth.currentUser, { displayName: form.displayName.trim() })
      try {
        const { notifyAllAdmins } = await import('../../services/admin-notifications.service')
        await notifyAllAdmins({
          type: 'profile_updated',
          title: `${form.displayName.trim()} actualizó su perfil`,
          body: 'Cambió su nombre',
          senderId: user.uid,
          senderName: form.displayName.trim(),
          senderRole: 'user',
          senderPhotoURL: profile?.profilePhotoURL || null,
          actionType: 'view_user',
          actionUrl: '/admin/users',
        })
      } catch {}
      toast.success('Perfil actualizado')
      setEditing(false)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const storageRef = ref(storage, `users/${user.uid}/profile/${Date.now()}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await updateUser(user.uid, { profilePhotoURL: url })
      await updateProfile(auth.currentUser, { photoURL: url })
      toast.success('Foto actualizada')
    } catch {
      toast.error('Error al subir foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // Derive membership end date label
  const membershipEndLabel = (() => {
    try {
      const end = profile?.membershipEndDate?.toDate
        ? profile.membershipEndDate.toDate()
        : profile?.membershipEndDate ? new Date(profile.membershipEndDate) : null
      if (!end) return null
      return end.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    } catch { return null }
  })()

  // Derive birth date label
  const birthDateLabel = (() => {
    try {
      if (!profile?.birthDate) return null
      const bd = typeof profile.birthDate === 'string'
        ? profile.birthDate
        : profile.birthDate?.toDate?.().toISOString().slice(0, 10)
      return new Date(bd + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    } catch { return null }
  })()

  if (!user) return <ProfileSkeleton />

  const canFreeze = (profile?.membershipIsActive || profile?.membershipType === 'monthly')
    && !profile?.isFrozen
    && profile?.freezeStatus !== 'requested'
    && profile?.freezeStatus !== 'approved'

  return (
    <AppShell title="Perfil">
      <div className="flex-1 p-4 pb-8 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* ── Hero card ─────────────────────────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="show"
            className="bg-salvaje-brown rounded-salvaje shadow-salvaje-lg overflow-hidden"
          >
            {/* Texture band */}
            <div className="h-1.5 bg-gradient-to-r from-salvaje-orange via-salvaje-gold to-salvaje-fire" />

            <div className="p-6 lg:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar + upload */}
              <div className="relative flex-shrink-0">
                <Avatar
                  src={profile?.profilePhotoURL}
                  name={profile?.displayName || user?.email}
                  size="xl"
                  className="w-28 h-28 text-3xl ring-4 ring-white/10"
                />
                <label className="absolute bottom-0.5 right-0.5 w-9 h-9 bg-salvaje-orange hover:bg-salvaje-fire transition-colors rounded-full flex items-center justify-center cursor-pointer shadow-salvaje-md">
                  {uploadingPhoto ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera size={15} className="text-white" />
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
              </div>

              {/* Name + badge + stats */}
              <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start gap-3">
                <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 sm:gap-3">
                  <h1 className="font-display text-3xl lg:text-4xl uppercase text-white leading-none">
                    {profile?.displayName || 'Atleta'}
                  </h1>
                  <MembershipBadge profile={profile} />
                </div>
                <p className="font-body text-sm text-white/50">{user?.email}</p>

                {/* Stats row */}
                <div className="flex flex-wrap gap-2 mt-1">
                  <StatPill
                    icon={Flame}
                    label="Asistencias"
                    value={profile?.classesAttended ?? 0}
                    accent
                  />
                  {profile?.currentStreak > 0 && (
                    <StatPill
                      icon={Award}
                      label="Racha"
                      value={`${profile.currentStreak}🔥`}
                    />
                  )}
                  {membershipEndLabel && (
                    <StatPill
                      icon={Clock}
                      label="Vence"
                      value={membershipEndLabel}
                    />
                  )}
                  {profile?.ticketeraBalance != null && profile?.membershipType === 'ticketera' && (
                    <StatPill
                      icon={CheckCircle2}
                      label="Tickets"
                      value={profile.ticketeraBalance}
                    />
                  )}
                </div>
              </div>

              {/* Desktop action buttons */}
              <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => { setForm({ displayName: profile?.displayName || '' }); setEditing(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-white/20 text-white font-display text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  <User size={14} /> Editar
                </button>
                <button
                  onClick={() => setShowAttendanceHistory(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-salvaje-orange/40 text-salvaje-orange font-display text-xs uppercase tracking-widest hover:bg-salvaje-orange/10 transition-all"
                >
                  <History size={14} /> Historial
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Main grid ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Left — personal info */}
            <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show">
              <Card className="h-full">
                <CardBody className="pt-5">
                  <p className="font-display text-base uppercase text-salvaje-dark mb-3 tracking-wide">
                    Información Personal
                  </p>
                  <InfoRow icon={Mail} label="Correo" value={user?.email} />
                  {profile?.phone && <InfoRow icon={Phone} label="Teléfono" value={profile.phone} />}
                  {birthDateLabel && <InfoRow icon={Calendar} label="Fecha de nacimiento" value={birthDateLabel} />}

                  {/* Mobile-only action buttons */}
                  <div className="mt-4 space-y-2 sm:hidden">
                    <button
                      onClick={() => { setForm({ displayName: profile?.displayName || '' }); setEditing(true) }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-salvaje-brown text-salvaje-brown font-display text-sm uppercase tracking-wide hover:bg-salvaje-brown hover:text-white transition-all"
                    >
                      <User size={15} /> Editar perfil
                    </button>
                    <button
                      onClick={() => setShowAttendanceHistory(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-salvaje-orange/50 text-salvaje-orange font-display text-sm uppercase tracking-wide hover:bg-salvaje-orange hover:text-white transition-all"
                    >
                      <History size={15} /> Ver historial de clases
                    </button>
                  </div>
                </CardBody>
              </Card>
            </motion.div>

            {/* Right — membership + actions */}
            <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show" className="flex flex-col gap-4">

              {/* Membership card */}
              <Card>
                <CardBody className="pt-5">
                  <p className="font-display text-base uppercase text-salvaje-dark mb-3 tracking-wide">
                    Membresía
                  </p>
                  {profile?.membershipIsActive ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-body text-sm text-salvaje-gray">Tipo</span>
                        <span className="font-body text-sm font-semibold text-salvaje-dark capitalize">
                          {profile.membershipType === 'monthly' ? 'Mensual' : profile.membershipType === 'ticketera' ? 'Ticketera' : profile.membershipType || '—'}
                        </span>
                      </div>
                      {membershipEndLabel && (
                        <div className="flex items-center justify-between">
                          <span className="font-body text-sm text-salvaje-gray">Vence</span>
                          <span className="font-body text-sm font-semibold text-salvaje-dark">{membershipEndLabel}</span>
                        </div>
                      )}
                      {profile?.ticketeraBalance != null && (
                        <div className="flex items-center justify-between">
                          <span className="font-body text-sm text-salvaje-gray">Clases disponibles</span>
                          <span className="font-display text-lg text-salvaje-orange">{profile.ticketeraBalance}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="font-body text-sm text-salvaje-gray">Sin plan activo</p>
                  )}
                </CardBody>
              </Card>

              {/* Linked-member relationship */}
              {profile?.linkedTo && (
                <Card>
                  <CardBody className="pt-5">
                    <p className="font-display text-base uppercase text-salvaje-dark mb-2 tracking-wide">
                      Plan familiar
                    </p>
                    <p className="font-body text-xs text-salvaje-gray mb-2">
                      Estás vinculado al plan de:
                    </p>
                    <div className="flex items-center gap-2">
                      <Avatar src={titular?.profilePhotoURL} name={titular?.displayName} size="sm" />
                      <div>
                        <p className="font-body text-sm font-semibold text-salvaje-dark">
                          {titular?.displayName || profile.titularName || '—'}
                        </p>
                        <p className="font-mono text-[10px] text-salvaje-gray">
                          {titular?.membershipIsActive ? 'Membresía vigente · puedes entrar' : 'Sin membresía activa · acceso restringido'}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}
              {!profile?.linkedTo && linkedMembers.length > 0 && (
                <Card>
                  <CardBody className="pt-5">
                    <p className="font-display text-base uppercase text-salvaje-dark mb-2 tracking-wide">
                      Mi tribu ({linkedMembers.length})
                    </p>
                    <p className="font-body text-xs text-salvaje-gray mb-3">
                      Estos miembros usan tu plan. Cada uno con su propio QR y métricas.
                    </p>
                    <div className="space-y-2">
                      {linkedMembers.map((m) => (
                        <div key={m.id} className="flex items-center gap-2">
                          <Avatar src={m.profilePhotoURL} name={m.displayName} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{m.displayName}</p>
                            <p className="font-mono text-[10px] text-salvaje-gray truncate">{m.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="font-body text-[11px] text-salvaje-gray mt-3">
                      Para cambiar miembros, contacta al admin.
                    </p>
                  </CardBody>
                </Card>
              )}

              {/* Freeze button / status */}
              {canFreeze && (
                <button onClick={() => setShowFreezeModal(true)} className="w-full text-left">
                  <Card hover>
                    <CardBody className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                          <Snowflake size={16} className="text-blue-500" />
                        </div>
                        <div>
                          <p className="font-body text-sm font-semibold text-salvaje-dark">Congelar membresía</p>
                          <p className="font-body text-xs text-salvaje-gray">Pausa temporal de tu plan</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-salvaje-gray" />
                    </CardBody>
                  </Card>
                </button>
              )}
              {profile?.freezeStatus === 'requested' && (
                <Card>
                  <CardBody className="flex items-center gap-3 py-4">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Snowflake size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="font-body text-sm font-semibold text-salvaje-dark">Congelamiento solicitado</p>
                      <p className="font-body text-xs text-salvaje-gray">En revisión por el admin.</p>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Logout */}
              <Button
                variant="ghost"
                className="w-full border border-salvaje-cream hover:border-salvaje-danger/30 hover:text-salvaje-danger"
                onClick={handleLogout}
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
          <Input
            label="Nombre"
            value={form.displayName}
            onChange={set('displayName')}
            icon={User}
          />
          <LockedField icon={Calendar} label="Fecha de nacimiento" value={birthDateLabel || '—'} />
          <LockedField icon={Mail} label="Correo electrónico" value={user?.email} />
          <LockedField icon={Phone} label="Teléfono" value={profile?.phone || '—'} />
          <Button className="w-full" loading={saving} onClick={handleSave}>
            Guardar cambios
          </Button>
        </div>
      </Modal>

      {/* ── Freeze modal ───────────────────────────────────────────────────── */}
      <Modal open={showFreezeModal} onClose={() => setShowFreezeModal(false)} title="Congelar membresía">
        <div className="px-5 pb-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Snowflake size={20} className="text-blue-500 flex-shrink-0" />
            <p className="font-body text-sm text-salvaje-dark">
              Tu membresía quedará pausada. El admin revisará tu solicitud y te notificará.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">
              ¿Cuántos días deseas congelar?
            </label>
            {(() => {
              const end = profile?.membershipEndDate?.toDate
                ? profile.membershipEndDate.toDate()
                : profile?.membershipEndDate ? new Date(profile.membershipEndDate) : null
              const maxDays = end ? Math.max(1, Math.floor((end - new Date()) / (1000 * 60 * 60 * 24))) : 30
              return (
                <div className="space-y-1.5">
                  <input
                    type="range"
                    min={1}
                    max={maxDays}
                    value={Math.min(freezeDays, maxDays)}
                    onChange={(e) => setFreezeDays(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-body text-salvaje-gray">1 día</span>
                    <span className="text-sm font-body font-bold text-blue-700">
                      {Math.min(freezeDays, maxDays)} días
                    </span>
                    <span className="text-xs font-body text-salvaje-gray">{maxDays} días</span>
                  </div>
                </div>
              )
            })()}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">
              Motivo (opcional)
            </label>
            <textarea
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              placeholder="Ej: Viaje, lesión, trabajo..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark resize-none focus:outline-none focus:border-salvaje-orange"
            />
          </div>
          <Button className="w-full" loading={freezing} onClick={handleRequestFreeze}>
            <Snowflake size={16} /> Solicitar {freezeDays} días de congelamiento
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setShowFreezeModal(false)}>
            Cancelar
          </Button>
        </div>
      </Modal>

      {/* ── Attendance history modal ───────────────────────────────────────── */}
      <Modal open={showAttendanceHistory} onClose={() => setShowAttendanceHistory(false)} title="Mis clases asistidas" size="lg">
        <div className="px-5 pb-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {loadingAttendance ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-salvaje-light rounded-xl animate-pulse" />
              ))}
            </div>
          ) : attendanceList.length === 0 ? (
            <div className="text-center py-10">
              <Calendar size={32} className="text-salvaje-cream mx-auto mb-3" />
              <p className="font-display text-base uppercase text-salvaje-dark">Sin clases todavía</p>
              <p className="font-body text-sm text-salvaje-gray mt-1">Cuando asistas a clases aparecerán aquí.</p>
            </div>
          ) : (
            <>
              <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">
                {attendanceList.length} {attendanceList.length === 1 ? 'clase' : 'clases'} totales
              </p>
              {attendanceList.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-salvaje-light rounded-xl px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CheckCircle2 size={16} className="text-salvaje-success flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{a.className}</p>
                      <p className="font-mono text-[10px] text-salvaje-gray">
                        {a.scheduledDate?.toDate ? formatShortDate(a.scheduledDate.toDate()) : '—'}
                        {a.scheduledDate?.toDate && <> · {formatTime(a.scheduledDate.toDate())}</>}
                        {a.coachName && <> · {a.coachName}</>}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-salvaje-orange flex-shrink-0 bg-salvaje-orange/10 px-2 py-0.5 rounded-full">
                    {a.method}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </Modal>
    </AppShell>
  )
}
