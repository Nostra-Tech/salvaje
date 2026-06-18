import { useState, useEffect } from 'react'
import { Shield, Plus, Pencil, Star } from 'lucide-react'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { AdminMembershipModal } from '../../components/admin/AdminMembershipModal'
import { getMembershipCatalog } from '../../services/membership.service'
import { formatCOP } from '../../utils/formatters'

const typeLabel = { monthly: 'Mensual', ticketera: 'Ticketera', free_trial: 'Cortesía' }

export function AdminMemberships() {
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  const fetch = () => {
    setLoading(true)
    getMembershipCatalog().then((c) => {
      const sorted = [...c].sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99))
      setCatalog(sorted)
      setLoading(false)
    })
  }

  useEffect(() => { fetch() }, [])

  return (
    <AdminShell title="Membresías">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Shield size={28} className="text-salvaje-orange" />
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Membresías</h1>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Nueva membresía
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
        ) : catalog.length === 0 ? (
          <EmptyState icon={Shield} title="Sin planes" description="Crea el primer plan con el botón arriba" />
        ) : (
          <div className="space-y-3">
            {catalog.map((plan) => (
              <Card key={plan.id} className={!plan.isActive ? 'opacity-60' : ''}>
                <CardBody className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display text-xl uppercase text-salvaje-dark">{plan.name}</p>
                        {plan.isHighlighted && (
                          <Badge variant="orange"><Star size={10} className="inline mr-0.5" />Recomendado</Badge>
                        )}
                        {!plan.isActive && <Badge variant="gray">Inactivo</Badge>}
                      </div>
                      {plan.description && (
                        <p className="font-body text-xs text-salvaje-gray mt-0.5">{plan.description}</p>
                      )}
                      {plan.features?.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {plan.features.slice(0, 4).map((f) => (
                            <Badge key={f} variant="default">{f}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display text-3xl text-salvaje-orange leading-tight">{formatCOP(plan.priceAsCOP || plan.price || 0)}</p>
                      {plan.originalPrice > 0 && plan.originalPrice !== plan.price && (
                        <p className="font-body text-xs text-salvaje-gray line-through">{formatCOP(plan.originalPrice)}</p>
                      )}
                      <Badge variant="default" className="mt-1">{typeLabel[plan.type]}</Badge>
                      <button
                        onClick={() => setEditing(plan)}
                        className="block ml-auto mt-2 p-2 rounded-lg hover:bg-salvaje-orange/10 text-salvaje-gray hover:text-salvaje-orange transition-colors"
                        title="Editar plan"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AdminMembershipModal
        plan={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={fetch}
        mode="edit"
      />
      <AdminMembershipModal
        plan={null}
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={fetch}
        mode="create"
      />
    </AdminShell>
  )
}
