import { useState, useEffect } from 'react'
import { Dumbbell, Search, Plus, Pencil } from 'lucide-react'
import { AdminShell } from '../../components/layout/AdminShell'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card, CardBody } from '../../components/ui/Card'
import { AdminCoachModal } from '../../components/admin/AdminCoachModal'
import { getAllCoaches } from '../../services/coaches.service'
import { formatCOP } from '../../utils/formatters'

export function AdminCoaches() {
  const [coaches, setCoaches] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  const fetchCoaches = () => {
    setLoading(true)
    getAllCoaches()
      .then((c) => { setCoaches(c); setFiltered(c) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCoaches() }, [])
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(coaches.filter((c) => c.displayName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)))
  }, [search, coaches])

  return (
    <AdminShell title="Coaches">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Dumbbell size={28} className="text-salvaje-orange" />
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Coaches</h1>
            <Badge variant="default">{coaches.length} total</Badge>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Crear coach
          </Button>
        </div>

        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar coach..." icon={Search} />

        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Dumbbell} title="Sin coaches" description="Invita al primer coach con el botón arriba" />
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <Card key={c.id}>
                <CardBody className="py-3 flex items-center gap-3">
                  <Avatar src={c.profilePhotoURL} name={c.displayName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{c.displayName}</p>
                    <p className="font-body text-xs text-salvaje-gray truncate">{c.email}</p>
                    {c.specializations?.length > 0 && (
                      <p className="font-body text-[10px] text-salvaje-gray truncate mt-0.5">{c.specializations.join(' · ')}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-salvaje-orange font-semibold">{formatCOP(c.hourlyRate)}/h</p>
                    <p className="font-body text-xs text-salvaje-gray">{c.totalClassesTaught || 0} clases</p>
                  </div>
                  {!c.isActive && <Badge variant="danger">Inactivo</Badge>}
                  <button
                    onClick={() => setEditing(c)}
                    className="p-2 rounded-lg hover:bg-salvaje-orange/10 text-salvaje-gray hover:text-salvaje-orange transition-colors"
                    title="Editar coach"
                  >
                    <Pencil size={16} />
                  </button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AdminCoachModal
        coach={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={fetchCoaches}
        mode="edit"
      />
      <AdminCoachModal
        coach={null}
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={fetchCoaches}
        mode="create"
      />
    </AdminShell>
  )
}
