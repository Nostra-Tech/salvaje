import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, Calendar, TrendingUp, User, Dumbbell, ClipboardList,
  DollarSign, LayoutDashboard, Users, ScanLine, MoreHorizontal,
  Lock, Play, Video, Snowflake, Star, Gift,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { AdminMoreDrawer } from '../admin/AdminMoreDrawer'
import { MoreDrawer } from './MoreDrawer'
import { isUserLocked } from '../../utils/permissions'

// Main 4 tabs shown always
const userTabs = [
  { to: '/app',          icon: Home,     label: 'Inicio', end: true },
  { to: '/app/classes',  icon: Calendar, label: 'Clases' },
  { to: '/app/events',   icon: Star,     label: 'Eventos' },
  { to: '/app/profile',  icon: User,     label: 'Perfil' },
]
// Extra items in the "Más" drawer
const userMoreItems = [
  { to: '/app/videos',     icon: Play,          label: 'Videos' },
  { to: '/app/progress',   icon: TrendingUp,    label: 'Progreso' },
  { to: '/app/membership', icon: ClipboardList, label: 'Membresía' },
  { to: '/app/referrals',  icon: Gift,          label: 'Referidos' },
]

const lockedUserTabs = [
  { to: '/app/membership', icon: Lock, label: 'Activar', end: true },
  { to: '/app/profile', icon: User, label: 'Perfil' },
]

const frozenUserTabs = [
  { to: '/app/profile', icon: User,      label: 'Perfil' },
  { to: '/app/frozen',  icon: Snowflake, label: 'Descongelar' },
]

// Main 4 coach tabs shown always
const coachTabs = [
  { to: '/coach',          icon: Home,    label: 'Inicio', end: true },
  { to: '/coach/checkin',  icon: ScanLine, label: 'Registrar' },
  { to: '/coach/classes',  icon: Dumbbell, label: 'Clases' },
  { to: '/coach/profile',  icon: User,     label: 'Perfil' },
]
// Extra items in coach "Más" drawer
const coachMoreItems = [
  { to: '/coach/events',  icon: Star,          label: 'Eventos' },
  { to: '/coach/videos',  icon: Video,         label: 'Videos' },
  { to: '/coach/plan',    icon: ClipboardList, label: 'Plan Semanal' },
  { to: '/coach/payroll', icon: DollarSign,    label: 'Mi Nómina' },
]

// Admin: 4 tabs + "Más" (drawer with the rest)
const adminMobileTabs = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/users', icon: Users, label: 'Usuarios' },
  { to: '/admin/classes', icon: Calendar, label: 'Clases' },
  { to: '/admin/finances', icon: DollarSign, label: 'Finanzas' },
]

function TabBar({ tabs, onMore, moreActive }) {
  return (
    <nav className="w-full bg-salvaje-brown safe-bottom lg:hidden flex-shrink-0">
      <div className="flex items-stretch h-16">
        {tabs.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
                isActive ? 'text-salvaje-orange' : 'text-white/40 hover:text-white/70'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.75} />
            <span className="text-[9px] font-body font-medium uppercase tracking-wider leading-none">{label}</span>
          </NavLink>
        ))}
        {onMore && (
          <button
            onClick={onMore}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
              moreActive ? 'text-salvaje-orange' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <MoreHorizontal size={20} strokeWidth={1.75} />
            <span className="text-[9px] font-body font-medium uppercase tracking-wider leading-none">Más</span>
          </button>
        )}
      </div>
    </nav>
  )
}

export function BottomNav() {
  const { role, profile } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()

  const userLocked = role === 'user' && isUserLocked(profile)
  const userFrozen = role === 'user' && !!profile?.isFrozen

  // Admin
  if (role === 'admin' || role === 'superadmin') {
    return (
      <>
        <TabBar tabs={adminMobileTabs} onMore={() => setMoreOpen(true)} moreActive={moreOpen} />
        <AdminMoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
      </>
    )
  }

  // Coach — 4 main tabs + Más drawer
  if (role === 'coach') {
    return (
      <>
        <TabBar tabs={coachTabs} onMore={() => setMoreOpen(true)} moreActive={moreOpen} />
        <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} items={coachMoreItems} />
      </>
    )
  }

  // Frozen or locked user — no "Más"
  if (userFrozen) {
    return <TabBar tabs={frozenUserTabs} />
  }
  if (userLocked) {
    return <TabBar tabs={lockedUserTabs} />
  }

  // Normal user — 4 main tabs + Más drawer
  return (
    <>
      <TabBar tabs={userTabs} onMore={() => setMoreOpen(true)} moreActive={moreOpen} />
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} items={userMoreItems} />
    </>
  )
}
