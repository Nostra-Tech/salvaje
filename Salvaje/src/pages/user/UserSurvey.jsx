import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, MapPin, Dumbbell, Users, Award, MessageSquare, ArrowLeft, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  doc, getDoc, addDoc, collection, query, where, getDocs, limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'

const QUESTIONS = [
  { key: 'place', label: 'El lugar (espacio, ambiente, limpieza)', icon: MapPin },
  { key: 'activities', label: 'Las actividades de la clase', icon: Dumbbell },
  { key: 'coach', label: 'El coach', icon: Award },
  { key: 'tribe', label: 'La energía de la tribu', icon: Users },
]

function StarRow({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1 hover:scale-110 transition-transform"
          aria-label={`${n} estrellas`}
        >
          <Star
            size={26}
            className={n <= value ? 'fill-salvaje-orange text-salvaje-orange' : 'text-salvaje-cream'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  )
}

export function UserSurvey() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [cls, setCls] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [ratings, setRatings] = useState({ place: 0, activities: 0, coach: 0, tribe: 0 })
  const [recommend, setRecommend] = useState(0) // 0–10 NPS-style
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!user?.uid || !classId) return
    let cancelled = false
    const load = async () => {
      try {
        // Load class info
        const cs = await getDoc(doc(db, 'classes', classId))
        if (!cancelled && cs.exists()) setCls({ id: cs.id, ...cs.data() })

        // Check if user already submitted feedback for this class
        const q = query(
          collection(db, 'feedback'),
          where('userId', '==', user.uid),
          where('classId', '==', classId),
          limit(1)
        )
        const snap = await getDocs(q)
        if (!cancelled && !snap.empty) setAlreadySubmitted(true)
      } catch (e) {
        console.warn('UserSurvey load failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.uid, classId])

  const setRating = (key, value) => setRatings((r) => ({ ...r, [key]: value }))

  const allAnswered = QUESTIONS.every((q) => ratings[q.key] > 0)

  const handleSubmit = async () => {
    if (!allAnswered) {
      toast.error('Califica todos los aspectos antes de enviar')
      return
    }
    setSubmitting(true)
    try {
      const avg = QUESTIONS.reduce((acc, q) => acc + (ratings[q.key] || 0), 0) / QUESTIONS.length
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userName: profile?.displayName || user.email || 'Salvaje',
        userPhotoURL: profile?.profilePhotoURL || '',
        classId,
        className: cls?.name || '',
        coachId: cls?.coachId || null,
        coachName: cls?.coachName || '',
        type: 'first_class',
        ratings,
        averageRating: Math.round(avg * 10) / 10,
        recommend: recommend || null,
        comments: (comments || '').trim(),
        createdAt: serverTimestamp(),
      })
      setDone(true)
      toast.success('¡Gracias! Tu opinión nos hace mejores.')
    } catch (e) {
      console.error('submit feedback failed:', e)
      toast.error('No pudimos enviar tu opinión: ' + (e?.message || 'error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppShell title="Tu opinión">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-3">
          {[1,2,3,4].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
        </div>
      </AppShell>
    )
  }

  if (alreadySubmitted || done) {
    return (
      <AppShell title="Tu opinión">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-6 text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-full bg-salvaje-success/15 flex items-center justify-center mx-auto"
          >
            <CheckCircle2 size={48} className="text-salvaje-success" />
          </motion.div>
          <h1 className="font-display text-3xl uppercase text-salvaje-dark">¡Gracias salvaje!</h1>
          <p className="font-body text-sm text-salvaje-gray max-w-xs mx-auto">
            {done
              ? 'Tu opinión llegó al box. Esto nos ayuda a entrenarte mejor.'
              : 'Ya nos compartiste tu opinión sobre esta clase. Gracias.'}
          </p>
          <Button onClick={() => navigate('/app')}>Volver al inicio</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Tu opinión">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs font-body text-salvaje-gray hover:text-salvaje-dark">
          <ArrowLeft size={14} /> Volver
        </button>

        {/* Hero */}
        <div className="bg-gradient-to-br from-salvaje-orange to-salvaje-fire rounded-salvaje p-5 text-white shadow-salvaje-md">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/80">Cuéntanos</p>
          <h1 className="font-display text-3xl uppercase leading-none mt-1 mb-2">¿Cómo estuvo tu primera batalla?</h1>
          <p className="font-body text-sm text-white/90">
            Tu opinión nos hace mejores. 30 segundos · directo, sin rodeos.
            {cls?.name && <> Acabas de salir de <span className="font-semibold">"{cls.name}"</span>{cls.coachName ? <> con <span className="font-semibold">{cls.coachName}</span></> : null}.</>}
          </p>
        </div>

        {/* Star rating questions */}
        <Card>
          <CardBody className="py-4 space-y-4">
            <h2 className="font-display text-base uppercase text-salvaje-dark">Calificá los aspectos</h2>
            {QUESTIONS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-salvaje-orange" />
                  <p className="font-body text-sm text-salvaje-dark">{label}</p>
                </div>
                <StarRow value={ratings[key]} onChange={(v) => setRating(key, v)} />
              </div>
            ))}
          </CardBody>
        </Card>

        {/* NPS */}
        <Card>
          <CardBody className="py-4 space-y-2">
            <p className="font-body text-sm text-salvaje-dark">
              ¿Recomendarías SALVAJE a otro salvaje? <span className="text-salvaje-gray text-xs">(0–10)</span>
            </p>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRecommend(i)}
                  className={`py-1.5 rounded-md font-mono text-xs transition-all ${
                    recommend === i
                      ? 'bg-salvaje-orange text-white'
                      : 'bg-salvaje-light text-salvaje-gray hover:bg-salvaje-cream'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-mono text-salvaje-gray uppercase tracking-widest">
              <span>Para nada</span>
              <span>Sin duda</span>
            </div>
          </CardBody>
        </Card>

        {/* Comments */}
        <Card>
          <CardBody className="py-4 space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-salvaje-orange" />
              <p className="font-body text-sm text-salvaje-dark">Comentarios (opcional)</p>
            </div>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="¿Qué fue lo mejor? ¿Qué mejorarías?"
              rows={4}
              maxLength={500}
            />
            <p className="text-[10px] font-mono text-salvaje-gray text-right">{comments.length}/500</p>
          </CardBody>
        </Card>

        <Button
          size="lg"
          className="w-full"
          loading={submitting}
          disabled={!allAnswered}
          onClick={handleSubmit}
        >
          Enviar mi opinión
        </Button>

        <p className="text-center text-xs font-body text-salvaje-gray">
          Tu opinión va directo al admin del box. La tribu te lee.
        </p>
      </div>
    </AppShell>
  )
}
