import { Target, Flag, Flame, Star, ChevronRight, Goal, Crown, Swords } from 'lucide-react'
import { TeamBadge } from './TeamBadge'
import { GROUP_MATCHES, GROUP_LETTERS, KNOCKOUT_ROUNDS } from '../data/worldCup'

const has = (s) => s && s.a !== '' && s.a != null && s.b !== '' && s.b != null

function analyze(scores = {}, qualifiers = {}, bestThirds = []) {
  let homeWins = 0
  let awayWins = 0
  let draws = 0
  let filled = 0
  let totalGoals = 0
  let topMatch = null
  const wins = {}
  const goalsFor = {} // goles que le das a cada selección en todos tus marcadores

  for (const m of GROUP_MATCHES) {
    const s = scores[m.id]
    if (!has(s)) continue
    filled++
    const a = +s.a
    const b = +s.b
    totalGoals += a + b
    goalsFor[m.teamA] = (goalsFor[m.teamA] || 0) + a
    goalsFor[m.teamB] = (goalsFor[m.teamB] || 0) + b
    if (a > b) {
      homeWins++
      wins[m.teamA] = (wins[m.teamA] || 0) + 1
    } else if (b > a) {
      awayWins++
      wins[m.teamB] = (wins[m.teamB] || 0) + 1
    } else {
      draws++
    }
    if (!topMatch || a + b > topMatch.goals) topMatch = { m, a, b, goals: a + b }
  }

  // Favoritos por victorias; el máximo favorito desempata por goles a favor.
  const favorites = Object.keys(wins)
    .map((team) => ({ team, n: wins[team], goals: goalsFor[team] || 0 }))
    .sort((x, y) => y.n - x.n || y.goals - x.goals)

  const advancing = new Set()
  GROUP_LETTERS.forEach((g) => {
    const q = qualifiers[g] || {}
    if (q.first) advancing.add(q.first)
    if (q.second) advancing.add(q.second)
  })
  ;(bestThirds || []).forEach((t) => t && advancing.add(t))

  return {
    filled,
    homeWins,
    awayWins,
    draws,
    totalGoals,
    avgGoals: filled ? totalGoals / filled : 0,
    topMatch,
    favorites,
    advancing: [...advancing],
  }
}

