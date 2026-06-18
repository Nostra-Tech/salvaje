export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-salvaje-cream flex items-center justify-center mb-4">
          <Icon size={28} className="text-salvaje-gray" />
        </div>
      )}
      <h3 className="font-display text-xl uppercase text-salvaje-dark mb-1">{title}</h3>
      {description && <p className="text-sm font-body text-salvaje-gray mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
