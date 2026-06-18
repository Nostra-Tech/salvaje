import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Avatar } from './Avatar'

/** Lista de posiciones con paginación (10 por página por defecto). */
export function LeaderboardRankings({ rows, startRank = 1, meId, pageSize = 10 }) {
  const [page, setPage] = useState(0)
  if (!rows.length) return null

  const totalPages = Math.ceil(rows.length / pageSize)
  const safePage = Math.min(page, totalPages - 1)
  const start = safePage * pageSize
  const slice = rows.slice(start, start + pageSize)

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-black/5">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-black/5 bg-salvaje-light-alt/50 text-xs uppercase tracking-wide text-salvaje-gray">
              <th className="px-3 py-2.5">#</th>
              <th className="px-2 py-2.5">Participante</th>
              <th className="hidden px-2 py-2.5 text-center sm:table-cell">Marc.</th>
              <th className="hidden px-2 py-2.5 text-center sm:table-cell">Clas.</th>
              <th className="px-3 py-2.5 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => {
              const rank = startRank + start + i
              const me = r.id === meId
              return (
                <tr key={r.id} className={`border-b border-black/5 last:border-0 ${me ? 'bg-salvaje-orange/10' : ''}`}>
                  <td className="px-3 py-2.5">
                    <span className="display text-base text-salvaje-brown">{rank}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar src={r.avatar} name={r.name} size={24} />
                      <span className="truncate font-semibold text-salvaje-brown">{r.name}</span>
                      {me && <span className="chip shrink-0 bg-salvaje-orange text-white">Tú</span>}
                    </div>
                  </td>
                  <td className="hidden px-2 py-2.5 text-center text-sm text-salvaje-gray sm:table-cell">
                    {r.breakdown.exactCount}✓ / {r.breakdown.resultCount}
                  </td>
                  <td className="hidden px-2 py-2.5 text-center text-sm text-salvaje-gray sm:table-cell">
                    {r.breakdown.qualifierHits}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="display text-xl text-salvaje-orange">{r.score}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-black/5 px-3 py-1.5 font-semibold text-salvaje-brown transition hover:bg-salvaje-light-alt disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-salvaje-gray">
            Página {safePage + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="inline-flex items-center gap-1 rounded-lg border border-black/5 px-3 py-1.5 font-semibold text-salvaje-brown transition hover:bg-salvaje-light-alt disabled:opacity-40"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