function Card({ icon: Icon, title, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={18} className="text-salvaje-orange" />
        <h3 className="font-bold text-salvaje-brown">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export function PredictionDashboard({ scores, qualifiers, bestThirds, champion, runnerUp, scorerTeam, scorer, onGo }) {
  const a = analyze(scores, qualifiers, bestThirds)
  const hasFinals = champion || runnerUp || scorer
  const decided = a.homeWins + a.awayWins + a.draws || 1
  const pct = (n) => Math.round((n / decided) * 100)
  const maxFav = a.favorites[0]?.n || 1
  const fav = a.favorites[0] || null

  if (a.filled === 0 && a.advancing.length === 0 && !hasFinals) {
    return (
      <div className="pb-28">
        <div className="card p-8 text-center">
          <Target className="mx-auto text-salvaje-orange" size={36} />
          <h2 className="display mt-3 text-2xl text-salvaje-brown">Aún no tienes pronósticos</h2>
          <p className="mt-1 text-sm text-salvaje-gray">
            Empieza por los marcadores o por elegir los clasificados y este panel cobrará vida.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button onClick={() => onGo('scores')} className="btn-primary">
              <Target size={18} /> Marcadores
            </button>
            <button onClick={() => onGo('qualifiers')} className="btn-gold">
              <Flag size={18} /> Clasificados
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 pb-28 md:grid-cols-2">
      {/* Finales: Campeón / Subcampeón / Goleador */}
      <div className="card p-5 md:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <Crown size={18} className="text-salvaje-gold" />
          <h3 className="font-bold text-salvaje-brown">Tus finales</h3>
          <button onClick={() => onGo('finales')} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-salvaje-orange hover:text-salvaje-fire">
            Editar <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FinalPick label="Campeón (+25)" team={champion} />
          <FinalPick label="Subcampeón (+20)" team={runnerUp} />
          <div>
            <div className="text-xs uppercase tracking-widest text-salvaje-gray">Goleador (+15)</div>
            {scorer ? (
              <div className="mt-1">
                <div className="display text-lg text-salvaje-brown leading-tight">{scorer}</div>
                {scorerTeam && <TeamBadge name={scorerTeam} size={18} className="mt-0.5 text-xs text-salvaje-gray" />}
              </div>
            ) : (
              <div className="mt-1 text-sm text-salvaje-gray">Sin elegir</div>
            )}
          </div>
        </div>
      </div>

      {/* Máximo favorito */}
      {fav && (
        <div className="card flex items-center gap-4 p-5 md:col-span-2">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-salvaje-orange/10">
            <TeamBadge name={fav.team} size={46} showName={false} />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-salvaje-gray">Tu máximo favorito</div>
            <div className="display truncate text-3xl text-salvaje-brown">{fav.team}</div>
            <div className="text-sm font-semibold text-salvaje-orange">
              Le das <strong>{fav.n}</strong> {fav.n === 1 ? 'victoria' : 'victorias'} y{' '}
              <strong>{fav.goals}</strong> {fav.goals === 1 ? 'gol' : 'goles'}
            </div>
          </div>
          <Flame size={42} className="ml-auto shrink-0 text-salvaje-fire" />
        </div>
      )}

      {/* Resultados que das */}
      <Card icon={Target} title="Resultados que das">
        <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-salvaje-light-alt">
          <div style={{ width: `${pct(a.homeWins)}%` }} className="bg-salvaje-success" />
          <div style={{ width: `${pct(a.draws)}%` }} className="bg-salvaje-gold" />
          <div style={{ width: `${pct(a.awayWins)}%` }} className="bg-salvaje-orange" />
        </div>
        <div className="grid grid-cols-3 text-center">
          <Mini n={a.homeWins} label="Gana local" color="text-salvaje-success" />
          <Mini n={a.draws} label="Empate" color="text-salvaje-gold" />
          <Mini n={a.awayWins} label="Gana visita" color="text-salvaje-orange" />
        </div>
        <div className="mt-3 text-xs text-salvaje-gray">
          {a.filled}/{GROUP_MATCHES.length} partidos pronosticados
        </div>
      </Card>

      {/* Goles */}
      <Card icon={Goal} title="Goles">
        <div className="flex items-end gap-6">
          <div>
            <div className="display text-4xl text-salvaje-brown">{a.totalGoals}</div>
            <div className="text-xs text-salvaje-gray">goles en total</div>
          </div>
          <div>
            <div className="display text-4xl text-salvaje-brown">{a.avgGoals.toFixed(1)}</div>
            <div className="text-xs text-salvaje-gray">promedio / partido</div>
          </div>
        </div>
        {a.topMatch && (
          <div className="mt-4 border-t border-black/5 pt-3">
            <div className="mb-1 text-xs uppercase tracking-wide text-salvaje-gray">El más goleador</div>
            <div className="flex items-center justify-between gap-2 text-sm font-semibold text-salvaje-brown">
              <TeamBadge name={a.topMatch.m.teamA} size={22} className="min-w-0 truncate" />
              <span className="shrink-0 rounded-lg bg-salvaje-light-alt px-2 py-0.5">
                {a.topMatch.a} : {a.topMatch.b}
              </span>
              <TeamBadge name={a.topMatch.m.teamB} size={22} reverse className="min-w-0 justify-end truncate" />
            </div>
          </div>
        )}
      </Card>

      {/* A quién le das más victorias */}
      <Card icon={Star} title="A quién le das más victorias" className="md:col-span-2">
        {a.favorites.length === 0 ? (
          <p className="text-sm text-salvaje-gray">Pronostica marcadores para ver tus favoritos.</p>
        ) : (
          <div className="space-y-2.5">
            {a.favorites.slice(0, 5).map(({ team, n }) => (
              <div key={team} className="flex items-center gap-3">
                <TeamBadge name={team} size={22} className="w-32 min-w-0 shrink-0 truncate text-sm font-medium text-salvaje-brown" />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-salvaje-light-alt">
                  <div className="h-full rounded-full bg-salvaje-orange" style={{ width: `${(n / maxFav) * 100}%` }} />
                </div>
                <span className="w-5 shrink-0 text-right text-sm font-bold text-salvaje-brown">{n}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Clasificados que elegiste — por grupo */}
      <Card icon={Flag} title="Clasificados que elegiste" className="md:col-span-2">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="display text-4xl text-salvaje-brown">{a.advancing.length}</span>
          <span className="text-xs text-salvaje-gray">de 32 a dieciseisavos</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {GROUP_LETTERS.map((g) => {
            const q = qualifiers?.[g] || {}
            return (
              <div key={g} className="rounded-xl border border-black/5 bg-white p-2.5">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-salvaje-gray">
                  Grupo {g}
                </div>
                <QRow pos="1º" team={q.first} />
                <QRow pos="2º" team={q.second} />
              </div>
            )
          })}
        </div>

        {bestThirds && bestThirds.length > 0 && (
          <div className="mt-3 border-t border-black/5 pt-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-salvaje-gray">
              <Crown size={13} className="text-salvaje-gold" /> Mejores terceros · {bestThirds.length}/8
            </div>
            <div className="flex flex-wrap gap-1.5">
              {bestThirds.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-salvaje-light-alt px-2 py-1 text-xs text-salvaje-brown">
                  <TeamBadge name={t} size={16} showName={false} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Fase eliminatoria — una tarjeta por ronda con los marcadores que diste */}
      {KNOCKOUT_ROUNDS.map((round) => (
        <Card key={round.key} icon={Swords} title={`${round.label} (${round.short})`} className="md:col-span-2">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="display text-4xl text-salvaje-brown">
              {round.matches.filter((m) => has(scores?.[m.id])).length}
            </span>
            <span className="text-xs text-salvaje-gray">de {round.matches.length} cruces pronosticados</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {round.matches.map((m) => {
              const s = scores?.[m.id]
              const filled = has(s)
              return (
                <div key={m.id} className="flex items-center gap-2 rounded-xl border border-black/5 bg-white p-2.5">
                  <TeamBadge name={m.teamA} size={20} showName={false} />
                  <span className="min-w-0 flex-1 truncate text-right text-xs font-semibold text-salvaje-brown">{m.teamA}</span>
                  {filled ? (
                    <span className="shrink-0 rounded-lg bg-salvaje-light-alt px-2 py-0.5 text-sm font-bold text-salvaje-brown">
                      {s.a} : {s.b}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-lg bg-salvaje-light-alt px-2 py-0.5 text-xs text-salvaje-gray/60">— : —</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-salvaje-brown">{m.teamB}</span>
                  <TeamBadge name={m.teamB} size={20} showName={false} />
                </div>
              )
            })}
          </div>
          <button
            onClick={() => onGo('scores')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-salvaje-orange hover:text-salvaje-fire"
          >
            Editar marcadores <ChevronRight size={14} />
          </button>
        </Card>
      ))}

      {/* Accesos para editar */}
      <div className="grid grid-cols-2 gap-3 md:col-span-2">
        <button
          onClick={() => onGo('scores')}
          className="card flex items-center justify-between p-4 text-left transition hover:shadow-salvaje-md"
        >
          <span className="flex items-center gap-2 font-semibold text-salvaje-brown">
            <Target size={18} className="text-salvaje-orange" /> Editar marcadores
          </span>
          <ChevronRight size={18} className="text-salvaje-gray" />
        </button>
        <button
          onClick={() => onGo('qualifiers')}
          className="card flex items-center justify-between p-4 text-left transition hover:shadow-salvaje-md"
        >
          <span className="flex items-center gap-2 font-semibold text-salvaje-brown">
            <Flag size={18} className="text-salvaje-orange" /> Editar clasificados
          </span>
          <ChevronRight size={18} className="text-salvaje-gray" />
        </button>
      </div>
    </div>
  )
}

function Mini({ n, label, color }) {
  return (
    <div>
      <div className={`display text-2xl ${color}`}>{n}</div>
      <div className="text-[11px] text-salvaje-gray">{label}</div>
    </div>
  )
}

function FinalPick({ label, team }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-salvaje-gray">{label}</div>
      {team ? (
        <div className="mt-1"><TeamBadge name={team} size={26} className="display text-lg text-salvaje-brown" /></div>
      ) : (
        <div className="mt-1 text-sm text-salvaje-gray">Sin elegir</div>
      )}
    </div>
  )
}

function QRow({ pos, team }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5 text-xs">
      <span className={`w-4 shrink-0 font-bold ${pos === '1º' ? 'text-salvaje-gold' : 'text-salvaje-orange'}`}>{pos}</span>
      {team ? (
        <TeamBadge name={team} size={16} className="min-w-0 truncate font-medium text-salvaje-brown" />
      ) : (
        <span className="text-salvaje-gray/40">— sin elegir</span>
      )}
    </div>
  )
}
