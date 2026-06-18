import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, AuthInit } from './hooks/useAuth'
import { PageLoader } from './components/ui/Spinner'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { RoleGuard } from './components/layout/RoleGuard'
import { MembershipGate } from './components/layout/MembershipGate'

// Auth pages
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'

// User pages
import { UserHome } from './pages/user/UserHome'
import { UserClasses } from './pages/user/UserClasses'
import { UserQR } from './pages/user/UserQR'
import { UserProgress } from './pages/user/UserProgress'
import { UserMembership } from './pages/user/UserMembership'
import { UserReferrals } from './pages/user/UserReferrals'
import { UserProfile } from './pages/user/UserProfile'
import { UserSurvey } from './pages/user/UserSurvey'
import { UserVideos } from './pages/user/UserVideos'
import { UserFrozen } from './pages/user/UserFrozen'
import { UserBlocked } from './pages/user/UserBlocked'

// Coach pages
import { CoachHome } from './pages/coach/CoachHome'
import { CoachClasses } from './pages/coach/CoachClasses'
import { CoachCheckIn } from './pages/coach/CoachCheckIn'
import { CoachWeeklyPlan } from './pages/coach/CoachWeeklyPlan'
import { CoachClassActive } from './pages/coach/CoachClassActive'
import { CoachPayroll } from './pages/coach/CoachPayroll'
import { CoachProfile } from './pages/coach/CoachProfile'
import { CoachVideos } from './pages/coach/CoachVideos'

// Admin pages
import { AdminHome } from './pages/admin/AdminHome'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminCoaches } from './pages/admin/AdminCoaches'
import { AdminClasses } from './pages/admin/AdminClasses'
import { AdminPayments } from './pages/admin/AdminPayments'
import { AdminPayroll } from './pages/admin/AdminPayroll'
import { AdminMemberships } from './pages/admin/AdminMemberships'
import { AdminWeeklyPlans } from './pages/admin/AdminWeeklyPlans'
import { AdminSettings } from './pages/admin/AdminSettings'
import { AdminFinances } from './pages/admin/AdminFinances'
import { AdminCashflow } from './pages/admin/AdminCashflow'
import { AdminAnalytics } from './pages/admin/AdminAnalytics'
import { AdminTracking } from './pages/admin/AdminTracking'
import { AdminActivityLog } from './pages/admin/AdminActivityLog'
import { AdminNotifications } from './pages/admin/AdminNotifications'
import { AdminFeedback } from './pages/admin/AdminFeedback'
import { AdminDiscountCodes } from './pages/admin/AdminDiscountCodes'
import { AdminWeeklyProjections } from './pages/admin/AdminWeeklyProjections'
import { AdminAIAssistant } from './pages/admin/AdminAIAssistant'
import { ConfigServiceHours } from './pages/superadmin/ConfigServiceHours'
import { ConfigAppSettings } from './pages/superadmin/ConfigAppSettings'
import { ConfigPaymentMethods } from './pages/superadmin/ConfigPaymentMethods'
import { SuperAdminAnalytics } from './pages/superadmin/SuperAdminAnalytics'
import { PollaSalvaje } from './pages/superadmin/PollaSalvaje'
import { SalvajeMock } from './pages/superadmin/SalvajeMock'
import { AdminPayrollHistory } from './pages/admin/AdminPayrollHistory'
import { AdminVideos } from './pages/admin/AdminVideos'
import { AdminEvents } from './pages/admin/AdminEvents'
import { UserEvents } from './pages/user/UserEvents'
import { CoachEvents } from './pages/coach/CoachEvents'

import { Setup } from './pages/Setup'
import { NotFound } from './pages/NotFound'
import { Unauthorized } from './pages/Unauthorized'
import { AuthAction } from './pages/AuthAction'
import { VerifyEmail } from './pages/VerifyEmail'

