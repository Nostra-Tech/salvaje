import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Smartphone, Users, CheckCircle2, XCircle, ChevronDown,
  ArrowLeft, CheckSquare, Search, UserPlus, AlertCircle, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Card, CardBody } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { useAuth } from '../../hooks/useAuth'
import { subscribeToClass, updateClass } from '../../services/classes.service'
import { searchUserByPhone } from '../../services/users.service'
import {
  registerAttendanceByQR, registerAttendanceManually,
  validateUserCanAttend, createWalkInUser, notifyNoShowsForClass,
  consumeCourtesyOnFinalize, createPendingSurveysForClass,
} from '../../services/attendance.service'
import { addClassToPayroll } from '../../services/payroll.service'
import { getCoachById } from '../../services/coaches.service'
import { notifyAllAdmins } from '../../services/admin-notifications.service'
import { grantPendingPaymentAccess } from '../../services/users.service'
import { formatTime } from '../../utils/formatters'
import { CLASS_STATUS, CLASS_AUTO_FINALIZE_MIN } from '../../utils/constants'
import { Timestamp } from 'firebase/firestore'

function parseEndTime(startDate, endVal) {
  if (!endVal) return null
  if (endVal?.toDate) return endVal.toDate()
  if (typeof endVal === 'string' && endVal.includes(':')) {
    const [h, m] = endVal.split(':').map(Number)
    const d = new Date(startDate); d.setHours(h, m, 0, 0)
    return d
  }
  return new Date(endVal)
}

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':')
}

