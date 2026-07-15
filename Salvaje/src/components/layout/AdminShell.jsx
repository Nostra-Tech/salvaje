import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Dumbbell, Calendar, CreditCard, DollarSign,
  ClipboardList, Settings, LogOut, Shield, BarChart3, History, Bell,
  TrendingUp, MessageSquare, Tag, Bot, Clock, Star, Trophy, Droplets,
} from 'lucide-react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Footer } from './Footer'
import { NotificationPanel } from '../notifications/NotificationPanel'
import { useAuth } from '../../hooks/useAuth'
import { useActivityTracker } from '../../hooks/useActivityTracker'
import { useBirthday } from '../../hooks/useBirthday'
import { useAdminAlerts } from '../../hooks/useAdminAlerts'
import { usePollaRegistrationAlerts } from '../../hooks/usePollaRegistrationAlerts'
import { useMockRegistrationAlerts } from '../../hooks/useMockRegistrationAlerts'
import { logout } from '../../services/auth.service'
import { Avatar } from '../ui/Avatar'
import { Logo } from '../ui/Logo'

const navGroups = [
  {
    label: 'Gestión',
    items: [
      { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard',       end: true },
      { to: '/admin/users',        icon: Users,           label: 'Usuarios' },
      { to: '/admin/coaches',      icon: Dumbbell,        label: 'Coaches' },
      { to: '/admin/classes',      icon: Calendar,        label: 'Clases' },
      { to: '/admin/weekly-plans', icon: ClipboardList,   label: 'Planes Semanales' },
      { to: '/admin/events',       icon: Star,            label: 'Eventos' },
    ],
  },
  {
    label: 'Financiero',
    items: [
      { to: '/admin/memberships',     icon: Shield,      label: 'Membresías' },
      { to: '/admin/payments',        icon: CreditCard,  label: 'Pagos Pendientes' },
      { to: '/admin/payroll',         icon: DollarSign,  label: 'Nómina' },
      { to: '/admin/cashflow',        icon: TrendingUp,  label: 'Flujo de Caja' },
      { to: '/admin/discount-codes',  icon: Tag,         label: 'Códigos de descuento' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/admin/analytics',           icon: BarChart3,    label: 'KPIs & Analytics' },
      { to: '/admin/tracking',            icon: TrendingUp,   label: 'Seguimiento' },
      { to: '/admin/weekly-projections',  icon: TrendingUp,   label: 'Proyecciones semana' },
      { to: '/admin/feedback',            icon: MessageSquare, label: 'Feedback' },
      { to: '/admin/ai',                  icon: Bot,          label: 'Salvaje IA' },
      { to: '/admin/activity-log',        icon: History,      label: 'Historial Actividad' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/admin/notifications', icon: Bell,     label: 'Notificaciones' },
      { to: '/admin/settings',      icon: Settings, label: 'Configuración' },
    ],
  },
  // V6 Ajustes 17 — admin payroll history.
  {
    label: 'Histórico',
    items: [
      { to: '/admin/payroll-history', icon: History, label: 'Histórico nómina' },
    ],
  },
  // V6 Ajustes 18/19/20/21/24/28 — SuperAdmin section, only visible if role === 'superadmin'.
  {
    label: 'SuperAdmin',
    superAdminOnly: true,
    items: [
      { to: '/superadmin/polla-mundialista-salvaje',   icon: Trophy,      label: 'Polla Mundialista Salvaje' },
      { to: '/superadmin/salvaje-splash',  icon: Droplets,    label: 'Salvaje Splash' },
      // Salvaje Mock oculto del panel administrativo (la ruta sigue existiendo por URL directa).
      { to: '/superadmin/analytics',       icon: BarChart3,   label: 'Analytics avanzado' },
      { to: '/superadmin/app-settings',    icon: Settings,    label: 'Configuración global' },
      { to: '/superadmin/service-hours',   icon: Clock,       label: 'Horarios de servicio' },
      { to: '/superadmin/payment-methods', icon: CreditCard,  label: 'Métodos de pago' },
    ],
  },
]

export function AdminShell({ title, children }) {
  const { profile, user, role } = useAuth()
  const navigate = useNavigate()
  useActivityTracker()
  useBirthday()
  useAdminAlerts()
  usePollaRegistrationAlerts()
  useMockRegistrationAlerts()
  // V6 Ajuste 28 — hide SuperAdmin sections for non-superadmins.
  const visibleNavGroups = navGroups.filter((g) => !g.superAdminOnly || role === 'superadmin')

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const roleLabel = role === 'superadmin' ? 'Super Admin' : 'Admin'
  const roleBadgeClass = role === 'superadmin'
    ? 'bg-salvaje-gold/20 text-salvaje-gold border-salvaje-gold/30'
    : 'bg-salvaje-orange/20 text-salvaje-orange border-salvaje-orange/30'

  return (
    <div className="flex h-screen h-dvh bg-salvaje-light overflow-hidden">
      {/* Sidebar — desktop only */}
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
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-hide">
          {visibleNavGroups.map((group) => (
            <div key={group.label}>
              <p className="font-body text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-salvaje-orange text-white'
                          : 'text-white/50 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <Icon size={17} strokeWidth={1.75} />
                    <span className="font-body text-sm font-medium">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <Avatar src={profile?.profilePhotoURL} name={profile?.displayName || user?.email} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="font-body text-white text-sm font-medium truncate">{profile?.displayName || 'Admin'}</p>
                <span className={`flex-shrink-0 text-[9px] font-body font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${roleBadgeClass}`}>
                  {roleLabel}
                </span>
              </div>
              <p className="font-body text-white/40 text-xs truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all text-sm font-body"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col h-full overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
        <BottomNav />
      </div>

      <NotificationPanel />
    </div>
  )
}
