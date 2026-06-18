import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { Logo } from '../ui/Logo'
import { useAuth } from '../../hooks/useAuth'
import { useUIStore } from '../../store/uiStore'
import { useNotifications } from '../../hooks/useNotifications'

export function TopBar({ title }) {
  const { user, profile, role } = useAuth()
  const { setNotificationPanelOpen } = useUIStore()
  const { unreadCount } = useNotifications(user?.uid)
  const navigate = useNavigate()

  const profilePath =
    role === 'coach' ? '/coach/profile' :
    role === 'user'  ? '/app/profile'   :
    null // admin/superadmin don't have a dedicated profile page

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-salvaje-cream safe-top">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          {title && (
            <span className="font-display text-lg uppercase text-salvaje-dark tracking-wide hidden sm:block">
              {title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setNotificationPanelOpen(true)}
            className="relative p-2 rounded-xl hover:bg-salvaje-light transition-colors"
          >
            <Bell size={20} className="text-salvaje-gray" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-salvaje-orange rounded-full text-white text-[9px] font-mono flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {profilePath ? (
            <button
              onClick={() => navigate(profilePath)}
              className="rounded-full hover:opacity-80 transition-opacity"
            >
              <Avatar
                src={profile?.profilePhotoURL}
                name={profile?.displayName || user?.email}
                size="sm"
              />
            </button>
          ) : (
            <Avatar
              src={profile?.profilePhotoURL}
              name={profile?.displayName || user?.email}
              size="sm"
            />
          )}
        </div>
      </div>
    </header>
  )
}
