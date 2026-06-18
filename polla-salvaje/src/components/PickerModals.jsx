import { useState, useMemo, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { ALL_TEAMS } from '../data/worldCup'
import { getSquad } from '../data/squads'
import { TeamBadge } from './TeamBadge'

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function Overlay({ children, onClose, title }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-salvaje-dark/60 backdrop-blur-sm" />
      <div
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-salvaje bg-white shadow-salvaje-lg sm:rounded-salvaje"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-salvaje-light-alt px-4 py-3">
          <h3 className="display text-xl text-salvaje-brown">{title}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-salvaje-gray hover:bg-salvaje-light-alt">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Modal de selección de equipo (48 selecciones con escudo + búsqueda). */
export function TeamPickerModal({ title = 'Elige una selección', selected, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const nq = norm(q)
    return ALL_TEAMS.filter((t) => !nq || norm(t).includes(nq))
  }, [q])
  return (
    <Overlay onClose={onClose} title={title}>
      <div className="border-b border-salvaje-light-alt p-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-salvaje-gray" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar selección…"
            className="w-full rounded-xl border border-salvaje-light-alt bg-salvaje-light py-2.5 pl-9 pr-3 text-sm text-salvaje-brown outline-none focus:border-salvaje-orange focus:ring-2 focus:ring-salvaje-orange/30"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 overflow-y-auto p-3">
        {list.map((t) => (
          <button
            key={t} onClick={() => { onSelect(t); onClose() }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${selected === t ? 'border-salvaje-orange bg-salvaje-orange/10 text-salvaje-orange' : 'border-salvaje-light-alt bg-white text-salvaje-brown hover:border-salvaje-orange/40 hover:bg-salvaje-light'}`}
          >
            <TeamBadge name={t} size={24} showName={false} />
            <span className="truncate font-semibold">{t}</span>
          </button>
        ))}
        {list.length === 0 && <p className="col-span-2 py-6 text-center text-sm text-salvaje-gray">Sin resultados.</p>}
      </div>
    </Overlay>
  )
}

/** Modal de selección de jugador (convocados de una selección + búsqueda). */
export function PlayerPickerModal({ team, selected, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const players = useMemo(() => getSquad(team), [team])
  const list = useMemo(() => {
    const nq = norm(q)
    return players.filter((p) => !nq || norm(p.n).includes(nq))
  }, [players, q])
  const POS = { PT: 'Portero', DF: 'Defensa', MC: 'Medio', DC: 'Delantero' }
  return (
    <Overlay onClose={onClose} title={`Goleador · ${team}`}>
      <div className="border-b border-salvaje-light-alt p-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-salvaje-gray" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jugador…"
            className="w-full rounded-xl border border-salvaje-light-alt bg-salvaje-light py-2.5 pl-9 pr-3 text-sm text-salvaje-brown outline-none focus:border-salvaje-orange focus:ring-2 focus:ring-salvaje-orange/30"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto p-3">
        {list.map((p) => (
          <button
            key={p.n + p.c} onClick={() => { onSelect(p.n); onClose() }}
            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${selected === p.n ? 'border-salvaje-orange bg-salvaje-orange/10 text-salvaje-orange' : 'border-salvaje-light-alt bg-white text-salvaje-brown hover:border-salvaje-orange/40 hover:bg-salvaje-light'}`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-semibold truncate">{p.n}</span>
              <span className="shrink-0 rounded-full bg-salvaje-light-alt px-2 py-0.5 text-[10px] uppercase text-salvaje-gray">{POS[p.p] || p.p}</span>
            </span>
            <span className="shrink-0 text-xs text-salvaje-gray">{p.g} goles</span>
          </button>
        ))}
        {list.length === 0 && <p className="py-6 text-center text-sm text-salvaje-gray">Sin convocados para esta selección.</p>}
      </div>
    </Overlay>
  )
}
