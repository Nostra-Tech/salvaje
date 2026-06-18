import { Shield, AlertCircle, Ticket } from 'lucide-react'
import { getDaysRemaining } from '../../utils/permissions'
import { formatShortDate } from '../../utils/formatters'
import { Button } from '../ui/Button'

const configs = {
  monthly: { label: 'Plan Mensual Ilimitado', color: 'bg-gradient-to-br from-salvaje-brown to-salvaje-dark', textColor: 'text-white', icon: Shield },
  ticketera: { label: 'Ticketera 12 Clases', color: 'bg-gradient-to-br from-salvaje-orange to-salvaje-fire', textColor: 'text-white', icon: Ticket },
  free_trial: { label: 'Clase de Cortesia', color: 'bg-gradient-to-br from-salvaje-gold to-salvaje-fire', textColor: 'text-white', icon: Shield },
  none: { label: 'Sin Membresia Activa', color: 'bg-salvaje-cream', textColor: 'text-salvaje-dark', icon: AlertCircle },
}

export function MembershipCard({ user, onRenew }) {
  const type = user?.membershipType || 'none'
  const config = configs[type] || configs.none
  const Icon = config.icon
  const daysLeft = getDaysRemaining(user)
  const isExpiringSoon = daysLeft !== null && daysLeft <= 5

  return (
    <div className={`rounded-salvaje overflow-hidden shadow-salvaje-md ${config.color}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className={`text-xs font-body uppercase tracking-widest font-semibold ${config.textColor} opacity-70`}>Membresia</p>
            <h3 className={`font-display text-xl uppercase ${config.textColor} mt-0.5 leading-tight`}>{config.label}</h3>
          </div>
          <Icon size={28} className={`${config.textColor} opacity-80 flex-shrink-0`} />
        </div>

        {type === 'monthly' && daysLeft !== null && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-body ${config.textColor} opacity-70`}>Vigencia</span>
              <span className={`text-xs font-mono ${config.textColor} font-medium`}>
                {isExpiringSoon ? (
                  <span className="flex items-center gap-1"><AlertCircle size={10} /> {daysLeft}d restantes</span>
                ) : (
                  `${daysLeft} dias`
                )}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isExpiringSoon ? 'bg-yellow-300' : 'bg-white'} transition-all`}
                style={{ width: `${Math.min(Math.max((daysLeft / 30) * 100, 0), 100)}%` }}
              />
            </div>
            {user?.membershipEndDate && (
              <p className={`text-xs font-body ${config.textColor} opacity-60 mt-1.5`}>
                Vence: {formatShortDate(user.membershipEndDate)}
              </p>
            )}
          </div>
        )}

        {type === 'ticketera' && (() => {
          const exp = user?.ticketeraExpDate?.toDate?.() || (user?.ticketeraExpDate ? new Date(user.ticketeraExpDate) : null)
          const daysLeft = exp ? Math.max(0, Math.ceil((exp - new Date()) / 86400000)) : null
          const expiringSoon = daysLeft != null && daysLeft <= 7
          return (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className={`font-display text-4xl ${config.textColor}`}>{user?.ticketeraBalance || 0}</span>
                <span className={`text-sm font-body ${config.textColor} opacity-70 mt-auto mb-0.5`}>clases disponibles</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full ${i < (user?.ticketeraBalance || 0) ? 'bg-white' : 'bg-white/20'}`} />
                ))}
              </div>
              {/* V6 Ajuste 5 — vencimiento de la tiquetera (60 días desde la compra) */}
              {exp && (
                <div className={`mt-2 px-2 py-1.5 rounded-lg text-xs font-body ${expiringSoon ? 'bg-yellow-300/20' : 'bg-white/10'} ${config.textColor}`}>
                  <p className="opacity-90">
                    Vencen el <strong>{exp.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                    {daysLeft != null && (
                      <span className={`ml-1 ${expiringSoon ? 'font-semibold' : 'opacity-70'}`}>
                        · {daysLeft} {daysLeft === 1 ? 'día restante' : 'días restantes'}
                      </span>
                    )}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${config.textColor} opacity-60`}>
                    Si compras nueva ticketera antes, primero se usan estas clases.
                  </p>
                </div>
              )}
            </div>
          )
        })()}

        {type === 'none' && (
          <div>
            <p className="text-sm font-body text-salvaje-gray mb-3">Activa tu membresia para reservar clases</p>
            {onRenew && (
              <Button size="sm" onClick={onRenew}>Ver planes</Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
