import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Users, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { AppShell } from '../../components/layout/AppShell'
import { ClassCard } from '../../components/classes/ClassCard'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import {
  subscribeToUpcomingClasses,
  reserveClass,
  cancelReservation,
} from '../../services/classes.service'
import { canReserveClass } from '../../utils/permissions'
import { formatDateTime } from '../../utils/formatters'

export function UserClasses() {
  const { user, profile } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [reserving, setReserving] = useState(false)
  const [filter, setFilter] = useState('week')

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeToUpcomingClasses(1, (data) => {
      setClasses(data)
      setLoading(false)
    })
    return unsub
  }, [])

  // V6 Ajuste 6 — re-evaluate filter every 60s so classes that just passed
  // disappear from the feed without manual refresh.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // Hide classes whose end already passed (15 min grace) — admin keeps full history.
  // V5 Ajuste 3: also hide classes whose START is in the past (today's earlier slots).
  // V8: only show classes within next 24 hours for users.
  const now = new Date()
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const filtered = classes.filter((c) => {
    const start = c.scheduledDate?.toDate ? c.scheduledDate.toDate() : new Date(c.scheduledDate)
    const end = c.endDate?.toDate ? c.endDate.toDate() : new Date(c.endDate || start)
    if (end && (now - end) > 15 * 60 * 1000) return false
    // Hide today's classes that already started, unless they are in_progress (live).
    if (start < now && c.status !== 'in_progress') return false
    // Only show classes starting within next 24 hours
    if (start > next24h) return false
    if (filter === 'today') {
      return start.toDateString() === now.toDateString()
    }
    if (filter === 'mine') {
      return (c.attendeeList || []).some((a) => a.userId === user?.uid)
    }
    return true
  })

  // V5 Ajuste 4: nearest reserved class (today/tomorrow) for the reminder banner.
  const nextMyReservation = (() => {
    const mine = classes
      .filter((c) => (c.attendeeList || []).some((a) => a.userId === user?.uid))
      .map((c) => {
        const start = c.scheduledDate?.toDate ? c.scheduledDate.toDate() : new Date(c.scheduledDate)
        return { c, start }
      })
      .filter(({ c, start }) => {
        if (start < now && c.status !== 'in_progress') return false
        const hoursUntil = (start - now) / (1000 * 60 * 60)
        return hoursUntil < 36 // today or tomorrow
      })
      .sort((a, b) => a.start - b.start)
    return mine[0] || null
  })()

  const isReserved = selected?.attendeeList?.some((a) => a.userId === user?.uid)
  const canReserve = profile && canReserveClass(profile)

  const handleReserve = async () => {
    if (!selected) return
    setReserving(true)
    try {
      if (isReserved) {
        await cancelReservation(selected.id, user.uid)
        toast.success('Reserva cancelada')
      } else {
        if (!canReserve) {
          toast.error('Necesitas una membresia activa')
          return
        }
        await reserveClass(selected.id, {
          uid: user.uid,
          displayName: profile?.displayName || user.email,
          profilePhotoURL: profile?.profilePhotoURL || '',
        })
        toast.success('Clase reservada')
      }
      await fetchClasses()
      setSelected(null)
    } catch (err) {
      toast.error(err.message || 'Error al procesar')
    } finally {
      setReserving(false)
    }
  }

  return (
    <AppShell title="Clases">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
        {/* V5 Ajuste 4: reminder banner of the nearest reserved class */}
        {nextMyReservation && (
          <ReservationReminderBanner cls={nextMyReservation.c} start={nextMyReservation.start} />
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilter('today')}
            className={`px-4 py-2 rounded-xl text-sm font-body font-medium transition-all ${
              filter === 'today'
                ? 'bg-salvaje-orange text-white'
                : 'bg-white text-salvaje-gray shadow-salvaje'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-4 py-2 rounded-xl text-sm font-body font-medium transition-all ${
              filter === 'week'
                ? 'bg-salvaje-orange text-white'
                : 'bg-white text-salvaje-gray shadow-salvaje'
            }`}
          >
            Próximos
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={`px-4 py-2 rounded-xl text-sm font-body font-medium transition-all ${
              filter === 'mine'
                ? 'bg-salvaje-orange text-white'
                : 'bg-white text-salvaje-gray shadow-salvaje'
            }`}
          >
            Mis reservas
          </button>
        </div>

        {/* Membership warning */}
        {!canReserve && (
          <div className="mb-4 px-4 py-3 bg-salvaje-orange/10 border border-salvaje-orange/20 rounded-xl">
            <p className="text-sm font-body text-salvaje-orange font-medium">
              Activa tu membresia para reservar clases
            </p>
          </div>
        )}

        {/* Class list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white rounded-salvaje animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sin clases"
            description="No hay clases disponibles en las próximas 24 horas. Las clases se publican con 24 horas de anticipación."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((cls, i) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <ClassCard cls={cls} userId={user?.uid} onClick={() => setSelected(cls)} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Class detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="px-5 pb-5 space-y-4">
            <div className="flex items-center gap-3 text-sm font-body text-salvaje-gray">
              <Clock size={14} />
              <span>{formatDateTime(selected.scheduledDate)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-body text-salvaje-gray">
              <Users size={14} />
              <span>
                {selected.currentBookings}/{selected.maxCapacity} inscritos
              </span>
            </div>

            {selected.wod && (
              <div className="bg-salvaje-light rounded-xl p-4">
                <p className="text-xs font-mono text-salvaje-orange uppercase tracking-widest mb-1">
                  WOD del dia
                </p>
                <p className="font-body text-sm text-salvaje-dark whitespace-pre-line">
                  {selected.wod}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {selected.status === 'in_progress' ? (
                <div className="flex-1 px-4 py-3 rounded-xl bg-salvaje-success/10 border border-salvaje-success/30 text-center">
                  <p className="font-display text-sm uppercase text-salvaje-success">Clase en vivo ahora</p>
                  <p className="font-body text-xs text-salvaje-gray mt-0.5">Acércate al box para registrarte</p>
                </div>
              ) : isReserved ? (
                <Button
                  variant="danger"
                  className="flex-1"
                  loading={reserving}
                  onClick={handleReserve}
                >
                  Cancelar reserva
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  loading={reserving}
                  onClick={handleReserve}
                  disabled={
                    !canReserve || selected.currentBookings >= selected.maxCapacity
                  }
                >
                  {selected.currentBookings >= selected.maxCapacity
                    ? 'Clase llena'
                    : 'Reservar clase'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

/**
 * V5 Ajuste 4 — banner that reminds the user about their nearest reserved
 * class (today or tomorrow). Shows class name, date label and time.
 */
function ReservationReminderBanner({ cls, start }) {
  if (!cls || !start) return null
  const today0 = new Date(); today0.setHours(0, 0, 0, 0)
  const tomorrow0 = new Date(today0); tomorrow0.setDate(tomorrow0.getDate() + 1)
  const start0 = new Date(start); start0.setHours(0, 0, 0, 0)
  const dayLabel = start0.getTime() === today0.getTime()
    ? 'hoy'
    : start0.getTime() === tomorrow0.getTime()
    ? 'mañana'
    : start.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })
  const timeStr = start.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-salvaje-orange/10 border border-salvaje-orange/30 rounded-xl px-4 py-3 flex items-start gap-3 mb-4"
    >
      <div className="w-8 h-8 bg-salvaje-orange/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Calendar className="w-4 h-4 text-salvaje-orange" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-salvaje-dark capitalize">
          Tienes clase {dayLabel}
        </p>
        <p className="text-xs text-salvaje-gray mt-0.5 truncate">
          {cls.name} · {timeStr}
        </p>
      </div>
    </motion.div>
  )
}
