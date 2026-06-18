import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Phone, Lock, Eye, EyeOff, Gift, Dumbbell, Calendar, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/ui/Logo'
import { registerUser } from '../services/auth.service'
import { useAuthStore } from '../store/authStore'
import { Footer } from '../components/layout/Footer'

export function Register() {
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({
    displayName: '',
    email: searchParams.get('email') || '',
    phone: '',
    birthDate: '',
    gender: '',
    password: '',
    confirmPassword: '',
    referralCode: searchParams.get('ref') || '',
    colegioMonteluna: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const e = searchParams.get('email')
    const r = searchParams.get('ref')
    if (e) setForm((f) => ({ ...f, email: e }))
    if (r) setForm((f) => ({ ...f, referralCode: r }))
  }, [searchParams])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (!form.birthDate) {
      setError('La fecha de nacimiento es requerida')
      return
    }
    // Calcular edad para validar mínimo (10 años)
    const birth = new Date(form.birthDate)
    const ageMs = Date.now() - birth.getTime()
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25)
    if (ageYears < 10) {
      setError('Debes tener al menos 10 años para entrenar en SALVAJE')
      return
    }
    if (ageYears > 100) {
      setError('Revisa la fecha de nacimiento')
      return
    }
    setLoading(true)
    const { setRegistering, setRole } = useAuthStore.getState()
    setRegistering(true) // Pause RoleGuard while we write the pending_users doc
    try {
      await registerUser({ ...form, birthDate: form.birthDate, gender: form.gender, colegioMonteluna: form.colegioMonteluna })
      // pending until the user clicks the email link; useAuth promotes after.
      setRole('pending')
      toast.success('Cuenta creada. Verifica tu correo para entrar.')
      await new Promise((r) => setTimeout(r, 100))
      setRegistering(false)
      navigate('/verify-email', { replace: true })
    } catch (err) {
      setRegistering(false)
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'Este email ya pertenece a la tribu. Inicia sesión.'
          : err.code === 'auth/weak-password'
          ? 'La contraseña es muy débil. Mínimo 8 caracteres.'
          : err.message || 'No pudimos registrarte. Reintenta.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-dvh flex flex-col lg:flex-row">
      {/* Brand panel - background image (mobile vs desktop), visible on all screens */}
      <div className="relative flex flex-col justify-between w-full lg:w-[40%] px-6 py-6 lg:px-14 lg:py-12 lg:min-h-screen overflow-hidden bg-salvaje-brown">
        {/* Mobile image */}
        <div
          className="absolute inset-0 bg-cover bg-center lg:hidden"
          style={{ backgroundImage: 'url(/registro-mobile.png)' }}
        />
        {/* Desktop image */}
        <div
          className="absolute inset-0 hidden bg-cover bg-top lg:block"
          style={{ backgroundImage: 'url(/registro.png)' }}
        />
        {/* Scrim for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-salvaje-dark/80 via-salvaje-dark/30 to-salvaje-dark/40" />

        <div className="relative z-10 flex items-center gap-3">
          <Logo size={36} bg="#F4EFE5" className="lg:hidden" />
          <Logo size={44} bg="#F4EFE5" className="hidden lg:block" />
          <span className="hidden lg:inline font-display text-2xl text-white uppercase tracking-wide">
            Salvaje
          </span>
        </div>

        <Dumbbell size={24} className="relative z-10 text-salvaje-orange/40 hidden lg:block" />
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 bg-salvaje-light overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm lg:max-w-2xl"
        >
          <h2 className="font-display text-3xl lg:text-4xl uppercase text-salvaje-dark mb-1">Crear Cuenta</h2>
          <p className="font-body text-salvaje-gray text-sm mb-4">
            Regístrate ahora y obtén tu PRIMERA clase GRATIS
          </p>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Input
              label="Nombre completo"
              value={form.displayName}
              onChange={set('displayName')}
              placeholder="Tu nombre"
              icon={User}
              required
            />
            <Input
              label="Correo electronico"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="tu@correo.com"
              icon={Mail}
              required
            />
            <Input
              label="Teléfono"
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              placeholder="300 000 0000"
              icon={Phone}
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={form.birthDate}
              onChange={set('birthDate')}
              icon={Calendar}
              required
              max={new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            />

            {/* Género */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-salvaje-gray uppercase tracking-wide font-body">
                Género
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-salvaje-gray pointer-events-none">
                  <ChevronDown size={16} />
                </span>
                <select
                  value={form.gender}
                  onChange={set('gender')}
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange transition-all appearance-none"
                >
                  <option value="">Sin especificar</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-salvaje-gray uppercase tracking-wide font-body">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-salvaje-gray">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min 8 caracteres"
                  required
                  className="w-full pl-9 pr-10 py-3 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-salvaje-gray"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Input
              label="Confirmar contrasena"
              type="password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              placeholder="Repite tu contrasena"
              icon={Lock}
              required
            />
            <Input
              label="Codigo de referido (opcional)"
              value={form.referralCode}
              onChange={set('referralCode')}
              placeholder="SALV-XXXX"
              icon={Gift}
            />

            {/* Colegio Monteluna gate: unlocks the Papás / Papás-e-Hijos plans. */}
            <label className="lg:col-span-2 flex items-start gap-2 cursor-pointer p-3 rounded-xl bg-white border border-salvaje-cream hover:border-salvaje-orange/40 transition-colors">
              <input
                type="checkbox"
                checked={form.colegioMonteluna}
                onChange={(e) => setForm((f) => ({ ...f, colegioMonteluna: e.target.checked }))}
                className="w-4 h-4 rounded accent-salvaje-orange mt-0.5"
              />
              <div className="flex-1">
                <p className="font-body text-sm text-salvaje-dark font-semibold">¿Tus hijos estudian en el Colegio Monteluna?</p>
                <p className="font-body text-[11px] text-salvaje-gray">Marca esta casilla si aplica para acceder a las tarifas Papás / Papás e Hijos.</p>
              </div>
            </label>

            {error && (
              <p className="lg:col-span-2 text-sm text-salvaje-danger font-body bg-salvaje-danger/5 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="lg:col-span-2 w-full" size="lg">
              Crear cuenta
            </Button>
          </form>

          <p className="text-center text-sm font-body text-salvaje-gray mt-5">
            Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="text-salvaje-orange hover:text-salvaje-fire font-semibold"
            >
              Inicia sesion
            </Link>
          </p>
        </motion.div>
        <Footer className="mt-8 !bg-transparent !border-0" />
      </div>
    </div>
  )
}
