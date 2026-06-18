import { TeamBadge } from './TeamBadge'
import { Lock } from 'lucide-react'

/**
 * Tarjeta para elegir 1º, 2º y (opcionalmente) 3º de un grupo.
 * Los 1º y 2º clasifican directo; los 3º compiten por los 8 mejores terceros
 * (estado global manejado por el padre).
 *
 * @param {string} group           letra del grupo
 * @param {string[]} teams         4 selecciones
 * @param {{first,second}} value   selección del usuario (1º/2º)
 * @param {(v:{first,second})=>void} onChange
 * @param {string[]} thirds        lista global de mejores terceros elegidos
 * @param {(team:string)=>void} onToggleThird
 * @param {boolean} thirdsFull     true si ya hay 8 terceros elegidos
 * @param {{first,second}|null} official      1º/2º reales (bloquea + resalta)
 * @param {string[]|null} officialThirds      mejores terceros reales
 */
export function QualifierGroupCard({
  group,
  teams,
  value = {},
  onChange,
  thirds = [],
  onToggleThird,
  thirdsFull = false,
  official,
  officialThirds,
  disabled = false,
}) {
  const officialLocked = !!(
    (official && (official.first || official.second)) ||
    (officialThirds && officialThirds.length)
  )
  // `disabled` = cierre por inicio de Jornada 2. Cualquiera bloquea la edición.
  const locked = officialLocked || disabled

  const pick = (pos, team) => {
    if (locked) return
    const next = { ...value }
    if (pos === 'first' && next.second === team) next.second = ''
    if (pos === 'second' && next.first === team) next.first = ''
    next[pos] = next[pos] === team ? '' : team
    onChange(next)
  }

  const advancedSet = new Set(
    [official?.first, official?.second, ...(officialThirds || [])].filter(Boolean),
  )

  return (
    <div className={`rounded-xl border bg-white p-3 ${locked ? 'border-salvaje-gold/40' : 'border-black/5'}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="display text-xl text-salvaje-brown">Grupo {group}</div>
        {locked && <Lock size={14} className="text-salvaje-gold" />}
      </div>

      <div className="space-y-1.5">
        {teams.map((team) => {
          const isFirst = value.first === team
          const isSecond = value.second === team
          const isThird = thirds.includes(team)
          const userPicked = isFirst || isSecond || isThird
          const advanced = advancedSet.has(team)
          const correct = locked && advanced && userPicked
          const wrong = locked && userPicked && !advanced
          const thirdDisabled = locked || isFirst || isSecond || (thirdsFull && !isThird)

          return (
            <div
              key={team}
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${
                correct ? 'bg-salvaje-success/10' : wrong ? 'bg-salvaje-danger/10' : 'bg-salvaje-light-alt/40'
              }`}
            >
              <TeamBadge name={team} size={22} className="min-w-0 text-[13px] font-medium text-salvaje-brown" />
              <div className="flex shrink-0 gap-1">
                <PosBtn active={isFirst} disabled={locked} onClick={() => pick('first', team)} kind="1">
                  1º
                </PosBtn>
                <PosBtn active={isSecond} disabled={locked} onClick={() => pick('second', team)} kind="2">
                  2º
                </PosBtn>
                <PosBtn
                  active={isThird}
                  disabled={thirdDisabled}
                  onClick={() => onToggleThird && onToggleThird(team)}
                  kind="3"
                  title="Mejor tercero"
                >
                  3º
                </PosBtn>
              </div>
            </div>
          )
        })}
      </div>

      {officialLocked && (
        <div className="mt-2 border-t border-black/5 pt-2 text-center text-[11px] text-salvaje-gray">
          Avanzan: <strong className="text-salvaje-brown">{[official?.first, official?.second].filter(Boolean).join(', ')}</strong>
          {officialThirds && officialThirds.some((t) => teams.includes(t)) && (
            <span> · 3º: <strong className="text-salvaje-brown">{officialThirds.filter((t) => teams.includes(t)).join(', ')}</strong></span>
          )}
        </div>
      )}
    </div>
  )
}

function PosBtn({ active, disabled, onClick, kind, children, title }) {
  const base = 'h-8 w-8 rounded-lg text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40'
  const activeCls =
    kind === '1'
      ? 'bg-salvaje-gold text-salvaje-dark'
      : kind === '2'
        ? 'bg-salvaje-orange text-white'
        : 'bg-salvaje-brown text-salvaje-cream'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${active ? activeCls : 'bg-white text-salvaje-gray border border-salvaje-gray/30 hover:border-salvaje-orange'}`}
    >
      {children}
    </button>
  )
}
