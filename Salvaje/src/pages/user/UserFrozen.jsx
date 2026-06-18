import { useState, useEffect } from 'react'
import { Snowflake, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { requestUnfreeze } from '../../services/users.service'
import { createNotification } from '../../services/notifications.service'
import { notifyAllAdmins } from '../../services/admin-notifications.service'

export function UserFrozen() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)

  // Admin descongeló la cuenta en tiempo real → redirigir al inicio
  useEffect(() => {
    if (profile && !profile.isFrozen) {
      navigate('/app', { replace: true })
    }
  }, [profile?.isFrozen])

  const frozenAt = profile?.frozenAt?.toDate
    ? profile.frozenAt.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const freezeEnd = profile?.freezeEndDate?.toDate
    ? profile.freezeEndDate.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const handleRequestUnfreeze = async () => {
    setSending(true)
    try {
      await requestUnfreeze(user.uid, '')
      notifyAllAdmins({
        type: 'unfreeze_requested',
        title: `${profile?.displayName || 'Un usuario'} quiere descongelar su membresía`,
        body: 'Solicita volver antes de que termine el período de congelamiento.',
        senderId: user.uid,
        senderName: profile?.displayName || 'Usuario',
        senderRole: 'user',
        senderPhotoURL: profile?.profilePhotoURL || null,
        relatedId: user.uid,
        relatedCollection: 'users',
        actionType: 'view_user',
        actionUrl: '/admin/users',
      }).catch((e) => console.warn('[unfreeze] admin notif failed:', e))
      createNotification({
        recipientId: user.uid,
        recipientRole: 'user',
        type: 'unfreeze_requested',
        title: 'Solicitud enviada',
        body: 'Tu solicitud de descongelamiento fue enviada. El admin la revisará pronto.',
        senderRole: 'system',
        senderName: 'SALVAJE',
      }).catch(() => {})
      toast.success('Solicitud enviada. El admin te responderá pronto.')
    } catch (e) {
      console.error('[requestUnfreeze]', e?.code, e?.message)
      toast.error('No pudimos enviar la solicitud. Reintenta.')
    }
    setSending(false)
  }

  const alreadyRequested = profile?.freezeStatus === 'unfreeze_requested'

  return (
    <AppShell title="Membresía Congelada" noScroll>
      <div className="flex-1 flex items-center justify-center px-4 py-4 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Card>
            <CardBody className="py-6 space-y-4">
              {/* Icono + título */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Snowflake size={32} className="text-blue-500" />
                </div>
                <h1 className="font-display text-2xl uppercase text-salvaje-dark">Membresía Congelada</h1>
                {frozenAt && (
                  <p className="font-body text-xs text-salvaje-gray">Desde el {frozenAt}</p>
                )}
                {freezeEnd && (
                  <p className="font-body text-xs text-salvaje-gray">Hasta el {freezeEnd}</p>
                )}
                {profile?.freezeReason && (
                  <p className="font-body text-xs text-salvaje-gray italic">"{profile.freezeReason}"</p>
                )}
              </div>

              {/* Descripción */}
              <p className="font-body text-sm text-salvaje-gray text-center leading-relaxed">
                Mientras esté congelada no puedes reservar clases. Si quieres volver antes, solicita el descongelamiento.
              </p>

              {/* Acción */}
              {alreadyRequested ? (
                <div className="bg-salvaje-orange/10 border border-salvaje-orange/20 rounded-xl px-4 py-3 text-center">
                  <p className="font-display text-sm uppercase text-salvaje-orange">Solicitud en revisión</p>
                  <p className="font-body text-xs text-salvaje-gray mt-0.5">El admin te notificará pronto.</p>
                </div>
              ) : (
                <Button className="w-full" loading={sending} onClick={handleRequestUnfreeze}>
                  <MessageCircle size={16} /> Solicitar descongelamiento
                </Button>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </AppShell>
  )
}
