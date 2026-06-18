import { Gift, Crown, Trophy, Sparkles } from 'lucide-react'

const PRIZE_STYLES = {
  gold: {
    badge: 'bg-gradient-to-br from-salvaje-gold to-yellow-600 text-salvaje-dark',
    pedestal: 'bg-gradient-to-b from-salvaje-gold/90 to-salvaje-gold/20',
    num: 'text-salvaje-dark/80',
  },
  silver: {
    badge: 'bg-gradient-to-br from-gray-200 to-gray-400 text-salvaje-dark',
    pedestal: 'bg-gradient-to-b from-gray-300/80 to-gray-300/10',
    num: 'text-salvaje-dark/70',
  },
  bronze: {
    badge: 'bg-gradient-to-br from-salvaje-fire to-orange-800 text-white',
    pedestal: 'bg-gradient-to-b from-salvaje-fire/80 to-salvaje-fire/10',
    num: 'text-white/80',
  },
}

function PrizePillar({ place, color, big, small, sub, height, crown }) {
  const s = PRIZE_STYLES[color]
  return (
    <div className="flex flex-col items-center">
      <div
        className={`mb-2 flex items-center justify-center rounded-full font-display shadow-lg ring-2 ring-white/20 ${
          crown ? 'h-12 w-12 text-lg' : 'h-9 w-9 text-base'
        } ${s.badge}`}
      >
        {crown ? <Crown size={22} className="fill-current" /> : `${place}º`}
      </div>
      <div className="mb-2 text-center leading-tight">
        <div className={`display text-salvaje-cream ${crown ? 'text-2xl' : 'text-xl'}`}>{big}</div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-salvaje-gold">{small}</div>
        <div className="mt-0.5 text-[10px] leading-tight text-salvaje-cream/60">{sub}</div>
      </div>
      <div className={`flex w-full items-start justify-center rounded-t-lg pt-1.5 ${height} ${s.pedestal}`}>
        <span className={`font-display text-3xl leading-none ${s.num}`}>{place}</span>
      </div>
    </div>
  )
}

const DETAIL = [
  { place: '1º', color: 'text-salvaje-gold', title: '1 mes GRATIS en Salvaje', desc: 'Una mensualidad completa sin costo para el campeón de la polla.' },
  { place: '2º', color: 'text-gray-400', title: '50% de descuento', desc: 'Mitad de precio en una mensualidad para el subcampeón.' },
  { place: '3º', color: 'text-salvaje-fire', title: '30% de descuento', desc: 'Descuento en una mensualidad para el tercer lugar.' },
]

export default function Prizes() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-6">
      {/* Podio */}
      <div className="overflow-hidden rounded-salvaje bg-gradient-to-br from-salvaje-brown to-salvaje-dark p-6 shadow-salvaje sm:p-8">
        <div className="mb-1 flex items-center justify-center gap-2 text-salvaje-cream">
          <Gift size={22} className="text-salvaje-gold" />
          <h1 className="display text-3xl sm:text-4xl">Premios</h1>
        </div>
        <p className="mb-6 text-center text-sm text-salvaje-cream/70">
          Compite por la cima del ranking y llévate tu premio Salvaje.
        </p>

        <div className="mx-auto grid max-w-md grid-cols-3 items-end gap-2 sm:gap-3">
          <PrizePillar place="2" color="silver" big="50%" small="Descuento" sub="en una mensualidad" height="h-24 sm:h-28" />
          <PrizePillar place="1" color="gold" big="1 MES" small="GRATIS" sub="en Salvaje" height="h-32 sm:h-40" crown />
          <PrizePillar place="3" color="bronze" big="30%" small="Descuento" sub="en una mensualidad" height="h-20 sm:h-24" />
        </div>
      </div>

      {/* Detalle */}
      <div className="mt-4 space-y-3">
        {DETAIL.map((d) => (
          <div key={d.place} className="flex items-start gap-3 rounded-salvaje bg-salvaje-light p-4 shadow-salvaje">
            <span className={`display text-2xl ${d.color}`}>{d.place}</span>
            <div className="min-w-0">
              <div className="display text-lg text-salvaje-brown">{d.title}</div>
              <p className="text-sm text-salvaje-gray">{d.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-salvaje-gray">
        <Sparkles size={14} className="text-salvaje-gold" />
        <span>Los premios se entregan al cierre del Mundial 2026 según el ranking final.</span>
        <Trophy size={14} className="text-salvaje-gold" />
      </div>
    </div>
  )
}
