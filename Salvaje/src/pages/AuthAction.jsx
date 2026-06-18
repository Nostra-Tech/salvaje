import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { verifyPasswordResetCode, confirmPasswordReset, applyActionCode } from 'firebase/auth'
import { auth } from '../services/firebase'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { Footer } from '../components/layout/Footer'

/**
 * Custom handler for Firebase Auth action URLs.
 * Configured in Firebase Console > Authentication > Templates > "URL personalizada del handler de acción"
 * to point to: https://salvaje-app.web.app/__/auth/action
 *
 * Or as fallback: this page reads ?mode=resetPassword&oobCode=...
 *
 * Modes:
 *   - resetPassword: user resets password
 *   - verifyEmail: confirm email
 *   - recoverEmail: recover email change
 */
export function AuthAction() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const mode = params.get('mode')
  const oobCode = params.get('oobCode')

  const [stage, setStage] = useState('loading') // loading | reset | success | error | verifyEmail
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!mode || !oobCode) {
      setStage('error')
      setError('Link inválido o incompleto. Solicita un nuevo correo de recuperación.')
      return
    }
    auth.languageCode = 'es'

    if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((emailFromCode) => {
          setEmail(emailFromCode)
          setStage('reset')
        })
        .catch((e) => {
          setStage('error')
          setError(
            e.code === 'auth/expired-action-code' ? 'Este link expiró. Solicita un nuevo correo de recuperación.'
            : e.code === 'auth/invalid-action-code' ? 'Link inválido o ya utilizado.'
            : 'No se pudo verificar el link. Intenta de nuevo.'
          )
        })
    } else if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => setStage('verifyEmail'))
        .catch(() => { setStage('error'); setError('No se pudo verificar el email.') })
    } else {
      setStage('error')
      setError('Acción no reconocida.')
    }
  }, [mode, oobCode])

  const handleReset = async (e) => {
    e.preventDefault()
    if (pwd.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    if (pwd !== pwd2)   { toast.error('Las contraseñas no coinciden'); return }
    setSubmitting(true)
    try {
      await confirmPasswordReset(auth, oobCode, pwd)
      setStage('success')
    } catch (e) {
      toast.error('Error al actualizar la contraseña: ' + (e.message || ''))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center px-5 py-8 relative overflow-hidden" style={{ background: '#FAF6F0' }}>
      {/* Brown accent header */}
      <div className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <Logo size={100} />
          <p className="font-display uppercase text-center mt-3" style={{ color: '#2C1810', fontSize: 18, letterSpacing: '0.04em' }}>
            Sin excusas. Sin límites.
          </p>
          <div className="w-20 h-px my-4" style={{ background: '#E8D9C0' }} />
        </motion.div>

        {stage === 'loading' && (
          <Card>
            <p className="font-body text-sm text-salvaje-gray text-center py-6">Verificando link...</p>
          </Card>
        )}

        {stage === 'error' && (
          <Card>
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-salvaje-danger/10 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle size={28} className="text-salvaje-danger" />
              </div>
              <h2 className="font-display text-2xl uppercase text-salvaje-dark">Algo salió mal</h2>
              <p className="font-body text-sm text-salvaje-gray">{error}</p>
              <Button onClick={() => navigate('/forgot-password')} className="w-full">
                Solicitar nuevo link
              </Button>
              <button onClick={() => navigate('/login')} className="font-body text-xs text-salvaje-gray hover:underline">
                Volver al login
              </button>
            </div>
          </Card>
        )}

        {stage === 'verifyEmail' && (
          <Card>
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-salvaje-success/10 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle size={28} className="text-salvaje-success" />
              </div>
              <h2 className="font-display text-2xl uppercase text-salvaje-dark">¡Email verificado!</h2>
              <p className="font-body text-sm text-salvaje-gray">Tu cuenta está lista. Ya puedes entrar a SALVAJE.</p>
              <Button onClick={() => navigate('/login')} className="w-full">
                Entrar a SALVAJE <ArrowRight size={16} />
              </Button>
            </div>
          </Card>
        )}

        {stage === 'reset' && (
          <Card>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="text-center">
                <h2 className="font-display text-2xl uppercase text-salvaje-dark">Nueva contraseña</h2>
                <p className="font-body text-sm text-salvaje-gray mt-1">
                  Para <strong>{email}</strong>
                </p>
              </div>
              <form onSubmit={handleReset} className="space-y-3">
                <PasswordField
                  label="Nueva contraseña"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  show={showPwd}
                  onToggle={() => setShowPwd((s) => !s)}
                />
                <PasswordField
                  label="Confirmar contraseña"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                  show={showPwd}
                  onToggle={() => setShowPwd((s) => !s)}
                />
                <ul className="text-[11px] font-body text-salvaje-gray space-y-0.5 pl-2">
                  <li className={pwd.length >= 8 ? 'text-salvaje-success' : ''}>• Mínimo 8 caracteres</li>
                  <li className={pwd === pwd2 && pwd ? 'text-salvaje-success' : ''}>• Ambas contraseñas iguales</li>
                </ul>
                <Button type="submit" className="w-full" size="lg" loading={submitting}>
                  Guardar nueva contraseña
                </Button>
              </form>
            </motion.div>
          </Card>
        )}

        {stage === 'success' && (
          <Card>
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-salvaje-success/10 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle size={28} className="text-salvaje-success" />
              </div>
              <h2 className="font-display text-3xl uppercase text-salvaje-dark">¡Listo!</h2>
              <p className="font-body text-sm text-salvaje-gray">
                Tu contraseña fue actualizada.<br />
                Ahora entra con tus nuevas credenciales.
              </p>
              <Button onClick={() => navigate('/login')} className="w-full" size="lg">
                Entrar a SALVAJE <ArrowRight size={16} />
              </Button>
            </div>
          </Card>
        )}
      </div>

      <p className="font-display uppercase text-center mt-8" style={{ color: '#2C1810', fontSize: 22, letterSpacing: '0.04em' }}>
        La Tribu Te Espera
      </p>
      <Footer className="absolute bottom-0 left-0 right-0 !bg-transparent !border-0" />
    </div>
  )
}

function Card({ children }) {
  return (
    <div className="bg-white rounded-2xl shadow-salvaje p-6 border border-salvaje-cream">
      {children}
    </div>
  )
}

function PasswordField({ label, value, onChange, show, onToggle }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide font-body" style={{ color: '#6B5C52' }}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B5C52' }}>
          <Lock size={16} />
        </span>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          className="w-full pl-9 pr-10 py-3 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-salvaje-dark"
          style={{ color: '#6B5C52' }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}
