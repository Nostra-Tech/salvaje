import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Phone, ArrowRight } from 'lucide-react'
import { AppInput } from '../components/AppInput'
import { Footer } from '../components/Footer'
import { toast } from '../components/Toast'
import { usePollaStore } from '../store/pollaStore'
import { registerOrLogin, loginByEmail } from '../services/polla.service'
import { asset } from '../lib/asset'

export default function Register() {
  const navigate = useNavigate()
  const setUser = usePollaStore((s) => s.setUser)

  const [mode, setMode] = useState('register') // 'register' | 'login'
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)

  // Glow que sigue el mouse en el panel del formulario
  const [glow, setGlow] = useState({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)
  const onGlowMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setGlow({ x: e.clientX - r.left, y: e.clientY - r.top })
  }
  // Soporte táctil: revela el trofeo al arrastrar el dedo sobre el login
  const onTouch = (e) => {
    const t = e.touches?.[0]
    if (!t) return
    const r = e.currentTarget.getBoundingClientRect()
    setGlow({ x: t.clientX - r.left, y: t.clientY - r.top })
    setHovering(true)
  }

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    if (!validEmail(form.email)) {
      toast.error('Ingresa un correo válido.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        const user = await loginByEmail(form.email)
        if (!user) {
          toast.error('Ese correo no está registrado. Regístrate primero.')
          setMode('register')
          return
        }
        setUser(user)
        toast.success(`¡Bienvenido de vuelta, ${user.fullName?.split(' ')[0] || ''}!`)
        navigate('/predict')
        return
      }
      if (form.fullName.trim().length < 3) {
        toast.error('Escribe tu nombre completo.')
        return
      }
      if (form.phone.trim().length < 7) {
        toast.error('Ingresa un número de celular válido.')
        return
      }
      const user = await registerOrLogin(form)
      setUser(user)
      toast.success(user.isNew ? '¡Registro exitoso! A pronosticar.' : '¡Bienvenido de vuelta!')
      navigate('/predict')
    } catch (err) {
      console.error(err)
      toast.error('No se pudo conectar. Revisa tu internet e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-salvaje-cream p-4">
      {/* Fondo claro con tinte cálido sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(900px 500px at 15% 10%, rgba(232,115,42,0.10), transparent 60%),' +
            'radial-gradient(700px 500px at 100% 100%, rgba(201,162,39,0.12), transparent 55%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-salvaje bg-salvaje-light shadow-salvaje-lg lg:h-[640px] lg:flex-row">
        {/* ── Formulario (abajo en móvil, izquierda en desktop) ── */}
        <div
          className="relative order-2 w-full overflow-y-auto px-6 py-8 sm:px-10 lg:order-1 lg:h-full lg:w-1/2 lg:px-14"
          onMouseMove={onGlowMove}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onTouchStart={onTouch}
          onTouchMove={onTouch}
          onTouchEnd={() => setHovering(false)}
        >
          {/* Halo de luz cálida que sigue el mouse */}
          <div
            className="pointer-events-none absolute h-[340px] w-[340px] rounded-full bg-salvaje-gold/25 blur-3xl transition-opacity duration-200"
            style={{ left: glow.x - 170, top: glow.y - 170, opacity: hovering ? 1 : 0 }}
          />
          {/* La luz revela el trofeo del Mundial */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-200"
            style={{
              opacity: hovering ? 1 : 0,
              backgroundImage: `url(${asset('trophy.png')})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center 42%',
              backgroundSize: '330px',
              WebkitMaskImage: `radial-gradient(175px circle at ${glow.x}px ${glow.y}px, #000 0%, rgba(0,0,0,0.85) 42%, transparent 72%)`,
              maskImage: `radial-gradient(175px circle at ${glow.x}px ${glow.y}px, #000 0%, rgba(0,0,0,0.85) 42%, transparent 72%)`,
            }}
          />

          <div className="relative z-10 flex min-h-full flex-col justify-center">
            {/* Tabs */}
            <div className="mb-6 flex rounded-xl bg-salvaje-light-alt p-1">
              <TabBtn active={mode === 'register'} onClick={() => setMode('register')}>
                Registrarme
              </TabBtn>
              <TabBtn active={mode === 'login'} onClick={() => setMode('login')}>
                Ya tengo cuenta
              </TabBtn>
            </div>

            <h1 className="display text-4xl text-salvaje-brown">
              {mode === 'register' ? 'Únete a la polla' : 'Bienvenido de vuelta'}
            </h1>
            <p className="mt-1 text-sm text-salvaje-gray">
              {mode === 'register'
                ? 'Regístrate con tus datos básicos y empieza a pronosticar.'
                : 'Ingresa con el correo con el que te registraste.'}
            </p>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
              {mode === 'register' && (
                <AppInput
                  icon={<User size={18} />}
                  placeholder="Nombre completo"
                  value={form.fullName}
                  onChange={update('fullName')}
                  autoComplete="name"
                />
              )}
              <AppInput
                icon={<Mail size={18} />}
                type="email"
                placeholder="Correo electrónico"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                required
              />
              {mode === 'register' && (
                <AppInput
                  icon={<Phone size={18} />}
                  type="tel"
                  placeholder="Celular"
                  value={form.phone}
                  onChange={update('phone')}
                  autoComplete="tel"
                />
              )}

              {/* Botón con brillo */}
              <button
                type="submit"
                disabled={loading}
                className="group/button relative mt-1 inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-salvaje-orange px-5 py-3 font-semibold text-white shadow-salvaje-md transition-all duration-300 ease-in-out hover:bg-salvaje-fire hover:shadow-salvaje-glow disabled:opacity-50"
              >
                <span>{loading ? 'Conectando…' : mode === 'register' ? 'Crear cuenta' : 'Ingresar'}</span>
                {!loading && <ArrowRight size={18} />}
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-120%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(120%)]">
                  <div className="relative h-full w-10 bg-white/25" />
                </div>
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-salvaje-gray">
              Al participar aceptas que tu nombre aparezca en la tabla de posiciones.
            </p>
          </div>
        </div>

        {/* ── Panel de marca (arriba en móvil, derecha en desktop) ── */}
        <div className="relative order-1 h-56 w-full overflow-hidden sm:h-72 lg:order-2 lg:h-full lg:w-1/2">
          {/* Imagen generada (atleta + estadio, paleta Salvaje) */}
          <img
            src={asset('intro.jpg')}
            alt="Atleta Salvaje con balón en el estadio"
            className="absolute inset-0 h-full w-full object-cover object-[58%_18%] lg:object-[72%_center]"
          />
          {/* Scrim oscuro a la izquierda para legibilidad del texto */}
          <div className="absolute inset-0 bg-gradient-to-r from-salvaje-dark/95 via-salvaje-brown/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-salvaje-dark/85 via-transparent to-salvaje-dark/30" />

          <div className="relative z-10 flex h-full flex-col justify-between p-6 text-salvaje-cream [text-shadow:0_2px_14px_rgba(0,0,0,0.55)] lg:p-12">
            <div className="flex items-center">
              <img
                src={asset('salvaje-logo-white.png')}
                alt="Salvaje — Vida Deportiva"
                className="h-20 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:h-24"
              />
            </div>

            {/* Titular grande solo en desktop */}
            <div className="hidden lg:block">
              <h2 className="display text-6xl leading-[0.95]">
                PRONOSTICA.
                <br />
                COMPITE.
                <br />
                <span className="text-salvaje-gold">DOMINA.</span>
              </h2>
              <p className="mt-4 max-w-xs text-salvaje-cream/90">
                Acierta marcadores y clasificados del Mundial 2026 y pelea por la cima del ranking Salvaje.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer className="absolute bottom-0 left-0 right-0 !bg-transparent !border-0" />
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-white text-salvaje-brown shadow-salvaje' : 'text-salvaje-gray hover:text-salvaje-brown'
      }`}
    >
      {children}
    </button>
  )
}
