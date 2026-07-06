import { useState } from 'react'
import { Crown, Medal, Goal, Lock, Clock, ChevronRight, Trophy } from 'lucide-react'
import { TeamBadge } from './TeamBadge'
import { TeamPickerModal, PlayerPickerModal } from './PickerModals'
import { FINALS_DEADLINE_LABEL } from '../data/worldCup'

/**
 * Campeón (+25), Subcampeón (+20) y Goleador (+15).
 * Editables hasta el inicio de los dieciseisavos de final (primer partido).
 */
export function FinalsSection({
  locked,
  champion, runnerUp, scorerTeam, scorer,
  setChampion, setRunnerUp, setScorerTeam, setScorer,
}) {
  const [modal, setModal] = useState(null) // 'champion' | 'runnerUp' | 'scorerTeam' | 'scorer'

  return (
    <div className="pb-28">
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-salvaje-gold/40 bg-salvaje-gold/15 p-3 text-sm text-salvaje-brown">
        <Trophy size={18} className="mt-0.5 shrink-0 text-salvaje-gold" />
        <p>
          Elige al <strong>Campeón (+25)</strong>, <strong>Subcampeón (+20)</strong> y <strong>Goleador (+15)</strong> del Mundial.
        </p>
      </div>

      {locked ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-salvaje-danger/30 bg-salvaje-danger/10 p-3 text-sm text-salvaje-brown">
          <Lock size={18} className="mt-0.5 shrink-0 text-salvaje-danger" />
          <p><strong>Finales cerradas.</strong> La edición estuvo disponible hasta el {FINALS_DEADLINE_LABEL} (hora Colombia).</p>
        </div>
      ) : (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-salvaje-orange/30 bg-salvaje-orange/10 p-3 text-sm text-salvaje-brown">
          <Clock size={18} className="mt-0.5 shrink-0 text-salvaje-orange" />
          <p>Puedes editarlas <strong>solo hasta el {FINALS_DEADLINE_LABEL}</strong> (hora Colombia). Después quedan bloqueadas.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Campeón */}
        <PickCard
          icon={Crown} accent="text-salvaje-gold" label="Campeón" sub="+25 pts"
          value={champion} disabled={locked} onClick={() => !locked && setModal('champion')}
        />
        {/* Subcampeón */}
        <PickCard
          icon={Medal} accent="text-salvaje-orange" label="Subcampeón" sub="+20 pts"
          value={runnerUp} disabled={locked} onClick={() => !locked && setModal('runnerUp')}
        />
        {/* Goleador */}
        <div className={`rounded-salvaje border bg-white p-4 shadow-salvaje ${locked ? 'opacity-70' : ''}`}>
          <div className="mb-2 flex items-center gap-2">
            <Goal size={18} className="text-salvaje-success" />
            <span className="display text-lg text-salvaje-brown">Goleador</span>
            <span className="ml-auto text-xs font-semibold text-salvaje-gray">+15 pts</span>
          </div>
          <button
            disabled={locked} onClick={() => setModal('scorerTeam')}
            className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-salvaje-light-alt bg-salvaje-light px-3 py-2.5 text-left text-sm text-salvaje-brown transition hover:border-salvaje-orange/40 disabled:cursor-not-allowed"
          >
            {scorerTeam ? <TeamBadge name={scorerTeam} size={22} /> : <span className="text-salvaje-gray">1) Elige selección</span>}
            <ChevronRight size={16} className="text-salvaje-gray" />
          </button>
          <button
            disabled={locked || !scorerTeam} onClick={() => setModal('scorer')}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-salvaje-light-alt bg-salvaje-light px-3 py-2.5 text-left text-sm text-salvaje-brown transition hover:border-salvaje-orange/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="truncate font-semibold">{scorer || <span className="font-normal text-salvaje-gray">2) Elige jugador</span>}</span>
            <ChevronRight size={16} className="text-salvaje-gray" />
          </button>
        </div>
      </div>

      {/* Modales */}
      {modal === 'champion' && (
        <TeamPickerModal title="Campeón del Mundial" selected={champion}
          onSelect={setChampion} onClose={() => setModal(null)} />
      )}
      {modal === 'runnerUp' && (
        <TeamPickerModal title="Subcampeón del Mundial" selected={runnerUp}
          onSelect={setRunnerUp} onClose={() => setModal(null)} />
      )}
      {modal === 'scorerTeam' && (
        <TeamPickerModal title="Selección del goleador" selected={scorerTeam}
          onSelect={(t) => { setScorerTeam(t); setScorer('') }} onClose={() => setModal(null)} />
      )}
      {modal === 'scorer' && scorerTeam && (
        <PlayerPickerModal team={scorerTeam} selected={scorer}
          onSelect={setScorer} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function PickCard({ icon: Icon, accent, label, sub, value, disabled, onClick }) {
  return (
    <div className={`rounded-salvaje border bg-white p-4 shadow-salvaje ${disabled ? 'opacity-70' : ''}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={18} className={accent} />
        <span className="display text-lg text-salvaje-brown">{label}</span>
        <span className="ml-auto text-xs font-semibold text-salvaje-gray">{sub}</span>
      </div>
      <button
        disabled={disabled} onClick={onClick}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-salvaje-light-alt bg-salvaje-light px-3 py-3 text-left text-sm text-salvaje-brown transition hover:border-salvaje-orange/40 disabled:cursor-not-allowed"
      >
        {value ? <TeamBadge name={value} size={24} /> : <span className="text-salvaje-gray">Elegir selección</span>}
        <ChevronRight size={16} className="text-salvaje-gray" />
      </button>
    </div>
  )
}
