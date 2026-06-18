import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, CheckCircle, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchSignInMethodsForEmail, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../services/firebase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/ui/Logo'
import { Modal } from '../components/ui/Modal'
import { Footer } from '../components/layout/Footer'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [notFoundModal, setNotFoundModal] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) {
      toast.error('Ingresa un email válido')
      return
    }
    setLoading(true)
    try {
      // Step 1: Verify email exists in Firebase Auth
      auth.languageCode = 'es'
      const methods = await fetchSignInMethodsForEmail(auth, email)
      // Note: in some Firebase setups this returns [] even for existing emails
      // due to email enumeration protection. Fall back to attempting send.
      if (methods.length === 0) {
        // Could be either: email doesn't exist OR enumeration protection is on.
        // Try sending — if it fails with user-not-found we know it's not registered.
        try {
          await sendPasswordResetEmail(auth, email)
          setSent(true)
        } catch (sendErr) {
          if (sendErr.code === 'auth/user-not-found') {
            setNotFoundModal(true)
          } else if (sendErr.code === 'auth/too-many-requests') {
            toast.error('Demasiados intentos. Espera unos minutos.')
          } else {
            toast.error('Error al enviar el correo. Intenta de nuevo.')
          }
        }
        return
      }
      // Step 2: Email exists — send reset
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      })
      setSent(true)
    } catch (error) {
      if (error.code === 'auth/too-many-requests') {
        toast.error('Demasiados intentos. Espera unos minutos.')
      } else {
        toast.error('Error al verificar el correo. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen min-h-dvh flex flex-col items-center justify-center px-6 py-10" style={{ background: '#FAF6F0' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-6">
          <Logo size={80} />
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-salvaje-success/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-salvaje-success" />
            </div>
            <h2 className="font-display text-3xl uppercase text-salvaje-dark mb-2">
              ¡Correo Enviado!
            </h2>
            <p className="font-body text-sm mb-2" style={{ color: '#6B5C52' }}>
              Te enviamos las instrucciones a <strong>{email}</strong>
            </p>
            <p className="font-body text-xs mb-6" style={{ color: '#6B5C52' }}>
              Revisa también tu carpeta de spam. El correo viene de noreply@salvaje-app.firebaseapp.com
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 font-body text-sm font-semibold hover:opacity-80 transition-colors"
              style={{ color: '#D4521A' }}
            >
              <ArrowLeft size={16} /> Volver al login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="font-display text-4xl uppercase text-salvaje-dark mb-1 text-center">
              Recupera Tu Acceso
            </h2>
            <p className="font-body text-sm mb-8 text-center" style={{ color: '#6B5C52' }}>
              Ingresa tu email para verificar si tienes cuenta en SALVAJE
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                icon={Mail}
                required
              />
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Verificar Email
              </Button>
            </form>
            <div className="flex justify-center mt-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 font-body text-sm hover:opacity-80 transition-colors"
                style={{ color: '#6B5C52' }}
              >
                <ArrowLeft size={16} /> Volver al login
              </Link>
            </div>
          </>
        )}
      </motion.div>

      {/* Modal: email not found */}
      <Modal open={notFoundModal} onClose={() => setNotFoundModal(false)} title="Este email no está registrado">
        <div className="px-5 pb-5 space-y-4">
          <div className="w-14 h-14 bg-salvaje-orange/10 rounded-2xl flex items-center justify-center mx-auto">
            <UserPlus size={28} className="text-salvaje-orange" />
          </div>
          <p className="text-center font-body text-sm" style={{ color: '#6B5C52' }}>
            No encontramos una cuenta con <strong>{email}</strong> en SALVAJE.
            <br />
            ¿Quieres unirte a la tribu?
          </p>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => navigate('/register?email=' + encodeURIComponent(email))}
            >
              <UserPlus size={16} /> Registrarme
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setNotFoundModal(false)}
            >
              Intentar con otro correo
            </Button>
          </div>
        </div>
      </Modal>
      <Footer className="absolute bottom-0 left-0 right-0 !bg-transparent !border-0" />
    </div>
  )
}
