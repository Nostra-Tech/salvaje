import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Calendar, QrCode, TrendingUp, User, Dumbbell, ClipboardList, DollarSign, LogOut, Gift, ScanLine, Play, Video, Snowflake, Star } from 'lucide-react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Footer } from './Footer'
import { NotificationPanel } from '../notifications/NotificationPanel'
import { AchievementUnlockedModal } from '../user/AchievementUnlockedModal'
import { BattleSurveyModal } from '../user/BattleSurveyModal'
import { BirthdayModal } from '../user/BirthdayModal'
import { Logo } from '../ui/Logo'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../hooks/useAuth'
import { useActivityTracker } from '../../hooks/useActivityTracker'
import { useBirthday } from '../../hooks/useBirthday'
import { useFreezeExpiry } from '../../hooks/useFreezeExpiry'
import { useMembershipExpiry } from '../../hooks/useMembershipExpiry'
import { logout } from '../../services/auth.service'
import { isUserLocked } from '../../utils/permissions'

const userNavItems = [
  { to: '/app',            icon: Home,         label: 'Inicio',     end: true },
  { to: '/app/classes',    icon: Calendar,     label: 'Clases' },
  { to: '/app/videos',     icon: Play,         label: 'Videos' },
  { to: '/app/events',     icon: Star,         label: 'Eventos' },
  { to: '/app/progress',   icon: TrendingUp,   label: 'Progreso' },
  { to: '/app/membership', icon: ClipboardList, label: 'Membresia' },
  { to: '/app/referrals',  icon: Gift,         label: 'Referidos' },
  { to: '/app/profile',    icon: User,         label: 'Perfil' },
]

// Locked-user nav: only payment + profile.
const lockedUserNavItems = [
  { to: '/app/membership', icon: ClipboardList, label: 'Activar plan', end: true },
  { to: '/app/profile',    icon: User,          label: 'Perfil' },
]

// Frozen-user nav: profile + unfreeze request.
const frozenNavItems = [
  { to: '/app/profile', icon: User,      label: 'Perfil' },
  { to: '/app/frozen',  icon: Snowflake, label: 'Descongelar' },
]

const coachNavItems = [
  { to: '/coach',          icon: Home,         label: 'Inicio',     end: true },
  { to: '/coach/checkin',  icon: ScanLine,     label: 'Registrar Ingreso' },
  { to: '/coach/classes',  icon: Dumbbell,     label: 'Mis Clases' },
  { to: '/coach/videos',   icon: Video,        label: 'Videos' },
  { to: '/coach/events',   icon: Star,         label: 'Eventos' },
  { to: '/coach/plan',     icon: ClipboardList, label: 'Plan Semanal' },
  { to: '/coach/payroll',  icon: DollarSign,   label: 'Mi Nomina' },
  { to: '/coach/profile',  icon: User,         label: 'Perfil' },
]

export function AppShell({ title, children, hideNav = false, noScroll = false }) {
  const { profile, user, role } = useAuth()
  const navigate = useNavigate()
  useActivityTracker()
  const { showBirthdayModal, closeBirthdayModal } = useBirthday()
  useFreezeExpiry()
  useMembershipExpiry()
  const userLocked = role === 'user' && isUserLocked(profile)
  const userFrozen = role === 'user' && !!profile?.isFrozen
  const effectiveHideNav = hideNav
  const navItems = role === 'coach'
    ? coachNavItems
    : userFrozen ? frozenNavItems
    : userLocked ? lockedUserNavItems
    : userNavItems
  const roleLabel = role === 'coach' ? 'Coach' : 'Atleta'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen h-dvh bg-salvaje-light overflow-hidden">
      {/* Sidebar — desktop only */}
      {!effectiveHideNav && (
        <aside className="hidden lg:flex flex-col w-64 bg-salvaje-brown min-h-screen fixed left-0 top-0 bottom-0 z-30">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
            <Logo size={36} bg="#F4EFE5" />
            <div>
              <p className="font-display text-white text-lg uppercase tracking-wide leading-none">Salvaje</p>
              <p className="font-body text-white/40 text-[10px] uppercase tracking-widest">{roleLabel}</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-hide">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-salvaje-orange text-white'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.75} />
                <span className="font-body text-sm font-medium">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User footer */}
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <Avatar src={profile?.profilePhotoURL} name={profile?.displayName || user?.email} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-body text-white text-sm font-medium truncate">{profile?.displayName || roleLabel}</p>
                <p className="font-body text-white/40 text-xs truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all text-sm font-body"
            >
              <LogOut size={16} />
              Cerrar sesion
            </button>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className={`flex-1 ${!effectiveHideNav ? 'lg:ml-64' : ''} flex flex-col h-full overflow-hidden`}>
        <TopBar title={title} />
        <main className={`flex-1 min-w-0 flex flex-col ${noScroll ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className="flex-1">{children}</div>
          {!noScroll && <Footer />}
        </main>
        {!effectiveHideNav && <BottomNav />}
      </div>

      <NotificationPanel />
      {/* V6 Ajuste 1 — pop achievement modal whenever a new one is unlocked. */}
      <AchievementUnlockedModal />
      {/* V6 Ajuste 9 — pop battle-survey modal when there's a pending one. */}
      <BattleSurveyModal />
      <BirthdayModal open={showBirthdayModal} onClose={closeBirthdayModal} name={profile?.displayName} />
    </div>
  )
}
