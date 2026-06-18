import { useNavigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Footer } from '../components/layout/Footer'
import { logout } from '../services/auth.service'

export function Unauthorized() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative min-h-screen bg-salvaje-light flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 bg-salvaje-danger/10 rounded-2xl flex items-center justify-center mb-4">
        <ShieldX size={32} className="text-salvaje-danger" />
      </div>
      <h1 className="font-display text-3xl uppercase text-salvaje-dark mb-2">
        Acceso Denegado
      </h1>
      <p className="font-body text-salvaje-gray text-sm mb-8">
        No tienes permiso para ver esta pagina.
      </p>
      <Button onClick={handleLogout} variant="secondary">
        Cerrar sesion
      </Button>
      <Footer className="absolute bottom-0 left-0 right-0" />
    </div>
  )
}
