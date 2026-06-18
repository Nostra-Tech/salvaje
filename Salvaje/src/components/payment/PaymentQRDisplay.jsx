import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Smartphone, Building2, Banknote, Clock, Copy, CheckCircle2, ChevronDown, Landmark,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardBody } from '../ui/Card'
import { getPaymentConfig } from '../../services/payment-config.service'

/**
 * Interactive payment-method picker.
 *
 * Props:
 *  - value:    selected method id ('nequi' | 'daviplata' | 'transferencia' | 'efectivo' | 'pse')
 *  - onChange: (methodId) => void
 *  - showReceiptHint: boolean — show "sube el comprobante después" caption
 */
export function PaymentQRDisplay({ value, onChange, showReceiptHint = true }) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPaymentConfig().then((c) => { setConfig(c); setLoading(false) })
  }, [])

  if (loading) return <div className="h-40 bg-white rounded-salvaje animate-pulse" />

  const methods = []
  if (config?.nequiQrImageURL || config?.nequiKey) {
    methods.push({
      id: 'nequi',
      title: 'Nequi',
      subtitle: 'Escanea el QR o usa la llave',
      icon: Smartphone,
      accent: 'bg-pink-500',
      key: config?.nequiKey,
      qr: config?.nequiQrImageURL,
    })
  }
  if (config?.daviplataQrImageURL || config?.daviplataKey) {
    methods.push({
      id: 'daviplata',
      title: 'Daviplata',
      subtitle: 'Escanea el QR o usa la llave',
      icon: Smartphone,
      accent: 'bg-red-500',
      key: config?.daviplataKey,
      qr: config?.daviplataQrImageURL,
    })
  }
  if (config?.bankTransferInfo?.accountNumber) {
    methods.push({
      id: 'transferencia',
      title: 'Transferencia bancaria',
      subtitle: 'Cuenta de ahorros · cualquier banco',
      icon: Building2,
      accent: 'bg-blue-600',
      bank: config.bankTransferInfo,
    })
  }
  // Efectivo always available
  methods.push({
    id: 'efectivo',
    title: 'Efectivo en el box',
    subtitle: 'Paga directamente en el box',
    icon: Banknote,
    accent: 'bg-salvaje-success',
  })

  return (
    <div className="space-y-3">
      <h3 className="font-display text-xl uppercase text-salvaje-dark">¿Cómo quieres pagar?</h3>

      {methods.length === 1 && (
        <p className="text-center font-body text-xs text-salvaje-gray italic">
          El admin no ha configurado QR ni cuenta bancaria. Solo está disponible "Efectivo en el box".
        </p>
      )}

      <div className="space-y-2">
        {methods.map((m) => (
          <MethodCard
            key={m.id}
            method={m}
            selected={value === m.id}
            onSelect={() => onChange(m.id)}
          />
        ))}

        {/* PSE — coming soon (replaces tarjeta) */}
        <div className="rounded-salvaje border border-salvaje-cream/80 bg-salvaje-light/40 p-3 flex items-center gap-3 opacity-60 cursor-not-allowed">
          <div className="w-10 h-10 rounded-xl bg-salvaje-gray/10 flex items-center justify-center flex-shrink-0">
            <Landmark size={18} className="text-salvaje-gray" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-base uppercase text-salvaje-dark">PSE</p>
              <span className="text-[10px] font-mono uppercase tracking-widest text-salvaje-orange flex items-center gap-1">
                <Clock size={10} /> En desarrollo
              </span>
            </div>
            <p className="font-body text-xs text-salvaje-gray">Pago directo desde tu banco · próximamente</p>
          </div>
        </div>
      </div>

      {showReceiptHint && value && value !== 'efectivo' && (
        <p className="font-body text-[11px] text-salvaje-gray text-center mt-2">
          Después de pagar, sube el comprobante abajo para activar tu plan.
        </p>
      )}
    </div>
  )
}

function MethodCard({ method, selected, onSelect }) {
  const { id, title, subtitle, icon: Icon, accent, key: payKey, qr, bank } = method

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-salvaje border-2 transition-all ${
        selected
          ? 'border-salvaje-orange bg-white shadow-salvaje-md'
          : 'border-salvaje-cream/80 bg-white hover:border-salvaje-orange/40'
      }`}
    >
      {/* Header */}
      <div className="p-3 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${accent} text-white flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base uppercase text-salvaje-dark">{title}</p>
          <p className="font-body text-xs text-salvaje-gray truncate">{subtitle}</p>
        </div>
        <div className="flex-shrink-0">
          {selected ? (
            <CheckCircle2 size={20} className="text-salvaje-orange" />
          ) : (
            <ChevronDown size={18} className="text-salvaje-gray" />
          )}
        </div>
      </div>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-salvaje-cream pt-3 space-y-3">
              {id === 'nequi' || id === 'daviplata' ? (
                <>
                  {qr && (
                    <div className="mx-auto w-44 h-44 bg-white rounded-2xl border-2 border-salvaje-cream p-2">
                      <img src={qr} alt={`QR ${title}`} className="w-full h-full object-contain" />
                    </div>
                  )}
                  {payKey ? (
                    <CopyField label={`Llave ${title}`} value={payKey} />
                  ) : !qr ? (
                    <p className="font-body text-xs text-salvaje-gray text-center">
                      El admin aún no configuró este método.
                    </p>
                  ) : null}
                </>
              ) : null}

              {id === 'transferencia' && bank && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Banco" value={bank.bankName} />
                    <Field label="Tipo" value={bank.accountType === 'ahorros' ? 'Ahorros' : 'Corriente'} />
                  </div>
                  <CopyField label="Número de cuenta" value={bank.accountNumber} mono />
                  <Field label="Titular" value={bank.accountHolder} />
                  {bank.nit && <CopyField label="NIT" value={bank.nit} mono />}
                </div>
              )}

              {id === 'efectivo' && (
                <p className="font-body text-xs text-salvaje-dark leading-snug">
                  Acércate al box y paga directo al coach. El admin activa tu plan al recibir el pago.
                  <br />
                  <span className="text-salvaje-gray">No necesitas subir comprobante.</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

function Field({ label, value }) {
  return (
    <div className="bg-salvaje-light rounded-lg p-2">
      <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest">{label}</p>
      <p className="text-salvaje-dark font-semibold text-sm">{value || '—'}</p>
    </div>
  )
}

function CopyField({ label, value, mono = false }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async (e) => {
    e.stopPropagation()
    if (!value) return
    try {
      await navigator.clipboard.writeText(value.toString())
      setCopied(true)
      toast.success(`${label} copiada`)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="bg-salvaje-light rounded-lg p-2.5 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-body text-salvaje-gray uppercase tracking-widest">{label}</p>
        <p className={`text-salvaje-dark font-semibold ${mono ? 'font-mono text-sm' : 'text-sm'} truncate`}>
          {value || '—'}
        </p>
      </div>
      {value && (
        <button
          type="button"
          onClick={handleCopy}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
            copied
              ? 'bg-salvaje-success text-white'
              : 'bg-white text-salvaje-orange hover:bg-salvaje-orange hover:text-white border border-salvaje-cream'
          }`}
          aria-label="Copiar"
        >
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
        </button>
      )}
    </div>
  )
}
