import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { Footer } from '../components/layout/Footer'
import { useAuth } from '../hooks/useAuth'
import { resendVerificationEmail, logout } from '../services/auth.service'
import { auth } from '../services/firebase'

/**
 * Holding screen for users whose Auth account exists but whose email has not
 * yet been verified. They land here after self-signup, and remain here until
 * they click the verification link in their inbox.
 *
 * "Ya verifiqué" forces auth.currentUser.reload() so the next useAuth pass
 * picks up emailVerified=true and finalize+promote the registration.
 */
export function VerifyEmail() {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [resending, setResending] = useState(false)
  const [checking, setChecking] = useState(false)

  const email = user?.email || ''

  // Admin-invited users are auto-promoted to 'user' by useAuth on first sign-in.
  // When that happens while we're on this page, slip them straight into the app.
  useEffect(() => {
    if (!role || role === 'pending') return
    if (role === 'admin' || role === 'superadmin') navigate('/admin', { replace: true })
    else if (role === 'coach') navigate('/coach', { replace: true })
    else navigate('/app', { replace: true })
  }, [role, navigate])

  async function handleResend() {
    setResending(true)
    try {
      await resendVerificationEmail()
      toast.success('Correo reenviado. Revisa tu bandeja.')
    } catch (e) {
      toast.error(e?.message || 'No pudimos reenviar. Intenta de nuevo.')
    } finally {
      setResending(false)
    }
  }

  async function handleCheck() {
    setChecking(true)
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload()
      }
      // useAuth's onAuthStateChanged doesn't fire on reload(), so nudge a hard
      // re-eval by sending the user back through the root route.
      if (auth.currentUser?.emailVerified) {
        toast.success('Email verificado · entrando a la app')
        // Short delay so the toast renders before the redirect tears down the page.
        await new Promise((r) => setTimeout(r, 350))
        window.location.replace('/')
      } else {
        toast('Aún no detectamos la verificación. Revisa tu correo.', { icon: '⏳' })
      }
    } catch (e) {
      toast.error('No pudimos verificar el estado. Reintenta.')
    } finally {
      setChecking(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative min-h-screen min-h-dvh flex flex-col items-center justify-center px-5 py-8" style={{ background: '#FAF6F0' }}>
      <div className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-6"
        >
          <Logo size={88} />
          <p className="font-display uppercase mt-2" style={{ color: '#2C1810', fontSize: 22, letterSpacing: '4px', fontWeight: 900 }}>
            SALVAJE
          </p>
        </motion.div>

        <div className="bg-white rounded-2xl shadow-salvaje p-6 border border-salvaje-cream">
          <div className="w-14 h-14 bg-salvaje-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Mail size={28} className="text-salvaje-orange" />
          </div>
          <h1 className="font-display text-2xl uppercase text-center text-salvaje-dark mb-2">
            Verifica tu correo
          </h1>
          <p className="font-body text-sm text-salvaje-gray text-center mb-1">
            Te enviamos un link a:
          </p>
          <p className="font-body text-sm text-salvaje-dark text-center font-semibold break-all mb-4">
            {email || 'tu correo'}
          </p>
          <p className="font-body text-xs text-salvaje-gray text-center mb-5">
            Abre el link desde tu correo para activar tu cuenta y entrar a la tribu. Si no lo ves, revisa la carpeta de spam.
          </p>

          <div className="space-y-2">
            <Button onClick={handleCheck} loading={checking} className="w-full" size="lg">
              <CheckCircle2 size={16} /> Ya verifiqué
            </Button>
            <Button onClick={handleResend} loading={resending} variant="secondary" className="w-full">
              <RefreshCw size={14} /> Reenviar correo
            </Button>
            <button
              onClick={handleLogout}
              className="w-full mt-2 inline-flex items-center justify-center gap-1 text-xs font-body text-salvaje-gray hover:text-salvaje-dark"
            >
              <LogOut size={12} /> Cerrar sesión
            </button>
          </div>
        </div>

        <p className="font-display uppercase text-center mt-6" style={{ color: '#2C1810', fontSize: 16, letterSpacing: '0.06em' }}>
          La Tribu Te Espera
        </p>
      </div>
      <Footer className="absolute bottom-0 left-0 right-0 !bg-transparent !border-0" />
    </div>
  )
}
