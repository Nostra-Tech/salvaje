import { useEffect, useState } from 'react'

// Inicio del Mundial 2026: México vs Sudáfrica — 11 de junio 2026, 14:00 (hora local).
const KICKOFF = new Date('2026-06-11T14:00:00')

function diff() {
  const ms = Math.max(0, KICKOFF.getTime() - Date.now())
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return { days, hours, minutes, seconds }
}

function Cell({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="display min-w-[42px] rounded-lg border border-white/10 bg-white/5 px-1.5 py-1.5 text-2xl text-salvaje-cream tabular-nums sm:min-w-[56px] sm:rounded-xl sm:px-2 sm:py-2 sm:text-3xl">
        {String(value).padStart(2, '0')}
      </div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white sm:text-[10px]">{label}</div>
    </div>
  )
}

export function Countdown() {
  const [t, setT] = useState(diff)

  useEffect(() => {
    const id = setInterval(() => setT(diff()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Cell value={t.days} label="Días" />
      <Cell value={t.hours} label="Horas" />
      <Cell value={t.minutes} label="Min" />
      <Cell value={t.seconds} label="Seg" />
    </div>
  )
}
