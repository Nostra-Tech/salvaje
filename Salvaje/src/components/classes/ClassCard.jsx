import { Clock, Users, CheckCircle } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Avatar } from '../ui/Avatar'
import { formatTime } from '../../utils/formatters'

const levelLabels = { all: 'Todos', beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' }
const levelVariants = { all: 'default', beginner: 'success', intermediate: 'orange', advanced: 'danger' }

export function ClassCard({ cls, userId, onClick, compact = false }) {
  const isReserved = cls.attendeeList?.some((a) => a.userId === userId)
  const isFull = cls.currentBookings >= cls.maxCapacity
  const isLive = cls.status === 'in_progress'
  const occupancyPct = Math.round((cls.currentBookings / cls.maxCapacity) * 100)

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-salvaje shadow-salvaje hover:shadow-salvaje-md transition-all duration-200 cursor-pointer active:scale-[0.99] overflow-hidden ${isLive ? 'ring-2 ring-salvaje-success/40' : ''}`}
    >
      {/* Top accent */}
      <div className={`h-1 ${isLive ? 'bg-salvaje-success' : isReserved ? 'bg-salvaje-success' : isFull ? 'bg-salvaje-danger' : 'bg-salvaje-orange'}`} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg uppercase text-salvaje-dark leading-tight truncate">{cls.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-salvaje-gray">
              <Clock size={12} />
              <span className="text-xs font-mono">{formatTime(cls.scheduledDate)} &ndash; {formatTime(cls.endDate)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {isLive && (
              <Badge variant="success">
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                EN VIVO
              </Badge>
            )}
            {isReserved && (
              <Badge variant="success">
                <CheckCircle size={10} />
                Reservado
              </Badge>
            )}
            {!isReserved && !isLive && isFull && <Badge variant="danger">Lleno</Badge>}
            <Badge variant={levelVariants[cls.level]}>{levelLabels[cls.level]}</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar src={cls.coachPhotoURL} name={cls.coachName} size="xs" />
            <span className="text-xs font-body text-salvaje-gray truncate max-w-[120px]">{cls.coachName}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-salvaje-gray" />
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-salvaje-gray">{cls.currentBookings}/{cls.maxCapacity}</span>
              <div className="w-12 h-1.5 bg-salvaje-cream rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${occupancyPct >= 90 ? 'bg-salvaje-danger' : occupancyPct >= 70 ? 'bg-salvaje-gold' : 'bg-salvaje-success'}`}
                  style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
