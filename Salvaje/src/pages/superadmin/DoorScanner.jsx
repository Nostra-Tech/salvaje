import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, QrCode, Gift, Camera, ArrowLeft, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  subscribeMockInscriptions, setMockCheckedIn, undoMockCheckedIn, redeemGiftClass,
} from '../../services/mockStats'

/**
 * ESCÁNER DE PUERTA (/puerta) — Salvaje Splash.
 *
 * Una sola página que queda abierta en el celular del staff: usa la cámara del
 * navegador y lee boletas EN CONTINUO. No abre enlaces ni pide el PIN por cada
 * QR (ese era el problema al escanear con la app de cámara: cada lectura abría
 * un navegador nuevo sin sesión). Cada entrada válida se confirma al instante y
 * queda marcada como usada; si se vuelve a escanear sale en rojo.
 */
const GIFT_TOTAL = 3
const isSplash = (r) => r.source === 'landing-splash' || r.evento === 'Salvaje Splash'
const SAME_CODE_COOLDOWN_MS = 6000

function fmtIn(ts) {
  if (!ts) return ''
  const d = typeof ts.toDate === 'function' ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

/** Extrae { mode, id } de lo que trae el QR (URL del panel con ?ticket= / ?gift=). */
function parseCode(text) {
  const m = String(text || '').match(/[?&](ticket|gift)=([A-Za-z0-9_-]+)/)
  if (m) return { mode: m[1], id: m[2] }
  return null
}

function beep(ok) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = ok ? 1200 : 300
    g.gain.value = 0.08
    o.connect(g); g.connect(ctx.destination)
    o.start()
    setTimeout(() => { o.stop(); ctx.close() }, ok ? 140 : 400)
  } catch {}
  try { navigator.vibrate?.(ok ? 80 : [120, 60, 120]) } catch {}
}

