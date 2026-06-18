import { useMemo } from 'react'
import { Clock, Users } from 'lucide-react'
import { formatTime } from '../../utils/formatters'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
// Default hours when there are no classes (typical gym hours)
const DEFAULT_HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 17, 18, 19, 20]

function statusColor(status) {
  return {
    scheduled:   'bg-blue-100   text-blue-800   border-blue-300',
    in_progress: 'bg-orange-100 text-orange-800 border-orange-400',
    completed:   'bg-green-100  text-green-800  border-green-300',
    cancelled:   'bg-red-100    text-red-800    border-red-300 line-through opacity-60',
  }[status] || 'bg-gray-100 text-gray-800 border-gray-300'
}

function occupancyColor(pct) {
  if (pct >= 70) return 'bg-salvaje-success'
  if (pct >= 40) return 'bg-salvaje-orange'
  return 'bg-salvaje-danger'
}

/**
 * Weekly grid: 7 days × selected hours.
 * Pass `weekStart` (Date pointing to Monday) and `classes` (array).
 */
export function WeeklyCalendarGrid({ weekStart, classes, onClickClass }) {
  // Map: dayIdx (0-6, monday-first) → hour → array of classes
  const { grid, hours } = useMemo(() => {
    const m = {}
    const hoursSet = new Set(DEFAULT_HOURS)
    for (const c of classes) {
      const date = c.scheduledDate?.toDate ? c.scheduledDate.toDate() : new Date(c.scheduledDate)
      // Day of week with monday=0
      const day = (date.getDay() + 6) % 7
      const hour = date.getHours()
      hoursSet.add(hour)
      const key = `${day}-${hour}`
      if (!m[key]) m[key] = []
      m[key].push(c)
    }
    const hoursArr = Array.from(hoursSet).sort((a, b) => a - b)
    return { grid: m, hours: hoursArr }
  }, [classes])

  return (
    <div className="bg-white rounded-salvaje shadow-salvaje overflow-x-auto">
      <div className="min-w-[820px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b-2 border-salvaje-cream sticky top-0 bg-white z-10">
          <div></div>
          {DAYS.map((d, i) => {
            const date = new Date(weekStart)
            date.setDate(date.getDate() + i)
            return (
              <div key={d} className="px-2 py-2 text-center border-l border-salvaje-cream">
                <p className="font-display text-sm uppercase text-salvaje-dark">{d}</p>
                <p className="font-mono text-[10px] text-salvaje-gray">{date.getDate()}</p>
              </div>
            )
          })}
        </div>
        {/* Body */}
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-salvaje-cream">
            <div className="px-2 py-2 font-mono text-[10px] text-salvaje-gray text-right pr-3 border-r border-salvaje-cream">
              {hour}:00
            </div>
            {DAYS.map((_, dayIdx) => {
              const slot = grid[`${dayIdx}-${hour}`] || []
              return (
                <div key={dayIdx} className="border-l border-salvaje-cream p-1 min-h-[58px] space-y-1">
                  {slot.map((cls) => {
                    const cap = cls.maxCapacity || 1
                    const booked = cls.currentBookings || cls.attendeeList?.length || 0
                    const pct = (booked / cap) * 100
                    return (
                      <button
                        key={cls.id}
                        onClick={() => onClickClass?.(cls)}
                        className={`w-full text-left p-1.5 rounded-md border text-[10px] font-body hover:shadow-md transition-all ${statusColor(cls.status)}`}
                      >
                        <p className="font-semibold truncate">{cls.name}</p>
                        <p className="opacity-75 truncate flex items-center gap-1">
                          <Clock size={9} />{formatTime(cls.scheduledDate)}
                        </p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="truncate opacity-75">{cls.coachName?.split(' ')[0]}</span>
                          <span className="flex items-center gap-0.5">
                            <Users size={9} />{booked}/{cap}
                          </span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-white/40 mt-1 overflow-hidden">
                          <div className={`h-full ${occupancyColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
