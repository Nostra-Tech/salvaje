import { X, Lock, CheckCircle2, Trophy } from 'lucide-react'
import { Avatar } from './Avatar'
import { TeamBadge } from './TeamBadge'
import { scoreMatch } from '../services/scoring'
import { ALL_MATCHES, hasMatchStarted, shortDate } from '../data/worldCup'

const hasScore = (s) => s && s.a !== '' && s.a != null && s.b !== '' && s.b != null

/**
 * Detalle de los marcadores de un participante visto por otro usuario.
 * REGLA DE PRIVACIDAD: solo se muestran los partidos que YA COMENZARON. Nadie
 * puede ver lo que pronosticaron los demás antes de que empiece el partido.
 */
export function UserScoresModal({ user, results, onClose }) {
  const now = Date.now()
  const predScores = user?.prediction?.scores || {}
  const officialScores = results?.scores || {}

  const started = ALL_MATCHES.filter((m) => hasMatchStarted(m, now))
  const hiddenCount = ALL_MATCHES.length - started.length

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-salvaje bg-white shadow-salvaje-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-salvaje-light-alt px-5 py-4">
          <Avatar src={user.avatar} name={user.name} size={44} className="ring-2 ring-salvaje-orange/20" />
          <div className="min-w-0 flex-1">
            <p className="display truncate text-2xl text-salvaje-brown leading-none">{user.name}</p>
            <p className="mt-1 text-xs text-salvaje-gray">Marcadores de partidos ya jugados</p>
          </div>
          <div className="text-right">
            <div className="display text-2xl text-salvaje-orange leading-none">{user.score}</div>
            <div className="text-[10px] uppercase tracking-wide text-salvaje-gray">puntos</div>
          </div>
          <button onClick={onClose} className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-salvaje-gray transition hover:bg-salvaje-light-alt">
            <X size={18} />
          </button>
        </div>

        {/* Aviso de privacidad */}
        <div className="flex items-start gap-2 border-b border-salvaje-light-alt bg-salvaje-light px-5 py-2.5 text-xs text-salvaje-gray">
          <Lock size={14} className="mt-0.5 shrink-0 text-salvaje-gold" />
          <p>Solo ves los pronósticos de partidos que <strong>ya comenzaron</strong>. Los que aún no empiezan permanecen ocultos.</p>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto px-5 py-4">
          {started.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Trophy size={30} className="text-salvaje-gold" />
              <p className="font-semibold text-salvaje-brown">Aún no ha empezado ningún partido</p>
              <p className="max-w-xs text-sm text-salvaje-gray">
                Cuando arranquen los partidos podrás ver aquí los marcadores que puso y los puntos que sumó.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {started.map((m) => {
                const pred = predScores[m.id]
                const off = officialScores[m.id]
                const puso = hasScore(pred)
                const r = puso && hasScore(off) ? scoreMatch(pred, off) : null
                return (
                  <div key={m.id} className="rounded-xl border border-black/5 bg-white px-3 py-2">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-salvaje-gray">
                      <span>{m.group ? `Grupo ${m.group}` : m.roundLabel}</span>
                      <span>{shortDate(m.date)} · {m.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-right text-sm font-semibold text-salvaje-brown">
                        <span className="truncate">{m.teamA}</span>
                        <TeamBadge name={m.teamA} showName={false} size={20} />
                      </span>
                      <span className="shrink-0 rounded-lg bg-salvaje-light-alt px-2 py-0.5 font-mono text-sm font-bold text-salvaje-brown">
                        {puso ? `${pred.a} : ${pred.b}` : '— : —'}
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-semibold text-salvaje-brown">
                        <TeamBadge name={m.teamB} showName={false} size={20} />
                        <span className="truncate">{m.teamB}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px]">
                      {hasScore(off) ? (
                        <span className="text-salvaje-gray">
                          Oficial: <strong className="text-salvaje-brown">{off.a} : {off.b}</strong>
                        </span>
                      ) : (
                        <span className="text-salvaje-gray">En juego · sin resultado oficial</span>
                      )}
                      {!puso ? (
                        <span className="chip bg-salvaje-danger/10 text-salvaje-danger">No pronosticó</span>
                      ) : r ? (
                        r.points > 0 ? (
                          <span className="chip bg-salvaje-success/15 text-salvaje-success">
                            <CheckCircle2 size={12} /> +{r.points} {r.exact ? 'exacto' : 'resultado'}
                          </span>
                        ) : (
                          <span className="chip bg-salvaje-danger/10 text-salvaje-danger">+0</span>
                        )
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {hiddenCount > 0 && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-salvaje-gray">
              <Lock size={12} className="text-salvaje-gray" />
              {hiddenCount} {hiddenCount === 1 ? 'partido aún no comienza' : 'partidos aún no comienzan'} — sus pronósticos se revelan al empezar.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
