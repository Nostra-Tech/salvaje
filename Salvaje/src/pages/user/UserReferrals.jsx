import { useState } from 'react'
import { Share2, Copy, Users, CheckCircle, Gift, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { formatShortDate } from '../../utils/formatters'

// Must match constants in services/referrals.service.js
const NEW_USER_DISCOUNT_PERCENT = 5
const REFERRER_DISCOUNT_PERCENT = 10

export function UserReferrals() {
  const { profile } = useAuth()
  const [copied, setCopied] = useState(false)

  const code = profile?.referralCode || ''
  const hasReward = !!profile?.referralDiscountActive && (profile?.referralDiscountPercent || 0) > 0
  const rewardPercent = profile?.referralDiscountPercent || REFERRER_DISCOUNT_PERCENT
  const rewardExp = profile?.referralDiscountExpiresAt?.toDate?.() || null

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Código copiado')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareWhatsapp = () => {
    const msg = encodeURIComponent(
      `Únete a SALVAJE. Usa mi código ${code} al registrarte y recibe ${NEW_USER_DISCOUNT_PERCENT}% de descuento en tu primer plan. ${window.location.origin}/register`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <AppShell title="Referidos">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-5">
        <h1 className="font-display text-4xl uppercase text-salvaje-dark">
          Programa de Referidos
        </h1>
        <p className="font-body text-salvaje-gray text-sm">
          Trae salvajes a la tribu. Ellos arrancan con {NEW_USER_DISCOUNT_PERCENT}% off en su primer plan,
          y tú te ganas {REFERRER_DISCOUNT_PERCENT}% para tu próxima renovación.
        </p>

        {/* Active reward banner */}
        {hasReward && (
          <div className="bg-gradient-to-br from-salvaje-success to-emerald-700 rounded-salvaje p-4 text-white shadow-salvaje-md">
            <div className="flex items-center gap-2 mb-1">
              <Gift size={16} />
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/80">Tienes una recompensa lista</p>
            </div>
            <p className="font-display text-3xl uppercase leading-none mb-1">{rewardPercent}% off</p>
            <p className="font-body text-sm text-white/90">Se aplica automáticamente en tu próxima renovación de membresía.</p>
            {rewardExp && (
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/70 mt-2 flex items-center gap-1">
                <Clock size={10} /> Vence {formatShortDate(rewardExp)}
              </p>
            )}
          </div>
        )}

        {/* Referral code card */}
        <Card>
          <CardBody className="text-center py-6">
            <p className="text-xs font-body text-salvaje-gray uppercase tracking-widest mb-2">
              Tu código
            </p>
            <p className="font-mono text-3xl text-salvaje-orange font-bold tracking-widest mb-4">
              {code}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" size="sm" onClick={copyCode}>
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              <Button size="sm" onClick={shareWhatsapp}>
                <Share2 size={14} />
                Compartir
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Referral count */}
        <Card>
          <CardBody className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-salvaje-orange/10 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-salvaje-orange" />
              </div>
              <div>
                <p className="font-display text-3xl text-salvaje-dark">
                  {profile?.referralsCount || 0}
                </p>
                <p className="font-body text-xs text-salvaje-gray uppercase tracking-wide">
                  Salvajes que pagaron con tu código
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* How it works — matches real logic in referrals.service.js */}
        <div className="bg-white rounded-xl shadow-salvaje p-4 space-y-3">
          <h2 className="font-display text-lg uppercase text-salvaje-dark">
            Cómo funciona
          </h2>
          <div className="space-y-2.5">
            {[
              'Compartes tu código con un amigo',
              'Se registra en SALVAJE usando tu código',
              `Cuando hace su primer pago, recibe ${NEW_USER_DISCOUNT_PERCENT}% de descuento`,
              `Tú ganas ${REFERRER_DISCOUNT_PERCENT}% para tu próxima renovación (válido 60 días)`,
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="font-mono text-xs text-salvaje-orange font-bold mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="font-body text-sm text-salvaje-dark leading-snug">{step}</p>
              </div>
            ))}
          </div>
          <p className="font-mono text-[10px] text-salvaje-gray uppercase tracking-widest pt-2 border-t border-salvaje-cream">
            Tu recompensa se desbloquea cuando tu referido paga · no al registrarse.
          </p>
        </div>

        {/* V6 Ajuste 14 — Términos y condiciones del programa de referidos */}
        <div className="bg-salvaje-cream/40 border border-salvaje-cream rounded-xl p-4 space-y-2">
          <h3 className="font-display text-sm uppercase text-salvaje-dark">Términos del programa</h3>
          <ul className="space-y-1.5 text-xs font-body text-salvaje-dark/85 leading-relaxed list-disc list-inside">
            <li>Cada referido aplica <strong>una sola vez</strong>. Si el mismo amigo paga otra membresía después, no genera nuevo descuento.</li>
            <li>Por cada referido que paga su primera membresía: <strong>{REFERRER_DISCOUNT_PERCENT}%</strong> de descuento para tu próxima renovación.</li>
            <li>Tope mensual del descuento acumulable: <strong>30%</strong>. Tres referidos = 30%; diez referidos = 30% (no se acumula más).</li>
            <li>Los descuentos se aplican en mensualidades. <strong>No son canjeables por dinero</strong>.</li>
            <li>Vigencia de la recompensa: <strong>60 días</strong> desde que se desbloquea.</li>
            <li>No puedes usar tu propio código.</li>
          </ul>
        </div>
      </div>
    </AppShell>
  )
}
