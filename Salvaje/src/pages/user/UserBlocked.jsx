import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldX, LogOut, CreditCard, Calendar, Bell, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { Logo } from '../../components/ui/Logo'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { logout } from '../../services/auth.service'
import { requestUnblock, requestClassAccess } from '../../services/users.service'

export function UserBlocked() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)
  const [sendingAccess, setSendingAccess] = useState(false)
  // Local flags so the "En revisión" state appears immediately after tap,
  // without waiting for Firestore propagation.
  const [sentUnblock, setSentUnblock] = useState(false)
  const [sentAccess, setSentAccess] = useState(false)

  const isNonPayment = profile?.blockType === 'non_payment'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const handleRequestUnblock = async () => {
    setSending(true)
    try {
      await requestUnblock(user.uid, profile?.displayName)
      setSentUnblock(true)
      toast.success('Solicitud enviada. El administrador la revisará pronto.')
    } catch {
      toast.error('No pudimos enviar la solicitud. Intenta de nuevo.')
    }
    setSending(false)
  }

  const handleRequestClassAccess = async () => {
    setSendingAccess(true)
    try {
      await requestClassAccess(user.uid, profile?.displayName)
      setSentAccess(true)
      toast.success('Solicitud enviada. El coach o admin la aprobará pronto.')
    } catch {
      toast.error('No pudimos enviar la solicitud. Intenta de nuevo.')
    }
    setSendingAccess(false)
  }

  // Either real-time Firestore update OR local flag = already sent
  const unblockAlreadySent = sentUnblock || profile?.unblockRequested
  const accessAlreadySent = sentAccess || profile?.classAccessRequested

  return (
    <div className="min-h-screen min-h-dvh bg-salvaje-dark flex flex-col items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center max-w-sm w-full text-center space-y-5">
        <Logo size={48} bg="#F4EFE5" />

        <div className="w-16 h-16 rounded-full bg-salvaje-danger/10 flex items-center justify-center">
          <ShieldX size={32} className="text-salvaje-danger" />
        </div>

        {/* Title and reason */}
        <div className="space-y-1.5">
          <h1 className="font-display text-3xl uppercase text-white">
            {isNonPayment ? 'Pago pendiente' : 'Cuenta suspendida'}
          </h1>
          <p className="font-body text-white/60 text-sm leading-relaxed">
            {isNonPayment
              ? 'Tu acceso está restringido por un pago de membresía pendiente.'
              : 'Tu cuenta ha sido suspendida temporalmente por el administrador.'}
          </p>
          {profile?.blockReason && (
            <div className="mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-xs font-body text-salvaje-gold uppercase tracking-wide mb-1">Motivo</p>
              <p className="font-body text-sm text-white/80">{profile.blockReason}</p>
            </div>
          )}
        </div>

        {/* ── NON-PAYMENT FLOW ── */}
        {isNonPayment && (
          <div className="w-full space-y-3">
            {/* Option 1: Pay */}
            <button
              onClick={() => navigate('/app/membership')}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-salvaje-orange/20 border border-salvaje-orange/40 hover:bg-salvaje-orange/30 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-salvaje-orange/20 flex items-center justify-center flex-shrink-0">
                <CreditCard size={20} className="text-salvaje-orange" />
              </div>
              <div>
                <p className="font-body text-sm font-semibold text-salvaje-orange">Pagar membresía</p>
                <p className="font-body text-xs text-white/50">Activa tu plan y recupera el acceso completo</p>
              </div>
            </button>

            {/* Option 2: Request class access */}
            {accessAlreadySent ? (
              <div className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-salvaje-gold/10 border border-salvaje-gold/30 text-left">
                <div className="w-10 h-10 rounded-full bg-salvaje-gold/10 flex items-center justify-center flex-shrink-0">
                  <Clock size={18} className="text-salvaje-gold" />
                </div>
                <div>
                  <p className="font-body text-sm font-semibold text-salvaje-gold">En revisión</p>
                  <p className="font-body text-xs text-white/50">El coach o admin aprobará tu ingreso pronto</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleRequestClassAccess}
                disabled={sendingAccess}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  {sendingAccess
                    ? <div className="w-4 h-4 border border-white/50 border-t-transparent rounded-full animate-spin" />
                    : <Calendar size={20} className="text-white/70" />
                  }
                </div>
                <div>
                  <p className="font-body text-sm font-semibold text-white/80">Solicitar acceso a clase</p>
                  <p className="font-body text-xs text-white/50">El coach o admin puede aprobar tu entrada</p>
                </div>
              </button>
            )}
          </div>
        )}

        {/* ── OTHER BLOCK FLOW ── */}
        {!isNonPayment && (
          <div className="w-full">
            {unblockAlreadySent ? (
              <div className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-salvaje-gold/10 border border-salvaje-gold/30">
                <div className="w-10 h-10 rounded-full bg-salvaje-gold/10 flex items-center justify-center flex-shrink-0">
                  <Clock size={18} className="text-salvaje-gold" />
                </div>
                <div className="text-left">
                  <p className="font-body text-sm font-semibold text-salvaje-gold">En revisión</p>
                  <p className="font-body text-xs text-white/50">El administrador revisará tu caso y te notificará</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleRequestUnblock}
                disabled={sending}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-salvaje-orange/15 border border-salvaje-orange/30 hover:bg-salvaje-orange/25 transition-colors text-left disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-full bg-salvaje-orange/20 flex items-center justify-center flex-shrink-0">
                  {sending
                    ? <div className="w-4 h-4 border border-salvaje-orange border-t-transparent rounded-full animate-spin" />
                    : <Bell size={20} className="text-salvaje-orange" />
                  }
                </div>
                <div>
                  <p className="font-body text-sm font-semibold text-salvaje-orange">Solicitar revisión</p>
                  <p className="font-body text-xs text-white/50">Envía una notificación al administrador</p>
                </div>
              </button>
            )}
          </div>
        )}

        <Button variant="ghost" className="w-full text-white/40 hover:text-white/70 mt-2" onClick={handleLogout}>
          <LogOut size={16} />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}
