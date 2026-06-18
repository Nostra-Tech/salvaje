import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, DollarSign, TrendingUp, ChevronRight } from 'lucide-react'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'

const sections = [
  {
    to: '/admin/payments',
    icon: CreditCard,
    label: 'Pagos Pendientes',
    desc: 'Confirmar o rechazar pagos de membresías',
    color: 'bg-salvaje-orange/10 text-salvaje-orange',
  },
  {
    to: '/admin/payroll',
    icon: DollarSign,
    label: 'Nómina',
    desc: 'Aprobar y pagar nómina quincenal de coaches',
    color: 'bg-salvaje-success/10 text-salvaje-success',
  },
  {
    to: '/admin/cashflow',
    icon: TrendingUp,
    label: 'Flujo de Caja',
    desc: 'Ingresos, egresos y utilidad mensual',
    color: 'bg-salvaje-brown/10 text-salvaje-brown',
  },
]

export function AdminFinances() {
  const navigate = useNavigate()
  return (
    <AdminShell title="Finanzas">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4 max-w-3xl">
        <div className="flex items-center gap-3">
          <DollarSign size={28} className="text-salvaje-orange" />
          <h1 className="font-display text-4xl uppercase text-salvaje-dark">Finanzas</h1>
        </div>

        <div className="space-y-3">
          {sections.map(({ to, icon: Icon, label, desc, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full text-left"
            >
              <Card hover>
                <CardBody className="py-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg uppercase text-salvaje-dark leading-tight">{label}</p>
                    <p className="font-body text-xs text-salvaje-gray mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight size={18} className="text-salvaje-gray flex-shrink-0" />
                </CardBody>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </AdminShell>
  )
}