export function DoorScanner() {
  const [rows, setRows] = useState([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [camError, setCamError] = useState('')
  const [result, setResult] = useState(null) // { tone, title, sub, name, row, mode, undoable }
  const videoRef = useRef(null)
  const scannerRef = useRef(null)
  const rowsRef = useRef([])
  const lastRef = useRef({ code: '', at: 0 })
  const resultTimer = useRef(null)
  const processingRef = useRef(false)

  // Registros EN VIVO (misma fuente que el panel).
  useEffect(() => {
    const unsub = subscribeMockInscriptions(
      (all) => { const r = all.filter(isSplash); rowsRef.current = r; setRows(r); setLoadingRows(false) },
      (e) => { console.error(e); setLoadingRows(false); toast.error('No se pudieron leer las boletas') },
    )
    return unsub
  }, [])

  const pagados = rows.filter((r) => r.paid).length
  const ingresaron = rows.filter((r) => r.checkedIn).length

  function showResult(res, ms) {
    if (resultTimer.current) clearTimeout(resultTimer.current)
    setResult(res)
    resultTimer.current = setTimeout(() => setResult(null), ms)
  }

  async function handleCode(text) {
    const now = Date.now()
    if (text === lastRef.current.code && now - lastRef.current.at < SAME_CODE_COOLDOWN_MS) return
    lastRef.current = { code: text, at: now }
    if (processingRef.current) return
    processingRef.current = true
    try {
      const parsed = parseCode(text)
      if (!parsed) { beep(false); showResult({ tone: 'danger', title: 'QR no reconocido', sub: 'No es una boleta de Salvaje Splash' }, 7000); return }
      const row = rowsRef.current.find((r) => r.id === parsed.id)
      if (!row) { beep(false); showResult({ tone: 'danger', title: 'Boleta no encontrada', sub: 'No existe ningún registro con ese código' }, 7000); return }

      if (parsed.mode === 'gift') {
        const redeemed = Math.min(row.giftClassesRedeemed || 0, GIFT_TOTAL)
        if (!row.paid) { beep(false); showResult({ tone: 'danger', title: 'Tarjeta no válida', sub: 'Sin pago registrado', name: row.nombre }, 7000); return }
        if (redeemed >= GIFT_TOTAL) { beep(false); showResult({ tone: 'danger', title: 'Tarjeta agotada', sub: `Ya redimió las ${GIFT_TOTAL} clases`, name: row.nombre }, 7000); return }
        showResult({ tone: 'gold', title: 'Tarjeta de regalo', sub: `${redeemed}/${GIFT_TOTAL} redimidas`, name: row.nombre, row, mode: 'gift' }, 15000)
        return
      }

      // Boleta de entrada: se confirma al instante (un solo uso, transaccional).
      if (!row.paid) { beep(false); showResult({ tone: 'danger', title: 'Entrada no válida', sub: 'No tiene pago registrado', name: row.nombre }, 7000); return }
      if (row.checkedIn) { beep(false); showResult({ tone: 'danger', title: 'Boleta ya usada', sub: `NO VÁLIDA · ingresó a las ${fmtIn(row.checkedInAt) || '—'}`, name: row.nombre }, 7000); return }
      try {
        await setMockCheckedIn(row.id)
        beep(true)
        showResult({ tone: 'success', title: 'Ingreso confirmado', sub: 'Boleta marcada como usada', name: row.nombre, row, undoable: true }, 7000)
      } catch (e) {
        const code = e?.message
        beep(false)
        if (code === 'ALREADY_CHECKED_IN') showResult({ tone: 'danger', title: 'Boleta ya usada', sub: 'Otro dispositivo ya registró este ingreso', name: row.nombre }, 7000)
        else if (code === 'NOT_PAID') showResult({ tone: 'danger', title: 'Entrada no válida', sub: 'No tiene pago registrado', name: row.nombre }, 7000)
        else showResult({ tone: 'danger', title: 'Error al registrar', sub: 'Revisa la conexión e intenta de nuevo', name: row.nombre }, 7000)
      }
    } finally {
      processingRef.current = false
    }
  }

  async function startScanner() {
    setCamError('')
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.muted = true
        try { await videoRef.current.play() } catch {}
      }
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      scannerRef.current = { reader, stream }
      // Lectura CONTINUA: el callback se dispara por cada frame con código.
      await reader.decodeFromStream(stream, videoRef.current, (res) => {
        if (res) handleCode(res.getText())
      })
    } catch (e) {
      console.error('DoorScanner camera failed:', e)
      const name = e?.name || ''
      const msg = name === 'NotAllowedError' || name === 'PermissionDeniedError'
        ? 'Permiso de cámara denegado. Habilítalo en la configuración del navegador.'
        : name === 'NotFoundError' ? 'No se detectó cámara en el dispositivo.'
        : name === 'NotReadableError' ? 'La cámara está en uso por otra app. Ciérrala e intenta de nuevo.'
        : 'No se pudo abrir la cámara.'
      setCamError(msg)
      stopScanner()
    }
  }

  function stopScanner() {
    try {
      const ref = scannerRef.current
      if (ref?.reader) { try { ref.reader.reset() } catch {} }
      if (ref?.stream) ref.stream.getTracks().forEach((t) => { try { t.stop() } catch {} })
    } catch {}
    if (videoRef.current) { try { videoRef.current.srcObject = null } catch {} }
    scannerRef.current = null
    setScanning(false)
  }

  useEffect(() => () => { stopScanner(); if (resultTimer.current) clearTimeout(resultTimer.current) }, [])

  const handleUndo = async (row) => {
    try { await undoMockCheckedIn(row.id); toast.success('Ingreso anulado · la boleta vuelve a ser válida'); setResult(null) }
    catch { toast.error('No se pudo anular') }
  }
  const handleRedeem = async (row) => {
    try { await redeemGiftClass(row.id); beep(true); toast.success('Clase redimida'); setResult(null) }
    catch { toast.error('No se pudo redimir') }
  }

  const toneCls = {
    success: 'bg-salvaje-success text-white',
    danger: 'bg-salvaje-danger text-white',
    gold: 'bg-salvaje-gold text-white',
  }
  const ToneIcon = result?.tone === 'success' ? CheckCircle2 : result?.tone === 'gold' ? Gift : AlertTriangle

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">
      {/* Barra superior */}
      <div className="relative z-20 flex items-center justify-between gap-3 px-4 py-3" style={{ background: 'rgba(18,10,6,0.92)' }}>
        <Link to="/superadmin/salvaje-splash" className="inline-flex items-center gap-1.5 text-xs font-body text-white/70 hover:text-white">
          <ArrowLeft size={16} /> Panel
        </Link>
        <div className="text-center">
          <p className="font-display text-lg uppercase leading-none tracking-wide">Puerta · Salvaje Splash</p>
          <p className="font-body text-[11px] text-white/60">Ingresaron <span className="font-semibold text-white">{ingresaron}</span> de {pagados} pagados</p>
        </div>
        <div className="w-14" />
      </div>

      {/* Cámara */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" />
        {scanning && !result && (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-64 w-64 rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
            <p className="absolute inset-x-0 bottom-8 text-center font-display text-xl uppercase tracking-widest text-white/90" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              Apunta al QR de la boleta
            </p>
          </>
        )}

        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10"><QrCode size={40} /></div>
            <p className="font-display text-2xl uppercase">Escáner de boletas</p>
            <p className="font-body text-sm text-white/70">
              Deja esta pantalla abierta: lee las boletas una tras otra y confirma el ingreso al instante. Cada boleta solo vale una vez.
            </p>
            {camError && <p className="rounded-lg bg-salvaje-danger/30 px-3 py-2 font-body text-sm">{camError}</p>}
            <button
              onClick={startScanner}
              disabled={loadingRows}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-salvaje-orange px-8 py-4 font-display text-lg uppercase tracking-widest text-white active:scale-95 transition disabled:opacity-50"
            >
              <Camera size={20} /> {loadingRows ? 'Cargando boletas…' : 'Activar cámara'}
            </button>
          </div>
        )}

        {/* Resultado (se superpone y desaparece solo; la cámara sigue leyendo) */}
        {result && (
          <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center ${toneCls[result.tone]}`} onClick={() => setResult(null)}>
            <ToneIcon size={84} strokeWidth={2.2} />
            <p className="mt-4 font-display text-4xl uppercase leading-none">{result.title}</p>
            {result.name && <p className="mt-3 font-display text-3xl uppercase leading-tight">{result.name}</p>}
            {result.sub && <p className="mt-2 font-body text-base uppercase tracking-wide opacity-90">{result.sub}</p>}
            {result.undoable && result.row && (
              <button
                onClick={(e) => { e.stopPropagation(); handleUndo(result.row) }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-black/25 px-5 py-2.5 font-body text-sm font-semibold"
              >
                <RotateCcw size={16} /> ¿Fue un error? Anular ingreso
              </button>
            )}
            {result.mode === 'gift' && result.row && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRedeem(result.row) }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-black/25 px-6 py-3 font-display text-lg uppercase tracking-widest"
              >
                <Gift size={18} /> Redimir 1 clase
              </button>
            )}
            <p className="mt-6 font-body text-xs opacity-70">Toca para seguir escaneando</p>
          </div>
        )}
      </div>
    </div>
  )
}
