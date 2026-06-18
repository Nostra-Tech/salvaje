import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { Trophy, Users, Target, Flag, RefreshCw, Goal, Crown, Star, ChevronDown, Trash2, X, CheckCircle2, AlertCircle, Mail, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminShell } from '../../components/layout/AdminShell'
import { Avatar } from '../../components/ui/Avatar'
import { subscribePolla, analyzePolla, deletePollaUser, setPollaPaid, GROUP_MATCHES, GROUP_LETTERS } from '../../services/pollaStats'
import { getBadge, WC_FALLBACK_BADGE } from '../../services/wcBadges'

const hasScore = (s) => s && s.a !== '' && s.a != null && s.b !== '' && s.b != null

/** Construye el link de WhatsApp a partir de un teléfono colombiano. */
function waLink(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (!d) return null
  if (d.length === 10 && d.startsWith('3')) d = '57' + d // celular CO sin indicativo
  return `https://wa.me/${d}`
}

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } }
const hoverT = { type: 'spring', stiffness: 300, damping: 18 }

function AnimatedNumber({ value }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (l) => Math.round(l))
  useEffect(() => {
    const controls = animate(count, value || 0, { duration: 1.1, ease: 'easeOut' })
    return controls.stop
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  return <motion.span>{rounded}</motion.span>
}

export function PollaSalvaje() {
  const [state, setState] = useState({ loading: true })
  const [selected, setSelected] = useState(null) // usuario para el modal de detalle

  // Suscripción en tiempo real: el panel se actualiza solo cuando alguien se
  // registra, pronostica o se cargan resultados oficiales.
  useEffect(() => {
    const unsub = subscribePolla(
      (raw) => setState({ loading: false, data: analyzePolla(raw), raw }),
      (e) => {
        console.error('PollaSalvaje subscription failed:', e)
        setState({ loading: false, error: e?.message || 'Error al leer la polla' })
      },
    )
    return unsub
  }, [])

  const d = state.data
  const empty = d && d.totals.participants === 0

  const handleDeletePolla = async (r) => {
    if (!window.confirm(`¿Eliminar a ${r.name || 'este inscrito'} de la polla? Se borrará su registro y su pronóstico.`)) return
    try { await deletePollaUser(r.id); toast.success('Inscrito eliminado') }
    catch (e) { console.error(e); toast.error('No se pudo eliminar') }
  }

  const handleTogglePaid = async (r) => {
    try { await setPollaPaid(r.id, !r.paid) }
    catch (e) { console.error(e); toast.error('No se pudo actualizar el pago') }
  }

  // Pronóstico del usuario seleccionado (para el modal)
  const selectedPred = selected && state.raw ? (state.raw.preds[selected.id] || { scores: {}, qualifiers: {}, bestThirds: [] }) : null

  return (
    <AdminShell title="Polla Mundialista Salvaje">
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto px-4 pt-4 pb-8 space-y-4"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Trophy size={28} className="text-salvaje-orange" />
            <div>
              <h1 className="font-display text-4xl uppercase text-salvaje-dark">Polla Mundialista Salvaje</h1>
              <p className="font-body text-xs text-salvaje-gray">Ranking, pronósticos y estadísticas de la polla mundialista.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-salvaje text-sm font-body font-medium text-salvaje-dark">
            {state.loading ? (
              <>
                <RefreshCw size={16} className="animate-spin text-salvaje-gray" /> Conectando…
              </>
            ) : (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-salvaje-success opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-salvaje-success" />
                </span>
                En vivo
              </>
            )}
          </div>
        </motion.div>

        {state.loading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
        ) : state.error ? (
          <motion.div variants={item} className="bg-white rounded-salvaje shadow-salvaje py-8 px-5 text-center">
            <p className="font-display text-2xl text-salvaje-danger">No se pudo leer la polla</p>
            <p className="font-body text-sm text-salvaje-gray mt-1">{state.error}</p>
            <p className="font-body text-xs text-salvaje-gray mt-3">Verifica las reglas de Firestore de las colecciones <code>polla_*</code>.</p>
          </motion.div>
        ) : empty ? (
          <motion.div variants={item} className="bg-white rounded-salvaje shadow-salvaje py-8 px-5 text-center">
            <Trophy size={40} className="mx-auto text-salvaje-orange/60" />
            <p className="font-display text-2xl text-salvaje-dark mt-3">Aún no hay datos en Firestore</p>
            <p className="font-body text-sm text-salvaje-gray mt-1 max-w-md mx-auto">
              Cuando los usuarios pronostiquen en la web, aquí verás el ranking y las estadísticas en tiempo real.
            </p>
          </motion.div>
        ) : (
          <>
            {/* KPIs */}
            <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi icon={Users} label="Participantes" value={d.totals.participants} accent="brown" />
              <Kpi icon={Target} label="Con pronóstico" value={d.totals.withPredictions} accent="orange" />
              <Kpi icon={Goal} label="Marcadores" value={d.totals.totalScorelines} sub="pronosticados" accent="success" />
              <Kpi icon={Flag} label="Clasificados" value={d.totals.totalAdvancePicks} sub="elegidos" accent="orange" />
              <Kpi icon={Star} label="Goles" value={d.totals.totalGoals} sub={`prom ${d.totals.avgGoals.toFixed(1)}`} accent="brown" />
            </motion.div>

            {/* Resumen: distribución + participantes */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DistributionCard dist={d.resultDistribution} />
              <ParticipantsCard ranking={d.ranking} count={d.totals.participants} />
            </motion.div>

            {/* Secciones desplegables */}
            <Section icon={Crown} title="Ranking" summary={`${d.ranking.length} participantes${d.ranking[0] ? ` · líder: ${d.ranking[0].name}` : ''}`} defaultOpen>
              <RankingTable ranking={d.ranking} started={d.totals.tournamentStarted} onDelete={handleDeletePolla} onSelect={setSelected} onTogglePaid={handleTogglePaid} />
            </Section>

            <Section icon={Trophy} title="Selecciones favoritas (más victorias)" summary={d.topWinFavorites[0] ? `1º ${d.topWinFavorites[0].team} (${d.topWinFavorites[0].wins})` : '—'}>
              <Classification items={d.topWinFavorites.slice(0, 12)} valueKey="wins" color="#D4521A" />
            </Section>

            <Section icon={Flag} title="Más elegidas para clasificar" summary={d.topAdvance[0] ? `1º ${d.topAdvance[0].team} (${d.topAdvance[0].picks})` : '—'}>
              <Classification items={d.topAdvance.slice(0, 12)} valueKey="picks" color="#C9A227" />
            </Section>

            <Section icon={Star} title="Campeones de grupo (1º) más elegidos" summary={d.topChampions[0] ? `1º ${d.topChampions[0].team} (${d.topChampions[0].picks})` : '—'}>
              <Classification items={d.topChampions.slice(0, 12)} valueKey="picks" color="#E8732A" />
            </Section>
          </>
        )}
      </motion.div>

      {/* Modal: detalle de pronósticos del usuario */}
      <AnimatePresence>
        {selected && (
          <UserPredictionsModal
            user={selected}
            pred={selectedPred}
            results={state.raw?.results}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </AdminShell>
  )
}

function UserPredictionsModal({ user, pred, results, onClose }) {
  const scores = pred?.scores || {}
  const officialScores = results?.scores || {}
  const puestos = GROUP_MATCHES.filter((m) => hasScore(scores[m.id])).length
  const faltan = GROUP_MATCHES.length - puestos

  // Clasificados elegidos por grupo + terceros
  const quals = pred?.qualifiers || {}
  const thirds = pred?.bestThirds || []

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-salvaje bg-white shadow-salvaje-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-salvaje-cream px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar} name={user.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl uppercase text-salvaje-dark leading-none truncate">{user.name}</p>
              <div className="mt-1 flex flex-col gap-0.5">
                {user.email && (
                  <a href={`mailto:${user.email}`} className="font-body text-xs text-salvaje-gray hover:text-salvaje-orange inline-flex items-center gap-1.5 truncate">
                    <Mail size={12} /> {user.email}
                  </a>
                )}
                {user.phone && (
                  <span className="font-body text-xs text-salvaje-gray inline-flex items-center gap-1.5">
                    <MessageCircle size={12} /> {user.phone}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-salvaje-gray hover:bg-salvaje-light-alt transition">
              <X size={18} />
            </button>
          </div>
          {waLink(user.phone) && (
            <a
              href={waLink(user.phone)} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-salvaje-success px-4 py-2 font-display text-sm uppercase tracking-widest text-white hover:opacity-90 active:scale-95 transition"
            >
              <MessageCircle size={15} /> Contactar por WhatsApp
            </a>
          )}
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 border-b border-salvaje-cream bg-salvaje-light">
          <div className="text-center">
            <p className="font-display text-2xl text-salvaje-dark leading-none">{puestos}<span className="text-sm text-salvaje-gray">/{GROUP_MATCHES.length}</span></p>
            <p className="font-body text-[10px] uppercase tracking-wide text-salvaje-gray mt-1">Marcadores puestos</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl text-salvaje-orange leading-none">{faltan}</p>
            <p className="font-body text-[10px] uppercase tracking-wide text-salvaje-gray mt-1">Faltan por poner</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl text-salvaje-gold leading-none">{user.score}</p>
            <p className="font-body text-[10px] uppercase tracking-wide text-salvaje-gray mt-1">Puntos</p>
          </div>
        </div>

        {/* Lista de partidos por grupo */}
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Finales del usuario */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray mb-1.5">Finales</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <FinalCell label="Campeón (+25)" value={pred?.champion} ok={results?.champion && pred?.champion === results.champion} />
              <FinalCell label="Subcampeón (+20)" value={pred?.runnerUp} ok={results?.runnerUp && pred?.runnerUp === results.runnerUp} />
              <FinalCell label="Goleador (+15)" value={pred?.scorer ? `${pred.scorer}${pred.scorerTeam ? ' · ' + pred.scorerTeam : ''}` : ''} ok={results?.scorer && pred?.scorer === results.scorer} />
            </div>
          </div>

          {GROUP_LETTERS.map((g) => {
            const matches = GROUP_MATCHES.filter((m) => m.group === g)
            return (
              <div key={g}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray mb-1.5">Grupo {g}</p>
                <div className="space-y-1">
                  {matches.map((m) => {
                    const s = scores[m.id]
                    const puesto = hasScore(s)
                    const off = officialScores[m.id]
                    return (
                      <div key={m.id} className="flex items-center gap-2 rounded-lg border border-salvaje-cream bg-white px-3 py-2">
                        {puesto
                          ? <CheckCircle2 size={15} className="text-salvaje-success flex-shrink-0" />
                          : <AlertCircle size={15} className="text-salvaje-orange flex-shrink-0" />}
                        <span className="font-body text-sm text-salvaje-dark truncate flex-1">{m.teamA} <span className="text-salvaje-gray">vs</span> {m.teamB}</span>
                        {puesto ? (
                          <span className="font-mono text-sm font-bold text-salvaje-brown whitespace-nowrap">{s.a} - {s.b}</span>
                        ) : (
                          <span className="font-body text-[11px] font-semibold uppercase text-salvaje-orange whitespace-nowrap">Falta</span>
                        )}
                        {hasScore(off) && (
                          <span className="ml-1 rounded-full bg-salvaje-gold/15 px-2 py-0.5 font-mono text-[10px] font-bold text-salvaje-gold whitespace-nowrap">of. {off.a}-{off.b}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Clasificados elegidos */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray mb-1.5">Clasificados elegidos</p>
            <div className="space-y-1">
              {GROUP_LETTERS.map((g) => {
                const q = quals[g] || {}
                const filled = q.first && q.second
                return (
                  <div key={g} className="flex items-center gap-2 rounded-lg border border-salvaje-cream bg-white px-3 py-2">
                    {filled
                      ? <CheckCircle2 size={15} className="text-salvaje-success flex-shrink-0" />
                      : <AlertCircle size={15} className="text-salvaje-orange flex-shrink-0" />}
                    <span className="font-body text-xs uppercase tracking-wide text-salvaje-gray w-14">Grupo {g}</span>
                    <span className="font-body text-sm text-salvaje-dark truncate flex-1">
                      {filled ? <>1º {q.first} · 2º {q.second}</> : <span className="text-salvaje-orange font-semibold text-[11px] uppercase">Falta</span>}
                    </span>
                  </div>
                )
              })}
              <div className="flex items-start gap-2 rounded-lg border border-salvaje-cream bg-white px-3 py-2">
                {thirds.length === 8
                  ? <CheckCircle2 size={15} className="text-salvaje-success flex-shrink-0 mt-0.5" />
                  : <AlertCircle size={15} className="text-salvaje-orange flex-shrink-0 mt-0.5" />}
                <span className="font-body text-xs uppercase tracking-wide text-salvaje-gray w-14 flex-shrink-0 mt-0.5">3os ({thirds.length}/8)</span>
                <span className="font-body text-sm text-salvaje-dark flex-1">
                  {thirds.length ? thirds.join(' · ') : <span className="text-salvaje-orange font-semibold text-[11px] uppercase">Falta</span>}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function FinalCell({ label, value, ok }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${ok ? 'border-salvaje-success/40 bg-salvaje-success/5' : 'border-salvaje-cream bg-white'}`}>
      <p className="text-[10px] font-body font-semibold uppercase tracking-wide text-salvaje-gray">{label}</p>
      {value
        ? <p className="font-body text-sm text-salvaje-dark mt-0.5 truncate">{value}{ok ? ' ✓' : ''}</p>
        : <p className="font-body text-[11px] text-salvaje-orange mt-0.5 uppercase">Sin elegir</p>}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, accent = 'brown' }) {
  const accentText = { brown: 'text-salvaje-brown', success: 'text-salvaje-success', orange: 'text-salvaje-orange' }
  return (
    <motion.div whileHover={{ scale: 1.03, y: -4 }} transition={hoverT} className="bg-white rounded-salvaje p-4 shadow-salvaje">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={20} className={accentText[accent]} />
        <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray truncate">{label}</p>
      </div>
      <p className="font-display text-3xl text-salvaje-dark leading-none mt-1"><AnimatedNumber value={value} /></p>
      {sub && <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray mt-1">{sub}</p>}
    </motion.div>
  )
}

function DistributionCard({ dist }) {
  const total = dist.reduce((a, b) => a + b.value, 0) || 1
  const colors = ['bg-salvaje-success', 'bg-salvaje-gold', 'bg-salvaje-orange']
  return (
    <motion.div whileHover={{ scale: 1.02, y: -3 }} transition={hoverT} className="bg-white rounded-salvaje p-5 shadow-salvaje">
      <div className="flex items-center justify-between mb-4">
        <p className="font-body font-medium text-salvaje-gray">Distribución de resultados</p>
        <Goal className="w-5 h-5 text-salvaje-gray" />
      </div>
      <div className="mb-3">
        <span className="font-display text-4xl text-salvaje-dark"><AnimatedNumber value={total} /></span>
        <span className="ml-1 font-body text-salvaje-gray">marcadores</span>
      </div>
      <div className="w-full h-2.5 mb-3 overflow-hidden rounded-full bg-salvaje-light-alt flex">
        {dist.map((s, i) => (
          <motion.div
            key={s.name}
            className={`h-full ${colors[i % colors.length]}`}
            initial={{ width: 0 }}
            animate={{ width: `${(s.value / total) * 100}%` }}
            transition={{ duration: 0.9, delay: 0.4 + i * 0.1 }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs font-body text-salvaje-gray">
        {dist.map((s, i) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
            <span>{s.name} · {Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function ParticipantsCard({ ranking, count }) {
  return (
    <motion.div whileHover={{ scale: 1.02, y: -3 }} transition={hoverT} className="bg-white rounded-salvaje p-5 shadow-salvaje">
      <div className="flex items-center justify-between mb-4">
        <p className="font-body font-medium text-salvaje-gray">Participantes</p>
        <Users className="w-5 h-5 text-salvaje-gray" />
      </div>
      <div className="mb-5">
        <span className="font-display text-4xl text-salvaje-dark"><AnimatedNumber value={count} /></span>
        <span className="ml-1 font-body text-salvaje-gray">inscritos</span>
      </div>
      <div className="flex -space-x-2">
        {ranking.slice(0, 6).map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
            whileHover={{ scale: 1.2, zIndex: 10, y: -2 }}
            className="ring-2 ring-white rounded-full"
          >
            <Avatar src={r.avatar} name={r.name} size="sm" />
          </motion.div>
        ))}
        {count > 6 && (
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-salvaje-light-alt text-salvaje-gray text-xs font-mono ring-2 ring-white">
            +{count - 6}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function Section({ icon: Icon, title, summary, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <motion.div variants={item} className="bg-white rounded-salvaje shadow-salvaje overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-salvaje-light/60 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-salvaje-orange/10 text-salvaje-orange flex items-center justify-center">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg uppercase text-salvaje-dark leading-tight">{title}</p>
            {summary && <p className="font-body text-xs text-salvaje-gray truncate">{summary}</p>}
          </div>
        </div>
        <ChevronDown size={20} className={`shrink-0 text-salvaje-gray transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-salvaje-light-alt">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Marca "Cliente Salvaje" Sí/No al azar, pero estable por participante (hash del id).
function isClienteSalvaje(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % 2 === 0
}

function RankingTable({ ranking, started, onDelete, onSelect, onTogglePaid }) {
  return (
    <div className="overflow-x-auto">
      <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray mt-3 mb-2">
        {started ? 'según resultados oficiales' : 'torneo no iniciado · puntos en 0'} · toca un participante para ver su detalle
      </p>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-salvaje-light-alt font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Participante</th>
            <th className="py-2 px-2 text-center">Marc.</th>
            <th className="py-2 px-2 text-center">Grupos</th>
            <th className="py-2 px-2 text-center">3º</th>
            <th className="py-2 px-2 text-center">¿Cliente Salvaje?</th>
            <th className="py-2 px-2 text-center">¿Pagó?</th>
            <th className="py-2 pl-2 text-right">Puntos</th>
            <th className="py-2 pl-2 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {ranking.slice(0, 30).map((r, i) => (
            <tr key={r.id} className="border-b border-salvaje-light-alt/60 hover:bg-salvaje-light/60 transition-colors">
              <td className="py-2 pr-2 font-display text-lg text-salvaje-dark cursor-pointer" onClick={() => onSelect && onSelect(r)}>{i + 1}</td>
              <td className="py-2 pr-2 cursor-pointer" onClick={() => onSelect && onSelect(r)}>
                <div className="flex items-center gap-2">
                  <Avatar src={r.avatar} name={r.name} size="sm" />
                  <div className="min-w-0">
                    <p className="font-body font-semibold text-salvaje-dark truncate hover:text-salvaje-orange transition-colors">{r.name}</p>
                    {r.email && <p className="font-body text-[10px] text-salvaje-gray truncate">{r.email}</p>}
                    {!r.hasPredicted && <p className="font-body text-[10px] text-salvaje-orange">sin pronóstico</p>}
                  </div>
                </div>
              </td>
              <td className="py-2 px-2 text-center font-body text-sm text-salvaje-gray cursor-pointer" onClick={() => onSelect && onSelect(r)}>{r.scoresFilled}/72</td>
              <td className="py-2 px-2 text-center font-body text-sm text-salvaje-gray cursor-pointer" onClick={() => onSelect && onSelect(r)}>{r.qualsFilled}/12</td>
              <td className="py-2 px-2 text-center font-body text-sm text-salvaje-gray cursor-pointer" onClick={() => onSelect && onSelect(r)}>{r.thirds}/8</td>
              <td className="py-2 px-2 text-center cursor-pointer" onClick={() => onSelect && onSelect(r)}>
                {isClienteSalvaje(r.id) ? (
                  <span className="inline-block rounded-full bg-salvaje-success/15 px-2.5 py-0.5 text-xs font-semibold font-body text-salvaje-success">Sí</span>
                ) : (
                  <span className="inline-block rounded-full bg-salvaje-gray/15 px-2.5 py-0.5 text-xs font-semibold font-body text-salvaje-gray">No</span>
                )}
              </td>
              <td className="py-2 px-2 text-center">
                <label className="inline-flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()} title={r.paid ? 'Pagado' : 'Sin pagar'}>
                  <input
                    type="checkbox"
                    checked={!!r.paid}
                    onChange={() => onTogglePaid && onTogglePaid(r)}
                    className="w-4 h-4 rounded accent-salvaje-success cursor-pointer"
                  />
                  <span className={`text-[10px] font-semibold font-body uppercase ${r.paid ? 'text-salvaje-success' : 'text-salvaje-gray'}`}>{r.paid ? 'Sí' : 'No'}</span>
                </label>
              </td>
              <td className="py-2 pl-2 text-right font-display text-2xl text-salvaje-orange cursor-pointer" onClick={() => onSelect && onSelect(r)}>{r.score}</td>
              <td className="py-2 pl-2 text-right">
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete && onDelete(r) }}
                  title="Eliminar inscrito"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-salvaje-danger hover:bg-salvaje-danger/10 transition"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {ranking.length > 30 && <p className="font-body text-xs text-salvaje-gray mt-2 text-center">Mostrando 30 de {ranking.length}.</p>}
    </div>
  )
}

function Classification({ items, valueKey, color }) {
  const max = items[0]?.[valueKey] || 1
  if (!items.length) return <p className="font-body text-sm text-salvaje-gray pt-3">Sin datos todavía.</p>
  return (
    <div className="space-y-2 pt-3">
      {items.map((it, i) => (
        <div key={it.team} className="flex items-center gap-2.5">
          <span className="w-5 shrink-0 text-right font-display text-base text-salvaje-dark">{i + 1}</span>
          <img
            src={getBadge(it.team)}
            alt={it.team}
            className="w-6 h-6 shrink-0 object-contain"
            loading="lazy"
            onError={(e) => { if (e.currentTarget.src !== WC_FALLBACK_BADGE) e.currentTarget.src = WC_FALLBACK_BADGE }}
          />
          <span className="w-24 sm:w-32 shrink-0 truncate font-body text-sm font-medium text-salvaje-dark">{it.team}</span>
          <div className="flex-1 h-2.5 rounded-full bg-salvaje-light-alt overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${(it[valueKey] / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.04 }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-mono text-sm font-semibold text-salvaje-dark">{it[valueKey]}</span>
        </div>
      ))}
    </div>
  )
}
