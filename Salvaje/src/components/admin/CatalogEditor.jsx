import { useState } from 'react'
import { Plus, Trash2, RotateCcw, Save, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { Card, CardBody } from '../ui/Card'
import { saveCatalog } from '../../services/catalogs.service'

/**
 * Generic editable catalog list with soft-delete + restore + revert.
 * Props: name, label, desc, items, adminUid, onUpdate
 */
export function CatalogEditor({ name, label, desc, items, adminUid, onUpdate }) {
  const [working, setWorking] = useState(items)
  const [history, setHistory] = useState([items]) // for revert (last 10 snapshots)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [showTrash, setShowTrash] = useState(false)

  const active = working.filter((i) => i.isActive !== false)
  const trashed = working.filter((i) => i.isActive === false)
  const dirty = JSON.stringify(working) !== JSON.stringify(items)

  const snapshot = (next) => {
    setHistory((h) => [...h.slice(-9), next])
    setWorking(next)
  }

  const addItem = () => {
    if (!newLabel.trim()) return
    const value = newLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
    if (working.find((i) => i.value === value)) {
      toast.error('Ya existe un item con ese valor')
      return
    }
    snapshot([...working, { value, label: newLabel.trim(), isActive: true }])
    setNewLabel('')
  }

  const updateLabel = (value, newLabel) => {
    snapshot(working.map((i) => i.value === value ? { ...i, label: newLabel } : i))
  }

  const softDelete = (value) => {
    snapshot(working.map((i) => i.value === value ? { ...i, isActive: false } : i))
  }

  const restore = (value) => {
    snapshot(working.map((i) => i.value === value ? { ...i, isActive: true } : i))
  }

  const purge = (value) => {
    if (!confirm('¿Eliminar permanentemente?')) return
    snapshot(working.filter((i) => i.value !== value))
  }

  const undo = () => {
    if (history.length < 2) return
    const prev = history[history.length - 2]
    setHistory((h) => h.slice(0, -1))
    setWorking(prev)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveCatalog(name, working, adminUid)
      toast.success('Catálogo guardado')
      onUpdate?.(working)
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRevertAll = () => {
    if (!confirm('¿Descartar todos los cambios?')) return
    setWorking(items)
    setHistory([items])
  }

  return (
    <Card>
      <CardBody className="py-4 space-y-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="font-display text-base uppercase text-salvaje-dark">{label}</p>
            {desc && <p className="font-body text-xs text-salvaje-gray">{desc}</p>}
          </div>
          {dirty && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={undo} disabled={history.length < 2}>
                <RotateCcw size={12} /> Deshacer
              </Button>
              <Button size="sm" variant="ghost" onClick={handleRevertAll}>
                Descartar
              </Button>
            </div>
          )}
        </div>

        {/* Active items */}
        <div className="space-y-1">
          {active.map((item) => (
            <div key={item.value} className="flex items-center gap-2 p-2 bg-salvaje-light/50 rounded-xl">
              <GripVertical size={12} className="text-salvaje-gray flex-shrink-0" />
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateLabel(item.value, e.target.value)}
                className="flex-1 bg-transparent border-0 font-body text-sm text-salvaje-dark focus:outline-none"
              />
              <span className="font-mono text-[10px] text-salvaje-gray">{item.value}</span>
              <button
                onClick={() => softDelete(item.value)}
                className="p-1 rounded hover:bg-salvaje-danger/10 text-salvaje-gray hover:text-salvaje-danger"
                title="Mover a papelera"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {active.length === 0 && (
            <p className="text-center font-body text-xs text-salvaje-gray py-2">Sin items activos</p>
          )}
        </div>

        {/* Add new */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
            placeholder="Nuevo item..."
            className="flex-1 px-3 py-2 rounded-xl border border-salvaje-cream bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30"
          />
          <Button size="sm" onClick={addItem}>
            <Plus size={12} /> Agregar
          </Button>
        </div>

        {/* Trash */}
        {trashed.length > 0 && (
          <div>
            <button
              onClick={() => setShowTrash((s) => !s)}
              className="font-body text-xs text-salvaje-gray hover:text-salvaje-dark"
            >
              {showTrash ? '▼' : '▶'} Papelera ({trashed.length})
            </button>
            {showTrash && (
              <div className="space-y-1 mt-2">
                {trashed.map((item) => (
                  <div key={item.value} className="flex items-center gap-2 p-2 bg-salvaje-cream/30 rounded-xl opacity-60">
                    <span className="flex-1 font-body text-sm text-salvaje-dark line-through">{item.label}</span>
                    <button
                      onClick={() => restore(item.value)}
                      className="px-2 py-0.5 rounded text-[10px] font-body bg-salvaje-success/10 text-salvaje-success hover:bg-salvaje-success/20"
                    >
                      Restaurar
                    </button>
                    <button
                      onClick={() => purge(item.value)}
                      className="px-2 py-0.5 rounded text-[10px] font-body bg-salvaje-danger/10 text-salvaje-danger hover:bg-salvaje-danger/20"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {dirty && (
          <Button className="w-full" loading={saving} onClick={handleSave}>
            <Save size={14} /> Guardar cambios
          </Button>
        )}
      </CardBody>
    </Card>
  )
}
