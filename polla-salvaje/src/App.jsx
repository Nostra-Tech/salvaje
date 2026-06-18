import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Header } from './components/Header'
import { DemoBanner } from './components/DemoBanner'
import { Onboarding } from './components/Onboarding'
import { Dock } from './components/Dock'
import { Footer } from './components/Footer'
import { Toaster } from './components/Toast'
import { usePollaStore } from './store/pollaStore'
import { useOfficialResultsSync } from './hooks/useOfficialResultsSync'
import Register from './pages/Register'
import Predict from './pages/Predict'
import Leaderboard from './pages/Leaderboard'
import Prizes from './pages/Prizes'
import Admin from './pages/Admin'
import Profile from './pages/Profile'

function ProtectedLayout() {
  const user = usePollaStore((s) => s.user)
  if (!user) return <Navigate to="/" replace />
  return (
    <div className="salvaje-bg-light min-h-screen">
      <Onboarding />
      <Header />
      <DemoBanner />
      <Outlet />
      <Footer />
      <Dock />
    </div>
  )
}

function PublicOnly({ children }) {
  const user = usePollaStore((s) => s.user)
  if (user) return <Navigate to="/predict" replace />
  return children
}

// Base de la app (/pollamundialistasalvaje/ en producción, / en dev) → basename del router.
const BASENAME = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export default function App() {
  // Mantiene los resultados oficiales al día (proveedor interno).
  useOfficialResultsSync()
  return (
    <BrowserRouter basename={BASENAME}>
      <Toaster />
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnly>
              <Register />
            </PublicOnly>
          }
        />
        <Route element={<ProtectedLayout />}>
          <Route path="/predict" element={<Predict />} />
          <Route path="/ranking" element={<Leaderboard />} />
          <Route path="/premios" element={<Prizes />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
