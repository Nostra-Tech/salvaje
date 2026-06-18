import { useState } from 'react'
import { Snowflake, Check, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { approveFreeze, rejectFreeze } from '../../services/users.service'

export function AdminFreezeModal({ user, open, onClose, onSaved }) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    try {
      await approveFreeze(user.id, note.trim())
      toast.success('Membresía congelada a partir de mañana')
      onSaved?.()
      onClose()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      await rejectFreeze(user.id)
      toast.success('Solicitud rechazada')
      onSaved?.()
      onClose()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Modal open={open} onClose={onClose} title="Solicitud de congelación" size="sm">
      <div className="px-5 pb-5 space-y-4">
        {/* Usuario */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-salvaje-light">
          <Avatar src={user.profilePhotoURL} name={user.displayName || user.email} size="sm" />
          <div className="min-w-0">
            <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{user.displayName || 'Sin nombre'}</p>
            <p className="font-body text-xs text-salvaje-gray truncate">{user.email}</p>
          </div>
        </div>

        {/* Días solicitados + motivo */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <Snowflake size={15} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-[11px] font-body font-semibold uppercase tracking-wide text-blue-500">Solicitud</p>
            <p className="text-sm font-body text-blue-900 font-semibold">
              {user.freezeDaysRequested || 7} días de congelación
            </p>
            {user.freezeReason && (
              <p className="text-xs font-body text-blue-700">Motivo: {user.freezeReason}</p>
            )}
          </div>
        </div>

        <p className="text-xs font-body text-salvaje-gray">
          Si apruebas, la congelación inicia <strong>mañana</strong> por{' '}
          <strong>{user.freezeDaysRequested || 7} días</strong>.
        </p>

        {/* Nota opcional */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota para el usuario (opcional)..."
          className="w-full px-3 py-2 rounded-xl border border-salvaje-cream text-sm font-body focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 resize-none h-16"
        />

        {/* Acciones */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1 text-salvaje-danger border-salvaje-cream hover:bg-salvaje-danger/5"
            loading={loading}
            onClick={handleReject}
          >
            <XCircle size={15} /> Rechazar
          </Button>
          <Button
            className="flex-1"
            loading={loading}
            onClick={handleApprove}
          >
            <Check size={15} /> Aprobar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
