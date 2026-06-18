import { useState, useEffect, useMemo } from 'react'
import {
  DollarSign, CheckCircle, Clock, Users, Calendar, Trophy,
  TrendingUp, Activity, FileText, Download, History as HistoryIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { getAllPayrolls, approveAndPayPayroll, periodForDate } from '../../services/payroll.service'
import { getAllCoaches } from '../../services/coaches.service'
import { getCoachClasses } from '../../services/classes.service'
import { createNotification } from '../../services/notifications.service'
import { formatCOP, formatShortDate } from '../../utils/formatters'

const statusBadge = { draft: 'default', pending_approval: 'gold', approved: 'orange', paid: 'success' }
const statusLabel = { draft: 'En curso', pending_approval: 'Pendiente aprobar', approved: 'Aprobado', paid: 'Pagado' }

export function AdminPayroll() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('current')
  const [payrolls, setPayrolls] = useState([])
  const [coaches, setCoaches] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [paying, setPaying] = useState(false)
  const [payNotes, setPayNotes] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const [p, c] = await Promise.all([getAllPayrolls(), getAllCoaches()])
    setPayrolls(p); setCoaches(c)
    // For projection: classes of next 14 days
    const now = new Date()
    const allClasses = []
    for (const coach of c.filter((x) => x.isActive !== false)) {
      const cls = await getCoachClasses(coach.id, 0, 14).catch(() => [])
      allClasses.push(...cls.map((cl) => ({ ...cl, coachHourlyRate: coach.hourlyRate || 0 })))
    }
    setClasses(allClasses)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const currentPeriodKey = periodForDate(new Date()).period

  // Group by period
  const byPeriod = useMemo(() => {
    const m = {}
    for (const p of payrolls) {
      const k = p.period || 'unknown'
      if (!m[k]) m[k] = []
      m[k].push(p)
    }
    return Object.entries(m)
      .map(([period, items]) => ({
        period,
        items,
        total: items.reduce((acc, x) => acc + (x.totalEarned || 0), 0),
        coachCount: items.length,
        isCurrent: period === currentPeriodKey,
        allPaid: items.every((x) => x.status === 'paid'),
        somePending: items.some((x) => x.status !== 'paid'),
      }))
      .sort((a, b) => b.period.localeCompare(a.period))
  }, [payrolls, currentPeriodKey])

  const currentPeriod = byPeriod.find((p) => p.isCurrent)
  const pendingPeriods = byPeriod.filter((p) => !p.isCurrent && p.somePending)
  const paidPeriods = byPeriod.filter((p) => p.allPaid && !p.isCurrent)

  // Top coach
  const topEarner = currentPeriod ? [...currentPeriod.items].sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0))[0] : null

  // Top occupancy this period
  const topOccupancy = useMemo(() => {
    if (!currentPeriod) return null
    let best = null
    for (const item of currentPeriod.items) {
      const myClasses = classes.filter((c) => c.coachId === item.coachId && c.status === 'completed')
      let totalCap = 0, totalAtt = 0
      for (const c of myClasses) {
        totalCap += c.maxCapacity || 0
        totalAtt += (c.attendeeList || []).filter((a) => a.checkedIn).length
      }
      const occ = totalCap ? (totalAtt / totalCap * 100) : 0
      if (!best || occ > best.occ) best = { name: item.coachName, occ, count: myClasses.length }
    }
    return best
  }, [currentPeriod, classes])

  // Projection: future classes × rate (only scheduled, not completed)
  const projection = useMemo(() => {
    const byCoach = {}
    for (const c of classes) {
      if (c.status === 'completed' || c.status === 'cancelled') continue
      const hours = (c.durationMinutes || 60) / 60
      const earned = hours * (c.coachHourlyRate || 0)
      if (!byCoach[c.coachId]) {
        byCoach[c.coachId] = { coachId: c.coachId, coachName: c.coachName, count: 0, hours: 0, earned: 0, hourlyRate: c.coachHourlyRate }
      }
      byCoach[c.coachId].count++
      byCoach[c.coachId].hours += hours
      byCoach[c.coachId].earned += earned
    }
    return Object.values(byCoach).sort((a, b) => b.earned - a.earned)
  }, [classes])

  const totalProjection = projection.reduce((acc, x) => acc + x.earned, 0)

  const handlePay = async () => {
    setPaying(true)
    try {
      await approveAndPayPayroll(selected.id, user.uid, payNotes)
      // Notif to coach with sender info
      await createNotification({
        recipientId: selected.coachId,
        recipientRole: 'coach',
        senderId: user.uid,
        senderName: profile?.displayName || 'Administración SALVAJE',
        senderRole: 'admin',
        senderPhotoURL: profile?.profilePhotoURL || null,
        type: 'payroll_paid',
        title: 'Tu nómina fue pagada',
        body: `Se aprobó tu pago de ${selected.period}: ${formatCOP(selected.totalEarned)}. ${payNotes || ''}`.trim(),
        relatedId: selected.id,
        relatedCollection: 'payroll',
        actionType: 'view',
        actionUrl: '/coach/payroll',
      })
      toast.success('Nómina pagada · cashflow actualizado')
      setSelected(null); setPayNotes('')
      fetchData()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <AdminShell title="Nómina">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <DollarSign size={28} className="text-salvaje-orange" />
          <h1 className="font-display text-4xl uppercase text-salvaje-dark">Nómina</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-salvaje w-fit">
          <TabBtn active={tab === 'current'}  onClick={() => setTab('current')}  icon={Activity}>Período actual</TabBtn>
          <TabBtn active={tab === 'pending'}  onClick={() => setTab('pending')}  icon={Clock} count={pendingPeriods.length}>Pendientes pago</TabBtn>
          <TabBtn active={tab === 'history'}  onClick={() => setTab('history')}  icon={HistoryIcon}>Histórico</TabBtn>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
        ) : tab === 'current' ? (
          <CurrentTab
            currentPeriod={currentPeriod}
            topEarner={topEarner}
            topOccupancy={topOccupancy}
            projection={projection}
            totalProjection={totalProjection}
            onSelectPayroll={setSelected}
          />
        ) : tab === 'pending' ? (
          <PendingTab periods={pendingPeriods} onSelectPayroll={setSelected} />
        ) : (
          <HistoryTab periods={paidPeriods} onSelectPayroll={setSelected} />
        )}
      </div>

      <PayrollDetailModal
        payroll={selected}
        open={!!selected}
        onClose={() => { setSelected(null); setPayNotes('') }}
        payNotes={payNotes}
        setPayNotes={setPayNotes}
        onPay={handlePay}
        paying={paying}
      />
    </AdminShell>
  )
}

