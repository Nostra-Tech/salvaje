import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PageLoader } from '../ui/Spinner'

export function ProtectedRoute({ children }) {
  const { user, initialized, loading } = useAuth()
  const location = useLocation()

  if (!initialized || loading) return <PageLoader />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  return children
}
