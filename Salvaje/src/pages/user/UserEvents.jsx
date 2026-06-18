import { useState, useEffect } from 'react'
import { Star, Calendar, MapPin, Users, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { subscribeToPublishedEvents, registerForEvent, unregisterFromEvent } from '../../services/events.service'

function formatEventDate(ts) {
  if (!ts) return ''
  const d = ts?.toDate?.() || new Date(ts)
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export function UserEvents() {
  const { user, profile } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    const unsub = subscribeToPublishedEvents((data) => {
      setEvents(data)
      setLoading(false)
    })
    return unsub
  }, [])

  const isRegistered = (ev) => ev.registeredList?.some((r) => r.userId === user?.uid)
  const isFull = (ev) => (ev.registeredCount || 0) >= (ev.capacity || 0)

  const handleRegister = async (ev) => {
    setActing(true)
    try {
      await registerForEvent(ev.id, { uid: user.uid, displayName: profile?.displayName || user.email, profilePhotoURL: profile?.profilePhotoURL || '' })
      toast.success('¡Te has inscrito al evento!')
      setSelected(null)
    } catch (e) { toast.error(e.message || 'Error al inscribirse') }
    setActing(false)
  }

  const handleUnregister = async (ev) => {
    setActing(true)
    try {
      await unregisterFromEvent(ev.id, user.uid)
      toast.success('Inscripción cancelada')
      setSelected(null)
    } catch (e) { toast.error(e.message || 'Error al cancelar') }
    setActing(false)
  }

  return (
    <AppShell title="Eventos">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center gap-3">
          <Star size={24} className="text-salvaje-orange" />
          <h1 className="font-display text-3xl uppercase text-salvaje-dark">Eventos</h1>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}</div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            {/* Icono decorativo */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-salvaje-orange/10 flex items-center justify-center">
                <Star size={44} className="text-salvaje-orange" strokeWidth={1.5} />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 bg-salvaje-gold rounded-full flex items-center justify-center shadow-salvaje">
                <span className="text-sm">🔥</span>
              </div>
            </div>

            {/* Texto principal */}
            <h2 className="font-display text-3xl uppercase text-salvaje-dark text-center leading-tight mb-2">
              Próximamente
            </h2>
            <p className="font-display text-lg uppercase text-salvaje-orange text-center mb-3">
              Grandes eventos se vienen
            </p>
            <p className="font-body text-sm text-salvaje-gray text-center max-w-xs leading-relaxed mb-6">
              La tribu SALVAJE está preparando algo épico. Activa tus notificaciones para ser el primero en enterarte.
            </p>

            {/* Banner decorativo */}
            <div className="w-full max-w-sm bg-gradient-to-r from-salvaje-brown to-salvaje-orange rounded-salvaje px-5 py-4 text-white text-center shadow-salvaje-md">
              <p className="font-display text-base uppercase tracking-wide">Mantente atento</p>
              <p className="font-body text-xs text-white/80 mt-0.5">
                Competencias · Retos · Charlas · Más
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                ev={ev}
                registered={isRegistered(ev)}
                full={isFull(ev)}
                onOpen={() => setSelected(ev)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <EventDetailModal
          ev={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          registered={isRegistered(selected)}
          full={isFull(selected)}
          acting={acting}
          onRegister={() => handleRegister(selected)}
          onUnregister={() => handleUnregister(selected)}
        />
      )}
    </AppShell>
  )
}

function EventCard({ ev, registered, full, onOpen }) {
  const spots = (ev.capacity || 0) - (ev.registeredCount || 0)
  return (
    <Card>
      <button className="w-full text-left hover:bg-salvaje-light/30 transition-colors rounded-salvaje" onClick={onOpen}>
        <CardBody className="py-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-lg uppercase text-salvaje-dark leading-tight">{ev.title}</p>
            {registered && (
              <Badge variant="success" className="flex-shrink-0">
                <CheckCircle2 size={10} /> Inscrito
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-body text-salvaje-gray">
            <span className="flex items-center gap-1 capitalize"><Calendar size={11} />{formatEventDate(ev.date)}</span>
            {ev.location && <span className="flex items-center gap-1"><MapPin size={11} />{ev.location}</span>}
            <span className="flex items-center gap-1"><Users size={11} />{spots > 0 ? `${spots} cupos disponibles` : 'Evento lleno'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={ev.price > 0 ? 'default' : 'success'}>
              {ev.price > 0 ? `$${ev.price.toLocaleString('es-CO')}` : 'Gratis'}
            </Badge>
            {full && !registered && <Badge variant="danger">Lleno</Badge>}
          </div>
        </CardBody>
      </button>
    </Card>
  )
}

function EventDetailModal({ ev, open, onClose, registered, full, acting, onRegister, onUnregister }) {
  const spots = (ev.capacity || 0) - (ev.registeredCount || 0)
  return (
    <Modal open={open} onClose={onClose} title={ev.title} size="lg">
      <div className="px-5 pb-5 space-y-4">
        <div className="bg-salvaje-light rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-body text-salvaje-dark capitalize">
            <Calendar size={14} className="text-salvaje-orange" />
            <span>{formatEventDate(ev.date)}</span>
          </div>
          {ev.location && (
            <div className="flex items-center gap-2 text-sm font-body text-salvaje-dark">
              <MapPin size={14} className="text-salvaje-orange" />
              <span>{ev.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm font-body text-salvaje-dark">
            <Users size={14} className="text-salvaje-orange" />
            <span>{ev.registeredCount || 0}/{ev.capacity || 0} inscritos · {spots} disponibles</span>
          </div>
          <div className="pt-1 flex gap-2">
            <Badge variant={ev.price > 0 ? 'default' : 'success'}>
              {ev.price > 0 ? `$${ev.price.toLocaleString('es-CO')}` : 'Gratis'}
            </Badge>
            {registered && <Badge variant="success"><CheckCircle2 size={10} /> Inscrito</Badge>}
          </div>
        </div>

        {ev.description?.trim() && (
          <div>
            <p className="font-display text-sm uppercase text-salvaje-dark mb-2">Descripción</p>
            <p className="font-body text-sm text-salvaje-dark leading-relaxed whitespace-pre-wrap">{ev.description}</p>
          </div>
        )}

        {registered ? (
          <Button variant="danger" onClick={onUnregister} loading={acting} className="w-full">
            Cancelar inscripción
          </Button>
        ) : full ? (
          <Button disabled className="w-full">Evento lleno</Button>
        ) : (
          <Button onClick={onRegister} loading={acting} className="w-full">
            Inscribirme al evento
          </Button>
        )}
      </div>
    </Modal>
  )
}