function TabBtn({ active, onClick, icon: Icon, count, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body font-medium transition-all ${
        active ? 'bg-salvaje-orange text-white' : 'text-salvaje-dark hover:bg-salvaje-cream/30'
      }`}
    >
      <Icon size={14} />
      {children}
      {typeof count === 'number' && count > 0 && (
        <span className="bg-salvaje-gold text-white text-[9px] font-mono rounded-full w-4 h-4 flex items-center justify-center">{count}</span>
      )}
    </button>
  )
}

function CurrentTab({ currentPeriod, topEarner, topOccupancy, projection, totalProjection, onSelectPayroll }) {
  if (!currentPeriod) {
    return (
      <EmptyState icon={Activity} title="Sin clases finalizadas en este período" description="La nómina se acumula al finalizar cada clase" />
    )
  }
  return (
    <>
      {/* Hero */}
      <Card>
        <CardBody className="py-4 bg-gradient-to-br from-salvaje-brown to-salvaje-dark rounded-salvaje text-white">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[11px] font-body uppercase tracking-widest text-white/50">Quincena actual</p>
              <p className="font-mono text-sm text-white/70">{currentPeriod.period}</p>
              <p className="font-display text-4xl text-white mt-1">{formatCOP(currentPeriod.total)}</p>
              <p className="font-body text-xs text-white/60 mt-1">{currentPeriod.coachCount} coaches · acumulado en tiempo real</p>
            </div>
            <div className="text-right space-y-1">
              {topEarner && (
                <div>
                  <p className="text-[10px] font-body uppercase tracking-widest text-white/50 flex items-center gap-1 justify-end">
                    <Trophy size={10} className="text-salvaje-orange" /> Top earner
                  </p>
                  <p className="font-display text-base text-white">{topEarner.coachName}</p>
                  <p className="font-mono text-sm text-salvaje-orange">{formatCOP(topEarner.totalEarned)}</p>
                </div>
              )}
              {topOccupancy && (
                <div className="pt-2">
                  <p className="text-[10px] font-body uppercase tracking-widest text-white/50 flex items-center gap-1 justify-end">
                    <Users size={10} className="text-salvaje-orange" /> Mejor aforo
                  </p>
                  <p className="font-mono text-sm text-white">{topOccupancy.name} — {topOccupancy.occ.toFixed(0)}%</p>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Coaches */}
      <Card>
        <CardBody className="py-3">
          <p className="font-display text-base uppercase text-salvaje-dark mb-2">Coaches este período</p>
          <div className="space-y-2">
            {currentPeriod.items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-salvaje-light/30">
                <Avatar name={p.coachName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-salvaje-dark">{p.coachName}</p>
                  <p className="font-mono text-[10px] text-salvaje-gray">{p.classesGiven || 0} clases · {p.hoursWorked?.toFixed(1) || 0}h · {formatCOP(p.hourlyRate)}/h</p>
                </div>
                <p className="font-display text-lg text-salvaje-orange">{formatCOP(p.totalEarned || 0)}</p>
                <Badge variant={statusBadge[p.status]}>{statusLabel[p.status]}</Badge>
                <Button size="sm" variant="ghost" onClick={() => onSelectPayroll(p)}>Ver</Button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Projection */}
      {projection.length > 0 && (
        <Card>
          <CardBody className="py-3">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-salvaje-orange" />
                <p className="font-display text-base uppercase text-salvaje-dark">Proyección próximas 2 semanas</p>
              </div>
              <p className="font-display text-2xl text-salvaje-orange">{formatCOP(totalProjection)}</p>
            </div>
            <p className="font-body text-xs text-salvaje-gray mb-3">
              Basado en clases programadas (no completadas aún) × tarifa de cada coach.
            </p>
            <div className="space-y-1">
              {projection.map((p) => (
                <div key={p.coachId} className="flex items-center justify-between text-xs font-body py-1.5 px-2 rounded-lg hover:bg-salvaje-light/30 border-b border-salvaje-cream last:border-0">
                  <div>
                    <span className="font-semibold text-salvaje-dark">{p.coachName}</span>
                    <span className="text-salvaje-gray"> — {p.count} clases × {p.hours.toFixed(1)}h × {formatCOP(p.hourlyRate)}</span>
                  </div>
                  <span className="font-mono text-salvaje-dark font-semibold">{formatCOP(p.earned)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </>
  )
}

function PendingTab({ periods, onSelectPayroll }) {
  if (periods.length === 0) {
    return <EmptyState icon={CheckCircle} title="Todo al día" description="No hay nóminas pendientes de pago" />
  }
  return (
    <div className="space-y-3">
      {periods.map((g) => (
        <Card key={g.period}>
          <CardBody className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-display text-lg uppercase text-salvaje-dark">{g.period}</p>
                <p className="font-body text-xs text-salvaje-gray">{g.coachCount} coaches · {g.items.filter((x) => x.status !== 'paid').length} sin pagar</p>
              </div>
              <p className="font-display text-2xl text-salvaje-orange">{formatCOP(g.total)}</p>
            </div>
            <div className="space-y-1 border-t border-salvaje-cream pt-2">
              {g.items.filter((x) => x.status !== 'paid').map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-salvaje-light/30">
                  <Avatar name={p.coachName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-salvaje-dark">{p.coachName}</p>
                    <p className="font-mono text-[10px] text-salvaje-gray">{p.classesGiven || 0} clases · {p.hoursWorked?.toFixed(1) || 0}h</p>
                  </div>
                  <p className="font-mono text-sm text-salvaje-orange">{formatCOP(p.totalEarned || 0)}</p>
                  <Button size="sm" onClick={() => onSelectPayroll(p)}>Pagar</Button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

function HistoryTab({ periods, onSelectPayroll }) {
  const [search, setSearch] = useState('')
  const filtered = periods.filter((p) => p.period.includes(search))
  if (periods.length === 0) {
    return <EmptyState icon={HistoryIcon} title="Sin histórico aún" description="Las nóminas pagadas aparecerán aquí" />
  }
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por período (ej: 2025-05)"
        className="w-full px-3 py-2 rounded-xl border border-salvaje-cream font-mono text-sm"
      />
      {filtered.map((g) => {
        const lastPayDate = g.items.map((i) => i.paidAt?.toDate?.() || null).filter(Boolean).sort((a, b) => b - a)[0]
        return (
          <Card key={g.period}>
            <CardBody className="py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg uppercase text-salvaje-dark">{g.period}</p>
                  <p className="font-body text-xs text-salvaje-gray">
                    {g.coachCount} coaches · pagado {lastPayDate ? formatShortDate(lastPayDate) : '—'}
                  </p>
                </div>
                <p className="font-display text-2xl text-salvaje-orange">{formatCOP(g.total)}</p>
              </div>
              <div className="mt-2 pt-2 border-t border-salvaje-cream space-y-1">
                {g.items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSelectPayroll(p)}
                    className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-salvaje-light/30"
                  >
                    <Avatar name={p.coachName} size="xs" />
                    <span className="flex-1 font-body text-xs text-salvaje-dark">{p.coachName}</span>
                    <span className="font-mono text-xs text-salvaje-orange">{formatCOP(p.totalEarned || 0)}</span>
                    <Badge variant="success">Pagado</Badge>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}

function PayrollDetailModal({ payroll, open, onClose, payNotes, setPayNotes, onPay, paying }) {
  if (!payroll) return null
  return (
    <Modal open={open} onClose={onClose} title={`Nómina · ${payroll.coachName}`} size="md">
      <div className="px-5 pb-5 space-y-4 max-h-[75vh] overflow-y-auto">
        <div className="bg-salvaje-light rounded-xl p-3">
          <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest">Período</p>
          <p className="font-mono text-sm text-salvaje-dark">{payroll.period}</p>
          <p className="font-display text-4xl text-salvaje-orange mt-2">{formatCOP(payroll.totalEarned)}</p>
          <div className="flex items-center gap-3 mt-2 text-xs font-body text-salvaje-gray flex-wrap">
            <span><Clock size={11} className="inline mr-1" />{payroll.hoursWorked?.toFixed(1) || 0}h</span>
            <span><Calendar size={11} className="inline mr-1" />{payroll.classesGiven || 0} clases</span>
            <span><DollarSign size={11} className="inline mr-1" />{formatCOP(payroll.hourlyRate)}/h</span>
          </div>
          <Badge variant={statusBadge[payroll.status]} className="mt-2">{statusLabel[payroll.status]}</Badge>
        </div>

        {payroll.classDetails?.length > 0 && (
          <div>
            <p className="text-xs font-body font-semibold uppercase tracking-widest text-salvaje-orange mb-2">Detalle</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {payroll.classDetails.map((cd, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-body py-1.5 px-2 rounded-lg hover:bg-salvaje-light/30 border-b border-salvaje-cream/50">
                  <div>
                    <p className="font-semibold text-salvaje-dark">{cd.className}</p>
                    <p className="text-salvaje-gray">{cd.classDate?.toDate ? formatShortDate(cd.classDate.toDate()) : ''} · {cd.durationHours}h · {cd.studentsAttended} asist.</p>
                  </div>
                  <p className="font-mono text-salvaje-dark font-semibold">{formatCOP(cd.earned)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {payroll.status !== 'paid' ? (
          <div className="space-y-2 pt-2 border-t border-salvaje-cream">
            <textarea
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Notas del pago (ej: Bancolombia ref #12345)"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-salvaje-cream text-sm font-body resize-none focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30"
            />
            <Button className="w-full" loading={paying} onClick={onPay}>
              <CheckCircle size={16} /> Aprobar y marcar como pagada
            </Button>
            <p className="text-[11px] font-body text-salvaje-gray text-center">Esto registra el egreso en cashflow + notifica al coach.</p>
          </div>
        ) : (
          <div className="bg-salvaje-success/5 border border-salvaje-success/20 rounded-xl p-3 text-center">
            <CheckCircle size={28} className="text-salvaje-success mx-auto mb-2" />
            <p className="font-body text-sm text-salvaje-dark">Pagada el {payroll.paidAt?.toDate ? formatShortDate(payroll.paidAt.toDate()) : '—'}</p>
            {payroll.paymentNotes && <p className="font-body text-xs text-salvaje-gray mt-1">{payroll.paymentNotes}</p>}
            {payroll.approvedBy && <p className="font-body text-[10px] text-salvaje-gray mt-1">Por: {payroll.approvedByName || payroll.approvedBy.slice(0, 8)}</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}
