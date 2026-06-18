import { useState, useEffect } from 'react'
import { Database } from 'lucide-react'
import { Card, CardBody } from '../../ui/Card'
import { useAuth } from '../../../hooks/useAuth'
import { getCatalogs, CATALOG_LABELS } from '../../../services/catalogs.service'
import { CatalogEditor } from '../CatalogEditor'

export function CatalogsSection() {
  const { user } = useAuth()
  const [catalogs, setCatalogs] = useState({})
  const [loading, setLoading] = useState(true)

  const reload = () => {
    setLoading(true)
    getCatalogs().then((c) => { setCatalogs(c); setLoading(false) })
  }

  useEffect(() => { reload() }, [])

  return (
    <div className="space-y-3">
      <Card>
        <CardBody className="py-3 flex items-start gap-2">
          <Database size={16} className="text-salvaje-orange mt-0.5 flex-shrink-0" />
          <p className="font-body text-xs text-salvaje-dark">
            Edita las listas que aparecen en formularios. <strong>Soft-delete con papelera</strong>, deshacer último cambio y descartar todos los cambios antes de guardar.
          </p>
        </CardBody>
      </Card>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}</div>
      ) : (
        Object.entries(catalogs).map(([name, items]) => (
          <CatalogEditor
            key={name}
            name={name}
            label={CATALOG_LABELS[name]?.title || name}
            desc={CATALOG_LABELS[name]?.desc}
            items={items}
            adminUid={user?.uid}
            onUpdate={() => reload()}
          />
        ))
      )}
    </div>
  )
}
