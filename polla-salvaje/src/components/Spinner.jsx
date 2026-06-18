import { Loader2 } from 'lucide-react'

export function Spinner({ label = 'Cargando…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-salvaje-gray ${className}`}>
      <Loader2 className="animate-spin" size={32} />
      <span className="text-sm">{label}</span>
    </div>
  )
}
