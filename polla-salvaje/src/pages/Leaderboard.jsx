import { useEffect, useState } from 'react'
import { Trophy, RefreshCw, Target, Flag } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { LeaderboardPodium } from '../components/LeaderboardPodium'
import { LeaderboardRankings } from '../components/LeaderboardRankings'
import { UserScoresModal } from '../components/UserScoresModal'
import { toast } from '../components/Toast'
import { getLeaderboard } from '../services/polla.service'
import { SCORING } from '../services/scoring'
import { usePollaStore } from '../store/pollaStore'

const DATE_RANGE = '11 jun – 19 jul 2026' // ventana del Mundial 2026

export default function Leaderboard() {
  const user = usePollaStore((s) => s.user)
  const [rows, setRows] = useState([])
  const [results, setResults] = useState({ scores: {} })
  const [selected, setSelected] = useState(null) // usuario abierto en el modal
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getLeaderboard()
      setRows(data.rows || [])
      setResults(data.results || { scores: {} })
    } catch (e) {
      console.error(e)
      toast.error('No se pudo cargar el ranking.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tournamentStarted = rows.some((r) => r.score > 0)
  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3) // del 4º en adelante, paginado

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-6">
      <div className="rounded-salvaje bg-salvaje-light p-5 shadow-salvaje sm:p-6">
        {/* Encabezado */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="display flex items-center gap-2 text-2xl text-salvaje-brown sm:text-3xl">
              <Trophy className="text-salvaje-gold" /> Ranking
            </h1>
            <p className="text-sm text-salvaje-gray">
              {DATE_RANGE}
              {!tournamentStarted && ' · torneo aún no iniciado'}
            </p>
          </div>
          <button onClick={load} className="btn-ghost shrink-0" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        {/* Leyenda de puntaje */}
        <div className="mb-6 grid grid-cols-3 gap-2">
          <Legend icon={Target} value={`${SCORING.exact} pts`} label="Marcador exacto" />
          <Legend icon={Target} value={`${SCORING.result} pts`} label="Resultado" />
          <Legend icon={Flag} value={`${SCORING.qualifier} pts`} label="Clasificado" />
        </div>

        {loading ? (
          <Spinner label="Calculando posiciones…" />
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-salvaje-gray">
            Aún no hay participantes. ¡Sé el primero en registrarte!
          </div>
        ) : (
          <>
            <p className="mb-3 text-center text-xs text-salvaje-gray">
              Toca un participante para ver sus marcadores de partidos ya jugados.
            </p>
            <LeaderboardPodium top={top3} meId={user?.id} onSelect={setSelected} />
            <LeaderboardRankings rows={rest} startRank={4} meId={user?.id} pageSize={10} onSelect={setSelected} />
          </>
        )}
      </div>

      {selected && (
        <UserScoresModal user={selected} results={results} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function Legend({ icon: Icon, value, label }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-3 text-center">
      <Icon size={16} className="mx-auto text-salvaje-orange" />
      <div className="display text-xl text-salvaje-brown">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-salvaje-gray">{label}</div>
    </div>
  )
}
