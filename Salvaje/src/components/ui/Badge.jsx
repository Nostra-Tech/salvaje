function cn(...args) { return args.filter(Boolean).join(' ') }

const variants = {
  default: 'bg-salvaje-cream text-salvaje-brown',
  orange: 'bg-salvaje-orange/10 text-salvaje-orange',
  success: 'bg-salvaje-success/10 text-salvaje-success',
  danger: 'bg-salvaje-danger/10 text-salvaje-danger',
  gold: 'bg-salvaje-gold/10 text-salvaje-gold',
  gray: 'bg-salvaje-gray/10 text-salvaje-gray',
  dark: 'bg-salvaje-dark text-white',
}

export function Badge({ variant = 'default', className, children }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-body uppercase tracking-wide',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
