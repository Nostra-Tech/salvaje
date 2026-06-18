import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, ChevronRight, X, DollarSign, Calendar, Users } from 'lucide-react'
import { collection, query, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { formatCOP, formatShortDate } from '../../utils/formatters'

/**
 * V6 Ajuste 17 — Payroll history grouped by period.
 * Main list: one card per period (e.g. "1-15 May") with total paid.
 * Click → drawer with detail per coach (clases + monto).
 */
export function AdminPayrollHistory() {
  const [payrolls, setPayrolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'payroll'), orderBy('endDate', 'desc')))
        if (!cancelled) setPayrolls(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (e) { console.error('AdminPayrollHistory fetch failed:', e) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Group by period code (e.g. "2025-05-Q1")
  const grouped = useMemo(() => {
    const map = {}
    for (const p of payrolls) {
      const key = p.period || 'sin-periodo'
      if (!map[key]) {
        map[key] = {
          period: key,
          startDate: p.startDate,
          endDate: p.endDate,
          coaches: [],
          totalPaid: 0,
          totalProjected: 0,
          paidCoaches: 0,
          totalClasses: 0,
        }
      }
      map[key].coaches.push(p)
      map[key].totalClasses += p.classesGiven || 0
      if (p.status === 'paid') {
        map[key].totalPaid += p.totalEarned || 0
        map[key].paidCoaches++
      } else {
        map[key].totalProjected += p.totalEarned || 0
      }
    }
    return Object.values(map).sort((a, b) => {
      const ad = a.endDate?.toMillis?.() || 0
      const bd = b.endDate?.toMillis?.() || 0
      return bd - ad
    })
  }, [payrolls])

  return (
    <AdminShell title="Historial de nómina">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <History size={28} className="text-salvaje-orange" />
          <div>
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Historial de nómina</h1>
            <p className="font-body text-xs text-salvaje-gray">Resumen por período. Toca para ver el detalle por coach.</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
        ) : grouped.length === 0 ? (
          <Card><CardBody className="py-10 text-center"><p className="font-body text-sm text-salvaje-gray">Aún no hay períodos de nómina.</p></CardBody></Card>
        ) : (
          <div className="space-y-2">
            {grouped.map((g) => (
              <button key={g.period} onClick={() => setSelectedPeriod(g)} className="w-full text-left">
                <Card hover>
                  <CardBody className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base uppercase text-salvaje-dark">
                        {g.period}
                      </p>
                      <p className="font-mono text-[11px] text-salvaje-gray">
                        {g.startDate?.toDate ? formatShortDate(g.startDate.toDate()) : ''} – {g.endDate?.toDate ? formatShortDate(g.endDate.toDate()) : ''}
                        {' · '}{g.coaches.length} coaches · {g.totalClasses} clases
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display text-xl text-salvaje-success leading-tight">{formatCOP(g.totalPaid)}</p>
                      {g.totalProjected > 0 && (
                        <p className="font-mono text-[10px] text-salvaje-orange">+ {formatCOP(g.totalProjected)} proy.</p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-salvaje-gray flex-shrink-0" />
                  </CardBody>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <PeriodDetailDrawer period={selectedPeriod} onClose={() => setSelectedPeriod(null)} />
    </AdminShell>
  )
}

function PeriodDetailDrawer({ period, onClose }) {
  return (
    <AnimatePresence>
      {period && (
        <div className="fixed inset-0 z-50">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-salvaje-dark/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-salvaje-lg overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-salvaje-cream flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">Período</p>
                <h3 className="font-display text-xl uppercase text-salvaje-dark">{period.period}</h3>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-salvaje-gray hover:bg-salvaje-light" aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Totals */}
              <div className="grid grid-cols-3 gap-2">
                <Stat icon={Users} label="Coaches" value={period.coaches.length} />
                <Stat icon={Calendar} label="Clases" value={period.totalClasses} />
                <Stat icon={DollarSign} label="Pagado" value={formatCOP(period.totalPaid)} accent="success" />
              </div>

              {/* Per-coach */}
              <p className="font-display text-xs uppercase tracking-widest text-salvaje-orange">Por coach</p>
              {period.coaches.map((p) => (
                <div key={p.id} className="bg-salvaje-light rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-body text-sm font-semibold text-salvaje-dark">{p.coachName || 'Coach'}</p>
                    <Badge variant={p.status === 'paid' ? 'success' : p.status === 'approved' ? 'orange' : 'default'}>
                      {p.status === 'paid' ? 'Pagado' : p.status === 'approved' ? 'Aprobado' : 'En curso'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs font-mono text-salvaje-gray">
                    <div><span className="text-salvaje-gray">Clases: </span><span className="text-salvaje-dark font-semibold">{p.classesGiven || 0}</span></div>
                    <div><span className="text-salvaje-gray">Horas: </span><span className="text-salvaje-dark font-semibold">{(p.hoursWorked || 0).toFixed(1)}h</span></div>
                    <div className="text-right"><span className="font-display text-base text-salvaje-orange">{formatCOP(p.totalEarned || 0)}</span></div>
                  </div>
                  {p.paidAt?.toDate && (
                    <p className="font-mono text-[10px] text-salvaje-gray mt-1">Pagado el {formatShortDate(p.paidAt.toDate())}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Stat({ icon: Icon, label, value, accent = 'brown' }) {
  const accents = {
    brown: 'text-salvaje-dark',
    success: 'text-salvaje-success',
  }
  return (
    <div className="bg-salvaje-light rounded-xl p-2.5 text-center">
      <Icon size={12} className="text-salvaje-orange mx-auto mb-0.5" />
      <p className={`font-display text-base ${accents[accent]} leading-tight`}>{value}</p>
      <p className="font-mono text-[9px] uppercase tracking-widest text-salvaje-gray mt-0.5">{label}</p>
    </div>
  )
}
