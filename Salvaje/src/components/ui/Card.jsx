function cn(...args) { return args.filter(Boolean).join(' ') }

export function Card({ className, hover = false, children, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-salvaje shadow-salvaje',
        hover && 'hover:shadow-salvaje-md hover:-translate-y-0.5 cursor-pointer transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }) {
  return <div className={cn('px-5 pt-5 pb-3', className)}>{children}</div>
}

export function CardBody({ className, children }) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>
}
