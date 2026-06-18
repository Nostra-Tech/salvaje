import { useState, useEffect, useMemo } from 'react'
import {
  Upload, CheckCircle, History, Check, Lock, Clock, RefreshCw, FileText,
  Package, CreditCard, ExternalLink,
} from 'lucide-react'
import { compressImage } from '../../utils/imageCompress'
import { isUserLocked } from '../../utils/permissions'
import toast from 'react-hot-toast'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { AppShell } from '../../components/layout/AppShell'
import { MembershipCard } from '../../components/membership/MembershipCard'
import { Card, CardBody } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { PaymentQRDisplay } from '../../components/payment/PaymentQRDisplay'
import { useAuth } from '../../hooks/useAuth'
import {
  getMembershipCatalog,
  getUserPurchases,
  createPurchase,
  getAppConfig,
  requestRevalidation,
  computeRenewalStartDate,
} from '../../services/membership.service'
import { computeApplicableDiscount, assertReferralPairIsFirst } from '../../services/referrals.service'
import { validateDiscountCode, bumpDiscountCodeUsage } from '../../services/discount-codes.service'
import { formatCOP, formatShortDate } from '../../utils/formatters'
import { filterPlansForUser } from '../../utils/dateHelpers'
import { PAYMENT_STATUS } from '../../utils/constants'
import { storage } from '../../services/firebase'
import {
  createLinkedMembers, validateMembersList, getLinkedMembers,
} from '../../services/linked-members.service'

