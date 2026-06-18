import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Footer } from '../components/layout/Footer'

export function NotFound() {
  return (
    <div className="relative min-h-screen bg-salvaje-light flex flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-8xl text-salvaje-orange mb-2">404</p>
      <h1 className="font-display text-3xl uppercase text-salvaje-dark mb-2">
        Pagina no encontrada
      </h1>
      <p className="font-body text-salvaje-gray text-sm mb-8">
        Esta pagina no existe o fue removida.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-salvaje-orange font-body font-semibold text-sm hover:text-salvaje-fire transition-colors"
      >
        <ArrowLeft size={16} /> Volver al inicio
      </Link>
      <Footer className="absolute bottom-0 left-0 right-0" />
    </div>
  )
}
