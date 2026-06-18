import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, collection, writeBatch } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import { Button } from '../components/ui/Button'
import { Footer } from '../components/layout/Footer'

const SETUP_KEY = 'SALVAJE_SETUP_2026_KEY'
const REQUIRED_SECRET = 'SALVAJE_SETUP_2026'

const MEMBERSHIPS = [
  {
    id: 'monthly_unlimited',
    name: 'Mensual Ilimitado',
    type: 'monthly',
    price: 180000,
    durationDays: 30,
    classesPerWeek: null,
    features: ['Clases ilimitadas', 'Acceso a todos los horarios', 'Seguimiento de progreso', 'App SALVAJE'],
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'ticketera_10',
    name: 'Tiqueteera 10 Clases',
    type: 'ticketera',
    price: 120000,
    classesTotal: 10,
    expiryDays: 60,
    features: ['10 clases a tu ritmo', 'Válida por 60 días', 'No vence el mes', 'App SALVAJE'],
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'ticketera_20',
    name: 'Tiqueteera 20 Clases',
    type: 'ticketera',
    price: 220000,
    classesTotal: 20,
    expiryDays: 90,
    features: ['20 clases a tu ritmo', 'Válida por 90 días', 'Mejor precio por clase', 'App SALVAJE'],
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'free_trial',
    name: 'Clase de Prueba',
    type: 'free_trial',
    price: 0,
    classesTotal: 1,
    expiryDays: 7,
    features: ['1 clase gratis', 'Válida por 7 días', 'Sin compromisos'],
    isActive: true,
    sortOrder: 4,
  },
]

const ACHIEVEMENTS = [
  { id: 'first_class',     name: 'Primera Vez',    description: 'Completaste tu primera clase',   icon: 'Star',       condition: { type: 'classes_count', value: 1   } },
  { id: 'ten_classes',     name: 'En Forma',        description: 'Completaste 10 clases',          icon: 'TrendingUp', condition: { type: 'classes_count', value: 10  } },
  { id: 'fifty_classes',   name: 'Guerrero',        description: 'Completaste 50 clases',          icon: 'Shield',     condition: { type: 'classes_count', value: 50  } },
  { id: 'hundred_classes', name: 'Leyenda Salvaje', description: 'Completaste 100 clases',         icon: 'Trophy',     condition: { type: 'classes_count', value: 100 } },
  { id: 'streak_7',        name: 'Semana Perfecta', description: '7 días seguidos asistiendo',     icon: 'Flame',      condition: { type: 'streak', value: 7          } },
  { id: 'streak_30',       name: 'Imparable',       description: '30 días seguidos asistiendo',    icon: 'Zap',        condition: { type: 'streak', value: 30         } },
  { id: 'referral_1',      name: 'Embajador',       description: 'Referiste a tu primer amigo',    icon: 'Users',      condition: { type: 'referrals', value: 1       } },
  { id: 'referral_5',      name: 'Líder Salvaje',   description: 'Referiste a 5 amigos',           icon: 'Award',      condition: { type: 'referrals', value: 5       } },
]

const APP_CONFIG = {
  boxName: 'CrossFit SALVAJE',
  boxAddress: 'Calle 100 # 15-30, Bogotá, Colombia',
  boxPhone: '3001234500',
  boxEmail: 'info@salvaje.app',
  paymentMethods: [
    { type: 'nequi',     label: 'Nequi',      number: '3001234500', owner: 'SALVAJE Box' },
    { type: 'daviplata', label: 'Daviplata',   number: '3001234500', owner: 'SALVAJE Box' },
    {
      type: 'transfer',
      label: 'Transferencia Bancolombia',
      account: '123-456789-00',
      accountType: 'Ahorros',
      owner: 'SALVAJE SAS',
      nit: '900.123.456-7',
    },
  ],
  updatedAt: new Date().toISOString(),
}

