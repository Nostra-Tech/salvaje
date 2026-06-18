import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  X, Bell, CheckCheck, CreditCard, Calendar, DollarSign,
  User as UserIcon, Zap, AlertTriangle, Award, ScanLine,
  Snowflake, PartyPopper, Video, Clock, Trophy, Flame, Trash2,
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import { Avatar } from '../ui/Avatar'
import { formatRelative } from '../../utils/formatters'

function iconForType(type) {
  if (type?.includes('polla')) return Trophy
  if (type?.includes('mock')) return Flame
  if (type?.includes('payment')) return CreditCard
  if (type?.includes('class')) return Calendar
  if (type?.includes('payroll')) return DollarSign
  if (type?.includes('referral')) return Award
  if (type?.includes('checkin') || type === 'scan_qr') return ScanLine
  if (type?.includes('freeze') || type?.includes('unfreeze')) return Snowflake
  if (type === 'membership_expiring_soon' || type === 'membership_expiring_user') return Clock
  if (type?.includes('birthday')) return PartyPopper
  if (type?.includes('video')) return Video
  if (type?.startsWith('admin_broadcast')) return Bell
  if (type === 'system_recommendation') return Zap
  if (type === 'system_alert') return AlertTriangle
  return Bell
}

function routeForNotif(notif, role) {
  // Freeze / unfreeze requests: go directly to that user's drawer
  if ((notif.type === 'freeze_requested' || notif.type === 'freeze_requested_summary') && role === 'admin' && notif.relatedId) {
    return `/admin/users?freeze=${notif.relatedId}`
  }
  if (notif.type === 'unfreeze_requested' && role === 'admin' && notif.relatedId) {
    return `/admin/users?user=${notif.relatedId}`
  }
  if (notif.actionUrl) return notif.actionUrl
  if (notif.relatedCollection === 'membership_purchases' && role === 'admin') return '/admin/payments'
  if (notif.relatedCollection === 'classes')
    return role === 'admin' ? '/admin/classes' : role === 'coach' ? '/coach/classes' : '/app/classes'
  if (notif.type === 'payroll_paid' && role === 'coach') return '/coach/payroll'
  if (notif.type === 'payroll_due' && role === 'admin') return '/admin/payroll'
  if (notif.type === 'referral_reward') return '/app/membership'
  if (notif.type === 'profile_updated' && role === 'admin') return '/admin/users'
  if (notif.type === 'freeze_requested' && role === 'admin') return '/admin/users'
  if (notif.type === 'unfreeze_requested' && role === 'admin') return '/admin/users'
  if (notif.type === 'freeze_approved' || notif.type === 'freeze_rejected') return '/app/membership'
  if (notif.type === 'unfreeze_approved') return '/app'
  if (notif.type === 'birthday_greeting') return '/app'
  if (notif.type === 'birthday_today' && notif.relatedId && (role === 'admin' || role === 'coach')) return `/admin/users?user=${notif.relatedId}`
  if (notif.type?.includes('video')) return role === 'user' ? '/app/videos' : null
  if (notif.type === 'new_event') return role === 'user' ? '/app/events' : role === 'coach' ? '/coach/events' : null
  return null
}

const ACTION_LABELS = {
  approve_payment: 'Ver y aprobar',
  view: 'Ver',
  view_class: 'Ver clase',
  view_user: 'Ver usuario',
}

const ROLE_LABELS = { user: 'Usuario', coach: 'Coach', admin: 'Admin', system: 'Sistema' }
const ROLE_COLORS = { user: 'bg-salvaje-gold/15 text-salvaje-gold', coach: 'bg-salvaje-success/15 text-salvaje-success', admin: 'bg-salvaje-orange/15 text-salvaje-orange', system: 'bg-salvaje-brown/15 text-salvaje-brown' }

