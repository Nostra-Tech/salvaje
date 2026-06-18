import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Save, Target, Flag, ShieldCheck, AlertTriangle, Crown } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { MatchScoreCard } from '../components/MatchScoreCard'
import { QualifierGroupCard } from '../components/QualifierGroupCard'
import { FinalsSection } from '../components/FinalsSection'
import { toast } from '../components/Toast'
import { GROUPS, GROUP_LETTERS, GROUP_MATCHES, matchesByDate } from '../data/worldCup'
import { usePollaStore } from '../store/pollaStore'
import { getResults, saveResults, isAdmin } from '../services/polla.service'

const DAYS = matchesByDate(GROUP_MATCHES)

export default function Admin() {
  const user = usePollaStore((s) => s.user)

  const [tab, setTab] = useState('scores')
  const [scores, setScores] = useState({})
  const [qualifiers, setQualifiers] = useState({})
  const [bestThirds, setBestThirds] = useState([])
  const [champion, setChampion] = useState('')
  const [runnerUp, setRunnerUp] = useState('')
  const [scorerTeam, setScorerTeam] = useState('')
  const [scorer, setScorer] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await getResults()
        if (!alive) return
        setScores(res.scores || {})
        setQualifiers(res.qualifiers || {})
        setBestThirds(res.bestThirds || [])
        setChampion(res.champion || '')
        setRunnerUp(res.runnerUp || '')
        setScorerTeam(res.scorerTeam || '')
        setScorer(res.scorer || '')
      } catch (e) {
        console.error(e)
        toast.error('No se pudieron cargar los resultados.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filledScores = useMemo(
    () => GROUP_MATCHES.filter((m) => scores[m.id]?.a !== '' && scores[m.id]?.a != null && scores[m.id]?.b !== '' && scores[m.id]?.b != null).length,
    [scores],
  )

  if (!user) return <Navigate to="/" replace />
  if (!isAdmin(user.email)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-salvaje-brown">
        <AlertTriangle className="mx-auto mb-3 text-salvaje-gold" size={40} />
        <h2 className="display text-2xl">Acceso restringido</h2>
        <p className="mt-2 text-sm text-salvaje-gray">
          Esta sección es solo para administradores de la polla.
        </p>
      </div>
    )
  }

  const MAX_THIRDS = 8
  const setScore = (id, p) => setScores((s) => ({ ...s, [id]: p }))

  const setQual = (g, v) => {
    setQualifiers((q) => ({ ...q, [g]: v }))
    const promoted = [v.first, v.second].filter(Boolean)
    if (promoted.length) setBestThirds((t) => t.filter((team) => !promoted.includes(team)))
  }

  const toggleThird = (team) => {
    setBestThirds((t) => {
      if (t.includes(team)) return t.filter((x) => x !== team)
      if (t.length >= MAX_THIRDS) {
        toast.info('Solo 8 mejores terceros.')
        return t
      }
      return [...t, team]
    })
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await saveResults({ scores, qualifiers, bestThirds, champion, runnerUp, scorerTeam, scorer })
      toast.success('Resultados oficiales guardados. El ranking se recalculó.')
    } catch (e) {
      console.error(e)
      toast.error('No se pudieron guardar los resultados.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner label="Cargando panel…" />

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 rounded-salvaje bg-salvaje-light p-5 shadow-salvaje">
        <h1 className="display flex items-center gap-2 text-3xl text-salvaje-brown">
          <ShieldCheck className="text-salvaje-orange" /> Panel de resultados
        </h1>
        <p className="text-sm text-salvaje-gray">
          Carga los marcadores reales y los clasificados de cada grupo. Al guardar, los puntos de todos los
          participantes se recalculan automáticamente. Deja un partido vacío si todavía no se juega.
        </p>
      </div>

      <div className="mb-5 flex gap-2">
        <SegBtn active={tab === 'scores'} onClick={() => setTab('scores')} icon={Target}>
          Marcadores ({filledScores}/{GROUP_MATCHES.length})
        </SegBtn>
        <SegBtn active={tab === 'qualifiers'} onClick={() => setTab('qualifiers')} icon={Flag}>
          Clasificados
        </SegBtn>
        <SegBtn active={tab === 'finales'} onClick={() => setTab('finales')} icon={Crown}>
          Finales
        </SegBtn>
      </div>

      {tab === 'finales' ? (
        <FinalsSection
          locked={false}
          champion={champion} runnerUp={runnerUp} scorerTeam={scorerTeam} scorer={scorer}
          setChampion={setChampion} setRunnerUp={setRunnerUp} setScorerTeam={setScorerTeam} setScorer={setScorer}
        />
      ) : tab === 'scores' ? (
        <div className="space-y-6 pb-28">
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
                    official={null}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="pb-28">
          <div className="mb-4 flex items-center justify-between rounded-xl border border-black/5 bg-white px-4 py-2 text-sm text-salvaje-brown">
            <span>Marca el 1º/2º de cada grupo y los 8 mejores terceros oficiales.</span>
            <span className={`display text-xl ${bestThirds.length === 8 ? 'text-salvaje-orange' : 'text-salvaje-brown'}`}>
              {bestThirds.length}/8 terceros
            </span>
          </div>
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
                official={null}
                officialThirds={null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Botón flotante de guardar — por encima del dock en móvil */}
      <button
        onClick={handleSave}
        disabled={saving}
        title="Guardar resultados"
        className="btn-gold fixed bottom-24 right-4 z-50 shadow-salvaje-lg sm:bottom-6 sm:right-6"
      >
        <Save size={18} />
        <span className="hidden sm:inline">{saving ? 'Guardando…' : 'Guardar'}</span>
      </button>
    </div>
  )
}

function SegBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
        active ? 'bg-salvaje-orange text-white shadow-salvaje' : 'border border-black/5 bg-white text-salvaje-gray hover:bg-salvaje-light-alt'
      }`}
    >
      <Icon size={18} />
      {children}
    </button>
  )
}