export function Setup() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [log, setLog] = useState([])

  const secret = params.get('secret')
  if (secret !== REQUIRED_SECRET) {
    return (
      <div className="relative min-h-screen bg-salvaje-dark flex items-center justify-center">
        <p className="text-salvaje-danger font-mono text-sm">403 Forbidden</p>
        <Footer className="absolute bottom-0 left-0 right-0" />
      </div>
    )
  }

  function addLog(msg) {
    setLog((prev) => [...prev, msg])
  }

  async function run() {
    setStatus('loading')
    setLog([])
    try {
      // 1. Create / sign-in admin auth user
      addLog('Creando usuario admin@salvaje.app...')
      let uid
      try {
        const cred = await createUserWithEmailAndPassword(auth, 'admin@salvaje.app', 'Salvaje2026*')
        uid = cred.user.uid
        addLog(`Auth user creado: ${uid}`)
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          const cred = await signInWithEmailAndPassword(auth, 'admin@salvaje.app', 'Salvaje2026*')
          uid = cred.user.uid
          addLog(`Auth user existente: ${uid}`)
        } else {
          throw err
        }
      }

      // 2. Write /admins/{uid} — always setDoc (merge avoids read permission issue)
      addLog('Escribiendo documento /admins...')
      const adminRef = doc(db, 'admins', uid)
      try {
        await setDoc(adminRef, {
          uid,
          email: 'admin@salvaje.app',
          displayName: 'Super Admin',
          role: 'admin',
          setupKey: SETUP_KEY,
          createdAt: new Date().toISOString(),
        })
        addLog('Admin document creado.')
      } catch (e) {
        if (e.code !== 'permission-denied') throw e
        addLog('Admin document ya existe, continuando...')
      }

      // 3. Seed memberships catalog
      addLog('Sembrando catálogo de membresías...')
      const batch1 = writeBatch(db)
      for (const m of MEMBERSHIPS) {
        batch1.set(doc(collection(db, 'memberships_catalog'), m.id), {
          ...m,
          createdAt: new Date().toISOString(),
        })
      }
      await batch1.commit()
      addLog(`${MEMBERSHIPS.length} membresías creadas.`)

      // 4. Seed achievements catalog
      addLog('Sembrando catálogo de logros...')
      const batch2 = writeBatch(db)
      for (const a of ACHIEVEMENTS) {
        batch2.set(doc(collection(db, 'achievements'), a.id), {
          ...a,
          createdAt: new Date().toISOString(),
        })
      }
      await batch2.commit()
      addLog(`${ACHIEVEMENTS.length} logros creados.`)

      // 5. App config
      addLog('Escribiendo configuración del box...')
      await setDoc(doc(db, 'app_config', 'main'), APP_CONFIG)
      addLog('App config guardada.')

      addLog('Setup completo. Redirigiendo al panel admin...')
      setStatus('done')
      setTimeout(() => navigate('/admin'), 2500)
    } catch (err) {
      addLog(`ERROR: ${err.message}`)
      setStatus('error')
    }
  }

  return (
    <div className="relative min-h-screen bg-salvaje-dark flex items-center justify-center p-6">
      <div className="bg-salvaje-brown rounded-2xl p-8 max-w-lg w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-display text-5xl text-salvaje-light tracking-wider">SALVAJE</h1>
          <p className="text-salvaje-light/50 text-xs font-mono uppercase tracking-widest">
            Bootstrap — Setup Inicial
          </p>
        </div>

        {status === 'idle' && (
          <div className="space-y-4">
            <p className="text-salvaje-light/70 text-sm text-center">
              Esto creará el Super Admin y sembrará todos los datos de catálogo necesarios.
            </p>
            <Button variant="primary" size="lg" className="w-full" onClick={run}>
              Inicializar SALVAJE
            </Button>
          </div>
        )}

        {(status === 'loading' || status === 'done' || status === 'error') && (
          <div className="bg-salvaje-dark/50 rounded-xl p-4 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
            {log.map((line, i) => (
              <p
                key={i}
                className={
                  line.startsWith('ERROR')
                    ? 'text-salvaje-danger'
                    : line.includes('completo') || line.includes('creado') || line.includes('creadas') || line.includes('guardada')
                    ? 'text-salvaje-success'
                    : 'text-salvaje-light/70'
                }
              >
                {line.startsWith('ERROR') ? line : `> ${line}`}
              </p>
            ))}
            {status === 'loading' && (
              <p className="text-salvaje-orange animate-pulse">{'> procesando...'}</p>
            )}
          </div>
        )}

        {status === 'error' && (
          <Button variant="secondary" className="w-full" onClick={run}>
            Reintentar
          </Button>
        )}
      </div>
      <Footer className="absolute bottom-0 left-0 right-0" />
    </div>
  )
}
