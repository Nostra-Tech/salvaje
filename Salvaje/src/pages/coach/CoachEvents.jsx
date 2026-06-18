import { useState, useEffect } from 'react'
import { Star, Calendar, MapPin, Users } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { subscribeToPublishedEvents } from '../../services/events.service'

function formatEventDate(ts) {
  if (!ts) return ''
  const d = ts?.toDate?.() || new Date(ts)
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export function CoachEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const unsub = subscribeToPublishedEvents((data) => {
      setEvents(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AppShell title="Eventos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <Star size={24} className="text-salvaje-orange" />
          <h1 className="font-display text-3xl uppercase text-salvaje-dark">Eventos</h1>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}</div>
        ) : events.length === 0 ? (
          <EmptyState icon={Star} title="Sin eventos próximos" description="Aquí aparecerán los eventos publicados." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {events.map((ev) => (
              <Card key={ev.id}>
                <button className="w-full text-left hover:bg-salvaje-light/30 transition-colors rounded-salvaje" onClick={() => setSelected(ev)}>
                  <CardBody className="py-4 space-y-2">
                    <p className="font-display text-lg uppercase text-salvaje-dark leading-tight">{ev.title}</p>
                    <div className="flex flex-wrap gap-3 text-xs font-body text-salvaje-gray">
                      <span className="flex items-center gap-1 capitalize"><Calendar size={11} />{formatEventDate(ev.date)}</span>
                      {ev.location && <span className="flex items-center gap-1"><MapPin size={11} />{ev.location}</span>}
                      <span className="flex items-center gap-1"><Users size={11} />{ev.registeredCount || 0}/{ev.capacity || 0} inscritos</span>
                    </div>
                    <Badge variant={ev.price > 0 ? 'default' : 'success'}>
                      {ev.price > 0 ? `$${ev.price.toLocaleString('es-CO')}` : 'Gratis'}
                    </Badge>
                  </CardBody>
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.title} size="lg">
          <div className="px-5 pb-5 space-y-4">
            <div className="bg-salvaje-light rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-body text-salvaje-dark capitalize">
                <Calendar size={14} className="text-salvaje-orange" />
                <span>{formatEventDate(selected.date)}</span>
              </div>
              {selected.location && (
                <div className="flex items-center gap-2 text-sm font-body text-salvaje-dark">
                  <MapPin size={14} className="text-salvaje-orange" />
                  <span>{selected.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm font-body text-salvaje-dark">
                <Users size={14} className="text-salvaje-orange" />
                <span>{selected.registeredCount || 0}/{selected.capacity || 0} inscritos</span>
              </div>
              <div className="pt-1">
                <Badge variant={selected.price > 0 ? 'default' : 'success'}>
                  {selected.price > 0 ? `$${selected.price.toLocaleString('es-CO')}` : 'Gratis'}
                </Badge>
              </div>
            </div>

            {selected.description?.trim() && (
              <div>
                <p className="font-display text-sm uppercase text-salvaje-dark mb-2">Descripción</p>
                <p className="font-body text-sm text-salvaje-dark leading-relaxed whitespace-pre-wrap">{selected.description}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
