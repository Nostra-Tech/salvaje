import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { isUserLocked } from '../../utils/permissions'

/**
 * Gate for regular users. Priority (highest first):
 *   1. Blocked  → /app/blocked  (profile always accessible; membership only if blockType=non_payment)
 *   2. Frozen   → /app/frozen
 *   3. Locked (no plan) → /app/membership
 */
const BASE_BLOCKED_ALLOWED = new Set(['/app/blocked', '/app/profile'])
const FROZEN_ALLOWED = new Set(['/app/frozen', '/app/profile'])
const ALWAYS_ALLOWED = new Set(['/app/membership', '/app/profile'])

export function MembershipGate({ children }) {
  const { role, profile, initialized } = useAuth()
  const location = useLocation()

  if (!initialized) return children
  if (role !== 'user') return children
  if (!profile) return children

  // 1. Blocked — highest priority
  if (profile.isBlocked) {
    const blockedAllowed = profile.blockType === 'non_payment'
      ? new Set([...BASE_BLOCKED_ALLOWED, '/app/membership'])
      : BASE_BLOCKED_ALLOWED
    if (!blockedAllowed.has(location.pathname)) {
      return <Navigate to="/app/blocked" replace />
    }
    return children
  }

  // 2. Frozen
  if (profile.isFrozen && !FROZEN_ALLOWED.has(location.pathname)) {
    return <Navigate to="/app/frozen" replace />
  }

  // 3. Locked (used free trial, no active plan)
  if (!profile.isFrozen && isUserLocked(profile) && !ALWAYS_ALLOWED.has(location.pathname)) {
    return <Navigate to="/app/membership" replace />
  }

  return children
}
