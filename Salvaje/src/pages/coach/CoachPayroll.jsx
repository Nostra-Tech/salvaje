import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Clock, Calendar, History, ChevronRight,
  TrendingUp, FileText, CheckCircle2, X,
} from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { periodForDate } from '../../services/payroll.service'
import { formatCOP, formatShortDate } from '../../utils/formatters'
import { usePayrollProjection } from '../../hooks/usePayrollProjection'

export function CoachPayroll() {
  const { user } = useAuth()
  const [allPayrolls, setAllPayrolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [receipt, setReceipt] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    const load = async () => {
      const q = query(
        collection(db, 'payroll'),
        where('coachId', '==', user.uid),
        orderBy('endDate', 'desc')
      )
      const snap = await getDocs(q).catch(() => null)
      const list = snap?.docs?.map((d) => ({ id: d.id, ...d.data() })) || []
      setAllPayrolls(list)
      setLoading(false)
    }
    load()
  }, [user?.uid])

  // Total earned histórico = SOLO los pagados (status === 'paid')
  const totalEarnedAllTime = useMemo(() =>
    allPayrolls
      .filter((p) => p.status === 'paid')
      .reduce((acc, p) => acc + (p.totalEarned || 0), 0)
  , [allPayrolls])

  // Período actual
  const currentPeriodInfo = periodForDate(new Date())
  const currentPeriodKey = currentPeriodInfo.period
  const currentPayroll = allPayrolls.find((p) => p.period === currentPeriodKey)
  // V6 Ajuste 26 — projection for the current period.
  const projection = usePayrollProjection(user?.uid, currentPeriodInfo.startDate, currentPeriodInfo.endDate)

  // Pagados (histórico)
  const paidPayrolls = allPayrolls.filter((p) => p.status === 'paid')

  return (
    <AppShell title="Mi Nómina">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <DollarSign size={24} className="text-salvaje-orange" />
          <h1 className="font-display text-3xl uppercase text-salvaje-dark">Mi Nómina</h1>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
        ) : (
          <>
            {/* KPI total ganado en SALVAJE */}
            <div className="bg-gradient-to-br from-salvaje-brown to-salvaje-dark rounded-salvaje p-5 text-white shadow-salvaje-md">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-salvaje-orange" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">Total ganado en SALVAJE</p>
              </div>
              <p className="font-display text-5xl text-white leading-none">{formatCOP(totalEarnedAllTime)}</p>
              <p className="font-body text-xs text-white/60 mt-1">Solo cuenta nóminas pagadas · {paidPayrolls.length} períodos</p>
            </div>

            {/* Período en curso */}
            <Card>
              <CardBody className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-salvaje-orange" />
                  <p className="font-display text-base uppercase text-salvaje-dark">Período en curso</p>
                  <Badge variant="orange">En curso</Badge>
                </div>
                {currentPayroll ? (
                  <>
                    <p className="font-mono text-xs text-salvaje-gray">{currentPayroll.period}</p>
                    <p className="font-display text-3xl text-salvaje-orange mt-1">{formatCOP(currentPayroll.totalEarned || 0)}</p>
                    <div className="flex items-center gap-3 text-xs font-body text-salvaje-gray mt-2">
                      <span>{currentPayroll.classesGiven || 0} clases</span>
                      <span>·</span>
                      <span>{(currentPayroll.hoursWorked || 0).toFixed(1)}h</span>
                    </div>
                    <p className="font-body text-[11px] text-salvaje-gray mt-2">
                      Pendiente de cierre el {currentPayroll.endDate?.toDate ? formatShortDate(currentPayroll.endDate.toDate()) : '—'}
                    </p>
                  </>
                ) : (
                  <p className="font-body text-sm text-salvaje-gray mt-2">
                    Sin clases finalizadas en esta quincena. Cuando termines tu primera clase, aparecerá aquí.
                  </p>
                )}

                {/* V6 Ajuste 26 — Confirmado vs proyectado */}
                {!projection.loading && (projection.confirmedClasses > 0 || projection.projectedClasses > 0) && (
                  <div className="mt-4 pt-3 border-t border-salvaje-cream grid grid-cols-2 gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">Confirmado</p>
                      <p className="font-display text-lg text-salvaje-success leading-tight">{formatCOP(projection.confirmedAmount)}</p>
                      <p className="font-mono text-[10px] text-salvaje-gray">{projection.confirmedClasses} clase{projection.confirmedClasses === 1 ? '' : 's'} cerradas</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">Proyectado</p>
                      <p className="font-display text-lg text-salvaje-orange leading-tight">{formatCOP(projection.projectedAmount)}</p>
                      <p className="font-mono text-[10px] text-salvaje-gray">{projection.projectedClasses} clase{projection.projectedClasses === 1 ? '' : 's'} programadas</p>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Acceso al histórico (drawer) */}
            <button
              onClick={() => setHistoryOpen(true)}
              className="w-full bg-white rounded-salvaje shadow-salvaje hover:shadow-salvaje-md transition-all px-4 py-3.5 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-salvaje-orange/10 text-salvaje-orange">
                  <History size={18} />
                </div>
                <div className="text-left">
                  <p className="font-display text-base uppercase text-salvaje-dark">Histórico de pagos</p>
                  <p className="font-body text-xs text-salvaje-gray">
                    {paidPayrolls.length === 0
                      ? 'Aún no hay pagos completados'
                      : `${paidPayrolls.length} período${paidPayrolls.length === 1 ? '' : 's'} pagado${paidPayrolls.length === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-salvaje-gray group-hover:text-salvaje-orange transition-colors" />
            </button>
          </>
        )}
      </div>

      {/* Drawer histórico */}
      <PayrollHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        payrolls={paidPayrolls}
        onSelectReceipt={(p) => setReceipt(p)}
      />

      {/* Receipt modal */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Colilla de pago" size="md">
        {receipt && (
          <div className="px-5 pb-5 space-y-3">
            <div className="bg-salvaje-light rounded-xl p-3">
              <p className="font-mono text-xs text-salvaje-gray">{receipt.period}</p>
              <p className="font-display text-3xl text-salvaje-orange leading-none mt-1">{formatCOP(receipt.totalEarned || 0)}</p>
              <div className="flex items-center gap-3 mt-2 text-xs font-body text-salvaje-gray">
                <span><Calendar size={11} className="inline mr-1" />{receipt.classesGiven || 0} clases</span>
                <span><Clock size={11} className="inline mr-1" />{(receipt.hoursWorked || 0).toFixed(1)}h</span>
              </div>
              {receipt.paidAt?.toDate && (
                <p className="font-body text-[10px] text-salvaje-gray mt-2">Pagado el {formatShortDate(receipt.paidAt.toDate())}</p>
              )}
              {receipt.paymentNotes && (
                <p className="font-body text-xs text-salvaje-dark mt-1 italic">{receipt.paymentNotes}</p>
              )}
            </div>
            <p className="text-xs font-body font-semibold uppercase tracking-widest text-salvaje-orange">Detalle por clase</p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {(receipt.classDetails || []).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-body py-1.5 px-2 rounded-lg hover:bg-salvaje-light/30 border-b border-salvaje-cream/50">
                  <div>
                    <p className="font-semibold text-salvaje-dark">{c.className}</p>
                    <p className="text-salvaje-gray">{c.classDate?.toDate ? formatShortDate(c.classDate.toDate()) : ''} · {c.durationHours}h · {c.studentsAttended} asist.</p>
                  </div>
                  <p className="font-mono text-salvaje-dark">{formatCOP(c.earned || 0)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

/**
 * Right-side drawer showing the coach's paid payroll history.
 * Each row links to the receipt modal via onSelectReceipt.
 */
function PayrollHistoryDrawer({ open, onClose, payrolls, onSelectReceipt }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-salvaje-dark/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-salvaje-light shadow-salvaje-lg overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-salvaje-cream flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={18} className="text-salvaje-orange" />
                <h3 className="font-display text-xl uppercase text-salvaje-dark">Histórico de pagos</h3>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-salvaje-light text-salvaje-gray hover:text-salvaje-dark transition-colors" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {payrolls.length === 0 ? (
                <Card>
                  <CardBody className="py-8 text-center">
                    <CheckCircle2 size={28} className="text-salvaje-cream mx-auto mb-2" />
                    <p className="font-body text-sm text-salvaje-gray">Aquí no hay nada todavía</p>
                    <p className="font-body text-xs text-salvaje-gray mt-0.5">Tus pagos aparecerán cuando el admin los apruebe</p>
                  </CardBody>
                </Card>
              ) : (
                payrolls.map((p) => (
                  <Card key={p.id}>
                    <CardBody className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-base uppercase text-salvaje-dark">{p.period}</p>
                          <p className="font-mono text-[10px] text-salvaje-gray mt-0.5">
                            {p.classesGiven || 0} clases · {(p.hoursWorked || 0).toFixed(1)}h
                          </p>
                          <p className="font-mono text-[10px] text-salvaje-gray">
                            Pagado {p.paidAt?.toDate ? formatShortDate(p.paidAt.toDate()) : '—'}
                          </p>
                        </div>
                        <p className="font-display text-xl text-salvaje-orange whitespace-nowrap">{formatCOP(p.totalEarned || 0)}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => onSelectReceipt(p)}>
                        <FileText size={12} /> Ver colilla
                      </Button>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
