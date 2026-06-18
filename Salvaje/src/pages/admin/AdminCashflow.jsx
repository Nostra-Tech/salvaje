import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Plus, Trash2,
  ArrowDownCircle, ArrowUpCircle, AlertCircle, Calendar
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Line, ComposedChart } from 'recharts'
import toast from 'react-hot-toast'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import {
  fetchCashflowMonthSummary, fetchLastSixMonths, addManualExpense, addManualIncome, deleteEntry,
  CASHFLOW_CATEGORIES,
} from '../../services/cashflow.service'
import { formatCOP, formatShortDate } from '../../utils/formatters'

function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function AdminCashflow() {
  const { user } = useAuth()
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [summary, setSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(null) // 'expense' | 'income' | null
  const [form, setForm] = useState({ category: 'rent', description: '', amount: '', date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const [s, h] = await Promise.all([
        fetchCashflowMonthSummary(monthKey),
        fetchLastSixMonths(),
      ])
      setSummary(s)
      setHistory(h)
    } catch {
      // error handled silently; UI shows empty state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [monthKey])

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const handleAdd = async () => {
    if (!form.description.trim() || !form.amount) { toast.error('Completa descripción y monto'); return }
    setSaving(true)
    try {
      const date = new Date(form.date + 'T12:00:00')
      if (addModal === 'income') {
        await addManualIncome({
          description: form.description,
          amount: form.amount,
          date,
          adminUid: user.uid,
        })
        toast.success('Ingreso registrado')
      } else {
        await addManualExpense({
          category: form.category,
          description: form.description,
          amount: form.amount,
          date,
          adminUid: user.uid,
        })
        toast.success('Gasto registrado')
      }
      setAddModal(null)
      setForm({ category: 'rent', description: '', amount: '', date: new Date().toISOString().slice(0, 10) })
      fetch()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, source) => {
    if (source === 'derived') {
      toast.error('Este movimiento viene de un pago/nómina. Modifícalo desde su sección.')
      return
    }
    if (!confirm('¿Eliminar este movimiento?')) return
    try {
      await deleteEntry(id)
      toast.success('Eliminado')
      fetch()
    } catch (e) { toast.error(e.message) }
  }

  // Comparison with previous month
  const prevMonth = history.length >= 2 ? history[history.length - 2] : null
  const incomeTrend = prevMonth?.income ? ((summary?.income || 0) - prevMonth.income) / prevMonth.income * 100 : 0
  const expenseTrend = prevMonth?.expense ? ((summary?.expense || 0) - prevMonth.expense) / prevMonth.expense * 100 : 0

  return (
    <AdminShell title="Flujo de Caja">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <TrendingUp size={28} className="text-salvaje-orange" />
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Flujo de Caja</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-salvaje-cream font-mono text-xs"
            />
            <Button size="sm" variant="secondary" onClick={() => setAddModal('income')}>
              <Plus size={14} /> Ingreso
            </Button>
            <Button size="sm" onClick={() => setAddModal('expense')}>
              <Plus size={14} /> Egreso
            </Button>
          </div>
        </div>

        {loading || !summary ? (
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map((i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KPI
                icon={ArrowUpCircle}
                label="Ingresos"
                value={formatCOP(summary.income)}
                trend={incomeTrend}
                color="text-salvaje-success"
              />
              <KPI
                icon={ArrowDownCircle}
                label="Egresos"
                value={formatCOP(summary.expense)}
                trend={-expenseTrend}
                color="text-salvaje-danger"
              />
              <KPI
                icon={DollarSign}
                label="Utilidad"
                value={formatCOP(summary.profit)}
                color={summary.profit >= 0 ? 'text-salvaje-orange' : 'text-salvaje-danger'}
                bold
              />
            </div>

            {/* Chart */}
            <Card>
              <CardBody className="py-4">
                <p className="font-display text-base uppercase text-salvaje-dark mb-3">Histórico (6 meses)</p>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8D9C0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="#A89684" />
                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} stroke="#A89684" />
                    <Tooltip
                      contentStyle={{ background: '#1A0F0A', border: 'none', borderRadius: 8, color: '#FAF6F0', fontSize: 12 }}
                      formatter={(v, name) => [formatCOP(v), { income: 'Ingresos', expense: 'Egresos', profit: 'Utilidad' }[name]]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, fontFamily: 'DM Sans' }}
                      formatter={(v) => ({ income: 'Ingresos', expense: 'Egresos', profit: 'Utilidad' }[v] || v)}
                    />
                    <Bar dataKey="income"  fill="#3F8E5C" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#9D2A1F" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="profit" stroke="#D4521A" strokeWidth={2} dot={{ fill: '#D4521A', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            {/* Movimientos */}
            <Card>
              <CardBody className="py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display text-base uppercase text-salvaje-dark">Movimientos del mes</p>
                  <Badge variant="default">{summary.entries.length} movimientos</Badge>
                </div>
                {summary.entries.length === 0 ? (
                  <p className="font-body text-sm text-salvaje-gray text-center py-6">Sin movimientos este mes</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-body">
                      <thead className="border-b border-salvaje-cream">
                        <tr>
                          <th className="text-left px-2 py-2 text-salvaje-gray">Fecha</th>
                          <th className="text-left px-2 py-2 text-salvaje-gray">Tipo</th>
                          <th className="text-left px-2 py-2 text-salvaje-gray">Descripción</th>
                          <th className="text-right px-2 py-2 text-salvaje-gray">Monto</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.entries.map((e) => (
                          <tr key={e.id} className="border-b border-salvaje-cream hover:bg-salvaje-light/30">
                            <td className="px-2 py-2 font-mono text-xs">{e.date?.toDate ? formatShortDate(e.date.toDate()) : '—'}</td>
                            <td className="px-2 py-2">
                              <Badge variant={e.type === 'income' ? 'success' : 'danger'}>
                                {e.type === 'income' ? 'Ingreso' : 'Egreso'}
                              </Badge>
                            </td>
                            <td className="px-2 py-2">
                              <p className="text-salvaje-dark">{e.description}</p>
                              <p className="text-[10px] text-salvaje-gray">
                                {CASHFLOW_CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                                {e.isAutomatic && <span className="ml-1 text-salvaje-orange">· auto</span>}
                              </p>
                            </td>
                            <td className={`text-right px-2 py-2 font-mono font-semibold ${e.type === 'income' ? 'text-salvaje-success' : 'text-salvaje-danger'}`}>
                              {e.type === 'income' ? '+' : '-'} {formatCOP(e.amount)}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {e.source !== 'derived' && (
                                <button
                                  onClick={() => handleDelete(e.id, e.source)}
                                  className="p-1.5 rounded-lg hover:bg-salvaje-danger/10 text-salvaje-gray hover:text-salvaje-danger"
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>

      {/* Add expense/income modal */}
      <Modal
        open={!!addModal}
        onClose={() => setAddModal(null)}
        title={addModal === 'income' ? 'Agregar ingreso' : 'Agregar egreso'}
      >
        <div className="px-5 pb-5 space-y-3">
          {addModal === 'expense' && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">Categoría</label>
              <select
                value={form.category}
                onChange={set('category')}
                className="px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
              >
                {CASHFLOW_CATEGORIES.filter((c) => c.value !== 'coach_payroll').map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}
          <Input label="Descripción *" value={form.description} onChange={set('description')} placeholder={addModal === 'income' ? 'Ej: Patrocinio Adidas' : 'Ej: Pago arriendo enero'} />
          <Input label="Monto (COP) *" type="number" value={form.amount} onChange={set('amount')} placeholder="500000" />
          <Input label="Fecha" type="date" value={form.date} onChange={set('date')} />
          <Button className="w-full" loading={saving} onClick={handleAdd}>
            <Plus size={14} /> Registrar {addModal === 'income' ? 'ingreso' : 'egreso'}
          </Button>
        </div>
      </Modal>
    </AdminShell>
  )
}

function KPI({ icon: Icon, label, value, trend, color, bold }) {
  return (
    <Card>
      <CardBody className="py-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} className={color} />
          <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest">{label}</p>
        </div>
        <p className={`font-display ${bold ? 'text-3xl' : 'text-2xl'} ${color} leading-tight`}>{value}</p>
        {typeof trend === 'number' && trend !== 0 && (
          <p className="font-body text-[11px] mt-1">
            {trend >= 0
              ? <span className="text-salvaje-success">▲ +{trend.toFixed(0)}% vs mes anterior</span>
              : <span className="text-salvaje-danger">▼ {trend.toFixed(0)}% vs mes anterior</span>}
          </p>
        )}
      </CardBody>
    </Card>
  )
}
