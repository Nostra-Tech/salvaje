import { TeamBadge } from './TeamBadge'
import { matchInsight } from '../services/wcInsights'

/** Panel con datos históricos de Mundiales para un partido (openfootball). */
export function MatchInsight({ teamA, teamB }) {
  const { a, b, h2h, prob, likely } = matchInsight(teamA, teamB)

  return (
    <div className="mt-2 space-y-2 border-t border-black/5 pt-2 text-[11px] text-salvaje-gray">
      {/* Probabilidad de victoria (histórica) */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="font-semibold uppercase tracking-wide">Prob. de victoria (histórica)</span>
          <span>
            Marcador típico <strong className="text-salvaje-brown">{likely}</strong>
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-salvaje-light-alt">
          <div style={{ width: `${prob.a}%` }} className="bg-salvaje-success" />
          <div style={{ width: `${prob.d}%` }} className="bg-salvaje-gold" />
          <div style={{ width: `${prob.b}%` }} className="bg-salvaje-orange" />
        </div>
        <div className="mt-1 flex justify-between font-semibold">
          <span className="text-salvaje-success">{prob.a}%</span>
          <span className="text-salvaje-gold">Empate {prob.d}%</span>
          <span className="text-salvaje-orange">{prob.b}%</span>
        </div>
      </div>

      {/* Récords en Mundiales */}
      <div className="grid grid-cols-2 gap-2">
        <TeamHistory name={teamA} t={a} />
        <TeamHistory name={teamB} t={b} />
      </div>

      {/* Head-to-head */}
      <div className="rounded-lg bg-salvaje-light-alt/60 px-2 py-1.5">
        {h2h ? (
          <>
            <span className="font-semibold text-salvaje-brown">Historial Mundial:</span> {h2h.played} PJ ·{' '}
            <span className="text-salvaje-success">{h2h.aWins}V</span>{' '}
            <span className="text-salvaje-gold">{h2h.draws}E</span>{' '}
            <span className="text-salvaje-orange">{h2h.bWins}D</span>
            {h2h.top.length > 0 && <> · resultados frecuentes: {h2h.top.map((t) => t.s).join(', ')}</>}
          </>
        ) : (
          <>Nunca se han enfrentado en un Mundial.</>
        )}
      </div>

      <div className="text-right text-[10px] text-salvaje-gray/60">Datos: openfootball/worldcup · 1930–2022</div>
    </div>
  )
}

function TeamHistory({ name, t }) {
  return (
    <div className="rounded-lg border border-black/5 bg-white px-2 py-1.5">
      <div className="mb-0.5 flex items-center gap-1 font-semibold text-salvaje-brown">
        <TeamBadge name={name} size={14} showName={false} />
        <span className="truncate">{name}</span>
      </div>
      {t ? (
        <div className="leading-relaxed text-salvaje-gray">
          {t.editions} Mundiales · {t.played} PJ
          <br />
          {t.win}G {t.draw}E {t.loss}P · {t.gf}:{t.ga}
          <br />
          <span className="font-semibold text-salvaje-orange">{t.winPct}%</span> de victorias
        </div>
      ) : (
        <div className="text-salvaje-gray">Debutante mundialista</div>
      )}
    </div>
  )
}
