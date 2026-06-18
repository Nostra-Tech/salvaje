import { ROLES } from './constants'

/**
 * V6 Ajuste 28 — role permissions matrix.
 *
 *  superadmin:  1 user. Can modify any config, manage admins, see everything.
 *  admin:       up to 2 users. Read-only on config/prices, but can manage
 *               operational data (users, classes, payments, payroll approval).
 *  coach:       manages their classes + payroll.
 *  user:        normal app access.
 */
export const PERMISSIONS = {
  superadmin: {
    canModifyConfig: true,
    canManageAdmins: true,
    canViewAllData: true,
    canModifyPrices: true,
    canDeleteUsers: true,
    canAccessAIAssistant: true,
    canManagePaymentMethods: true,
    canManageServiceHours: true,
    canViewActivityLog: true,
  },
  admin: {
    canModifyConfig: false,
    canManageAdmins: false,
    canViewAllData: true,
    canModifyPrices: false,
    canDeleteUsers: false,
    canAccessAIAssistant: true,
    canManagePaymentMethods: false,
    canManageServiceHours: false,
    canViewActivityLog: true,
  },
  coach: {
    canModifyConfig: false,
    canManageAdmins: false,
    canViewAllData: false,
    canModifyPrices: false,
    canDeleteUsers: false,
    canAccessAIAssistant: false,
    canManagePaymentMethods: false,
    canManageServiceHours: false,
    canViewActivityLog: false,
  },
  user: {
    canModifyConfig: false,
    canManageAdmins: false,
    canViewAllData: false,
    canModifyPrices: false,
    canDeleteUsers: false,
    canAccessAIAssistant: false,
    canManagePaymentMethods: false,
    canManageServiceHours: false,
    canViewActivityLog: false,
  },
}

export function hasPermission(role, permission) {
  return PERMISSIONS[role]?.[permission] ?? false
}

/** Both admin and superadmin pass this gate. */
export function isAdminOrSuper(role) {
  return role === 'admin' || role === 'superadmin'
}

/** Only the single superadmin passes this gate. */
export function isSuperAdmin(role) {
  return role === 'superadmin'
}

export function canReserveClass(user) {
  if (!user) return false
  if (user.isBlocked) return false
  if (user.membershipIsActive) return true
  if (user.ticketeraBalance > 0) return true
  if (!user.hasUsedFreeTrial) return true
  return false
}

export function getMembershipStatus(user) {
  if (!user) return 'none'
  if (user.membershipIsActive && user.membershipType === 'monthly') return 'monthly'
  if (user.ticketeraBalance > 0) return 'ticketera'
  if (!user.hasUsedFreeTrial) return 'free_trial'
  return 'none'
}

export function getDaysRemaining(user) {
  if (!user?.membershipEndDate) return null
  const end = user.membershipEndDate?.toDate ? user.membershipEndDate.toDate() : new Date(user.membershipEndDate)
  const now = new Date()
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return diff
}

export function isRoleAllowed(userRole, allowedRoles) {
  return allowedRoles.includes(userRole)
}

/**
 * A user is "locked" when:
 *  - they already used their free trial,
 *  - have no active membership,
 *  - have no ticketera credits,
 *  - and are not blocked (blocked has its own flow).
 *
 * Locked users only see the membership/payment screen until they pay
 * and the admin validates.
 */
export function isUserLocked(user) {
  if (!user) return false
  if (user.isBlocked) return false
  if (user.membershipIsActive) {
    // If endDate has passed, treat as expired (locked).
    const end = user.membershipEndDate?.toDate
      ? user.membershipEndDate.toDate()
      : (user.membershipEndDate ? new Date(user.membershipEndDate) : null)
    if (!end || end > new Date()) return false
  }
  if ((user.ticketeraBalance || 0) > 0) return false
  if (!user.hasUsedFreeTrial) return false
  return true
}
