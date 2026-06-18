import { forwardRef } from 'react'

function cn(...args) { return args.filter(Boolean).join(' ') }

export const Input = forwardRef(function Input({ label, error, className, icon: Icon, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-salvaje-gray uppercase tracking-wide font-body">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-salvaje-gray">
            <Icon size={16} />
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark',
            'focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange transition-all duration-200',
            'placeholder:text-salvaje-gray/50',
            Icon && 'pl-9',
            error && 'border-salvaje-danger focus:ring-salvaje-danger/30 focus:border-salvaje-danger',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-salvaje-danger font-body">{error}</p>}
    </div>
  )
})

export const Select = forwardRef(function Select({ label, error, children, className, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-salvaje-gray uppercase tracking-wide font-body">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'w-full px-4 py-3 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark',
          'focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange transition-all duration-200',
          error && 'border-salvaje-danger',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-salvaje-danger font-body">{error}</p>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ label, error, className, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-salvaje-gray uppercase tracking-wide font-body">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'w-full px-4 py-3 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark resize-none',
          'focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange transition-all duration-200',
          error && 'border-salvaje-danger',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-salvaje-danger font-body">{error}</p>}
    </div>
  )
})
