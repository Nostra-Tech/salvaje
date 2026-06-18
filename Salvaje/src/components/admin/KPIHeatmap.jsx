const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

function getColor(value, max) {
  if (max === 0 || value === 0) return '#F4EFE5' // empty cream
  const intensity = value / max
  // Cream → Orange gradient
  const r = Math.round(244 - (244 - 212) * intensity)
  const g = Math.round(239 - (239 - 82) * intensity)
  const b = Math.round(229 - (229 - 26) * intensity)
  return `rgb(${r},${g},${b})`
}

export function KPIHeatmap({ grid, totalAttendances }) {
  // grid: 7 rows (days) × 24 cols (hours)
  // We display only HOURS subset
  const max = grid.flat().reduce((m, v) => Math.max(m, v), 0)
  return (
    <div className="bg-white rounded-salvaje p-4 shadow-salvaje">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-lg uppercase text-salvaje-dark">Mapa de calor</h3>
        <span className="font-mono text-xs text-salvaje-gray">{totalAttendances} check-ins · 4 semanas</span>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header */}
          <div className="flex items-center gap-1 ml-10 mb-1">
            {HOURS.map((h) => (
              <div key={h} className="w-7 text-center font-mono text-[10px] text-salvaje-gray">
                {h}
              </div>
            ))}
          </div>
          {/* Rows */}
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="flex items-center gap-1 mb-1">
              <div className="w-9 font-body text-[11px] text-salvaje-gray uppercase tracking-wide">{day}</div>
              {HOURS.map((h) => {
                const v = grid[dayIdx]?.[h] || 0
                return (
                  <div
                    key={h}
                    className="w-7 h-7 rounded-md flex items-center justify-center font-mono text-[10px] text-salvaje-dark transition-all hover:scale-110 hover:ring-2 hover:ring-salvaje-orange"
                    style={{ background: getColor(v, max) }}
                    title={`${day} ${h}:00 — ${v} check-ins`}
                  >
                    {v > 0 ? v : ''}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] font-mono text-salvaje-gray">
        <span>Menos</span>
        <div className="flex gap-0.5">
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <div key={p} className="w-4 h-3 rounded" style={{ background: getColor(max * p, max) }} />
          ))}
        </div>
        <span>Más</span>
      </div>
    </div>
  )
}
