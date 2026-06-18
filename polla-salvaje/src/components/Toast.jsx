import { create } from 'zustand'
import { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

let _id = 0

const useToastStore = create((set) => ({
  toasts: [],
  push: (toast) => {
    const id = ++_id
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }))
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** API imperativa simple: toast.success('...'), toast.error('...'), toast.info('...') */
export const toast = {
  success: (msg) => useToastStore.getState().push({ type: 'success', msg }),
  error: (msg) => useToastStore.getState().push({ type: 'error', msg }),
  info: (msg) => useToastStore.getState().push({ type: 'info', msg }),
}

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}
const COLORS = {
  success: 'border-salvaje-success/40 text-salvaje-success',
  error: 'border-salvaje-danger/40 text-salvaje-danger',
  info: 'border-salvaje-gold/40 text-salvaje-gold',
}

function ToastItem({ t, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, t.type === 'error' ? 5000 : 3000)
    return () => clearTimeout(timer)
  }, [t, onClose])

  const Icon = ICONS[t.type] || Info
  return (
    <div
      className={`animate-slide-up flex items-start gap-3 rounded-xl border bg-salvaje-light px-4 py-3 shadow-salvaje-lg ${COLORS[t.type] || ''}`}
    >
      <Icon size={20} className="mt-0.5 shrink-0" />
      <p className="text-sm font-medium text-salvaje-brown">{t.msg}</p>
      <button onClick={onClose} className="ml-1 text-salvaje-gray hover:text-salvaje-brown">
        <X size={16} />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div className="fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  )
}
