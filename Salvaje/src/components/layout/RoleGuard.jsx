import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/authStore'
import { PageLoader } from '../ui/Spinner'

export function RoleGuard({ allowedRoles, children }) {
  const { role, initialized, loading } = useAuth()
  const registering = useAuthStore((s) => s.registering)

  // While auth is initializing, a registration is in flight, or identity is
  // still being resolved (loading=true) — hold the route. Without the loading
  // check, a fresh sign-in would briefly see role=null and bounce to /unauthorized.
  if (!initialized || loading || registering) return <PageLoader />
  // V6 Ajuste 28: superadmin satisfies anything an admin can access.
  const effectiveRoles = allowedRoles.includes('admin') && !allowedRoles.includes('superadmin')
    ? [...allowedRoles, 'superadmin']
    : allowedRoles
  // Pending users haven't verified their email yet — route them to the
  // verification screen instead of the generic /unauthorized.
  if (role === 'pending') return <Navigate to="/verify-email" replace />
  if (!effectiveRoles.includes(role)) return <Navigate to="/unauthorized" replace />

  return children
}
