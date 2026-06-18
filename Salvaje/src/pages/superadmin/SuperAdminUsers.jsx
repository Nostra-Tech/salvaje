import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, X, Mail, Phone, Calendar, Award, Gift, Shield, CreditCard, Star, Activity,
} from 'lucide-react'
import {
  collection, query, where, orderBy, getDocs, limit,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { getAllUsers } from '../../services/users.service'
import { formatCOP, formatShortDate } from '../../utils/formatters'

/**
 * V6 Ajuste 20 — SuperAdmin user explorer.
 * Lists all users with deep info on click (drawer).
 */
export function SuperAdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let cancelled = false
    getAllUsers().then((u) => { if (!cancelled) { setUsers(u); setLoading(false) } })
      .catch((e) => { console.error(e); if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter((u) =>
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.referralCode || '').toLowerCase().includes(q)
    )
  }, [users, search])

  return (
    <AdminShell title="Usuarios SuperAdmin">
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-salvaje-orange" />
          <div>
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Usuarios</h1>
            <p className="font-body text-xs text-salvaje-gray">Vista completa con datos extendidos. Solo SuperAdmin.</p>
          </div>
        </div>

        <Input icon={Search} placeholder="Buscar por nombre, correo, teléfono o código de referido..." value={search} onChange={(e) => setSearch(e.target.value)} />

        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <Card><CardBody className="py-10 text-center"><p className="font-body text-sm text-salvaje-gray">Sin usuarios encontrados.</p></CardBody></Card>
        ) : (
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">{filtered.length} usuarios</p>
            {filtered.map((u) => (
              <button key={u.id} onClick={() => setSelected(u)} className="w-full text-left">
                <Card hover>
                  <CardBody className="py-3 flex items-center gap-3">
                    <Avatar src={u.profilePhotoURL} name={u.displayName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{u.displayName || u.email}</p>
                        {u.isBlocked && <Badge variant="danger">Bloqueado</Badge>}
                        {u.membershipIsActive && <Badge variant="success">Activa</Badge>}
                        {!u.membershipIsActive && (u.ticketeraBalance || 0) > 0 && <Badge variant="orange">Ticketera</Badge>}
                      </div>
                      <p className="font-mono text-[10px] text-salvaje-gray truncate">
                        {u.email}{u.phone ? ` · ${u.phone}` : ''}
                      </p>
                    </div>
                    <p className="font-mono text-[10px] text-salvaje-orange flex-shrink-0">{u.referralCode || '—'}</p>
                  </CardBody>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Drawer con datos completos */}
      <UserDeepDrawer user={selected} onClose={() => setSelected(null)} />
    </AdminShell>
  )
}

function UserDeepDrawer({ user, onClose }) {
  const [purchases, setPurchases] = useState(null)
  const [referrals, setReferrals] = useState(null)
  const [attendances, setAttendances] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      try {
        // Purchases
        const ps = await getDocs(query(
          collection(db, 'membership_purchases'),
          where('userId', '==', user.id),
          orderBy('createdAt', 'desc'),
          limit(50)
        ))
        if (!cancelled) setPurchases(ps.docs.map((d) => ({ id: d.id, ...d.data() })))

        // Referrals (people he/she referred)
        const rs = await getDocs(query(
          collection(db, 'membership_purchases'),
          where('referredByUserId', '==', user.id)
        ))
        if (!cancelled) setReferrals(rs.docs.map((d) => ({ id: d.id, ...d.data() })))

        // Attendances — scan recent classes (cap 200) and filter client-side.
        const cs = await getDocs(query(
          collection(db, 'classes'),
          orderBy('scheduledDate', 'desc'),
          limit(200)
        ))
        const mine = []
        cs.forEach((d) => {
          const data = d.data()
          if ((data.attendeeList || []).some((a) => a.userId === user.id && a.checkedIn)) {
            mine.push({ id: d.id, name: data.name, scheduledDate: data.scheduledDate, coachName: data.coachName })
          }
        })
        if (!cancelled) setAttendances(mine)
      } catch (e) { console.warn('UserDeepDrawer load failed:', e) }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <AnimatePresence>
      {user && (
        <div className="fixed inset-0 z-50">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-salvaje-dark/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-salvaje-lg overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-salvaje-brown text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={user.profilePhotoURL} name={user.displayName} size="md" />
                <div className="min-w-0">
                  <p className="font-display text-lg uppercase truncate">{user.displayName || user.email}</p>
                  <p className="font-mono text-[10px] text-white/60">{user.email}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Identity */}
              <Section title="Identidad">
                <Field icon={Mail} label="Correo" value={user.email} />
                <Field icon={Phone} label="Teléfono" value={user.phone} />
                <Field icon={Calendar} label="Nacimiento" value={user.birthDate?.toDate ? formatShortDate(user.birthDate.toDate()) : (user.dateOfBirth?.toDate ? formatShortDate(user.dateOfBirth.toDate()) : '—')} />
                <Field icon={Calendar} label="Registrado" value={user.createdAt?.toDate ? formatShortDate(user.createdAt.toDate()) : '—'} />
              </Section>

              {/* Membership */}
              <Section title="Membresía actual">
                <Field icon={Shield} label="Tipo" value={user.membershipType || 'none'} />
                <Field icon={Calendar} label="Vence" value={user.membershipEndDate?.toDate ? formatShortDate(user.membershipEndDate.toDate()) : '—'} />
                <Field icon={CreditCard} label="Tickets" value={user.ticketeraBalance ?? 0} />
                <Field icon={Calendar} label="Tickets vencen" value={user.ticketeraExpDate?.toDate ? formatShortDate(user.ticketeraExpDate.toDate()) : '—'} />
                <Field icon={Star} label="Cortesía usada" value={user.hasUsedFreeTrial ? 'Sí' : 'No'} />
              </Section>

              {/* Referral */}
              <Section title="Referidos">
                <Field icon={Gift} label="Su código" value={user.referralCode} />
                <Field icon={Gift} label="Referido por" value={user.referredByCode || user.referredBy || '—'} />
                <Field icon={Award} label="Conteo de referidos" value={user.referralsCount || 0} />
                <Field icon={Award} label="Descuento referido activo" value={user.referralDiscountActive ? `${user.referralDiscountPercent || 0}%` : '—'} />
                {referrals && (
                  <Field icon={Award} label="Pagaron con su código" value={`${referrals.filter((r) => r.paymentStatus === 'confirmed').length} de ${referrals.length}`} />
                )}
              </Section>

              {/* Stats */}
              <Section title="Stats">
                <Field icon={Activity} label="Clases asistidas" value={user.classesAttended ?? 0} />
                <Field icon={Activity} label="Racha actual" value={user.currentStreak ?? 0} />
                <Field icon={Activity} label="Racha máxima" value={user.longestStreak ?? 0} />
                <Field icon={Award} label="Logros" value={(user.unlockedAchievements || []).length} />
              </Section>

              {/* Purchases */}
              <Section title={`Pagos (${purchases?.length ?? '...'})`}>
                {!purchases ? (
                  <div className="h-12 bg-salvaje-light animate-pulse rounded-lg" />
                ) : purchases.length === 0 ? (
                  <p className="font-body text-xs text-salvaje-gray">Sin pagos.</p>
                ) : (
                  <div className="space-y-1.5">
                    {purchases.slice(0, 8).map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-salvaje-light rounded-lg px-3 py-1.5 text-xs font-body">
                        <div className="min-w-0">
                          <p className="text-salvaje-dark font-semibold truncate">{p.catalogName || 'Plan'}</p>
                          <p className="font-mono text-[10px] text-salvaje-gray">{p.createdAt?.toDate ? formatShortDate(p.createdAt.toDate()) : '—'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-mono text-salvaje-dark">{formatCOP(p.amountPaid || p.amount || 0)}</p>
                          <Badge variant={p.paymentStatus === 'confirmed' ? 'success' : p.paymentStatus === 'rejected' ? 'danger' : 'gold'}>
                            {p.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Attendances */}
              <Section title={`Últimas asistencias (${attendances?.length ?? '...'})`}>
                {!attendances ? (
                  <div className="h-12 bg-salvaje-light animate-pulse rounded-lg" />
                ) : attendances.length === 0 ? (
                  <p className="font-body text-xs text-salvaje-gray">Sin asistencias todavía.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {attendances.slice(0, 15).map((a) => (
                      <div key={a.id} className="flex items-center justify-between bg-salvaje-light rounded-lg px-3 py-1.5 text-xs font-body">
                        <p className="text-salvaje-dark font-semibold truncate">{a.name || 'Clase'}</p>
                        <p className="font-mono text-[10px] text-salvaje-gray flex-shrink-0">
                          {a.scheduledDate?.toDate ? formatShortDate(a.scheduledDate.toDate()) : '—'} · {a.coachName || ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-display text-xs uppercase tracking-widest text-salvaje-orange mb-1.5">{title}</h3>
      <div className="bg-salvaje-light/60 rounded-xl p-2.5 space-y-1.5">{children}</div>
    </div>
  )
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs font-body">
      <Icon size={12} className="text-salvaje-gray flex-shrink-0" />
      <span className="text-salvaje-gray">{label}:</span>
      <span className="text-salvaje-dark font-semibold truncate">{value ?? '—'}</span>
    </div>
  )
}