export function CoachClassActive() {
  const { classId } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const scannerRef = useRef(null)
  const [cls, setCls] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [phoneModal, setPhoneModal] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [tick, setTick] = useState(0)

  // Live subscription
  useEffect(() => {
    const unsub = subscribeToClass(classId, setCls)
    return unsub
  }, [classId])

  // Tick every second to update elapsed time
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-start if scheduled and within window; auto-finalize past the threshold
  useEffect(() => {
    if (!cls) return
    const startTime = cls.scheduledDate?.toDate?.() || new Date(cls.scheduledDate)
    const endTime = parseEndTime(startTime, cls.endDate || cls.endTime)
    const now = new Date()
    const minutesUntilStart = (startTime - now) / 60000
    const minutesAfterEnd = endTime ? (now - endTime) / 60000 : -Infinity

    if (cls.status === 'scheduled') {
      // Block if too early. Late-start grace window stays at 15 min so a coach
      // running a few minutes behind can still abrir el registro.
      if (minutesUntilStart > 15) {
        toast.error(`Aún no es hora. Faltan ${Math.ceil(minutesUntilStart - 15)} min.`)
        navigate('/coach')
        return
      }
      if (minutesAfterEnd > 15) {
        toast.error('Esta clase ya pasó hace más de 15 min. Habla con el admin.')
        navigate('/coach')
        return
      }
      handleAutoStart()
    }

    // Auto-finalize once we cross the configured grace period after end.
    if (cls.status === 'in_progress' && minutesAfterEnd >= CLASS_AUTO_FINALIZE_MIN) {
      handleAutoFinalize()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls?.status, tick])

  async function handleAutoStart() {
    try {
      // Validate only one in_progress class per coach
      // (lightweight check; if user navigated here it's already chosen)
      await updateClass(classId, {
        status: 'in_progress',
        actualStartTime: Timestamp.now(),
      })
      // Notify admins
      try {
        await notifyAllAdmins({
          type: 'class_started',
          title: 'Clase iniciada',
          body: `${profile?.displayName || 'Coach'} inició "${cls.name}"`,
          senderId: user?.uid,
          senderName: profile?.displayName || 'Coach',
          senderRole: 'coach',
          senderPhotoURL: profile?.profilePhotoURL || null,
          relatedId: classId,
          relatedCollection: 'classes',
          actionType: 'view',
          actionUrl: '/admin/classes',
        })
      } catch {}
    } catch (e) { /* swallow */ }
  }

  async function handleAutoFinalize() {
    try {
      await finalize(true)
      toast(`Clase auto-finalizada · pasaron ${CLASS_AUTO_FINALIZE_MIN} min del fin programado`, { icon: '⏰' })
      navigate('/coach')
    } catch {}
  }

  async function startScanner() {
    setScanResult(null)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Tu navegador no soporta cámara. Usa Chrome o Safari.')
      return
    }
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      toast.error('La cámara solo funciona en HTTPS.')
      return
    }

    setScanning(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.muted = true
        try { await videoRef.current.play() } catch {}
      }

      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      scannerRef.current = { reader, stream }

      await reader.decodeFromStream(stream, videoRef.current, async (res) => {
        if (res) {
          stopScanner()
          await handleQRResult(res.getText())
        }
      })
    } catch (e) {
      console.error('startScanner failed:', e)
      const name = e?.name || ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        toast.error('Permiso de cámara denegado. Habilítalo en la configuración del navegador.')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        toast.error('No se detectó ninguna cámara en el dispositivo.')
      } else if (name === 'NotReadableError') {
        toast.error('La cámara está en uso por otra app. Ciérrala e intenta de nuevo.')
      } else {
        toast.error('No se pudo acceder a la cámara: ' + (e?.message || name || 'error'))
      }
      stopScanner()
    }
  }

  function stopScanner() {
    try {
      const ref = scannerRef.current
      if (ref?.reader) { try { ref.reader.reset() } catch {} }
      if (ref?.stream) {
        ref.stream.getTracks().forEach((t) => { try { t.stop() } catch {} })
      } else if (ref?.reset) {
        try { ref.reset() } catch {}
      }
    } catch {}
    if (videoRef.current) {
      try { videoRef.current.srcObject = null } catch {}
    }
    scannerRef.current = null
    setScanning(false)
  }

  async function handleQRResult(token) {
    try {
      const r = await registerAttendanceByQR(token, classId)
      setScanResult({ ok: true, name: r.userName, reason: r.validation.reason })
      setTimeout(() => setScanResult(null), 2500)
    } catch (e) {
      setScanResult({ ok: false, message: e.message })
      setTimeout(() => setScanResult(null), 3500)
    }
  }

  async function finalize(autoFinalized = false) {
    const checkedInCount = (cls.attendeeList || []).filter((a) => a.checkedIn).length
    await updateClass(classId, {
      status: CLASS_STATUS.COMPLETED,
      attendedCount: checkedInCount,
      autoFinalized,
      actualEndTime: Timestamp.now(),
    })
    try {
      const coach = await getCoachById(cls.coachId)
      await addClassToPayroll({ id: classId, ...cls }, coach)
    } catch {}
    // V5 Ajuste 7: consume courtesy classes for attendees who used cortesía.
    try { await consumeCourtesyOnFinalize(classId) } catch (e) { console.warn('consumeCourtesy failed:', e) }
    // V6 Ajuste 9: create pending battle-survey docs for each attendee.
    try { await createPendingSurveysForClass(classId) } catch (e) { console.warn('createPendingSurveys failed:', e) }
    // Send motivational notification to anyone who reserved but didn't show.
    try { await notifyNoShowsForClass(classId) } catch (e) { console.warn('notifyNoShows failed:', e) }
    try {
      const cap = cls.maxCapacity || 0
      const occ = cap > 0 ? Math.round((checkedInCount / cap) * 100) : 0
      const noShows = (cls.attendeeList || []).filter((a) => !a.checkedIn && a.reservedAt).length

      // SALVAJE-voice copy: directa, motivadora, sin diminutivos.
      let title, body
      if (autoFinalized) {
        title = 'Otra batalla cerrada · sin nadie al mando'
        body = `"${cls.name}" se cerró sola pasados ${CLASS_AUTO_FINALIZE_MIN} min del fin. ${checkedInCount} salvaje${checkedInCount === 1 ? '' : 's'} en el box. Aforo ${occ}%.`
      } else if (checkedInCount === 0) {
        title = 'Batalla terminada · sin asistentes'
        body = `${cls.coachName} cerró "${cls.name}". Nadie hizo acto de presencia. Toca revisar la convocatoria.`
      } else if (occ >= 90) {
        title = 'Batalla épica · box lleno'
        body = `${cls.coachName} cerró "${cls.name}" con ${checkedInCount}/${cap} salvajes. ${occ}% de aforo. Así se entrena.`
      } else if (noShows > 0) {
        title = 'Batalla cerrada · faltaron salvajes'
        body = `${cls.coachName} cerró "${cls.name}". ${checkedInCount} entraron, ${noShows} reservaron y no aparecieron. Ya recibieron jalón motivacional.`
      } else {
        title = 'Batalla cerrada'
        body = `${cls.coachName} cerró "${cls.name}". ${checkedInCount} salvaje${checkedInCount === 1 ? '' : 's'} hicieron acto de presencia. Aforo ${occ}%.`
      }

      await notifyAllAdmins({
        type: autoFinalized ? 'class_auto_finalized' : 'class_completed',
        title,
        body,
        senderId: user?.uid,
        senderName: profile?.displayName || cls.coachName,
        senderRole: autoFinalized ? 'system' : 'coach',
        senderPhotoURL: profile?.profilePhotoURL || null,
        relatedId: classId,
        relatedCollection: 'classes',
        actionType: 'view',
        actionUrl: '/admin/classes',
      })
    } catch {}
  }

  async function handleFinish() {
    // V6 Ajuste 16: el coach no puede cerrar antes de que pase el 80% de la duración programada.
    const startTime = cls.scheduledDate?.toDate?.() || new Date(cls.scheduledDate)
    const endTime = parseEndTime(startTime, cls.endDate || cls.endTime)
    const totalDurMs = endTime ? (endTime - startTime) : 60 * 60000
    const minDurMs = totalDurMs * 0.8
    const now = new Date()
    if (now < startTime) {
      toast.error('No puedes finalizar antes de que empiece la clase.')
      return
    }
    const elapsedFromStart = now - startTime
    if (elapsedFromStart < minDurMs) {
      const minRemaining = Math.ceil((minDurMs - elapsedFromStart) / 60000)
      toast.error(`Faltan ${minRemaining} min para que puedas cerrar la clase (mínimo 80% de la duración).`)
      return
    }

    if (!confirm(`¿Finalizar la clase? Asistieron ${cls.attendedCount || 0} de ${cls.maxCapacity}.`)) return
    try {
      await finalize(false)
      toast.success('Clase finalizada. Buena energía.')
      navigate('/coach')
    } catch (e) { toast.error('No pudimos finalizar. Reintenta.') }
  }

  if (!cls) return null

  const startTime = cls.scheduledDate?.toDate?.() || new Date(cls.scheduledDate)
  const endTime = parseEndTime(startTime, cls.endDate || cls.endTime)
  const elapsedMs = cls.actualStartTime ? Date.now() - (cls.actualStartTime.toDate?.() || new Date(cls.actualStartTime)).getTime() : 0
  const autoFinalizeTime = endTime ? new Date(endTime.getTime() + CLASS_AUTO_FINALIZE_MIN * 60000) : null

  const attendees = cls.attendeeList || []
  const checkedIn = attendees.filter((a) => a.checkedIn)
  const reserved = attendees.filter((a) => !a.checkedIn)

  // V7 Ajuste 3: Calcula si puede finalizar (80% de duración)
  const totalDurMs = endTime ? (endTime - startTime) : 60 * 60000
  const minDurMs = totalDurMs * 0.8
  const elapsedFromStart = new Date() - startTime
  const canFinalize = new Date() >= startTime && elapsedFromStart >= minDurMs
  const remainingMinutesForFinalize = Math.ceil((minDurMs - elapsedFromStart) / 60000)
  const progressPercent = Math.min((elapsedFromStart / totalDurMs) * 100, 100)

  return (
    <div className="min-h-screen min-h-dvh bg-salvaje-dark text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-salvaje-brown text-white p-4 safe-top">
        <button onClick={() => navigate('/coach')} className="text-white/70 hover:text-white inline-flex items-center gap-1 text-xs font-body mb-1">
          <ArrowLeft size={14} /> Volver
        </button>
        <h1 className="font-display text-2xl uppercase">{cls.name}</h1>
        <p className="font-mono text-[11px] text-white/60 mt-0.5">
          {formatTime(cls.scheduledDate)} - {formatTime(cls.endDate)}
        </p>
        {cls.status === 'in_progress' && (
          <div className="flex items-center gap-2 mt-1 text-[11px] font-body">
            <span className="w-1.5 h-1.5 rounded-full bg-salvaje-success animate-pulse" />
            <span>En proceso · {formatElapsed(elapsedMs)}</span>
          </div>
        )}
        {autoFinalizeTime && cls.status === 'in_progress' && (
          <p className="font-mono text-[10px] text-white/40 mt-0.5">
            Auto-finaliza a las {autoFinalizeTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Aforo en vivo */}
      <div className="px-4 pt-4">
        <div className="bg-white text-salvaje-dark rounded-2xl p-5 text-center shadow-salvaje-md">
          <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray mb-1">Aforo en vivo</p>
          <div className="font-display text-5xl text-salvaje-orange leading-none">
            {checkedIn.length}<span className="text-2xl text-salvaje-gray">/{cls.maxCapacity}</span>
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs font-body text-salvaje-gray">
            <span>Reservados: <strong>{checkedIn.filter((a) => !a.walkIn).length}</strong></span>
            <span>·</span>
            <span>Walk-ins: <strong>{checkedIn.filter((a) => a.walkIn).length}</strong></span>
          </div>
        </div>
      </div>

      {/* Scanner / Phone buttons */}
      <div className="px-4 pt-4 space-y-2">
        <Button size="xl" className="w-full" onClick={startScanner}>
          <Camera size={22} /> Escanear QR
        </Button>
        <Button size="lg" variant="secondary" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/15" onClick={() => setPhoneModal(true)}>
          <Smartphone size={18} /> Registrar por teléfono
        </Button>
      </div>

      {/* Result toast */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="fixed top-32 left-4 right-4 z-50 max-w-sm mx-auto"
          >
            <div className={`p-4 rounded-2xl text-center ${scanResult.ok ? 'bg-salvaje-success' : 'bg-salvaje-danger'} text-white shadow-salvaje-lg`}>
              {scanResult.ok ? <CheckCircle2 size={32} className="mx-auto mb-1" /> : <XCircle size={32} className="mx-auto mb-1" />}
              {scanResult.name && <p className="font-display text-lg uppercase">{scanResult.name}</p>}
              <p className="font-body text-sm">{scanResult.message || 'Registrado'}</p>
              {scanResult.reason && <p className="font-body text-xs text-white/80 mt-0.5">{scanResult.reason}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attendees */}
      <div className="flex-1 overflow-y-auto mt-4">
        <div className="bg-salvaje-brown/60 backdrop-blur-sm rounded-t-2xl mx-2 px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="font-display text-base uppercase">Asistentes ({checkedIn.length})</span>
          <span className="font-mono text-xs text-white/60">{reserved.length} sin asistir</span>
        </div>
        <div className="bg-salvaje-brown/60 backdrop-blur-sm mx-2 rounded-b-2xl px-4 py-2 space-y-1.5 mb-4">
          {checkedIn.map((a) => (
            <div key={a.userId + (a.checkedInAt?.toMillis?.() || '')} className="flex items-center gap-2 py-1">
              <CheckCircle2 size={14} className="text-salvaje-success flex-shrink-0" />
              <span className="font-body text-sm text-white flex-1 truncate">{a.userName}</span>
              <span className="font-mono text-[10px] text-white/40">
                {a.checkedInAt?.toDate ? a.checkedInAt.toDate().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                {' · '}{a.qrScanned ? 'QR' : a.lateRegistration ? 'Tardío' : a.walkIn ? 'Walk-in' : 'Manual'}
              </span>
            </div>
          ))}
          {reserved.map((a) => (
            <div key={a.userId} className="flex items-center gap-2 py-1 opacity-60">
              <Clock size={14} className="text-white/40 flex-shrink-0" />
              <span className="font-body text-sm text-white/70 flex-1 truncate">{a.userName}</span>
              <span className="font-mono text-[10px] text-white/40">reservó</span>
            </div>
          ))}
          {attendees.length === 0 && (
            <p className="text-center font-body text-sm text-white/50 py-3">Aún no hay registros</p>
          )}
        </div>
      </div>

      {/* Finalizar */}
      <div className="sticky bottom-0 px-4 py-3 bg-salvaje-dark border-t border-white/10 safe-bottom space-y-2">
        {cls.status === 'in_progress' && !canFinalize && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-body text-white/60 mb-1">
              <span>Duración mínima (80%)</span>
              <span className="font-mono">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-salvaje-orange transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-white/50 text-center font-body">
              Falta {remainingMinutesForFinalize} min para poder finalizar
            </p>
          </div>
        )}
        <Button
          variant="danger"
          className="w-full"
          size="lg"
          onClick={handleFinish}
          disabled={cls.status === 'in_progress' && !canFinalize}
        >
          <CheckSquare size={16} /> {canFinalize || cls.status !== 'in_progress' ? 'Finalizar clase' : `Espera ${remainingMinutesForFinalize} min`}
        </Button>
      </div>

      {/* QR Scanner overlay */}
      {scanning && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6">
          <button onClick={stopScanner} className="absolute top-4 right-4 bg-white/10 rounded-full p-2 text-white">
            <ChevronDown size={20} />
          </button>
          <div className="relative w-full max-w-sm aspect-square">
            <video ref={videoRef} className="w-full h-full object-cover rounded-2xl" playsInline muted autoPlay />
            <div className="absolute inset-0 border-2 border-salvaje-orange rounded-2xl pointer-events-none" />
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-salvaje-orange rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-salvaje-orange rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-salvaje-orange rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-salvaje-orange rounded-br-2xl" />
          </div>
          <p className="font-body text-sm text-white/70 mt-4 text-center">Apunta al QR del salvaje</p>
        </div>
      )}

      {/* Phone search modal */}
      <PhoneSearchModal
        open={phoneModal}
        onClose={() => setPhoneModal(false)}
        classId={classId}
        coachUid={user?.uid}
        onRegistered={(name) => {
          setScanResult({ ok: true, name, message: 'Registrado' })
          setTimeout(() => setScanResult(null), 2500)
          setPhoneModal(false)
        }}
      />
    </div>
  )
}

function PhoneSearchModal({ open, onClose, classId, coachUid, onRegistered }) {
  const [step, setStep] = useState('input') // input | found | not_found | create
  const [phone, setPhone] = useState('')
  const [foundUser, setFoundUser] = useState(null)
  const [validation, setValidation] = useState(null)
  const [busy, setBusy] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (!open) {
      setStep('input'); setPhone(''); setFoundUser(null); setValidation(null); setNewName('')
    }
  }, [open])

  async function search() {
    if (!phone || phone.length < 7) { toast.error('Número inválido. Mínimo 7 dígitos.'); return }
    setBusy(true)
    try {
      const u = await searchUserByPhone(phone)
      if (!u) {
        setStep('not_found')
      } else {
        const v = validateUserCanAttend(u)
        setFoundUser(u); setValidation(v); setStep('found')
      }
    } catch { toast.error('No pudimos buscar. Reintenta.') }
    setBusy(false)
  }

  async function confirmRegister() {
    if (!foundUser) return
    setBusy(true)
    try {
      const r = await registerAttendanceManually(foundUser.id, classId)
      onRegistered?.(r.userName)
    } catch (e) { toast.error(e.message || 'No pudimos registrar') }
    setBusy(false)
  }

  async function createAndRegister() {
    if (!newName?.trim() || newName.trim().length < 3) { toast.error('Ingresa el nombre completo'); return }
    setBusy(true)
    try {
      const newUid = await createWalkInUser({
        phone, displayName: newName.trim(), useFreeTrial: true, createdByCoachUid: coachUid,
      })
      const r = await registerAttendanceManually(newUid, classId)
      onRegistered?.(r.userName)
    } catch (e) { toast.error(e.message || 'No pudimos crearlo') }
    setBusy(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar por teléfono" size="md">
      <div className="px-5 pb-5 space-y-3">
        {step === 'input' && (
          <>
            <p className="font-body text-sm text-salvaje-gray">Escribe el número del asistente</p>
            <Input
              label="Número de celular"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="3001234567"
              maxLength={10}
              autoFocus
            />
            <Button onClick={search} loading={busy} className="w-full">
              <Search size={14} /> Buscar
            </Button>
          </>
        )}
        {step === 'found' && foundUser && (
          <>
            <Card>
              <CardBody className="py-3 flex items-center gap-3">
                <Avatar src={foundUser.profilePhotoURL} name={foundUser.displayName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-salvaje-dark">{foundUser.displayName}</p>
                  <p className="font-mono text-[10px] text-salvaje-gray">{foundUser.phone}</p>
                </div>
              </CardBody>
            </Card>
            <div className={`rounded-xl p-3 flex items-start gap-2 ${validation?.canAttend ? 'bg-salvaje-success/10 border border-salvaje-success/30' : 'bg-salvaje-danger/10 border border-salvaje-danger/30'}`}>
              {validation?.canAttend ? <CheckCircle2 size={16} className="text-salvaje-success mt-0.5" /> : <AlertCircle size={16} className="text-salvaje-danger mt-0.5" />}
              <p className={`font-body text-sm ${validation?.canAttend ? 'text-salvaje-success' : 'text-salvaje-danger'} font-semibold`}>{validation?.reason}</p>
            </div>
            {validation?.canAttend ? (
              <Button onClick={confirmRegister} loading={busy} className="w-full">
                <CheckCircle2 size={14} /> Registrar asistencia
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="font-body text-xs text-salvaje-gray text-center">Sin membresía activa.</p>
                <Button
                  variant="secondary"
                  loading={busy}
                  className="w-full border-salvaje-orange text-salvaje-orange"
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await grantPendingPaymentAccess(foundUser.id)
                      const r = await registerAttendanceManually(foundUser.id, classId)
                      onRegistered?.(r.userName)
                      toast.success('Acceso temporal concedido · Recuerda cobrar el pago')
                    } catch (e) { toast.error(e.message || 'Error') }
                    setBusy(false)
                  }}
                >
                  <AlertCircle size={14} /> Dar acceso (paga después)
                </Button>
              </div>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setStep('input')}>Buscar otro</Button>
          </>
        )}
        {step === 'not_found' && (
          <>
            <Card>
              <CardBody className="py-3 flex items-center gap-3">
                <AlertCircle size={20} className="text-salvaje-orange" />
                <div>
                  <p className="font-body text-sm font-semibold text-salvaje-dark">Número no registrado</p>
                  <p className="font-mono text-xs text-salvaje-gray">{phone} no está en la tribu</p>
                </div>
              </CardBody>
            </Card>
            <Button onClick={() => setStep('create')} className="w-full">
              <UserPlus size={14} /> Crear y activar cortesía
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { setStep('input'); setPhone('') }}>Buscar otro</Button>
          </>
        )}
        {step === 'create' && (
          <>
            <p className="font-body text-sm text-salvaje-gray">Crea la cuenta del salvaje y activa su clase de cortesía.</p>
            <Input label="Número (no editable)" value={phone} disabled />
            <Input label="Nombre completo" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Andrés Gómez" autoFocus />
            <div className="bg-salvaje-orange/10 border border-salvaje-orange/30 rounded-xl p-2 text-[11px] font-body text-salvaje-dark">
              Se crea una cuenta con primera clase de cortesía activada. El usuario podrá completar su perfil después.
            </div>
            <Button onClick={createAndRegister} loading={busy} className="w-full" disabled={newName.trim().length < 3}>
              <UserPlus size={14} /> Crear y registrar
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep('not_found')}>Atrás</Button>
          </>
        )}
      </div>
    </Modal>
  )
}
