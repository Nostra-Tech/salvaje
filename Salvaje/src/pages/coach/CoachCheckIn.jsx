import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCheck, UserX, ArrowLeft, Clock, Users, Play, Calendar,
  Search, User, Phone, AlertCircle, CheckCircle2, UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Card, CardBody } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Avatar } from '../../components/ui/Avatar'
import { useAuth } from '../../hooks/useAuth'
import { findActiveClassForUser, checkInUser, getCoachClasses } from '../../services/classes.service'
import { searchUserByPhone, getAllUsers, grantPendingPaymentAccess } from '../../services/users.service'
import {
  registerAttendanceManually,
  validateUserCanAttend,
  createWalkInUser,
} from '../../services/attendance.service'
import { checkAndUnlockAchievements } from '../../services/achievements.service'
import { formatTime } from '../../utils/formatters'

/**
 * Pick the coach's current "registration target" class:
 *  - in_progress class (any time)
 *  - scheduled class within ±15min of start, up to 15min after end
 */
function pickActiveClass(classes) {
  const now = new Date()
  const candidates = (classes || [])
    .filter((c) => c.status === 'in_progress' || c.status === 'scheduled')
    .map((c) => {
      const start = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate)
      const end = c.endDate?.toDate?.() || new Date(c.endDate || start)
      return { c, start, end }
    })

  const inWindow = candidates.filter(({ c, start, end }) => {
    if (c.status === 'in_progress') return true
    const minutesUntilStart = (start - now) / 60000
    const minutesAfterEnd = (now - end) / 60000
    return minutesUntilStart <= 15 && minutesAfterEnd <= 15
  })
  inWindow.sort((a, b) => a.start - b.start)
  return inWindow[0]?.c || null
}

