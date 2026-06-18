import { User } from 'lucide-react'

function cn(...args) { return args.filter(Boolean).join(' ') }

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-2xl',
}

export function Avatar({ src, name, size = 'md', className }) {
  const initials = name ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : null

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={cn('rounded-full object-cover bg-salvaje-cream', sizes[size], className)}
      />
    )
  }

  return (
    <div className={cn(
      'rounded-full bg-salvaje-brown text-white flex items-center justify-center font-display font-bold flex-shrink-0',
      sizes[size],
      className
    )}>
      {initials || <User size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />}
    </div>
  )
}
