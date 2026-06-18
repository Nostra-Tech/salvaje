import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Users, Plus, Pencil, Shield, Clock, CheckCircle2, Snowflake,
  X, Mail, Phone, Calendar, Award, Gift, Star, Activity, CreditCard,
  AlertTriangle, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import {
  collection, query, where, orderBy, getDocs, limit,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { AdminEditUserModal } from '../../components/admin/AdminEditUserModal'
import { AdminCreateUserModal } from '../../components/admin/AdminCreateUserModal'
import { AdminActivateMembershipModal } from '../../components/admin/AdminActivateMembershipModal'
import { AdminFreezeModal } from '../../components/admin/AdminFreezeModal'
import { subscribeToAllUsers, grantPendingPaymentAccess, unblockUser, approveUnfreeze } from '../../services/users.service'
import { formatCOP, formatShortDate } from '../../utils/formatters'
import { useAuth } from '../../hooks/useAuth'

const membershipColors = { monthly: 'success', ticketera: 'orange', free_trial: 'gold', none: 'gray' }
const membershipLabels = { monthly: 'Mensual', ticketera: 'Ticketera', free_trial: 'Cortesía', none: 'Sin plan' }

// ─── MetricCard ──────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, color = 'text-salvaje-orange', onClick, highlight }) {
  return (
    <button
      onClick={onClick}
      className={`text-left w-full bg-white rounded-2xl shadow-salvaje p-4 transition-all ${onClick ? 'hover:shadow-salvaje-md cursor-pointer' : 'cursor-default'} ${highlight ? 'ring-2 ring-salvaje-orange' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest leading-tight">{label}</p>
      </div>
      <p className={`font-display text-3xl leading-tight ${color}`}>{value}</p>
      {sub && <p className="text-[10px] font-body text-salvaje-gray mt-0.5">{sub}</p>}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AdminUsers() {
  const { role } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('all')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [activating, setActivating] = useState(null)
  const [creating, setCreating] = useState(false)
  const [approvingAccess, setApprovingAccess] = useState(null)
  const [freezing, setFreezing] = useState(null)
  const [deep, setDeep] = useState(null)

  const fetchUsers = () => {} // kept for onSaved callbacks — subscription handles data

  const handleApproveClassAccess = async (u) => {
    setApprovingAccess(u.id)
    try {
      await grantPendingPaymentAccess(u.id, 'Admin')
      toast.success(`Acceso temporal aprobado para ${u.displayName || 'el usuario'}`)
      fetchUsers()
    } catch {
      toast.error('Error al aprobar acceso')
    }
    setApprovingAccess(null)
  }

  const handleApproveUnblock = async (u) => {
    setApprovingAccess(u.id)
    try {
      await unblockUser(u.id)
      toast.success(`${u.displayName || 'Usuario'} desbloqueado`)
      fetchUsers()
    } catch {
      toast.error('Error al desbloquear')
    }
    setApprovingAccess(null)
  }

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeToAllUsers((data) => {
      setUsers(data)
      setLoading(false)
    })
    return unsub
  }, [])

  // Auto-open freeze modal or user drawer when arriving from a notification
  useEffect(() => {
    if (loading || users.length === 0) return
    const freezeId = searchParams.get('freeze')
    const userId = searchParams.get('user')
    if (freezeId) {
      const target = users.find((u) => u.id === freezeId)
      if (target && target.freezeStatus === 'requested') setFreezing(target)
      setSearchParams({}, { replace: true })
    } else if (userId) {
      const target = users.find((u) => u.id === userId)
      if (target) setDeep(target)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, users, loading])

  // ── Metrics ──────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now - 30 * 86400000)
    const fourteenDaysAgo = new Date(now - 14 * 86400000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000)
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const active = users.filter(u => u.membershipIsActive && !u.isFrozen)
    const frozen = users.filter(u => u.isFrozen)
    const noPlan = users.filter(u => !u.membershipIsActive && !u.isFrozen && u.hasUsedFreeTrial)
    const newThisMonth = users.filter(u => {
      const d = u.createdAt?.toDate?.() || (u.createdAt ? new Date(u.createdAt) : null)
      return d && d >= firstOfMonth
    })
    const expiringIn7 = users.filter(u => {
      const e = u.membershipEndDate?.toDate?.() || (u.membershipEndDate ? new Date(u.membershipEndDate) : null)
      if (!e || !u.membershipIsActive) return false
      const days = Math.ceil((e - now) / 86400000)
      return days >= 0 && days <= 7
    })
    const atRisk = users.filter(u => {
      if (!u.membershipIsActive || u.isFrozen) return false
      const last = u.lastClassDate?.toDate?.() || (u.lastClassDate ? new Date(u.lastClassDate) : null)
      return !last || last < fourteenDaysAgo
    })
    const dormant = users.filter(u => {
      if (!u.membershipIsActive || u.isFrozen) return false
      const last = u.lastClassDate?.toDate?.() || (u.lastClassDate ? new Date(u.lastClassDate) : null)
      return !last || last < thirtyDaysAgo
    })
    const consistent = users.filter(u => {
      if (!u.membershipIsActive || u.isFrozen) return false
      const last = u.lastClassDate?.toDate?.() || (u.lastClassDate ? new Date(u.lastClassDate) : null)
      return last && last >= thirtyDaysAgo
    })

    return { active, frozen, noPlan, newThisMonth, expiringIn7, atRisk, dormant, consistent, total: users.length }
  }, [users])

  // ── Segmented + searched list ─────────────────────────────────────────────
  const segmented = useMemo(() => {
    const base = segment === 'all' ? users
      : segment === 'active' ? metrics.active
      : segment === 'atrisk' ? metrics.atRisk
      : segment === 'expiring' ? metrics.expiringIn7
      : segment === 'frozen' ? metrics.frozen
      : segment === 'noplan' ? metrics.noPlan
      : users

    const q = search.toLowerCase()
    if (!q) return base
    return base.filter(u =>
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.referralCode?.toLowerCase().includes(q)
    )
  }, [users, metrics, segment, search])

  return (
    <AdminShell title="Usuarios">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <Users size={28} className="text-salvaje-orange" />
              <h1 className="font-display text-4xl uppercase text-salvaje-dark">Usuarios</h1>
              <Badge variant="default">{users.length} total</Badge>
            </div>
            {users.length > 0 && (
              <p className="font-body text-xs text-salvaje-gray mt-0.5 ml-1">
                {metrics.active.length} activos · {metrics.atRisk.length} en riesgo · {metrics.expiringIn7.length} vencen esta semana
              </p>
            )}
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Crear usuario
          </Button>
        </div>

        {/* ── Métricas globales ── */}
        {users.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            <MetricCard
              icon={Users}
              label="Total"
              value={metrics.total}
              color="text-salvaje-dark"
            />
            <MetricCard
              icon={CheckCircle2}
              label="Activos"
              value={metrics.active.length}
              color="text-salvaje-success"
              onClick={() => setSegment('active')}
              highlight={segment === 'active'}
            />
            <MetricCard
              icon={Clock}
              label="Dormidos"
              value={metrics.dormant.length}
              sub="30+ días sin clase"
              color="text-amber-500"
            />
            <MetricCard
              icon={AlertTriangle}
              label="En riesgo"
              value={metrics.atRisk.length}
              sub="14+ días sin clase"
              color="text-salvaje-danger"
              onClick={() => setSegment('atrisk')}
              highlight={segment === 'atrisk'}
            />
            <MetricCard
              icon={Snowflake}
              label="Congelados"
              value={metrics.frozen.length}
              color="text-blue-400"
              onClick={() => setSegment('frozen')}
              highlight={segment === 'frozen'}
            />
            <MetricCard
              icon={Shield}
              label="Sin plan"
              value={metrics.noPlan.length}
              sub="Cortesía agotada"
              color="text-salvaje-gray"
              onClick={() => setSegment('noplan')}
              highlight={segment === 'noplan'}
            />
            <MetricCard
              icon={Calendar}
              label="Vencen 7d"
              value={metrics.expiringIn7.length}
              color="text-salvaje-gold"
              onClick={() => setSegment('expiring')}
              highlight={segment === 'expiring'}
            />
            <MetricCard
              icon={TrendingUp}
              label="Nuevos mes"
              value={metrics.newThisMonth.length}
              color="text-salvaje-orange"
            />
          </div>
        )}

        {/* ── Tabs de segmentación ── */}
        {users.length > 0 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
            {[
              { key: 'all', label: `Todos (${users.length})` },
              { key: 'active', label: `Activos (${metrics.active.length})` },
              { key: 'atrisk', label: `En riesgo (${metrics.atRisk.length})`, danger: true },
              { key: 'expiring', label: `Vencen 7d (${metrics.expiringIn7.length})`, warning: true },
              { key: 'frozen', label: `Congelados (${metrics.frozen.length})` },
              { key: 'noplan', label: `Sin plan (${metrics.noPlan.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSegment(tab.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all whitespace-nowrap ${
                  segment === tab.key
                    ? tab.danger ? 'bg-salvaje-danger text-white'
                      : tab.warning ? 'bg-salvaje-gold text-white'
                      : 'bg-salvaje-orange text-white'
                    : 'bg-white text-salvaje-dark hover:bg-salvaje-cream/50 shadow-salvaje'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Alertas (solo en "Todos") ── */}
        {segment === 'all' && users.length > 0 && (
          <div className="space-y-2">
            {metrics.expiringIn7.length > 0 && (
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl bg-salvaje-gold/10 border border-salvaje-gold/30 text-salvaje-gold font-body text-xs font-semibold select-none">
                  <Calendar size={13} />
                  {metrics.expiringIn7.length} membresía{metrics.expiringIn7.length > 1 ? 's' : ''} vence{metrics.expiringIn7.length === 1 ? '' : 'n'} en los próximos 7 días
                  <span className="ml-auto group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-1 space-y-1 pl-1">
                  {metrics.expiringIn7.map(u => {
                    const e = u.membershipEndDate?.toDate?.() || (u.membershipEndDate ? new Date(u.membershipEndDate) : null)
                    const days = e ? Math.ceil((e - new Date()) / 86400000) : null
                    return (
                      <div key={u.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-salvaje-gold/5 border border-salvaje-gold/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar src={u.profilePhotoURL} name={u.displayName} size="xs" />
                          <div className="min-w-0">
                            <p className="font-body text-xs font-semibold text-salvaje-dark truncate">{u.displayName || u.email}</p>
                            <p className="font-mono text-[10px] text-salvaje-gray">
                              {e ? `Vence ${e.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : '—'}
                              {days !== null ? ` · ${days === 0 ? 'hoy' : `${days}d`}` : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActivating(u)}
                          className="flex-shrink-0 text-[10px] font-body font-semibold px-2 py-1 rounded-lg bg-salvaje-gold/20 text-salvaje-gold hover:bg-salvaje-gold/30 transition-colors"
                        >
                          Renovar
                        </button>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}

            {metrics.atRisk.length > 0 && (
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl bg-salvaje-danger/10 border border-salvaje-danger/30 text-salvaje-danger font-body text-xs font-semibold select-none">
                  <AlertTriangle size={13} />
                  {metrics.atRisk.length} activo{metrics.atRisk.length > 1 ? 's' : ''} sin asistir 14+ días
                  <span className="ml-auto group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-1 space-y-1 pl-1">
                  {metrics.atRisk.slice(0, 5).map(u => {
                    const last = u.lastClassDate?.toDate?.() || (u.lastClassDate ? new Date(u.lastClassDate) : null)
                    return (
                      <div key={u.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-salvaje-danger/5 border border-salvaje-danger/15">
                        <Avatar src={u.profilePhotoURL} name={u.displayName} size="xs" />
                        <div className="min-w-0 flex-1">
                          <p className="font-body text-xs font-semibold text-salvaje-dark truncate">{u.displayName || u.email}</p>
                          <p className="font-mono text-[10px] text-salvaje-gray">
                            {last
                              ? `Última clase: ${last.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`
                              : 'Sin clases registradas'}
                          </p>
                        </div>
                        <button
                          onClick={() => setDeep(u)}
                          className="flex-shrink-0 text-[10px] font-body font-semibold px-2 py-1 rounded-lg bg-salvaje-danger/10 text-salvaje-danger hover:bg-salvaje-danger/20 transition-colors"
                        >
                          Ver
                        </button>
                      </div>
                    )
                  })}
                  {metrics.atRisk.length > 5 && (
                    <button
                      onClick={() => setSegment('atrisk')}
                      className="w-full text-center text-[10px] font-body text-salvaje-danger hover:underline py-1"
                    >
                      Ver todos ({metrics.atRisk.length})
                    </button>
                  )}
                </div>
              </details>
            )}
          </div>
        )}

        {/* ── Métricas de solicitudes pendientes ── */}
        {users.length > 0 && (() => {
          const frozen = users.filter((u) => u.isFrozen).length
          const pendingFreeze = users.filter((u) => u.freezeStatus === 'requested').length
          const pendingUnfreeze = users.filter((u) => u.freezeStatus === 'unfreeze_requested').length
          const pendingAccess = users.filter((u) => u.classAccessRequested || u.unblockRequested).length
          const pendingPayment = users.filter((u) => u.pendingPaymentAccess).length
          if (!frozen && !pendingFreeze && !pendingUnfreeze && !pendingAccess && !pendingPayment) return null
          return (
            <div className="flex flex-wrap gap-2">
              {frozen > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                  <Snowflake size={13} className="text-blue-400" />
                  <span className="font-body text-xs text-blue-800 font-semibold">{frozen} congelada{frozen > 1 ? 's' : ''}</span>
                </div>
              )}
              {pendingFreeze > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
                  <Clock size={13} className="text-blue-500" />
                  <span className="font-body text-xs text-blue-800 font-semibold">{pendingFreeze} solicitud{pendingFreeze > 1 ? 'es' : ''} congelar</span>
                </div>
              )}
              {pendingAccess > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
                  <Clock size={13} className="text-amber-500" />
                  <span className="font-body text-xs text-amber-800 font-semibold">{pendingAccess} solicitud{pendingAccess > 1 ? 'es' : ''} pendiente{pendingAccess > 1 ? 's' : ''}</span>
                </div>
              )}
              {pendingUnfreeze > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-100">
                  <Snowflake size={13} className="text-cyan-500" />
                  <span className="font-body text-xs text-cyan-800 font-semibold">{pendingUnfreeze} solicitud{pendingUnfreeze > 1 ? 'es' : ''} descongelar</span>
                </div>
              )}
              {pendingPayment > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-100">
                  <CreditCard size={13} className="text-orange-400" />
                  <span className="font-body text-xs text-orange-800 font-semibold">{pendingPayment} con acceso temporal</span>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Buscador ── */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email, teléfono o código de referido..."
          icon={Search}
        />

        {/* ── Lista ── */}
        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : segmented.length === 0 ? (
          <EmptyState icon={Users} title="Sin usuarios" />
        ) : (
          <div className="space-y-2">
            {segmented.map((u) => (
              <Card
                key={u.id}
                className={
                  u.freezeStatus === 'requested' ? 'border-2 border-blue-200' :
                  u.freezeStatus === 'unfreeze_requested' ? 'border-2 border-cyan-200' :
                  u.classAccessRequested ? 'border-2 border-amber-200' :
                  u.unblockRequested ? 'border-2 border-orange-200' : ''
                }
              >
                <CardBody className="py-3 space-y-2">
                  {/* Main row — click card area to open deep drawer */}
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setDeep(u)}>
                      <Avatar src={u.profilePhotoURL} name={u.displayName || u.email} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{u.displayName || 'Sin nombre'}</p>
                        <p className="font-body text-xs text-salvaje-gray truncate">{u.email}</p>
                      </div>
                      <Badge variant={membershipColors[u.membershipType || 'none']}>
                        {membershipLabels[u.membershipType || 'none']}
                      </Badge>
                      {u.isBlocked && (
                        <Badge variant="danger">
                          {u.blockType === 'non_payment' ? 'Mora' : 'Bloqueado'}
                        </Badge>
                      )}
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setActivating(u)}
                        className="p-2 rounded-lg hover:bg-salvaje-orange/10 text-salvaje-gray hover:text-salvaje-orange transition-colors"
                        title="Activar/cambiar membresía"
                      >
                        <Shield size={16} />
                      </button>
                      <button
                        onClick={() => setEditing(u)}
                        className="p-2 rounded-lg hover:bg-salvaje-orange/10 text-salvaje-gray hover:text-salvaje-orange transition-colors"
                        title="Editar usuario"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Solicitud de congelación */}
                  {u.freezeStatus === 'requested' && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <Snowflake size={13} className="text-blue-400 flex-shrink-0" />
                        <span className="font-body text-xs text-blue-800 truncate">
                          Solicita congelar {u.freezeDaysRequested ? `${u.freezeDaysRequested} días` : 'su membresía'}
                        </span>
                      </div>
                      <button
                        onClick={() => setFreezing(u)}
                        className="flex-shrink-0 flex items-center gap-1 text-xs font-body font-semibold px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      >
                        <CheckCircle2 size={12} /> Revisar
                      </button>
                    </div>
                  )}

                  {/* Solicitud de descongelamiento */}
                  {u.freezeStatus === 'unfreeze_requested' && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-cyan-50 border border-cyan-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <Snowflake size={13} className="text-cyan-500 flex-shrink-0" />
                        <span className="font-body text-xs text-cyan-900 truncate">
                          Solicita descongelar su membresía
                          {u.unfreezeReturnNote ? ` · "${u.unfreezeReturnNote}"` : ''}
                        </span>
                      </div>
                      <button
                        disabled={approvingAccess === u.id}
                        onClick={async () => {
                          setApprovingAccess(u.id)
                          try {
                            await approveUnfreeze(u.id)
                            toast.success(`${u.displayName || 'Usuario'} descongelado`)
                            fetchUsers()
                          } catch { toast.error('Error al descongelar') }
                          setApprovingAccess(null)
                        }}
                        className="flex-shrink-0 flex items-center gap-1 text-xs font-body font-semibold px-3 py-1.5 rounded-lg bg-cyan-100 text-cyan-700 hover:bg-cyan-200 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} /> Descongelar
                      </button>
                    </div>
                  )}

                  {/* Solicitud de acceso temporal (mora) */}
                  {u.classAccessRequested && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock size={13} className="text-amber-500 flex-shrink-0" />
                        <span className="font-body text-xs text-amber-900 truncate">Solicita acceso temporal a clase</span>
                      </div>
                      <button
                        disabled={approvingAccess === u.id}
                        onClick={() => handleApproveClassAccess(u)}
                        className="flex-shrink-0 flex items-center gap-1 text-xs font-body font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} /> Aprobar
                      </button>
                    </div>
                  )}

                  {/* Solicitud de desbloqueo */}
                  {u.unblockRequested && !u.classAccessRequested && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock size={13} className="text-orange-400 flex-shrink-0" />
                        <span className="font-body text-xs text-orange-900 truncate">Solicita revisión de su bloqueo</span>
                      </div>
                      <button
                        disabled={approvingAccess === u.id}
                        onClick={() => handleApproveUnblock(u)}
                        className="flex-shrink-0 flex items-center gap-1 text-xs font-body font-semibold px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} /> Desbloquear
                      </button>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AdminEditUserModal
        user={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={fetchUsers}
      />
      <AdminActivateMembershipModal
        user={activating}
        open={!!activating}
        onClose={() => setActivating(null)}
        onSaved={fetchUsers}
      />
      <AdminCreateUserModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={fetchUsers}
      />
      <AdminFreezeModal
        user={freezing}
        open={!!freezing}
        onClose={() => setFreezing(null)}
        onSaved={fetchUsers}
      />

      {/* Deep drawer — click any user row to open */}
      <UserDeepDrawer
        user={deep}
        onClose={() => setDeep(null)}
        onEdit={(u) => { setDeep(null); setEditing(u) }}
        onActivate={(u) => { setDeep(null); setActivating(u) }}
        onRefresh={fetchUsers}
      />
    </AdminShell>
  )
}

// ─── UserDeepDrawer ───────────────────────────────────────────────────────────
function UserDeepDrawer({ user, onClose, onEdit, onActivate, onRefresh }) {
  const [purchases, setPurchases] = useState(null)
  const [referrals, setReferrals] = useState(null)
  const [attendances, setAttendances] = useState(null)
  const [unfreezing, setUnfreezing] = useState(false)

  const handleUnfreeze = async () => {
    setUnfreezing(true)
    try {
      await approveUnfreeze(user.id)
      toast.success('Membresía descongelada')
      onRefresh?.()
      onClose()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setUnfreezing(false)
    }
  }

  useEffect(() => {
    if (!user) { setPurchases(null); setReferrals(null); setAttendances(null); return }
    let cancelled = false
    const load = async () => {
      try {
        const ps = await getDocs(query(
          collection(db, 'membership_purchases'),
          where('userId', '==', user.id),
          orderBy('createdAt', 'desc'),
          limit(50)
        ))
        if (!cancelled) setPurchases(ps.docs.map((d) => ({ id: d.id, ...d.data() })))

        const rs = await getDocs(query(
          collection(db, 'membership_purchases'),
          where('referredByUserId', '==', user.id)
        ))
        if (!cancelled) setReferrals(rs.docs.map((d) => ({ id: d.id, ...d.data() })))

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
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-salvaje-dark/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-salvaje-lg overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-salvaje-brown text-white p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar src={user.profilePhotoURL} name={user.displayName} size="md" />
                <div className="min-w-0">
                  <p className="font-display text-lg uppercase truncate">{user.displayName || user.email}</p>
                  <p className="font-mono text-[10px] text-white/60 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onActivate(user)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Activar membresía"
                >
                  <Shield size={16} />
                </button>
                <button
                  onClick={() => onEdit(user)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Editar usuario"
                >
                  <Pencil size={16} />
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <DeepSection title="Identidad">
                <DeepField icon={Mail} label="Correo" value={user.email} />
                <DeepField icon={Phone} label="Teléfono" value={user.phone} />
                <DeepField icon={Calendar} label="Nacimiento" value={
                  user.birthDate?.toDate ? formatShortDate(user.birthDate.toDate()) :
                  user.dateOfBirth?.toDate ? formatShortDate(user.dateOfBirth.toDate()) : '—'
                } />
                <DeepField icon={Calendar} label="Registrado" value={
                  user.createdAt?.toDate ? formatShortDate(user.createdAt.toDate()) : '—'
                } />
              </DeepSection>

              <DeepSection title="Membresía actual">
                <DeepField icon={Shield} label="Tipo" value={membershipLabels[user.membershipType || 'none']} />
                <DeepField icon={Calendar} label="Vence" value={
                  user.membershipEndDate?.toDate ? formatShortDate(user.membershipEndDate.toDate()) : '—'
                } />
                <DeepField icon={CreditCard} label="Tickets" value={user.ticketeraBalance ?? 0} />
                <DeepField icon={Star} label="Cortesía usada" value={user.hasUsedFreeTrial ? 'Sí' : 'No'} />
                {user.isFrozen && (
                  <>
                    <DeepField icon={Snowflake} label="Estado" value={`Congelada hasta ${user.freezeEndDate?.toDate ? formatShortDate(user.freezeEndDate.toDate()) : '—'}`} />
                    <button
                      disabled={unfreezing}
                      onClick={handleUnfreeze}
                      className="mt-1 w-full flex items-center justify-center gap-1.5 text-xs font-body font-semibold px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
                    >
                      <Snowflake size={12} /> {unfreezing ? 'Descongelando...' : 'Descongelar ahora'}
                    </button>
                  </>
                )}
              </DeepSection>

              <DeepSection title="Referidos">
                <DeepField icon={Gift} label="Su código" value={user.referralCode} />
                <DeepField icon={Gift} label="Referido por" value={user.referredByCode || user.referredBy || '—'} />
                <DeepField icon={Award} label="Conteo" value={user.referralsCount || 0} />
                <DeepField icon={Award} label="Descuento activo" value={user.referralDiscountActive ? `${user.referralDiscountPercent || 0}%` : '—'} />
                {referrals && (
                  <DeepField icon={Award} label="Pagaron con su código" value={`${referrals.filter((r) => r.paymentStatus === 'confirmed').length} de ${referrals.length}`} />
                )}
              </DeepSection>

              <DeepSection title="Stats">
                <DeepField icon={Activity} label="Clases asistidas" value={user.classesAttended ?? 0} />
                <DeepField icon={Activity} label="Racha actual" value={user.currentStreak ?? 0} />
                <DeepField icon={Activity} label="Racha máxima" value={user.longestStreak ?? 0} />
                <DeepField icon={Award} label="Logros" value={(user.unlockedAchievements || []).length} />

                {/* Attendance heatmap-style last 30 days */}
                {attendances !== null && (
                  <div className="mt-2">
                    <p className="text-[10px] font-mono text-salvaje-gray uppercase tracking-widest mb-1.5">Últimos 30 días</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: 30 }, (_, i) => {
                        const date = new Date()
                        date.setDate(date.getDate() - (29 - i))
                        date.setHours(0, 0, 0, 0)
                        const nextDay = new Date(date)
                        nextDay.setDate(nextDay.getDate() + 1)
                        const attended = attendances.some(a => {
                          const d = a.scheduledDate?.toDate?.() || (a.scheduledDate ? new Date(a.scheduledDate) : null)
                          return d && d >= date && d < nextDay
                        })
                        return (
                          <div
                            key={i}
                            title={date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                            className={`w-5 h-5 rounded-sm transition-colors ${attended ? 'bg-salvaje-orange' : 'bg-salvaje-cream'}`}
                          />
                        )
                      })}
                    </div>
                    <p className="text-[10px] font-body text-salvaje-gray mt-1">
                      {attendances.filter(a => {
                        const d = a.scheduledDate?.toDate?.() || (a.scheduledDate ? new Date(a.scheduledDate) : null)
                        return d && d >= new Date(Date.now() - 30 * 86400000)
                      }).length} clases en los últimos 30 días
                    </p>
                  </div>
                )}
              </DeepSection>

              <DeepSection title={`Pagos (${purchases?.length ?? '...'})`}>
                {!purchases ? (
                  <div className="h-10 bg-salvaje-light animate-pulse rounded-lg" />
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
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="font-mono text-salvaje-dark">{formatCOP(p.amountPaid || p.amount || 0)}</p>
                          <Badge variant={p.paymentStatus === 'confirmed' ? 'success' : p.paymentStatus === 'rejected' ? 'danger' : 'gold'}>
                            {p.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DeepSection>

              <DeepSection title={`Asistencias (${attendances?.length ?? '...'})`}>
                {!attendances ? (
                  <div className="h-10 bg-salvaje-light animate-pulse rounded-lg" />
                ) : attendances.length === 0 ? (
                  <p className="font-body text-xs text-salvaje-gray">Sin asistencias.</p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {attendances.slice(0, 15).map((a) => (
                      <div key={a.id} className="flex items-center justify-between bg-salvaje-light rounded-lg px-3 py-1.5 text-xs font-body">
                        <p className="text-salvaje-dark font-semibold truncate">{a.name || 'Clase'}</p>
                        <p className="font-mono text-[10px] text-salvaje-gray flex-shrink-0 ml-2">
                          {a.scheduledDate?.toDate ? formatShortDate(a.scheduledDate.toDate()) : '—'}{a.coachName ? ` · ${a.coachName}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </DeepSection>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function DeepSection({ title, children }) {
  return (
    <div>
      <h3 className="font-display text-xs uppercase tracking-widest text-salvaje-orange mb-1.5">{title}</h3>
      <div className="bg-salvaje-light/60 rounded-xl p-2.5 space-y-1.5">{children}</div>
    </div>
  )
}

function DeepField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs font-body">
      <Icon size={12} className="text-salvaje-gray flex-shrink-0" />
      <span className="text-salvaje-gray">{label}:</span>
      <span className="text-salvaje-dark font-semibold truncate">{value ?? '—'}</span>
    </div>
  )
}
