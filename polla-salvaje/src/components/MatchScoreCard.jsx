import { useState } from 'react'
import { TeamBadge } from './TeamBadge'
import { MatchInsight } from './MatchInsight'
import { scoreMatch } from '../services/scoring'
import { Lock, CheckCircle2, BarChart3, ChevronDown, Clock } from 'lucide-react'
import { shortDate, isScoreLocked, scoreDeadlineMs, formatCO } from '../data/worldCup'
import { asset } from '../lib/asset'

function ScoreInput({ value, onChange, disabled }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={99}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value
        if (v === '') return onChange('')
        const n = Math.max(0, Math.min(99, parseInt(v, 10) || 0))
        onChange(String(n))
      }}
      className="h-12 w-12 rounded-lg border border-salvaje-gray/30 bg-white text-center text-lg font-bold text-salvaje-brown outline-none focus:border-salvaje-orange focus:ring-2 focus:ring-salvaje-orange/20 disabled:bg-salvaje-light-alt disabled:text-salvaje-gray"
      placeholder="-"
    />
  )
}

/**
 * Tarjeta de un partido con predicción de marcador.
 * @param {object} match
 * @param {{a,b}} pred
 * @param {(p:{a,b})=>void} onChange
 * @param {{a,b}|null} official  resultado oficial (bloquea y muestra puntos)
 */
export function MatchScoreCard({ match, pred = {}, onChange, official, variant = 'light', withInsight = false }) {
  const officialLocked = !!official
  // Bloqueo por tiempo: el marcador se edita hasta 5 min antes del partido.
  const timeLocked = !officialLocked && isScoreLocked(match)
  const locked = officialLocked || timeLocked
  const deadline = scoreDeadlineMs(match)
  const setA = (a) => onChange({ ...pred, a })
  const setB = (b) => onChange({ ...pred, b })
  const result = official ? scoreMatch(pred, official) : null
  const [insightOpen, setInsightOpen] = useState(false)

  const dark = variant === 'glass'
  const c = dark
    ? {
        box: 'bg-salvaje-dark/40 backdrop-blur-md',
        borderIdle: 'border-white/10',
        meta: 'text-salvaje-cream/50',
        team: 'text-salvaje-cream',
        sep: 'text-salvaje-cream/40',
        line: 'border-white/10',
        muted: 'text-salvaje-cream/70',
        strong: 'text-salvaje-cream',
      }
    : {
        box: 'bg-white',
        borderIdle: 'border-black/5',
        meta: 'text-salvaje-gray',
        team: 'text-salvaje-brown',
        sep: 'text-salvaje-gray',
        line: 'border-black/5',
        muted: 'text-salvaje-gray',
        strong: 'text-salvaje-brown',
      }

  return (
    <div className={`relative overflow-hidden rounded-xl border px-3 py-3 ${c.box} ${locked ? 'border-salvaje-gold/50' : c.borderIdle}`}>
      {/* Banner Salvaje × FIFA 2026 como marca de agua sutil */}
      <img
        src={asset('banner.jpg')}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12]"
      />
      <div className="relative z-10 flex flex-col gap-2">
        <div className={`text-outline-white flex items-center justify-between text-[11px] font-bold ${c.meta}`}>
        <span className="font-bold uppercase tracking-wide">{match.group ? `Grupo ${match.group}` : match.roundLabel}</span>
        <span>
          {shortDate(match.date)} · {match.time}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Equipo A */}
        <div className={`text-outline-white flex min-w-0 items-center justify-end gap-2 text-right text-sm font-bold ${c.team}`}>
          <span className="truncate">{match.teamA}</span>
          <TeamBadge name={match.teamA} showName={false} size={28} />
        </div>

        {/* Marcador */}
        <div className="flex items-center gap-1.5">
          <ScoreInput value={pred.a} onChange={setA} disabled={locked} />
          <span className={c.sep}>:</span>
          <ScoreInput value={pred.b} onChange={setB} disabled={locked} />
        </div>

        {/* Equipo B */}
        <div className={`text-outline-white flex min-w-0 items-center gap-2 text-left text-sm font-bold ${c.team}`}>
          <TeamBadge name={match.teamB} showName={false} size={28} />
          <span className="truncate">{match.teamB}</span>
        </div>
      </div>

      {officialLocked && (
        <div className={`flex items-center justify-center gap-2 border-t pt-2 text-xs ${c.line}`}>
          <Lock size={13} className="text-salvaje-gold" />
          <span className={c.muted}>
            Oficial: <strong className={c.strong}>{official.a} : {official.b}</strong>
          </span>
          {result && result.points > 0 ? (
            <span className="chip bg-salvaje-success/15 text-salvaje-success">
              <CheckCircle2 size={12} /> +{result.points} {result.exact ? 'exacto' : 'resultado'}
            </span>
          ) : (
            <span className="chip bg-salvaje-danger/10 text-salvaje-danger">+0</span>
          )}
        </div>
      )}

      {timeLocked && (
        <div className={`text-outline-white flex items-center justify-center gap-1.5 border-t pt-2 text-[11px] font-bold ${c.line} ${c.muted}`}>
          <Lock size={12} className="text-salvaje-gold" />
          <span>Edición cerrada · cerró 5 min antes del partido</span>
        </div>
      )}

      {!locked && deadline && !Number.isNaN(deadline) && (
        <div className={`text-outline-white flex items-center justify-center gap-1.5 pt-1 text-[10px] font-semibold ${c.meta}`}>
          <Clock size={11} className="text-salvaje-orange" />
          <span>Editable hasta {formatCO(deadline)}</span>
        </div>
      )}

      {withInsight && (
        <>
          <button
            type="button"
            onClick={() => setInsightOpen((o) => !o)}
            className="text-outline-white mt-1 flex items-center justify-center gap-1 border-t border-black/5 pt-2 text-[11px] font-bold text-salvaje-orange hover:text-salvaje-fire"
          >
            <BarChart3 size={13} />
            {insightOpen ? 'Ocultar historial' : 'Historial y probabilidad'}
            <ChevronDown size={13} className={insightOpen ? 'rotate-180' : ''} />
          </button>
          {insightOpen && <MatchInsight teamA={match.teamA} teamB={match.teamB} />}
        </>
      )}
      </div>
    </div>
  )
}
