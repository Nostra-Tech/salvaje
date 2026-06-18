import { Logo } from './Logo'

function cn(...args) { return args.filter(Boolean).join(' ') }

export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10', xl: 'w-16 h-16' }
  return (
    <div className={cn(
      'border-2 border-salvaje-orange/20 border-t-salvaje-orange rounded-full animate-spin',
      sizes[size],
      className
    )} />
  )
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-salvaje-light gap-4">
      <div className="flex flex-col items-center gap-3">
        <Logo size={56} />
        <Spinner size="md" />
        <p className="text-xs font-body text-salvaje-gray uppercase tracking-widest">Cargando</p>
      </div>
    </div>
  )
}
