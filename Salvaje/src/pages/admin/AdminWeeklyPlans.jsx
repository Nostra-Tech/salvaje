import { useState, useEffect, useMemo } from 'react'
import { ClipboardList, CheckCircle, XCircle, AlertCircle, DollarSign, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { getAllPlans, approvePlan, rejectPlan } from '../../services/weekly-plan.service'
import { getAllCoaches } from '../../services/coaches.service'
import { createNotification } from '../../services/notifications.service'
import { formatShortDate, formatCOP } from '../../utils/formatters'
import { PLAN_STATUS, DAYS_ES } from '../../utils/constants'

const statusBadge = { draft: 'default', pending_approval: 'gold', approved: 'success', rejected: 'danger' }
const statusLabel = { draft: 'Borrador', pending_approval: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }
const DAYS_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function computePlanStats(plan, coach) {
  let totalClasses = 0
  let totalHours = 0
  for (const dayKey of DAYS_KEYS) {
    const dayCls = (plan.days || {})[dayKey] || []
    for (const c of dayCls) {
      totalClasses++
      const [sh, sm] = (c.startTime || '0:0').split(':').map(Number)
      const [eh, em] = (c.endTime || '0:0').split(':').map(Number)
      totalHours += ((eh * 60 + em) - (sh * 60 + sm)) / 60
    }
  }
  const projected = totalHours * (coach?.hourlyRate || 0)
  return { totalClasses, totalHours, projected }
}

export function AdminWeeklyPlans() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([getAllPlans(), getAllCoaches()])
      setPlans(p); setCoaches(c)
    } catch {
      // error handled silently; UI shows empty state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const coachMap = useMemo(() => Object.fromEntries(coaches.map((c) => [c.id, c])), [coaches])

  // Group: for each ACTIVE coach, do they have a plan? what state?
  const coachRows = useMemo(() => {
    const activeCoaches = coaches.filter((c) => c.isActive !== false)
    return activeCoaches.map((coach) => {
      const plan = plans.find((p) => p.coachId === coach.id)
      return { coach, plan, stats: plan ? computePlanStats(plan, coach) : null }
    })
  }, [coaches, plans])

  const totalProjected = coachRows.reduce((acc, r) => acc + (r.stats?.projected || 0), 0)
  const totalClasses = coachRows.reduce((acc, r) => acc + (r.stats?.totalClasses || 0), 0)
  const totalHours = coachRows.reduce((acc, r) => acc + (r.stats?.totalHours || 0), 0)

  const handleApprove = async () => {
    setApproving(true)
    try {
      await approvePlan(selected.id, user.uid, selected)
      await createNotification({
        recipientId: selected.coachId,
        recipientRole: 'coach',
        type: 'weekly_plan_approved',
        title: 'Plan aprobado',
        body: 'Tu plan semanal fue aprobado. Las clases ya están publicadas.',
      })
      toast.success('Plan aprobado y clases generadas')
      setSelected(null)
      fetchData()
    } catch (e) { toast.error(e.message || 'Error al aprobar') }
    finally { setApproving(false) }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Indica el motivo'); return }
    setRejecting(true)
    try {
      await rejectPlan(selected.id, rejectReason)
      await createNotification({
        recipientId: selected.coachId,
        recipientRole: 'coach',
        type: 'weekly_plan_rejected',
        title: 'Plan rechazado',
        body: rejectReason,
      })
      toast.success('Plan rechazado')
      setSelected(null)
      fetchData()
    } catch { toast.error('Error') }
    finally { setRejecting(false) }
  }

  const selectedCoach = selected ? coachMap[selected.coachId] : null
  const selectedStats = selected && selectedCoach ? computePlanStats(selected, selectedCoach) : null

  return (
    <AdminShell title="Planes Semanales">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <ClipboardList size={28} className="text-salvaje-orange" />
          <h1 className="font-display text-4xl uppercase text-salvaje-dark">Planes Semanales</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={ClipboardList} label="Coaches con plan" value={coachRows.filter((r) => r.plan).length} sub={`de ${coachRows.length}`} />
          <Stat icon={Clock} label="Total clases" value={totalClasses} sub="semana" />
          <Stat icon={Clock} label="Horas totales" value={totalHours.toFixed(1)} sub="semana" />
        </div>
        <p className="font-body text-xs text-salvaje-gray italic">
          La proyección de nómina ahora vive en el módulo <strong>Nómina</strong> (Tab "Período actual" → sección "Proyección").
        </p>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : coachRows.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Sin coaches activos" />
        ) : (
          <div className="space-y-2">
            {coachRows.map(({ coach, plan, stats }) => (
              <Card key={coach.id}>
                <CardBody className="py-3 flex items-center gap-3">
                  <Avatar src={coach.profilePhotoURL} name={coach.displayName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-salvaje-dark">{coach.displayName}</p>
                    {plan ? (
                      <>
                        <p className="font-mono text-xs text-salvaje-gray">
                          {stats.totalClasses} clases · {stats.totalHours.toFixed(1)}h · {formatCOP(stats.projected)} proyectado
                        </p>
                        {plan.status === 'approved' && plan.generatedClassIds?.length > 0 && (
                          <p className="font-body text-[10px] text-salvaje-success mt-0.5">
                            {plan.generatedClassIds.length} clases generadas en el calendario
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="font-body text-xs text-salvaje-danger flex items-center gap-1">
                        <AlertCircle size={11} /> Sin plan esta semana
                      </p>
                    )}
                  </div>
                  {plan ? (
                    <>
                      <Badge variant={statusBadge[plan.status]}>{statusLabel[plan.status]}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => setSelected(plan)}>
                        Ver detalle
                      </Button>
                    </>
                  ) : (
                    <Badge variant="danger">Sin plan</Badge>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Plan de ${selected?.coachName}`} size="lg">
        {selected && (
          <div className="px-5 pb-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="bg-salvaje-light rounded-xl p-3 space-y-1 text-sm font-body">
              <div>Semana: {selected.weekStart ? formatShortDate(selected.weekStart) : ''} a {selected.weekEnd ? formatShortDate(selected.weekEnd) : ''}</div>
              {selectedStats && (
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-salvaje-cream">
                  <div>
                    <p className="text-[10px] text-salvaje-gray uppercase">Clases</p>
                    <p className="font-display text-lg text-salvaje-orange">{selectedStats.totalClasses}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-salvaje-gray uppercase">Horas</p>
                    <p className="font-display text-lg text-salvaje-orange">{selectedStats.totalHours.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-salvaje-gray uppercase">Proyectado</p>
                    <p className="font-display text-lg text-salvaje-orange">{formatCOP(selectedStats.projected)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {DAYS_KEYS.map((dayKey, i) => {
                const dayCls = (selected.days || {})[dayKey] || []
                if (dayCls.length === 0) return null
                return (
                  <div key={dayKey}>
                    <p className="text-xs font-body font-semibold text-salvaje-orange uppercase tracking-widest mb-1">{DAYS_ES[i]}</p>
                    <div className="space-y-1">
                      {dayCls.map((cls, j) => (
                        <div key={j} className="bg-salvaje-light rounded-xl px-3 py-2">
                          <p className="font-body text-sm font-semibold text-salvaje-dark">{cls.name}</p>
                          <p className="font-mono text-xs text-salvaje-gray">{cls.startTime} – {cls.endTime} · {cls.maxCapacity} cupos</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {selected.status === PLAN_STATUS.PENDING && (
              <div className="space-y-3 sticky bottom-0 bg-white -mx-5 px-5 pt-3 pb-1 border-t border-salvaje-cream">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Motivo de rechazo (si aplica)..."
                  className="w-full px-3 py-2 rounded-xl border border-salvaje-cream text-sm font-body focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 resize-none h-16"
                />
                <div className="flex gap-2">
                  <Button variant="danger" className="flex-1" loading={rejecting} onClick={handleReject}>
                    <XCircle size={14} /> Rechazar
                  </Button>
                  <Button className="flex-1" loading={approving} onClick={handleApprove}>
                    <CheckCircle size={14} /> Aprobar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminShell>
  )
}

function Stat({ icon: Icon, label, value, sub, highlight }) {
  return (
    <Card>
      <CardBody className="py-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={14} className="text-salvaje-orange" />
          <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest">{label}</p>
        </div>
        <p className={`font-display leading-tight ${highlight ? 'text-2xl text-salvaje-orange' : 'text-2xl text-salvaje-dark'}`}>{value}</p>
        {sub && <p className="font-body text-[10px] text-salvaje-gray mt-0.5">{sub}</p>}
      </CardBody>
    </Card>
  )
}
