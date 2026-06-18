import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, XCircle, Eye, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { getPendingPayments, getAllPurchases, confirmPayment, rejectPayment } from '../../services/membership.service'
import { createNotification } from '../../services/notifications.service'
import { formatCOP, formatDateTime } from '../../utils/formatters'
import { useAuth } from '../../hooks/useAuth'
import { PAYMENT_STATUS } from '../../utils/constants'
import { Input } from '../../components/ui/Input'

export function AdminPayments() {
  const { user } = useAuth()
  const [pending, setPending] = useState([])
  const [all, setAll] = useState([])
  const [tab, setTab] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const [pend, allP] = await Promise.all([getPendingPayments(), getAllPurchases()])
    setPending(pend)
    setAll(allP)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await confirmPayment(selected.id, user.uid, user.displayName || 'Admin')
      await createNotification({ recipientId: selected.userId, recipientRole: 'user', type: 'payment_confirmed', title: 'Pago confirmado', body: `Tu ${selected.catalogName} ha sido activado.` })
      toast.success('Pago confirmado y membresia activada')
      setSelected(null)
      fetchData()
    } catch (e) { toast.error(e.message || 'Error al confirmar') }
    finally { setConfirming(false) }
  }

  const handleReject = async () => {
    if (!rejectReason) { toast.error('Indica el motivo'); return }
    setRejecting(true)
    try {
      await rejectPayment(selected.id, rejectReason, user?.uid, user?.displayName || 'Administración SALVAJE')
      toast.success('Pago rechazado · usuario notificado')
      setSelected(null)
      fetchData()
    } catch { toast.error('Error') }
    finally { setRejecting(false) }
  }

  const displayed = tab === 'pending' ? pending : all
  const statusBadge = { pending: 'gold', confirmed: 'success', rejected: 'danger' }
  const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmado', rejected: 'Rechazado' }
  const methodLabels = { nequi: 'Nequi', daviplata: 'Daviplata', transferencia: 'Transferencia', efectivo: 'Efectivo', gift: 'Regalo' }

  return (
    <AdminShell title="Pagos">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-4xl uppercase text-salvaje-dark">Pagos</h1>
          {pending.length > 0 && <Badge variant="danger">{pending.length} pendientes</Badge>}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-xl text-sm font-body font-medium transition-all ${tab === 'pending' ? 'bg-salvaje-orange text-white' : 'bg-white text-salvaje-gray shadow-salvaje'}`}>
            Pendientes ({pending.length})
          </button>
          <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-xl text-sm font-body font-medium transition-all ${tab === 'all' ? 'bg-salvaje-orange text-white' : 'bg-white text-salvaje-gray shadow-salvaje'}`}>
            Todos
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
        ) : displayed.length === 0 ? (
          <EmptyState icon={CreditCard} title="Sin pagos" description={tab === 'pending' ? 'No hay pagos pendientes' : 'No hay pagos registrados'} />
        ) : (
          <div className="space-y-2">
            {displayed.map((p) => (
              <button key={p.id} onClick={() => setSelected(p)} className="w-full text-left bg-white rounded-xl shadow-salvaje px-4 py-3 flex items-center justify-between hover:shadow-salvaje-md transition-all">
                <div>
                  <p className="font-body text-sm font-semibold text-salvaje-dark">{p.userName}</p>
                  <p className="font-body text-xs text-salvaje-gray">{p.catalogName} &middot; {methodLabels[p.paymentMethod] || p.paymentMethod}</p>
                  <p className="font-mono text-xs text-salvaje-gray">{p.createdAt ? formatDateTime(p.createdAt) : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl text-salvaje-dark">{formatCOP(p.amountPaid)}</span>
                  <Badge variant={statusBadge[p.paymentStatus]}>{statusLabel[p.paymentStatus]}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle del pago" size="lg">
        {selected && (
          <div className="px-5 pb-5 space-y-4">
            <div className="bg-salvaje-light rounded-xl p-4 space-y-2 text-sm font-body">
              <div className="flex justify-between"><span className="text-salvaje-gray">Usuario</span><span className="font-semibold text-salvaje-dark">{selected.userName}</span></div>
              <div className="flex justify-between"><span className="text-salvaje-gray">Plan</span><span className="font-semibold text-salvaje-dark">{selected.catalogName}</span></div>
              <div className="flex justify-between"><span className="text-salvaje-gray">Metodo</span><span>{methodLabels[selected.paymentMethod]}</span></div>
              <div className="flex justify-between"><span className="text-salvaje-gray">Monto</span><span className="font-display text-2xl text-salvaje-orange">{formatCOP(selected.amountPaid)}</span></div>
            </div>

            {selected.paymentReceiptURL && (
              <div>
                <p className="text-xs font-body text-salvaje-gray uppercase tracking-wide mb-2">Comprobante</p>
                <a href={selected.paymentReceiptURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-salvaje-orange font-body text-sm hover:text-salvaje-fire transition-colors">
                  <Eye size={14} />Ver comprobante
                </a>
              </div>
            )}

            {selected.paymentStatus === PAYMENT_STATUS.PENDING && (
              <div className="space-y-3">
                <div>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo de rechazo (si aplica)..." className="w-full px-3 py-2 rounded-xl border border-salvaje-cream text-sm font-body focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 resize-none h-16" />
                </div>
                <div className="flex gap-2">
                  <Button variant="danger" className="flex-1" loading={rejecting} onClick={handleReject}>
                    <XCircle size={14} />Rechazar
                  </Button>
                  <Button className="flex-1" loading={confirming} onClick={handleConfirm}>
                    <CheckCircle size={14} />Confirmar
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
