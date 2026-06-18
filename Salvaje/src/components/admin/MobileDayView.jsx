import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react'
import { Card, CardBody } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatTime } from '../../utils/formatters'

const DAYS_FULL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const statusBadge = { scheduled: 'default', in_progress: 'orange', completed: 'success', cancelled: 'danger' }
const statusLabel = { scheduled: 'Programada', in_progress: 'En curso', completed: 'Completada', cancelled: 'Cancelada' }

function startOfWeek(d) {
  const x = new Date(d); x.setHours(0,0,0,0)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

/**
 * Mobile-first day view: shows 1 day, with 7-day strip selector at top + swipe-friendly cards.
 */
export function MobileDayView({ weekStart, classes, onClickClass }) {
  const [dayIdx, setDayIdx] = useState(() => {
    const today = new Date()
    return Math.max(0, Math.min(6, (today.getDay() + 6) % 7))
  })

  const dayDate = (() => { const d = new Date(weekStart); d.setDate(d.getDate() + dayIdx); return d })()
  const dayClasses = classes
    .filter((c) => {
      const d = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate)
      return d.toDateString() === dayDate.toDateString()
    })
    .sort((a, b) => {
      const ad = a.scheduledDate?.toDate?.() || new Date(0)
      const bd = b.scheduledDate?.toDate?.() || new Date(0)
      return ad - bd
    })

  return (
    <div className="space-y-3">
      {/* 7-day strip selector */}
      <div className="bg-white rounded-xl shadow-salvaje p-1.5 flex">
        {DAYS_FULL.map((label, i) => {
          const d = new Date(weekStart); d.setDate(d.getDate() + i)
          const active = i === dayIdx
          const today = new Date(); today.setHours(0,0,0,0)
          const isToday = d.toDateString() === today.toDateString()
          return (
            <button
              key={i}
              onClick={() => setDayIdx(i)}
              className={`flex-1 py-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                active ? 'bg-salvaje-orange text-white' : 'text-salvaje-dark hover:bg-salvaje-cream/40'
              }`}
            >
              <span className={`font-mono text-[10px] uppercase ${active ? 'text-white/80' : 'text-salvaje-gray'}`}>{label}</span>
              <span className={`font-display text-base leading-none ${isToday && !active ? 'text-salvaje-orange' : ''}`}>{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      {/* Day header */}
      <div className="flex items-center justify-between">
        <button onClick={() => setDayIdx((i) => Math.max(0, i - 1))} disabled={dayIdx === 0} className="p-1.5 rounded-lg disabled:opacity-30">
          <ChevronLeft size={16} />
        </button>
        <p className="font-display text-base uppercase text-salvaje-dark capitalize">
          {dayDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <button onClick={() => setDayIdx((i) => Math.min(6, i + 1))} disabled={dayIdx === 6} className="p-1.5 rounded-lg disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day classes */}
      {dayClasses.length === 0 ? (
        <Card><CardBody className="text-center py-8">
          <p className="font-body text-sm text-salvaje-gray">Sin clases este día</p>
        </CardBody></Card>
      ) : (
        <div className="space-y-2">
          {dayClasses.map((c) => {
            const cap = c.maxCapacity || 1
            const booked = c.currentBookings || c.attendeeList?.length || 0
            const pct = (booked / cap) * 100
            const occColor = pct >= 70 ? 'bg-salvaje-success' : pct >= 40 ? 'bg-salvaje-orange' : 'bg-salvaje-danger'
            return (
              <Card key={c.id}>
                <button onClick={() => onClickClass?.(c)} className="w-full text-left">
                  <CardBody className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-base uppercase text-salvaje-dark">{c.name}</p>
                        <div className="flex items-center gap-2 text-xs font-body text-salvaje-gray mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1"><Clock size={10} />{formatTime(c.scheduledDate)} - {formatTime(c.endDate)}</span>
                          <span className="flex items-center gap-1"><Users size={10} />{booked}/{cap}</span>
                        </div>
                        <p className="font-mono text-[10px] text-salvaje-gray mt-0.5">{c.coachName}</p>
                      </div>
                      <Badge variant={statusBadge[c.status]}>{statusLabel[c.status]}</Badge>
                    </div>
                    <div className="w-full h-1 rounded-full bg-salvaje-light mt-2 overflow-hidden">
                      <div className={`h-full ${occColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </CardBody>
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
