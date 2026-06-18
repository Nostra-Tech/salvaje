import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Save, Target, Flag, Sparkles, Layers, Lock, Clock } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { MatchScoreCard } from '../components/MatchScoreCard'
import { QualifierGroupCard } from '../components/QualifierGroupCard'
import { GroupStack } from '../components/GroupStack'
import { PredictionDashboard } from '../components/PredictionDashboard'
import { FinalsSection } from '../components/FinalsSection'
import { Avatar } from '../components/Avatar'
import { toast } from '../components/Toast'
import { GROUPS, GROUP_LETTERS, GROUP_MATCHES, matchesByDate, isQualifiersLocked, QUALIFIERS_DEADLINE_LABEL, isFinalsLocked } from '../data/worldCup'
import { usePollaStore } from '../store/pollaStore'
import { getPrediction, savePrediction, getResults } from '../services/polla.service'

const DAYS = matchesByDate(GROUP_MATCHES)

// Un marcador oficial solo cuenta (y bloquea la tarjeta) si tiene ambos goles.
function officialScore(s) {
  if (s && s.a !== '' && s.a != null && s.b !== '' && s.b != null) return s
  return null
}

export default function Predict() {
  const user = usePollaStore((s) => s.user)

  // El tab vive en la URL: sin tab = vista resumen ("Mis pronósticos");
  // ?tab=scores = Marcadores; ?tab=qualifiers = Clasificados. Así el dock abre cada uno.
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') // null | 'scores' | 'qualifiers'
  const setTab = (t) => setSearchParams({ tab: t }, { replace: true })
  const [scores, setScores] = useState({})
  const [qualifiers, setQualifiers] = useState({})
  const [bestThirds, setBestThirds] = useState([])
  const [champion, setChampion] = useState('')
  const [runnerUp, setRunnerUp] = useState('')
  const [scorerTeam, setScorerTeam] = useState('')
  const [scorer, setScorer] = useState('')
  const [results, setResults] = useState({ scores: {}, qualifiers: {}, bestThirds: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [groupView, setGroupView] = useState('normal') // 'normal' | 'quick'

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [pred, res] = await Promise.all([getPrediction(user.id), getResults()])
        if (!alive) return
        setScores(pred.scores || {})
        setQualifiers(pred.qualifiers || {})
        setBestThirds(pred.bestThirds || [])
        setChampion(pred.champion || '')
        setRunnerUp(pred.runnerUp || '')
        setScorerTeam(pred.scorerTeam || '')
        setScorer(pred.scorer || '')
        setResults(res)
      } catch (e) {
        console.error(e)
        toast.error('No se pudieron cargar tus pronósticos.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [user.id])

  const scoresFilled = useMemo(
    () => GROUP_MATCHES.filter((m) => scores[m.id]?.a !== '' && scores[m.id]?.a != null && scores[m.id]?.b !== '' && scores[m.id]?.b != null).length,
    [scores],
  )
  const qualsFilled = useMemo(
    () => GROUP_LETTERS.filter((g) => qualifiers[g]?.first && qualifiers[g]?.second).length,
    [qualifiers],
  )

  const MAX_THIRDS = 8
  const setScore = (id, p) => setScores((s) => ({ ...s, [id]: p }))

  // Clasificados: editables solo hasta el inicio de la Jornada 2.
  const qualifiersLocked = isQualifiersLocked()
  const finalsLocked = isFinalsLocked()

  const setQual = (g, v) => {
    if (qualifiersLocked) {
      toast.info('Los clasificados ya están cerrados (inicio de la Jornada 2).')
      return
    }
    setQualifiers((q) => ({ ...q, [g]: v }))
    // Si un equipo pasa a ser 1º/2º, ya no puede ser "mejor tercero".
    const promoted = [v.first, v.second].filter(Boolean)
    if (promoted.length) setBestThirds((t) => t.filter((team) => !promoted.includes(team)))
  }

  const toggleThird = (team) => {
    if (qualifiersLocked) {
      toast.info('Los clasificados ya están cerrados (inicio de la Jornada 2).')
      return
    }
    setBestThirds((t) => {
      if (t.includes(team)) return t.filter((x) => x !== team)
      if (t.length >= MAX_THIRDS) {
        toast.info(`Solo 8 mejores terceros. Quita uno para elegir otro.`)
        return t
      }
      return [...t, team]
    })
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await savePrediction(user.id, { scores, qualifiers, bestThirds, champion, runnerUp, scorerTeam, scorer })
      toast.success('Pronóstico guardado.')
    } catch (e) {
      console.error(e)
      toast.error('No se pudo guardar. Revisa tu conexión.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner label="Cargando tus pronósticos…" />

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Encabezado + progreso */}
      <div className="mb-5 flex flex-col gap-4 rounded-salvaje bg-salvaje-light p-5 shadow-salvaje sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!tab && (
            <Avatar src={user.avatar} name={user.fullName} size={52} className="ring-2 ring-salvaje-orange/20" />
          )}
          <div>
            <h1 className="display text-3xl text-salvaje-brown">
              {tab === 'qualifiers'
                ? 'Clasificados'
                : tab === 'scores'
                  ? 'Marcadores'
                  : tab === 'finales'
                    ? 'Finales'
                    : `Hola, ${user.fullName?.split(' ')[0] || 'Salvaje'}`}
            </h1>
            <p className="text-sm text-salvaje-gray">
              {tab === 'qualifiers'
                ? 'Elige el 1º y 2º de cada grupo y tus 8 mejores terceros.'
                : tab === 'scores'
                  ? 'Pronostica el marcador de los 72 partidos de fase de grupos.'
                  : tab === 'finales'
                    ? 'Campeón, Subcampeón y Goleador del Mundial.'
                    : 'Esta es la radiografía de tus predicciones del Mundial 2026.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Progress icon={Target} value={scoresFilled} total={GROUP_MATCHES.length} label="Marcadores" />
          <Progress icon={Flag} value={qualsFilled} total={GROUP_LETTERS.length} label="Grupos" />
        </div>
      </div>

      {tab === 'scores' ? (
        <div className="space-y-6 pb-28">
          <div className="flex items-start gap-2 rounded-xl border border-salvaje-orange/30 bg-salvaje-orange/10 p-3 text-sm text-salvaje-brown">
            <Clock size={18} className="mt-0.5 shrink-0 text-salvaje-orange" />
            <p>
              Cada marcador se puede editar <strong>hasta 5 minutos antes</strong> del inicio de ese partido (hora Colombia).
              Después queda <strong>bloqueado</strong>. Verás la fecha límite en cada tarjeta.
            </p>
          </div>
          {DAYS.map(({ date, items }) => (
            <section key={date}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-salvaje-gray">
                <span className="h-px flex-1 bg-salvaje-gray/20" />
                {date}
                <span className="h-px flex-1 bg-salvaje-gray/20" />
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                {items.map((m) => (
                  <MatchScoreCard
                    key={m.id}
                    match={m}
                    pred={scores[m.id] || {}}
                    onChange={(p) => setScore(m.id, p)}
                    official={officialScore(results.scores?.[m.id])}
                    withInsight
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : tab === 'qualifiers' ? (
        <div className="pb-28">
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-salvaje-gold/40 bg-salvaje-gold/15 p-3 text-sm text-salvaje-brown">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-salvaje-gold" />
            <p>
              Clasifican a dieciseisavos (32 equipos): el <strong>1º</strong> y <strong>2º</strong> de cada grupo más
              los <strong>8 mejores terceros</strong>. Marca el 1º/2º de cada grupo y elige tus 8 terceros con el botón{' '}
              <strong>3º</strong>. Cada acierto vale <strong>3 puntos</strong>.
            </p>
          </div>

          {qualifiersLocked ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-salvaje-danger/30 bg-salvaje-danger/10 p-3 text-sm text-salvaje-brown">
              <Lock size={18} className="mt-0.5 shrink-0 text-salvaje-danger" />
              <p>
                <strong>Clasificados cerrados.</strong> La edición estuvo disponible hasta el inicio de la Jornada 2
                ({QUALIFIERS_DEADLINE_LABEL}, hora Colombia). Ya no se pueden modificar.
              </p>
            </div>
          ) : (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-salvaje-orange/30 bg-salvaje-orange/10 p-3 text-sm text-salvaje-brown">
              <Clock size={18} className="mt-0.5 shrink-0 text-salvaje-orange" />
              <p>
                Puedes editar tus clasificados <strong>solo hasta el inicio de la Jornada 2</strong>:{' '}
                <strong>{QUALIFIERS_DEADLINE_LABEL}</strong> (hora Colombia). Después quedan bloqueados.
              </p>
            </div>
          )}

          <div className="mb-4 flex items-center gap-2">
            <div className="flex flex-1 items-center justify-between rounded-xl border border-black/5 bg-white px-4 py-2.5 text-sm text-salvaje-brown">
              <span>Mejores terceros</span>
              <span className={`display text-xl ${bestThirds.length === 8 ? 'text-salvaje-orange' : 'text-salvaje-brown'}`}>
                {bestThirds.length}/8
              </span>
            </div>
            <button
              onClick={() => setGroupView((v) => (v === 'normal' ? 'quick' : 'normal'))}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-salvaje-orange/40 bg-salvaje-orange/10 px-3 py-2.5 text-sm font-semibold text-salvaje-orange transition hover:bg-salvaje-orange/20"
            >
              <Layers size={16} />
              {groupView === 'normal' ? 'Vista rápida' : 'Vista normal'}
            </button>
          </div>

          {groupView === 'quick' ? (
            <GroupStack
              groupLetters={GROUP_LETTERS}
              groups={GROUPS}
              qualifiers={qualifiers}
              setQual={setQual}
              bestThirds={bestThirds}
              toggleThird={toggleThird}
              thirdsFull={bestThirds.length >= MAX_THIRDS}
              results={results}
              disabled={qualifiersLocked}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GROUP_LETTERS.map((g) => (
                <QualifierGroupCard
                  key={g}
                  group={g}
                  teams={GROUPS[g]}
                  value={qualifiers[g] || {}}
                  onChange={(v) => setQual(g, v)}
                  thirds={bestThirds}
                  onToggleThird={toggleThird}
                  thirdsFull={bestThirds.length >= MAX_THIRDS}
                  official={results.qualifiers?.[g] || null}
                  officialThirds={results.bestThirds || null}
                  disabled={qualifiersLocked}
                />
              ))}
            </div>
          )}
        </div>
      ) : tab === 'finales' ? (
        <FinalsSection
          locked={finalsLocked}
          champion={champion} runnerUp={runnerUp} scorerTeam={scorerTeam} scorer={scorer}
          setChampion={setChampion} setRunnerUp={setRunnerUp} setScorerTeam={setScorerTeam} setScorer={setScorer}
        />
      ) : (
        <PredictionDashboard
          scores={scores} qualifiers={qualifiers} bestThirds={bestThirds}
          champion={champion} runnerUp={runnerUp} scorerTeam={scorerTeam} scorer={scorer}
          onGo={setTab}
        />
      )}

      {/* Botón flotante de guardar (solo al editar) — por encima del dock en móvil */}
      {tab && (
        <button
          onClick={handleSave}
          disabled={saving}
          title="Guardar pronóstico"
          className="btn-gold fixed bottom-24 right-4 z-50 shadow-salvaje-lg sm:bottom-6 sm:right-6"
        >
          <Save size={18} />
          <span className="hidden sm:inline">{saving ? 'Guardando…' : 'Guardar'}</span>
        </button>
      )}
    </div>
  )
}

function Progress({ icon: Icon, value, total, label }) {
  const pct = Math.round((value / total) * 100)
  return (
    <div className="min-w-0 rounded-xl border border-black/5 bg-white p-3 sm:min-w-[120px]">
      <div className="flex items-center justify-between text-salvaje-gray">
        <Icon size={16} className="text-salvaje-orange" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="display text-2xl text-salvaje-brown">
        {value}
        <span className="text-base text-salvaje-gray">/{total}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-salvaje-light-alt">
        <div className="h-full rounded-full bg-salvaje-orange transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