export function NotificationPanel() {
  const { notificationPanelOpen, setNotificationPanelOpen } = useUIStore()
  const { user, role } = useAuth()
  const { notifications, unreadCount, read, readAll, remove, removeAll } = useNotifications(user?.uid)
  const navigate = useNavigate()

  const handleClick = (notif) => {
    if (!notif.isRead) read(notif.id)
    const route = routeForNotif(notif, role)
    if (route) {
      setNotificationPanelOpen(false)
      navigate(route)
    }
  }

  const handleClearAll = () => {
    if (notifications.length === 0) return
    if (window.confirm('¿Eliminar todas las notificaciones? Esta acción no se puede deshacer.')) {
      removeAll().catch(() => {})
    }
  }

  return (
    <AnimatePresence>
      {notificationPanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-salvaje-dark/40 backdrop-blur-sm z-40"
            onClick={() => setNotificationPanelOpen(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-salvaje-lg z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-salvaje-cream">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-salvaje-orange" />
                <h2 className="font-display text-xl uppercase text-salvaje-dark">Notificaciones</h2>
                {unreadCount > 0 && (
                  <span className="bg-salvaje-orange text-white text-xs font-mono rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={readAll} className="p-1.5 rounded-lg hover:bg-salvaje-light transition-colors text-salvaje-gray" title="Marcar todas como leídas">
                    <CheckCheck size={16} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={handleClearAll} className="p-1.5 rounded-lg hover:bg-salvaje-danger/10 transition-colors text-salvaje-gray hover:text-salvaje-danger" title="Eliminar todas">
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={() => setNotificationPanelOpen(false)} className="p-1.5 rounded-lg hover:bg-salvaje-light transition-colors text-salvaje-gray">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                  <Bell size={40} className="text-salvaje-cream mb-3" />
                  <p className="font-display text-lg uppercase text-salvaje-dark">Sin notificaciones</p>
                  <p className="text-sm font-body text-salvaje-gray mt-1">Aquí aparecerán tus alertas</p>
                </div>
              ) : (
                <div className="divide-y divide-salvaje-cream">
                  {notifications.map((notif) => (
                    <NotifItem key={notif.id} notif={notif} role={role} onClick={() => handleClick(notif)} onRemove={() => remove(notif.id)} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function NotifItem({ notif, role, onClick, onRemove }) {
  const TypeIcon = iconForType(notif.type)
  const senderRole = notif.senderRole || 'system'
  const senderName = notif.senderName || 'SALVAJE'
  const showSender = !!notif.senderName && notif.senderName !== 'SALVAJE'

  return (
    <div className={`group relative transition-colors hover:bg-salvaje-light/50 ${!notif.isRead ? 'bg-salvaje-orange/5' : ''}`}>
      <button
        onClick={onClick}
        className="w-full text-left px-4 py-3 pr-10"
      >
      <div className="flex items-start gap-3">
        {/* Avatar / Icon */}
        {showSender ? (
          <div className="relative flex-shrink-0">
            <Avatar src={notif.senderPhotoURL} name={senderName} size="sm" />
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${ROLE_COLORS[senderRole] || ROLE_COLORS.system}`}>
              <TypeIcon size={11} />
            </div>
          </div>
        ) : (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${!notif.isRead ? 'bg-salvaje-orange/15 text-salvaje-orange' : 'bg-salvaje-light text-salvaje-gray'}`}>
            <TypeIcon size={16} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header: sender + role + time */}
          {showSender && (
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="font-body text-xs font-semibold text-salvaje-dark">{senderName}</span>
              <span className={`px-1.5 py-px rounded-full text-[9px] font-mono uppercase tracking-wider ${ROLE_COLORS[senderRole]}`}>
                {ROLE_LABELS[senderRole] || senderRole}
              </span>
              <span className="font-mono text-[10px] text-salvaje-gray">· {formatRelative(notif.createdAt)}</span>
            </div>
          )}
          {/* Title + body */}
          <p className="text-sm font-semibold font-body text-salvaje-dark leading-snug">{notif.title}</p>
          <p className="text-xs font-body text-salvaje-gray mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>
          {/* CTA + relative time (when no sender) */}
          <div className="flex items-center justify-between mt-1.5">
            {!showSender && (
              <span className="text-[10px] font-mono text-salvaje-gray/60">{formatRelative(notif.createdAt)}</span>
            )}
            {notif.actionType && (
              <span className="text-[11px] font-body font-semibold text-salvaje-orange flex items-center gap-0.5 ml-auto">
                {ACTION_LABELS[notif.actionType] || 'Ver'} →
              </span>
            )}
          </div>
        </div>
        {!notif.isRead && <div className="w-2 h-2 rounded-full bg-salvaje-orange mt-2 flex-shrink-0" />}
      </div>
      </button>
      {/* Botón eliminar */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        title="Eliminar notificación"
        className="absolute right-2 top-2 p-1.5 rounded-lg text-salvaje-gray/60 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-salvaje-danger/10 hover:text-salvaje-danger transition-all"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
