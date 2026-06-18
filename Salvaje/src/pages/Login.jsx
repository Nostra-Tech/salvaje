import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/ui/Logo'
import { Footer } from '../components/layout/Footer'
import { loginWithEmail } from '../services/auth.service'

// Stagger animation for the form column.
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Read from FormData to handle browser autofill (where onChange may not fire
    // before submit, leaving useState empty on the first attempt).
    const formData = new FormData(e.currentTarget)
    const finalEmail = (formData.get('email') || email || '').toString().trim()
    const finalPassword = (formData.get('password') || password || '').toString()

    if (!finalEmail || !finalPassword) {
      setError('Ingresa tu correo y contraseña')
      return
    }

    // Sync state so the visible fields don't appear to "clear" if login fails.
    if (finalEmail !== email) setEmail(finalEmail)
    if (finalPassword !== password) setPassword(finalPassword)

    setLoading(true)
    try {
      await loginWithEmail(finalEmail, finalPassword)
      // Let useAuth's onAuthStateChanged resolve the role and redirect.
      navigate('/', { replace: true })
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found'
          ? 'Credenciales incorrectas. Inténtalo otra vez.'
          : err.code === 'auth/too-many-requests'
          ? 'Demasiados intentos. Espera unos minutos.'
          : 'No pudimos iniciar sesión. Revisa tu conexión.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen min-h-dvh w-full items-center justify-center bg-salvaje-cream p-4">
      {/* Warm ambient tint behind the card */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(900px 500px at 15% 10%, rgba(232,115,42,0.10), transparent 60%),' +
            'radial-gradient(700px 500px at 100% 100%, rgba(201,162,39,0.12), transparent 55%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-salvaje bg-salvaje-light shadow-salvaje-lg lg:h-[640px] lg:flex-row">
        {/* ── Form (below on mobile, left on desktop) ── */}
        <div className="order-2 w-full overflow-y-auto px-6 py-8 sm:px-10 lg:order-1 lg:h-full lg:w-1/2 lg:px-14">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex min-h-full flex-col justify-center gap-6"
          >
            {/* Compact brand */}
            <motion.div variants={itemVariants} className="flex flex-col items-center lg:items-start">
              <Logo size={64} />
              <p
                className="font-display uppercase mt-2"
                style={{ color: '#2C1810', fontSize: 24, letterSpacing: '4px', fontWeight: 900 }}
              >
                SALVAJE
              </p>
              <p
                className="font-body uppercase"
                style={{ color: '#6B5C52', fontSize: 10, letterSpacing: '4px', marginTop: -2 }}
              >
                Vida Deportiva
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center lg:text-left">
              <h1
                className="font-display uppercase"
                style={{ color: '#2C1810', fontSize: 30, letterSpacing: '0.04em', lineHeight: 1.05 }}
              >
                Bienvenido de vuelta
              </h1>
              <p className="font-body text-sm mt-1" style={{ color: '#6B5C52' }}>
                Sin excusas. Sin límites. La tribu te espera.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <motion.div variants={itemVariants}>
                <Input
                  label="Correo electrónico"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  icon={Mail}
                  required
                  autoComplete="email"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-xs font-semibold uppercase tracking-wide font-body"
                    style={{ color: '#6B5C52' }}
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B5C52' }}>
                      <Lock size={16} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full pl-9 pr-10 py-3 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-salvaje-dark transition-colors"
                      style={{ color: '#6B5C52' }}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </motion.div>

              {error && (
                <motion.p
                  variants={itemVariants}
                  className="text-sm font-body bg-salvaje-danger/5 px-3 py-2 rounded-lg"
                  style={{ color: '#9D2A1F' }}
                >
                  {error}
                </motion.p>
              )}

              <motion.div variants={itemVariants} className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-body hover:underline transition-colors"
                  style={{ color: '#6B5C52' }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Entrar a SALVAJE
                </Button>
              </motion.div>
            </form>

            <motion.p
              variants={itemVariants}
              className="text-center text-xs font-body"
              style={{ color: '#6B5C52' }}
            >
              ¿Aún no eres salvaje?{' '}
              <Link
                to="/register"
                className="font-semibold transition-colors hover:opacity-80"
                style={{ color: '#D4521A' }}
              >
                Únete ahora →
              </Link>
            </motion.p>
          </motion.div>
        </div>

        {/* ── Brand video (top band on mobile, right half on desktop) ── */}
        <div className="relative order-1 h-72 w-full overflow-hidden sm:h-80 lg:order-2 lg:h-full lg:w-1/2">
          <video
            className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
            src="/salvaje-web.mp4"
            autoPlay
            loop
            muted
            playsInline
            poster="/Favicon.png"
          />
          {/* Scrims for legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-salvaje-dark/70 via-salvaje-brown/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-salvaje-dark/75 via-transparent to-salvaje-dark/20" />

          <div className="relative z-10 flex h-full flex-col justify-end p-6 text-salvaje-cream [text-shadow:0_2px_14px_rgba(0,0,0,0.55)] lg:p-12">
            <span className="font-display uppercase text-lg tracking-[0.1em] text-salvaje-gold lg:text-2xl">
              Sin excusas. Sin límites.
            </span>
          </div>
        </div>
      </div>

      <Footer className="absolute bottom-0 left-0 right-0 !bg-transparent !border-0" />
    </div>
  )
}