function RootRedirect() {
  const { user, role, initialized, loading } = useAuth()
  if (!initialized || loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (role === 'pending') return <Navigate to="/verify-email" replace />
  if (role === 'admin' || role === 'superadmin') return <Navigate to="/admin" replace />
  if (role === 'coach') return <Navigate to="/coach" replace />
  return <Navigate to="/app" replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthInit />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* User routes — wrapped in MembershipGate: a locked user (used cortesía,
            no active membership/ticketera) can only reach /app/membership and /app/profile. */}
        <Route path="/app" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><MembershipGate><UserHome /></MembershipGate></RoleGuard></ProtectedRoute>} />
        <Route path="/app/classes" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><MembershipGate><UserClasses /></MembershipGate></RoleGuard></ProtectedRoute>} />
        <Route path="/app/qr" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><MembershipGate><UserQR /></MembershipGate></RoleGuard></ProtectedRoute>} />
        <Route path="/app/progress" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><MembershipGate><UserProgress /></MembershipGate></RoleGuard></ProtectedRoute>} />
        <Route path="/app/membership" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><MembershipGate><UserMembership /></MembershipGate></RoleGuard></ProtectedRoute>} />
        <Route path="/app/referrals" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><MembershipGate><UserReferrals /></MembershipGate></RoleGuard></ProtectedRoute>} />
        <Route path="/app/profile" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><MembershipGate><UserProfile /></MembershipGate></RoleGuard></ProtectedRoute>} />
        <Route path="/app/survey/:classId" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><MembershipGate><UserSurvey /></MembershipGate></RoleGuard></ProtectedRoute>} />
        <Route path="/app/videos" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><MembershipGate><UserVideos /></MembershipGate></RoleGuard></ProtectedRoute>} />
        <Route path="/app/events" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><MembershipGate><UserEvents /></MembershipGate></RoleGuard></ProtectedRoute>} />
        <Route path="/app/frozen" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><UserFrozen /></RoleGuard></ProtectedRoute>} />
        <Route path="/app/blocked" element={<ProtectedRoute><RoleGuard allowedRoles={['user']}><UserBlocked /></RoleGuard></ProtectedRoute>} />

        {/* Coach routes */}
        <Route path="/coach" element={<ProtectedRoute><RoleGuard allowedRoles={['coach']}><CoachHome /></RoleGuard></ProtectedRoute>} />
        <Route path="/coach/checkin" element={<ProtectedRoute><RoleGuard allowedRoles={['coach']}><CoachCheckIn /></RoleGuard></ProtectedRoute>} />
        <Route path="/coach/classes" element={<ProtectedRoute><RoleGuard allowedRoles={['coach']}><CoachClasses /></RoleGuard></ProtectedRoute>} />
        <Route path="/coach/plan" element={<ProtectedRoute><RoleGuard allowedRoles={['coach']}><CoachWeeklyPlan /></RoleGuard></ProtectedRoute>} />
        <Route path="/coach/classes/:classId/active" element={<ProtectedRoute><RoleGuard allowedRoles={['coach']}><CoachClassActive /></RoleGuard></ProtectedRoute>} />
        <Route path="/coach/payroll" element={<ProtectedRoute><RoleGuard allowedRoles={['coach']}><CoachPayroll /></RoleGuard></ProtectedRoute>} />
        <Route path="/coach/profile" element={<ProtectedRoute><RoleGuard allowedRoles={['coach']}><CoachProfile /></RoleGuard></ProtectedRoute>} />
        <Route path="/coach/videos" element={<ProtectedRoute><RoleGuard allowedRoles={['coach']}><CoachVideos /></RoleGuard></ProtectedRoute>} />
        <Route path="/coach/events" element={<ProtectedRoute><RoleGuard allowedRoles={['coach']}><CoachEvents /></RoleGuard></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminHome /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminUsers /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/coaches" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminCoaches /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/classes" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminClasses /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminPayments /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/payroll" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminPayroll /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/memberships" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminMemberships /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/weekly-plans" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminWeeklyPlans /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminSettings /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/finances" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminFinances /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/cashflow" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminCashflow /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminAnalytics /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/tracking" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminTracking /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/activity-log" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminActivityLog /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminNotifications /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/feedback" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminFeedback /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/discount-codes" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminDiscountCodes /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/weekly-projections" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminWeeklyProjections /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/ai" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminAIAssistant /></RoleGuard></ProtectedRoute>} />
        {/* V6 Ajuste 17 — admin payroll history grouped */}
        <Route path="/admin/payroll-history" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminPayrollHistory /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/videos" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminVideos /></RoleGuard></ProtectedRoute>} />
        <Route path="/admin/events" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','superadmin']}><AdminEvents /></RoleGuard></ProtectedRoute>} />
        {/* V6 Ajustes 18/19/20/21/24/28 — SuperAdmin-only routes. */}
        <Route path="/superadmin/service-hours" element={<ProtectedRoute><RoleGuard allowedRoles={['superadmin']}><ConfigServiceHours /></RoleGuard></ProtectedRoute>} />
        <Route path="/superadmin/app-settings" element={<ProtectedRoute><RoleGuard allowedRoles={['superadmin']}><ConfigAppSettings /></RoleGuard></ProtectedRoute>} />
        <Route path="/superadmin/payment-methods" element={<ProtectedRoute><RoleGuard allowedRoles={['superadmin']}><ConfigPaymentMethods /></RoleGuard></ProtectedRoute>} />
        <Route path="/superadmin/users" element={<Navigate to="/admin/users" replace />} />
        <Route path="/superadmin/analytics" element={<ProtectedRoute><RoleGuard allowedRoles={['superadmin']}><SuperAdminAnalytics /></RoleGuard></ProtectedRoute>} />
        <Route path="/superadmin/polla-mundialista-salvaje" element={<ProtectedRoute><RoleGuard allowedRoles={['superadmin']}><PollaSalvaje /></RoleGuard></ProtectedRoute>} />
        <Route path="/superadmin/salvaje-mock" element={<ProtectedRoute><RoleGuard allowedRoles={['superadmin']}><SalvajeMock /></RoleGuard></ProtectedRoute>} />

        <Route path="/setup" element={<Setup />} />
        <Route path="/auth-action" element={<AuthAction />} />
        <Route path="/__/auth/action" element={<AuthAction />} />
        <Route path="/verify-email" element={<ProtectedRoute><VerifyEmail /></ProtectedRoute>} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