export function UserMembership() {
  const { user, profile } = useAuth()
  const [catalog, setCatalog] = useState([])
  const [purchases, setPurchases] = useState([])
  const [config, setConfig] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [discountInfo, setDiscountInfo] = useState(null)
  // V5 Ajuste 19 — admin promo code
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [promoApplied, setPromoApplied] = useState(null) // { code, savings, finalPrice }
  const [validatingPromo, setValidatingPromo] = useState(false)

  useEffect(() => {
    Promise.all([
      getMembershipCatalog(),
      getUserPurchases(user?.uid),
      getAppConfig(),
    ])
      .then(([cat, purch, cfg]) => {
        setCatalog(cat)
        setPurchases(purch)
        setConfig(cfg)
      })
      .finally(() => setLoading(false))
  }, [user?.uid])

  const [renewalInfo, setRenewalInfo] = useState(null)
  // Multi-member plans: collect linked-member info before payment is sent.
  const [members, setMembers] = useState([])
  const [existingLinkedCount, setExistingLinkedCount] = useState(0)

  // requiredLinkedCount = familySize - 1, minus members the user already
  // linked previously (renewals reuse the same group, no need to re-ask).
  const familySize = parseInt(selectedPlan?.familySize) || 1
  const requiredLinkedCount = Math.max(0, familySize - 1 - existingLinkedCount)

  const handleSelectPlan = async (plan) => {
    // V6 Ajuste 4: anticipated renewal — block tiquetera with stock, defer monthly start.
    if (user?.uid) {
      try {
        const r = await computeRenewalStartDate(user.uid, plan?.type)
        if (!r.canBuy) {
          toast.error(r.reason || 'No puedes comprar este plan ahora.')
          setRenewalInfo(null)
          return
        }
        setRenewalInfo(r)
      } catch (e) {
        console.warn('computeRenewalStartDate failed:', e)
        setRenewalInfo(null)
      }
    }

    setSelectedPlan(plan)
    setReceiptFile(null)
    setPaymentMethod('')
    setPromoCodeInput('')
    setPromoApplied(null)

    // Preload existing linked members so renewals don't ask twice.
    if (user?.uid) {
      try {
        const existing = await getLinkedMembers(user.uid)
        setExistingLinkedCount(existing.length)
      } catch { setExistingLinkedCount(0) }
    }
    setMembers([])

    if (user?.uid) {
      try {
        const d = await computeApplicableDiscount(user.uid, plan?.type)
        setDiscountInfo(d)
      } catch { setDiscountInfo({ percent: 0, fixedPrice: null }) }
    }
  }

  // Resize the member-entry array whenever the plan or pre-existing link count
  // changes, so the count of forms always matches what the user must fill.
  useEffect(() => {
    setMembers((cur) => {
      const arr = Array.isArray(cur) ? cur.slice(0, requiredLinkedCount) : []
      while (arr.length < requiredLinkedCount) {
        arr.push({ email: '', displayName: '', phone: '', dateOfBirth: '', gender: '' })
      }
      return arr
    })
  }, [requiredLinkedCount])

  const updateMember = (idx, field, value) => {
    setMembers((cur) => {
      const next = [...cur]
      next[idx] = { ...(next[idx] || {}), [field]: value }
      return next
    })
  }

  // V5 Ajuste 19: try a promo code
  const handleApplyPromo = async () => {
    if (!selectedPlan || !promoCodeInput?.trim()) return
    setValidatingPromo(true)
    try {
      // Apply promo on top of the referral-discounted price (whichever was already computed).
      const baseAfterReferral = (() => {
        const base = selectedPlan.priceAsCOP || 0
        if (discountInfo?.fixedPrice && discountInfo.fixedPrice < base) return discountInfo.fixedPrice
        if (discountInfo?.percent) return Math.max(0, base - Math.round((base * discountInfo.percent) / 100))
        return base
      })()
      const result = await validateDiscountCode(promoCodeInput, {
        userId: user.uid,
        basePrice: baseAfterReferral,
      })
      if (!result.valid) {
        toast.error(result.reason || 'Código no válido')
        setPromoApplied(null)
        return
      }
      setPromoApplied(result)
      toast.success(`Promo aplicada · ahorras ${formatCOP(result.savings)}`)
    } catch (e) {
      toast.error('No pudimos validar el código')
    } finally {
      setValidatingPromo(false)
    }
  }
  const handleClearPromo = () => {
    setPromoCodeInput('')
    setPromoApplied(null)
  }

  const finalPrice = useMemo(() => {
    if (!selectedPlan) return 0
    const base = selectedPlan.priceAsCOP || 0
    // 1) Apply referral first
    let afterReferral = base
    if (discountInfo?.fixedPrice && discountInfo.fixedPrice < base) {
      afterReferral = discountInfo.fixedPrice
    } else if (discountInfo?.percent) {
      afterReferral = Math.max(0, base - Math.round(base * discountInfo.percent / 100))
    }
    // 2) Then apply admin promo on top of that.
    if (promoApplied?.valid) {
      return promoApplied.finalPrice
    }
    return afterReferral
  }, [selectedPlan, discountInfo, promoApplied])

  const handleSubmitPayment = async () => {
    if (!paymentMethod) {
      toast.error('Elige un método de pago primero')
      return
    }
    if (!receiptFile && paymentMethod !== 'efectivo') {
      toast.error('Sube el comprobante de pago')
      return
    }
    // Multi-member plans must have all members filled before payment is sent.
    // "No se podrán cambiar después" — we collect upfront so the relationship
    // is locked at purchase time.
    if (requiredLinkedCount > 0) {
      const validation = validateMembersList(members, requiredLinkedCount)
      if (!validation.valid) {
        toast.error(validation.errors[0])
        return
      }
      const titularEmail = (user?.email || '').toLowerCase()
      if (members.some((m) => (m.email || '').trim().toLowerCase() === titularEmail)) {
        toast.error('Cada miembro debe tener un email distinto al tuyo')
        return
      }
    }
    setSubmitting(true)
    const t = toast.loading('Procesando comprobante…')
    try {
      let receiptURL = null
      if (receiptFile) {
        // Resize phone photos before upload — main perf win on mobile.
        toast.loading('Optimizando comprobante…', { id: t })
        const optimized = await compressImage(receiptFile)

        toast.loading('Subiendo comprobante…', { id: t })
        const storageRef = ref(
          storage,
          `payment_receipts/${user.uid}/${Date.now()}_${optimized.name || 'receipt.jpg'}`
        )
        await uploadBytes(storageRef, optimized)
        receiptURL = await getDownloadURL(storageRef)
      }

      // V7 Ajuste 2: Validar que si usa referido como nuevo usuario, el par solo aplica una vez
      if (discountInfo?.reason === 'new_user_referral' && profile?.referredBy) {
        try {
          await assertReferralPairIsFirst(user.uid, profile.referredBy)
        } catch (e) {
          toast.error(e.message, { id: t })
          setSubmitting(false)
          return
        }
      }

      toast.loading('Enviando para validación…', { id: t })
      await createPurchase({
        userId: user.uid,
        userName: profile?.displayName || user.email,
        userEmail: user.email,
        userPhotoURL: profile?.profilePhotoURL || null,
        catalogId: selectedPlan.id,
        catalogName: selectedPlan.name,
        membershipType: selectedPlan.type,
        // V6 Ajuste 4 — request a deferred start date if this is a renewal.
        requestedStartDate: renewalInfo?.isRenewal && renewalInfo.startDate
          ? renewalInfo.startDate
          : null,
        startDate: null,
        endDate: null,
        amountPaid: finalPrice,
        amount: finalPrice,
        originalAmount: selectedPlan.priceAsCOP,
        discountApplied: discountInfo?.percent || 0,
        discountReason: discountInfo?.reason || null,
        referralCodeUsed: discountInfo?.reason === 'new_user_referral' ? profile?.referredByCode : null,
        // V5 Ajuste 19: admin promo code applied
        promoCodeUsed: promoApplied?.code?.id || null,
        promoSavings: promoApplied?.savings || 0,
        paymentMethod,
        paymentStatus: PAYMENT_STATUS.PENDING,
        paymentReceiptURL: receiptURL,
        paymentNotes: '',
        rejectionReason: '',
        giftedBy: null,
        giftedByName: '',
        giftMessage: '',
      })

      // Bump promo code usage (best-effort).
      if (promoApplied?.code?.id) {
        bumpDiscountCodeUsage(promoApplied.code.id).catch((e) => console.warn('bumpDiscountCodeUsage failed:', e))
      }

      // Multi-member plan: provision the linked-member accounts right after
      // the payment is sent. Their access kicks in when the admin confirms the
      // titular's payment (membershipIsActive flips on the titular doc).
      if (requiredLinkedCount > 0) {
        try {
          toast.loading('Invitando miembros...', { id: t })
          await createLinkedMembers({
            titularUid: user.uid,
            titularName: profile?.displayName || user.email,
            members: members.map((m) => ({
              email: m.email.trim().toLowerCase(),
              displayName: m.displayName.trim(),
              phone: (m.phone || '').trim(),
              dateOfBirth: m.dateOfBirth || null,
              gender: m.gender || '',
            })),
          })
        } catch (e) {
          console.error('createLinkedMembers failed:', e)
          toast.error(
            'Pago enviado, pero falló invitar a un miembro: ' + (e?.message || 'error') +
            '. El admin lo puede agregar luego.',
            { id: t }
          )
          setSelectedPlan(null)
          setReceiptFile(null)
          setMembers([])
          setSubmitting(false)
          getUserPurchases(user.uid).then(setPurchases).catch(() => {})
          return
        }
      }

      // Optimistic UI: close modal + success toast immediately. The list
      // refresh happens in the background.
      toast.success(
        requiredLinkedCount > 0
          ? `Pago enviado y ${requiredLinkedCount} miembro${requiredLinkedCount === 1 ? '' : 's'} invitado${requiredLinkedCount === 1 ? '' : 's'}.`
          : 'Pago enviado. El admin lo revisará pronto.',
        { id: t }
      )
      setSelectedPlan(null)
      setReceiptFile(null)
      setMembers([])
      setSubmitting(false)
      getUserPurchases(user.uid).then(setPurchases).catch((e) => console.warn('refresh purchases failed:', e))
    } catch (e) {
      console.error('handleSubmitPayment failed:', e)
      toast.error('No pudimos enviar el pago: ' + (e?.message || 'error'), { id: t })
      setSubmitting(false)
    }
  }

  const statusBadge = { pending: 'gold', confirmed: 'success', rejected: 'danger' }
  const statusLabel = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    rejected: 'Rechazado',
  }

  // Locked state derived from profile + pending payments.
  const locked = isUserLocked(profile)
  const pendingPayment = useMemo(
    () => purchases.find((p) => p.paymentStatus === PAYMENT_STATUS.PENDING),
    [purchases]
  )

  return (
    <AppShell title="Membresía">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-5">
        <h1 className="font-display text-4xl uppercase text-salvaje-dark">Membresía</h1>

        {/* LOCKED banner — user cannot do anything else until they pay + admin validates */}
        {locked && (
          <div className="bg-gradient-to-br from-salvaje-danger to-red-800 rounded-salvaje p-5 text-white shadow-salvaje-md">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={18} />
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/90">Cuenta inactiva</p>
            </div>
            {pendingPayment ? (
              <>
                <h2 className="font-display text-2xl uppercase leading-tight">Esperando validación</h2>
                <p className="font-body text-sm text-white/90 mt-1.5 leading-snug">
                  Tu pago está en cola. El admin lo revisa y lo activa pronto. Mientras tanto solo puedes ver esta pantalla.
                </p>
                <div className="flex items-center gap-2 mt-3 bg-white/15 rounded-lg px-3 py-2">
                  <Clock size={14} />
                  <p className="font-mono text-xs">
                    {pendingPayment.catalogName} · {formatCOP(pendingPayment.amountPaid || pendingPayment.amount || 0)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl uppercase leading-tight">Tu clase de cortesía ya se cumplió</h2>
                <p className="font-body text-sm text-white/90 mt-1.5 leading-snug">
                  Para volver al box, activa un plan abajo. No vas a ver clases, QR, ni nada más
                  hasta que pagues y el admin valide.
                </p>
              </>
            )}
          </div>
        )}

        {/* Membership card hidden for locked users — they don't have one yet */}
        {profile && !locked && <MembershipCard user={profile} />}

        {/* ─────────────────────────────────────────────
            SECCIÓN 1 · Planes disponibles (catálogo)
            Hidden if there's already a pending payment to avoid double-charging.
            ───────────────────────────────────────────── */}
        {!pendingPayment && (
        <Section icon={Package} title="Planes disponibles" subtitle="Elige cuál se adapta a tu ritmo">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-white rounded-salvaje animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {catalog
                // Hide the free trial — it's not a buyable plan, it's automatic.
                .filter((plan) => {
                  const t = (plan.type || '').toLowerCase()
                  const n = (plan.name || '').toLowerCase()
                  const id = (plan.id || '').toLowerCase()
                  if (t === 'free_trial' || t === 'trial' || t === 'prueba') return false
                  if ((plan.priceAsCOP || 0) <= 0) return false
                  if (n.includes('cortes') || n.includes('prueba') || n.includes('trial')) return false
                  if (plan.isActive === false) return false

                  // Age-gated plans (e.g. Sub 21): visible only while user is
                  // strictly under plan.maxAge. The day they turn 21, Sub 21
                  // disappears from the picker (no renewal at the old price).
                  const hasAgeConstraint = plan.minAge !== undefined || plan.maxAge !== undefined ||
                    id.includes('sub21') || id.includes('sub-21') || t === 'sub21' ||
                    n.includes('sub-21') || n.includes('sub 21')
                  if (hasAgeConstraint) {
                    const birthRaw = profile?.birthDate || profile?.dateOfBirth
                    const birth = birthRaw?.toDate?.() || (birthRaw ? new Date(birthRaw) : null)
                    if (!birth || Number.isNaN(birth.getTime())) return false
                    const ageMs = Date.now() - birth.getTime()
                    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25)
                    const max = plan.maxAge ?? 21
                    if (ageYears >= max) return false
                    if (Number.isFinite(plan.minAge) && ageYears < plan.minAge) return false
                  }

                  // Colegio Monteluna gate: only show to users marked as having kids there.
                  if (plan.requiresColegioMonteluna && !profile?.colegioMonteluna) {
                    return false
                  }

                  // Special plans (admin-enabled per user)
                  if (plan.isSpecial) {
                    const enabled = Array.isArray(profile?.specialPlans) && profile.specialPlans.includes(plan.id)
                    if (!enabled) return false
                  }

                  return true
                })
                .map((plan) => {
                  const benefits = getPlanBenefits(plan)
                  return (
                    <Card key={plan.id} hover onClick={() => handleSelectPlan(plan)}>
                      <CardBody className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-lg uppercase text-salvaje-dark">
                              {plan.name}
                            </p>
                            {plan.description && (
                              <p className="font-body text-xs text-salvaje-gray mt-0.5">
                                {plan.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-display text-2xl text-salvaje-orange leading-none">
                              {formatCOP(plan.priceAsCOP)}
                            </p>
                            {plan.durationDays > 0 && (
                              <p className="font-mono text-[10px] text-salvaje-gray uppercase tracking-widest mt-0.5">
                                {plan.durationDays} días
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Benefits list — what the plan includes */}
                        {benefits.length > 0 && (
                          <ul className="space-y-1.5 mt-3 mb-3">
                            {benefits.map((b, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs font-body text-salvaje-dark">
                                <Check size={12} className="text-salvaje-success mt-0.5 flex-shrink-0" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <Button size="sm" className="w-full">
                          Activar plan
                        </Button>
                      </CardBody>
                    </Card>
                  )
                })}
            </div>
          )}
        </Section>
        )}

        {/* ─────────────────────────────────────────────
            SECCIÓN 2 · Pasarela de pago (siempre visible)
            Muestra los métodos disponibles para que el usuario sepa
            con qué puede pagar antes de elegir un plan.
            ───────────────────────────────────────────── */}
        <Section
          icon={CreditCard}
          title="Pasarela de pago"
          subtitle="Métodos disponibles en SALVAJE"
        >
          <Card>
            <CardBody className="py-4">
              <PaymentGatewayPreview />
            </CardBody>
          </Card>
        </Section>

        {/* ─────────────────────────────────────────────
            SECCIÓN 3 · Historial de pagos
            Cada pago muestra estado + comprobante + botón "Pedir re-validación"
            si lleva tiempo pendiente.
            ───────────────────────────────────────────── */}
        {purchases.length > 0 && (
          <Section
            icon={History}
            title="Historial de pagos"
            subtitle="Todos tus envíos para validación"
          >
            <div className="space-y-2">
              {purchases.map((p) => (
                <PurchaseRow
                  key={p.id}
                  purchase={p}
                  statusBadge={statusBadge}
                  statusLabel={statusLabel}
                  onRefresh={() => getUserPurchases(user.uid).then(setPurchases)}
                  userInfo={{ userName: profile?.displayName || user.email, userPhotoURL: profile?.profilePhotoURL }}
                />
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Payment modal */}
      <Modal
        open={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        title={selectedPlan?.name}
        size="lg"
      >
        {selectedPlan && (
          <div className="px-5 pb-5 space-y-4">
            {/* V6 Ajuste 4 — anticipated renewal banner */}
            {renewalInfo?.isRenewal && renewalInfo.startDate && (
              <div className="bg-salvaje-orange/10 border border-salvaje-orange/30 rounded-xl p-3 text-sm font-body text-salvaje-dark">
                <p className="font-display text-base uppercase text-salvaje-orange mb-1">Renovación anticipada</p>
                <p className="leading-snug">
                  Tu plan actual vence el <strong>{renewalInfo.currentExpiresAt?.toLocaleDateString('es-CO')}</strong>. El nuevo arranca el <strong>{renewalInfo.startDate.toLocaleDateString('es-CO')}</strong> sin perder días.
                </p>
              </div>
            )}

            {/* Discount info banner */}
            {discountInfo && discountInfo.percent > 0 && (
              <div className="bg-salvaje-success/10 border border-salvaje-success/30 rounded-xl p-3 text-center">
                <p className="font-display text-base uppercase text-salvaje-success">
                  ¡{discountInfo.percent}% de descuento!
                </p>
                <p className="font-body text-xs text-salvaje-dark mt-0.5">
                  {discountInfo.reason === 'new_user_referral'
                    ? 'Por unirte con código de referido'
                    : 'Por traer un nuevo salvaje a la tribu'}
                </p>
              </div>
            )}

            {/* Price breakdown */}
            <div className="bg-salvaje-light rounded-xl p-4">
              <p className="text-xs font-mono text-salvaje-gray uppercase tracking-widest mb-2">
                Resumen
              </p>
              <div className="space-y-1.5 text-sm font-body">
                <div className="flex justify-between">
                  <span className="text-salvaje-gray">Precio plan</span>
                  <span className="text-salvaje-dark font-mono">{formatCOP(selectedPlan.priceAsCOP)}</span>
                </div>
                {discountInfo?.fixedPrice && discountInfo.fixedPrice < selectedPlan.priceAsCOP && (
                  <div className="flex justify-between">
                    <span className="text-salvaje-success">Precio referido</span>
                    <span className="text-salvaje-success font-mono">{formatCOP(discountInfo.fixedPrice)}</span>
                  </div>
                )}
                {!discountInfo?.fixedPrice && discountInfo?.percent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-salvaje-success">Descuento ({discountInfo.percent}%)</span>
                    <span className="text-salvaje-success font-mono">- {formatCOP(Math.round(selectedPlan.priceAsCOP * discountInfo.percent / 100))}</span>
                  </div>
                )}
                {promoApplied?.valid && (
                  <div className="flex justify-between">
                    <span className="text-salvaje-success">Promo {promoApplied.code.id}</span>
                    <span className="text-salvaje-success font-mono">- {formatCOP(promoApplied.savings)}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-salvaje-cream flex justify-between items-baseline">
                <span className="text-xs font-body text-salvaje-gray uppercase tracking-widest">Total</span>
                <p className="font-display text-3xl text-salvaje-orange">
                  {formatCOP(finalPrice)}
                </p>
              </div>
            </div>

            {/* V5 Ajuste 19 — admin promo code input */}
            <div className="bg-white border border-salvaje-cream rounded-xl p-3">
              <label className="text-xs font-semibold text-salvaje-gray uppercase tracking-wide font-body block mb-1.5">
                ¿Tienes un código promo?
              </label>
              {promoApplied?.valid ? (
                <div className="flex items-center justify-between gap-2 bg-salvaje-success/10 border border-salvaje-success/30 rounded-lg px-3 py-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-salvaje-success uppercase">{promoApplied.code.id}</p>
                    <p className="text-[11px] font-body text-salvaje-dark">Ahorras {formatCOP(promoApplied.savings)}</p>
                  </div>
                  <button onClick={handleClearPromo} className="text-xs font-body text-salvaje-gray hover:text-salvaje-danger underline">
                    Quitar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="SALV20"
                    className="flex-1 px-3 py-2 rounded-lg border border-salvaje-cream font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
                  />
                  <Button size="sm" loading={validatingPromo} onClick={handleApplyPromo}>Aplicar</Button>
                </div>
              )}
            </div>

            {requiredLinkedCount > 0 && (
              <div className="bg-white border border-salvaje-cream rounded-xl p-3 space-y-2">
                <div>
                  <p className="text-xs font-semibold text-salvaje-orange uppercase tracking-wide font-body">
                    Miembros vinculados ({requiredLinkedCount})
                  </p>
                  <p className="text-[11px] font-body text-salvaje-gray mt-1 leading-relaxed">
                    Este plan cubre <strong>{familySize} personas</strong>. Registra ahora a {requiredLinkedCount === 1 ? 'la otra persona' : `los otros ${requiredLinkedCount}`}: cada quien recibe correo para crear su contraseña y tendrá su propio QR. <strong>No se podrán cambiar después.</strong>
                  </p>
                </div>
                {members.map((m, idx) => (
                  <div key={idx} className="border border-salvaje-cream rounded-xl p-3 space-y-2 bg-salvaje-light/30">
                    <p className="text-[11px] font-body font-semibold uppercase tracking-widest text-salvaje-gray">Miembro {idx + 1}</p>
                    <input
                      type="email"
                      value={m.email}
                      onChange={(e) => updateMember(idx, 'email', e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full px-3 py-2 rounded-lg border border-salvaje-cream font-body text-sm focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
                    />
                    <input
                      type="text"
                      value={m.displayName}
                      onChange={(e) => updateMember(idx, 'displayName', e.target.value)}
                      placeholder="Nombre completo"
                      className="w-full px-3 py-2 rounded-lg border border-salvaje-cream font-body text-sm focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        value={m.phone}
                        onChange={(e) => updateMember(idx, 'phone', e.target.value)}
                        placeholder="Teléfono"
                        className="px-3 py-2 rounded-lg border border-salvaje-cream font-body text-sm focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
                      />
                      <input
                        type="date"
                        value={m.dateOfBirth}
                        onChange={(e) => updateMember(idx, 'dateOfBirth', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-salvaje-cream font-mono text-xs focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Interactive method picker — replaces the old <Select>.
                Selecting a method expands it with QR + key + copy buttons. */}
            <PaymentQRDisplay value={paymentMethod} onChange={setPaymentMethod} />

            {paymentMethod && paymentMethod !== 'efectivo' && (
              <div>
                <label className="text-xs font-semibold text-salvaje-gray uppercase tracking-wide font-body block mb-1.5">
                  Comprobante de pago
                </label>
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-salvaje-cream rounded-xl cursor-pointer hover:border-salvaje-orange/50 hover:bg-salvaje-orange/5 transition-all">
                  {receiptFile ? (
                    <div className="text-center">
                      <CheckCircle size={24} className="text-salvaje-success mx-auto mb-1" />
                      <p className="text-xs font-body text-salvaje-dark">
                        {receiptFile.name}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={24} className="text-salvaje-gray mx-auto mb-1" />
                      <p className="text-xs font-body text-salvaje-gray">
                        Toca para subir el comprobante
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files[0])}
                  />
                </label>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              loading={submitting}
              disabled={!paymentMethod || (paymentMethod !== 'efectivo' && !receiptFile)}
              onClick={handleSubmitPayment}
            >
              {!paymentMethod
                ? 'Elige un método primero'
                : paymentMethod === 'efectivo'
                ? 'Avisar al admin'
                : 'Enviar para validación'}
            </Button>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

/**
 * Section header with icon + title + optional subtitle. Wraps children
 * in consistent vertical spacing. Used to give the page a clear 3-section rhythm.
 */
function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 border-b border-salvaje-cream pb-2">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-salvaje-orange/10 flex items-center justify-center flex-shrink-0">
            <Icon size={16} className="text-salvaje-orange" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl uppercase text-salvaje-dark leading-none">{title}</h2>
          {subtitle && <p className="font-body text-xs text-salvaje-gray mt-1">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

/**
 * Pasarela de pago — read-only preview of available payment methods.
 * Just shows what's available; the user picks the actual method when buying a plan.
 */
function PaymentGatewayPreview() {
  return (
    <div className="space-y-2">
      <p className="font-body text-xs text-salvaje-gray leading-snug">
        Cuando elijas un plan se desplegarán todos los métodos para que pagues. Estos son los disponibles hoy:
      </p>
      <PaymentQRDisplay value="" onChange={() => {}} showReceiptHint={false} />
    </div>
  )
}

/**
 * Single purchase row in the history. Shows payment status, amount, receipt link
 * and (if pending) a "request re-validation" button (rate-limited to 1/24h server-side).
 */
function PurchaseRow({ purchase: p, statusBadge, statusLabel, onRefresh, userInfo }) {
  const [requesting, setRequesting] = useState(false)
  const isPending = p.paymentStatus === PAYMENT_STATUS.PENDING
  const isRejected = p.paymentStatus === PAYMENT_STATUS.REJECTED

  const handleRevalidation = async () => {
    setRequesting(true)
    try {
      await requestRevalidation(p.id, userInfo)
      toast.success('Pedimos al admin que lo revise. Te avisamos cuando lo valide.')
      onRefresh?.()
    } catch (e) {
      toast.error(e?.message || 'No pudimos enviar el pedido')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <Card>
      <CardBody className="py-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-body text-sm font-semibold text-salvaje-dark truncate">
                {p.catalogName || 'Plan'}
              </p>
              <Badge variant={statusBadge[p.paymentStatus]}>
                {statusLabel[p.paymentStatus]}
              </Badge>
            </div>
            <p className="font-mono text-[11px] text-salvaje-gray mt-0.5">
              {p.createdAt?.toDate ? formatShortDate(p.createdAt.toDate()) : (p.createdAt ? formatShortDate(p.createdAt) : '—')}
              {p.paymentMethod && <> · {p.paymentMethod}</>}
            </p>
            {isRejected && p.rejectionReason && (
              <p className="font-body text-xs text-salvaje-danger mt-1.5 bg-salvaje-danger/5 rounded-lg px-2 py-1">
                {p.rejectionReason}
              </p>
            )}
          </div>
          <p className="font-display text-lg text-salvaje-dark whitespace-nowrap">
            {formatCOP(p.amountPaid || p.amount || 0)}
          </p>
        </div>

        {/* Actions row */}
        {(p.paymentReceiptURL || isPending) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-salvaje-cream/60 flex-wrap">
            {p.paymentReceiptURL && (
              <a
                href={p.paymentReceiptURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-body text-salvaje-orange hover:underline"
              >
                <FileText size={12} /> Ver comprobante <ExternalLink size={10} />
              </a>
            )}
            {isPending && (
              <Button
                size="sm"
                variant="ghost"
                loading={requesting}
                onClick={handleRevalidation}
                className="ml-auto"
              >
                <RefreshCw size={12} /> Pedir re-validación
              </Button>
            )}
          </div>
        )}

        {/* Show how many times revalidation was asked (transparency) */}
        {p.revalidationRequestCount > 0 && isPending && (
          <p className="font-mono text-[10px] text-salvaje-gray uppercase tracking-widest mt-2">
            Re-validación pedida {p.revalidationRequestCount} {p.revalidationRequestCount === 1 ? 'vez' : 'veces'}
          </p>
        )}
      </CardBody>
    </Card>
  )
}

/**
 * Returns the benefit list for a plan. Prefers the catalog doc's `benefits` field
 * if defined, otherwise generates a sensible default per plan type.
 */
function getPlanBenefits(plan) {
  if (Array.isArray(plan.benefits) && plan.benefits.length > 0) {
    return plan.benefits.filter(Boolean)
  }
  const t = (plan.type || '').toLowerCase()
  if (t === 'monthly') {
    const days = plan.durationDays || 30
    return [
      'Clases ilimitadas',
      `Acceso al box durante ${days} días`,
      'Reserva con un toque',
      'Acceso a clases EN VIVO',
    ]
  }
  if (t === 'ticketera') {
    const count = plan.classCount || plan.classesIncluded || 12
    return [
      `${count} clases para usar cuando quieras`,
      'Sin caducidad mensual estricta',
      'Reserva con un toque',
      'Ideal si entrenas pocas veces por semana',
    ]
  }
  return []
}
