import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Crown, ChevronRight, X, Lock, Eye } from 'lucide-react'
import { usePollaStore } from '../store/pollaStore'
import { getPrediction } from '../services/polla.service'
import { safeStorage } from '../services/safeStorage'
import { FINALS_DEADLINE_LABEL, isFinalsLocked } from '../data/worldCup'

const SEEN_KEY = 'polla_notifs_seen'

/**
 * Campana de notificaciones del usuario (visible en el Header y el perfil).
 * Muestra una lista de avisos:
 *  - Oportunidad de elegir Campeón / Subcampeón / Goleador (mientras esté abierto).
 *  - Invitación a ver los marcadores de los rivales en el ranking.
 * Un punto naranja indica avisos sin leer; se limpia al abrir la campana.
 */
export function FinalsBell({ className = '' }) {
  const user = usePollaStore((s) => s.user)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [finalsComplete, setFinalsComplete] = useState(true) // hasta saber, no alarmamos
  const [seen, setSeen] = useState(() => safeStorage.getItem(SEEN_KEY) || '')

  const finalsLocked = isFinalsLocked()
  const opportunity = !finalsLocked && !finalsComplete

  useEffect(() => {
    if (!user?.id) return
    let alive = true
    ;(async () => {
      try {
        const pred = await getPrediction(user.id)
        if (!alive) return
        setFinalsComplete(Boolean(pred.champion && pred.runnerUp && pred.scorer))
      } catch {
        // Silencioso: si no se puede leer, no mostramos alerta falsa.
      }
    })()
    return () => { alive = false }
  }, [user?.id])

  // Lista de notificaciones activas (en orden de prioridad).
  const notifs = useMemo(() => {
    const list = []
    if (!finalsLocked) {
      list.push({
        id: opportunity ? 'finals-open' : 'finals-done',
        icon: Crown,
        tone: opportunity ? 'gold' : 'success',
        title: opportunity ? '¡Tienes una oportunidad!' : 'Tus finales están listas',
        body: opportunity
          ? <>Aún puedes elegir <strong>Campeón, Subcampeón y Goleador</strong> hasta el <strong>{FINALS_DEADLINE_LABEL}</strong> (hora Colombia).</>
          : <>Puedes editar tu <strong>Campeón, Subcampeón y Goleador</strong> hasta el <strong>{FINALS_DEADLINE_LABEL}</strong> (hora Colombia).</>,
        cta: 'Elegir ahora',
        to: '/predict?tab=finales',
      })
    }
    list.push({
      id: 'ranking-spy',
      icon: Eye,
      tone: 'orange',
      title: '¿Cómo le va a tus rivales?',
      body: <>Entra al <strong>Ranking</strong> y toca a cualquier participante para ver los marcadores que puso en los partidos ya jugados y los puntos que lleva.</>,
      cta: 'Ver el ranking',
      to: '/ranking',
    })
    return list
  }, [finalsLocked, opportunity])

  // Firma de los avisos actuales → si cambió respecto a lo último visto, hay no leídos.
  const signature = useMemo(() => notifs.map((n) => n.id).join('|'), [notifs])
  const hasUnread = seen !== signature

  if (!user) return null

  const toggle = () => {
    setOpen((o) => {
      const next = !o
      if (next && hasUnread) {
        setSeen(signature)
        safeStorage.setItem(SEEN_KEY, signature)
      }
      return next
    })
  }

  const go = (to) => { setOpen(false); navigate(to) }

  const TONE = {
    gold: 'bg-salvaje-gold/20 text-salvaje-gold',
    success: 'bg-salvaje-success/15 text-salvaje-success',
    orange: 'bg-salvaje-orange/15 text-salvaje-orange',
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 text-salvaje-gray transition hover:bg-black/5 hover:text-salvaje-brown"
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <Bell size={18} />
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-salvaje-orange opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-salvaje-orange ring-2 ring-salvaje-light" />
          </span>
        )}
      </button>

      {open && (
        <>
          {/* backdrop para cerrar al tocar fuera */}
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[88vw] overflow-hidden rounded-salvaje border border-black/5 bg-white shadow-salvaje-lg">
            <div className="flex items-center justify-between border-b border-salvaje-light-alt px-4 py-2.5">
              <span className="font-semibold text-salvaje-brown">Notificaciones</span>
              <button onClick={() => setOpen(false)} className="text-salvaje-gray hover:text-salvaje-brown">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[60vh] divide-y divide-salvaje-light-alt overflow-y-auto">
              {finalsLocked && (
                <div className="flex items-start gap-3 px-4 py-3.5 text-sm text-salvaje-gray">
                  <Lock size={18} className="mt-0.5 shrink-0 text-salvaje-gray" />
                  <p>El plazo para elegir Campeón, Subcampeón y Goleador ya cerró ({FINALS_DEADLINE_LABEL}, hora Colombia).</p>
                </div>
              )}

              {notifs.map((n) => {
                const Icon = n.icon
                return (
                  <button
                    key={n.id}
                    onClick={() => go(n.to)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-salvaje-light"
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE[n.tone]}`}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-salvaje-brown">{n.title}</span>
                      <span className="mt-0.5 block text-sm text-salvaje-gray">{n.body}</span>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-salvaje-orange">
                        {n.cta} <ChevronRight size={12} />
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
