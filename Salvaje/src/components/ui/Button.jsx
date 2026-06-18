function cn(...args) {
  return args.filter(Boolean).join(' ')
}

const variants = {
  primary: 'bg-salvaje-orange text-white hover:bg-salvaje-fire active:scale-95 shadow-salvaje-glow font-display uppercase tracking-widest',
  secondary: 'border-2 border-salvaje-brown text-salvaje-brown hover:bg-salvaje-brown hover:text-white active:scale-95 font-display uppercase tracking-widest',
  danger: 'bg-salvaje-danger text-white hover:opacity-90 active:scale-95 font-display uppercase tracking-widest',
  ghost: 'text-salvaje-gray hover:text-salvaje-dark hover:bg-salvaje-light-alt active:scale-95 font-body',
  success: 'bg-salvaje-success text-white hover:opacity-90 active:scale-95 font-display uppercase tracking-widest',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-lg',
  lg: 'px-7 py-3.5 text-base rounded-xl',
  xl: 'px-8 py-4 text-lg rounded-xl',
}

export function Button({ variant = 'primary', size = 'md', className, loading, disabled, children, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all duration-200 font-semibold select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  )
}