export function CoachCheckIn() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeClass, setActiveClass] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)

  // Search state
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchMode, setSearchMode] = useState('name') // 'name' | 'phone'
  const [result, setResult] = useState(null)
  const [processing, setProcessing] = useState(false)

  // Create new user state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    let cancelled = false
    const load = async () => {
      const classes = await getCoachClasses(user.uid, 0, 1).catch(() => [])
      if (cancelled) return
      setActiveClass(pickActiveClass(classes))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user?.uid])

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 2) {
      toast.error('Escribe al menos 2 caracteres para buscar')
      return
    }
    setSearching(true)
    setSearchResults([])
    try {
      if (searchMode === 'phone') {
        const u = await searchUserByPhone(query.trim())
        setSearchResults(u ? [u] : [])
      } else {
        // Name search — client-side filter on all users
        const all = await getAllUsers()
        const q = query.trim().toLowerCase()
        const found = all.filter((u) =>
          u.displayName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
        ).slice(0, 10)
        setSearchResults(found)
      }
    } catch {
      toast.error('No pudimos buscar. Reintenta.')
    }
    setSearching(false)
  }

  const handleApproveAccess = async (foundUser) => {
    setProcessing(true)
    try {
      await grantPendingPaymentAccess(foundUser.id, user?.displayName || 'Coach')
      toast.success(`Acceso temporal aprobado para ${foundUser.displayName}`)
      // Re-register with fresh data
      const { getUserById } = await import('../../services/users.service')
      const refreshed = await getUserById(foundUser.id)
      handleRegister(refreshed || { ...foundUser, pendingPaymentAccess: true, isBlocked: false })
    } catch (e) {
      toast.error(e.message || 'Error al aprobar acceso')
      setProcessing(false)
    }
  }

  const handleRegister = async (foundUser) => {
    if (!activeClass) {
      toast.error('No hay clase activa para registrar asistencia')
      return
    }
    setProcessing(true)
    try {
      // If user is blocked for non-payment and requested access, show approval option
      if (foundUser.isBlocked && foundUser.blockType === 'non_payment' && foundUser.classAccessRequested) {
        setResult({
          success: false,
          message: 'Pago pendiente',
          detail: `${foundUser.displayName} tiene un pago pendiente y solicita acceso temporal. ¿Aprobar?`,
          userName: foundUser.displayName,
          pendingAccessUser: foundUser,
        })
        setProcessing(false)
        return
      }

      const validation = validateUserCanAttend(foundUser)
      if (!validation.canAttend) {
        setResult({
          success: false,
          message: 'Sin acceso',
          detail: validation.reason,
          userName: foundUser.displayName,
        })
        setProcessing(false)
        return
      }

      // Check if already checked in
      const attendee = (activeClass.attendeeList || []).find((a) => a.userId === foundUser.id)
      if (attendee?.checkedIn) {
        setResult({
          success: false,
          message: 'Ya registrado',
          detail: `${foundUser.displayName} ya está registrado en ${activeClass.name}`,
          userName: foundUser.displayName,
        })
        setProcessing(false)
        return
      }

      await registerAttendanceManually(foundUser.id, activeClass.id)
      checkAndUnlockAchievements(foundUser.id).catch(() => {})
      setResult({
        success: true,
        message: 'Ingreso registrado',
        userName: foundUser.displayName,
        className: activeClass.name,
        time: formatTime(activeClass.scheduledDate),
      })
      setQuery('')
      setSearchResults([])
    } catch (e) {
      setResult({ success: false, message: e.message || 'Error al registrar' })
    }
    setProcessing(false)
  }

  const handleCreateAndRegister = async () => {
    if (!newName.trim() || newName.trim().length < 3) {
      toast.error('Ingresa el nombre completo')
      return
    }
    if (!newPhone || newPhone.length < 7) {
      toast.error('Número de teléfono inválido')
      return
    }
    if (!activeClass) {
      toast.error('No hay clase activa')
      return
    }
    setCreating(true)
    try {
      const newUid = await createWalkInUser({
        phone: newPhone, displayName: newName.trim(),
        useFreeTrial: true, createdByCoachUid: user?.uid,
      })
      await registerAttendanceManually(newUid, activeClass.id)
      setResult({
        success: true,
        message: 'Usuario creado y registrado',
        userName: newName.trim(),
        className: activeClass.name,
        time: formatTime(activeClass.scheduledDate),
      })
      setShowCreate(false)
      setNewName(''); setNewPhone('')
      setQuery(''); setSearchResults([])
    } catch (e) {
      toast.error(e.message || 'No pudimos crear al usuario')
    }
    setCreating(false)
  }

  const openActiveClass = () => {
    if (!activeClass) return
    navigate(`/coach/classes/${activeClass.id}/active`)
  }

  return (
    <AppShell title="Registrar Ingreso">
      <div className="min-h-[calc(100vh-3.5rem)] bg-salvaje-light flex flex-col">
        <div className="px-4 pt-4 pb-6 max-w-lg mx-auto w-full space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/coach')} className="p-1.5 rounded-lg text-salvaje-gray hover:bg-white">
              <ArrowLeft size={18} />
            </button>
            <h1 className="font-display text-2xl uppercase text-salvaje-dark">Registrar Ingreso</h1>
          </div>

          {/* Active class card */}
          {loading ? (
            <div className="h-40 bg-white rounded-2xl animate-pulse" />
          ) : activeClass ? (
            <ActiveClassCard cls={activeClass} onOpenClass={openActiveClass} />
          ) : (
            <Card>
              <CardBody className="py-10 text-center">
                <Calendar size={32} className="text-salvaje-cream mx-auto mb-2" />
                <p className="font-display text-lg uppercase text-salvaje-dark">Sin clase activa</p>
                <p className="font-body text-sm text-salvaje-gray mt-1 max-w-xs mx-auto">
                  Cuando entres a la ventana de tu próxima clase (15 min antes de empezar), aparecerá aquí.
                </p>
                <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate('/coach/classes')}>
                  Ver mis clases
                </Button>
              </CardBody>
            </Card>
          )}

          {/* Search section */}
          {activeClass && (
            <Card>
              <CardBody className="space-y-3">
                <p className="font-display text-base uppercase text-salvaje-dark">Buscar asistente</p>

                {/* Mode selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSearchMode('name'); setQuery(''); setSearchResults([]) }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-body font-medium transition-all ${
                      searchMode === 'name' ? 'bg-salvaje-orange text-white' : 'bg-salvaje-light text-salvaje-gray hover:bg-salvaje-cream'
                    }`}
                  >
                    <User size={14} /> Por nombre
                  </button>
                  <button
                    onClick={() => { setSearchMode('phone'); setQuery(''); setSearchResults([]) }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-body font-medium transition-all ${
                      searchMode === 'phone' ? 'bg-salvaje-orange text-white' : 'bg-salvaje-light text-salvaje-gray hover:bg-salvaje-cream'
                    }`}
                  >
                    <Phone size={14} /> Por teléfono
                  </button>
                </div>

                {/* Search input */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(searchMode === 'phone' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                      placeholder={searchMode === 'phone' ? '3001234567' : 'Nombre del asistente'}
                      type={searchMode === 'phone' ? 'tel' : 'text'}
                      maxLength={searchMode === 'phone' ? 10 : undefined}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button onClick={handleSearch} loading={searching} className="flex-shrink-0">
                    <Search size={16} />
                  </Button>
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 bg-salvaje-light rounded-xl px-3 py-2.5">
                        <Avatar src={u.profilePhotoURL} name={u.displayName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{u.displayName || '—'}</p>
                          <p className="font-mono text-[10px] text-salvaje-gray">{u.phone || u.email || '—'}</p>
                        </div>
                        <Button
                          size="sm"
                          loading={processing}
                          onClick={() => handleRegister(u)}
                        >
                          Registrar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && query.trim().length > 0 && !searching && (
                  <div className="bg-salvaje-light rounded-xl p-3 text-center space-y-2">
                    <p className="font-body text-sm text-salvaje-gray">No se encontró ningún usuario</p>
                    <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
                      <UserPlus size={14} /> Crear nuevo y registrar
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Create new user panel */}
          <AnimatePresence>
            {showCreate && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
              >
                <Card>
                  <CardBody className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-base uppercase text-salvaje-dark">Nuevo asistente</p>
                      <button onClick={() => setShowCreate(false)} className="text-salvaje-gray text-xs font-body">Cancelar</button>
                    </div>
                    <Input
                      label="Nombre completo"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Andrés Gómez"
                    />
                    <Input
                      label="Teléfono"
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="3001234567"
                      maxLength={10}
                    />
                    <div className="bg-salvaje-orange/10 border border-salvaje-orange/30 rounded-xl p-2 text-[11px] font-body text-salvaje-dark">
                      Se crea con clase de cortesía activada. El usuario puede completar su perfil después.
                    </div>
                    <Button
                      className="w-full"
                      loading={creating}
                      onClick={handleCreateAndRegister}
                      disabled={newName.trim().length < 3 || newPhone.length < 7}
                    >
                      <UserPlus size={14} /> Crear y registrar
                    </Button>
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result overlay */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className={`p-5 rounded-2xl text-center ${result.success ? 'bg-salvaje-success' : 'bg-salvaje-danger'}`}
              >
                {result.success
                  ? <UserCheck size={48} className="text-white mx-auto mb-2" />
                  : <UserX size={48} className="text-white mx-auto mb-2" />}
                {result.userName && (
                  <p className="font-display text-2xl text-white uppercase">{result.userName}</p>
                )}
                <p className="font-body text-white/90 text-sm font-semibold mt-0.5">{result.message}</p>
                {result.className && (
                  <div className="flex items-center justify-center gap-2 mt-2 text-white/80 text-sm font-body">
                    <Clock size={14} /> <span>{result.className} · {result.time}</span>
                  </div>
                )}
                {result.detail && (
                  <p className="font-body text-white/70 text-xs mt-1">{result.detail}</p>
                )}
                {result.pendingAccessUser && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 bg-white text-salvaje-success border-white w-full"
                    loading={processing}
                    onClick={() => handleApproveAccess(result.pendingAccessUser)}
                  >
                    <UserCheck size={14} /> Aprobar acceso temporal
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 bg-white/20 text-white border-white/30 w-full"
                  onClick={() => setResult(null)}
                >
                  Registrar otro
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  )
}

function ActiveClassCard({ cls, onOpenClass }) {
  const isLive = cls.status === 'in_progress'
  const start = cls.scheduledDate?.toDate?.() || new Date(cls.scheduledDate)
  const end = cls.endDate?.toDate?.() || new Date(cls.endDate || start)
  const booked = cls.currentBookings || cls.attendeeList?.length || 0
  const checkedIn = (cls.attendeeList || []).filter((a) => a.checkedIn).length

  const gradient = isLive
    ? 'from-salvaje-success to-emerald-700'
    : 'from-salvaje-orange to-salvaje-fire'
  const ring = isLive ? 'ring-salvaje-success/25' : 'ring-salvaje-orange/30'

  return (
    <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <div className={`bg-gradient-to-br ${gradient} ring-4 ${ring} rounded-salvaje p-5 text-white shadow-salvaje-md`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/80 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/90">
            {isLive ? 'Clase en vivo' : 'Lista para iniciar'}
          </p>
          {isLive && <span className="ml-auto bg-white text-salvaje-success font-display text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full">EN VIVO</span>}
        </div>
        <h2 className="font-display text-3xl uppercase leading-none mb-3">{cls.name}</h2>
        <div className="flex items-center gap-3 text-sm font-body text-white/90 mb-4 flex-wrap">
          <span className="flex items-center gap-1"><Clock size={13} />{formatTime(start)} - {formatTime(end)}</span>
          <span className="flex items-center gap-1"><Users size={13} />{checkedIn}/{booked} registrados</span>
        </div>
        <button
          onClick={onOpenClass}
          className="w-full bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 text-sm font-body text-white flex items-center justify-center gap-2 transition-colors"
        >
          <Play size={14} /> Abrir vista completa de la clase
        </button>
      </div>
    </motion.div>
  )
}
