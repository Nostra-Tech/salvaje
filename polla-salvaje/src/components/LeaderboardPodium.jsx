import { Avatar } from './Avatar'
import { asset } from '../lib/asset'

// Podio para el top 3 del ranking (orden visual: 2º · 1º · 3º).

const CONF = {
  1: { ring: 'ring-salvaje-gold', badge: 'bg-salvaje-gold', block: 'from-salvaje-gold to-salvaje-gold/70', h: 'h-28' },
  2: { ring: 'ring-salvaje-gray/50', badge: 'bg-salvaje-gray', block: 'from-salvaje-gray/70 to-salvaje-gray/40', h: 'h-20' },
  3: { ring: 'ring-salvaje-fire/50', badge: 'bg-salvaje-fire', block: 'from-salvaje-fire/80 to-salvaje-fire/40', h: 'h-16' },
}

function PodiumSpot({ row, rank, me, onSelect }) {
  const c = CONF[rank]
  return (
    <div
      onClick={() => onSelect && onSelect(row)}
      className="flex w-full max-w-[140px] flex-1 cursor-pointer flex-col items-center transition hover:-translate-y-0.5"
    >
      {rank === 1 && <img src={asset('trophy.png')} alt="Campeón" className="mb-1 h-10 w-auto object-contain drop-shadow" />}

      {/* Avatar con número de puesto */}
      <div className="relative mb-2">
        <Avatar src={row.avatar} name={row.name} size={rank === 1 ? 64 : 56} className={`bg-salvaje-light ring-4 ${c.ring}`} />
        <span className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow ${c.badge}`}>
          {rank}
        </span>
      </div>

      <span className="w-full truncate text-center text-sm font-semibold text-salvaje-brown" title={row.name}>
        {row.name}
        {me && ' (Tú)'}
      </span>
      <div className="leading-none">
        <span className="display text-xl text-salvaje-orange">{row.score}</span>
        <span className="ml-1 text-[10px] text-salvaje-gray">pts</span>
      </div>

      {/* Bloque del podio */}
      <div className={`mt-2 flex w-full justify-center rounded-t-xl bg-gradient-to-b pt-2 ${c.block} ${c.h}`}>
        <span className="display text-3xl text-white/90">{rank}º</span>
      </div>
    </div>
  )
}

export function LeaderboardPodium({ top, meId, onSelect }) {
  // top = [1º, 2º, 3º] (en orden de ranking). Lo mostramos como 2º · 1º · 3º.
  const order = [
    { row: top[1], rank: 2 },
    { row: top[0], rank: 1 },
    { row: top[2], rank: 3 },
  ].filter((x) => x.row)

  if (order.length === 0) return null

  return (
    <div className="mb-6 flex items-end justify-center gap-2 sm:gap-5">
      {order.map(({ row, rank }) => (
        <PodiumSpot key={row.id} row={row} rank={rank} me={row.id === meId} onSelect={onSelect} />
      ))}
    </div>
  )
}
