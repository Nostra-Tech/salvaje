import { CreditCard } from 'lucide-react'
import { AdminShell } from '../../components/layout/AdminShell'
import { PaymentMethodsSection } from '../../components/admin/settings/PaymentMethodsSection'

/**
 * V6 Ajuste 24 — SuperAdmin-only CRUD for payment methods.
 * Reuses the existing PaymentMethodsSection component (Nequi/Daviplata/Bank).
 */
export function ConfigPaymentMethods() {
  return (
    <AdminShell title="Métodos de pago">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <CreditCard size={28} className="text-salvaje-orange" />
          <div>
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Métodos de pago</h1>
            <p className="font-body text-xs text-salvaje-gray">QRs, llaves y datos bancarios visibles para los usuarios al pagar.</p>
          </div>
        </div>
        <PaymentMethodsSection />
      </div>
    </AdminShell>
  )
}
