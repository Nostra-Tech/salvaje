import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MessageSquare, X, CheckCircle2 } from 'lucide-react'
import {
  collection, query, where, orderBy, limit, onSnapshot,
  doc, updateDoc, serverTimestamp, addDoc,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import toast from 'react-hot-toast'

/**
 * V6 Ajuste 9 — "¿Cómo estuvo tu batalla?" auto-modal.
 *
 * Listens for the user's first pending survey and pops a non-blocking modal
 * (5 stars + optional comment + skip). On submit/skip, marks the survey as
 * answered/skipped and writes a `feedback/{id}` doc when answered.
 */
export function BattleSurveyModal() {
  const { user, role } = useAuth()
  const [pending, setPending] = useState(null)
  const [open, setOpen] = useState(false)
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user?.uid || role !== 'user') return
    const q = query(
      collection(db, 'pendingSurveys'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc'),
      limit(1)
    )
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setPending(null)
        setOpen(false)
        return
      }
      const d = snap.docs[0]
      setPending({ id: d.id, ...d.data() })
      setOpen(true)
      setStars(0)
      setComment('')
    }, (err) => console.warn('BattleSurveyModal listener:', err))
    return unsub
  }, [user?.uid, role])

  const handleSkip = async () => {
    setOpen(false)
    if (pending?.id) {
      try {
        await updateDoc(doc(db, 'pendingSurveys', pending.id), {
          status: 'skipped',
          skippedAt: serverTimestamp(),
        })
      } catch (e) { console.warn('skip survey failed:', e) }
    }
    setPending(null)
  }

  const handleSubmit = async () => {
    if (stars < 1) {
      toast.error('Califica con al menos 1 estrella')
      return
    }
    setSubmitting(true)
    try {
      // Create feedback doc — this is what AdminFeedback reads.
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userName: user.displayName || user.email || 'Salvaje',
        classId: pending.classId,
        className: pending.className,
        coachId: pending.coachId || null,
        coachName: pending.coachName || '',
        type: 'battle_survey',
        ratings: { coach: stars }, // single dimension here, AdminFeedback already supports it
        averageRating: stars,
        recommend: null,
        comments: (comment || '').trim(),
        createdAt: serverTimestamp(),
      })
      // Mark pending as answered.
      await updateDoc(doc(db, 'pendingSurveys', pending.id), {
        status: 'answered',
        answeredAt: serverTimestamp(),
        rating: stars,
        comment: (comment || '').trim(),
      })
      toast.success('¡Gracias salvaje! Tu opinión llega al box.')
      setOpen(false)
      setPending(null)
    } catch (e) {
      console.error('submit battle survey failed:', e)
      toast.error('No pudimos enviar tu evaluación: ' + (e?.message || 'error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!pending) return null

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-salvaje-dark/70 backdrop-blur-sm"
            onClick={handleSkip}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-salvaje-lg overflow-hidden"
          >
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-salvaje-light hover:bg-salvaje-cream text-salvaje-gray transition-colors z-10"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>

            <div className="bg-gradient-to-br from-salvaje-orange to-salvaje-fire text-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/80 mb-1">
                Cuéntanos
              </p>
              <h2 className="font-display text-2xl uppercase leading-tight">
                ¿Cómo estuvo tu batalla?
              </h2>
              {pending.className && (
                <p className="font-body text-sm text-white/90 mt-1">
                  {pending.className}{pending.coachName ? ` · ${pending.coachName}` : ''}
                </p>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Star rating */}
              <div>
                <p className="font-body text-sm text-salvaje-dark mb-2">Tu calificación</p>
                <div className="flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setStars(n)}
                      className="p-1.5 hover:scale-110 transition-transform"
                      aria-label={`${n} estrellas`}
                    >
                      <Star
                        size={32}
                        className={n <= stars ? 'fill-salvaje-orange text-salvaje-orange' : 'text-salvaje-cream'}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="text-xs font-semibold text-salvaje-gray uppercase tracking-wide font-body block mb-1.5 flex items-center gap-1">
                  <MessageSquare size={11} /> ¿Qué fue lo mejor? (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Cuéntanos en una línea..."
                  rows={3}
                  maxLength={300}
                  className="w-full px-3 py-2 rounded-xl border border-salvaje-cream bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" className="flex-1" onClick={handleSkip} disabled={submitting}>
                  Saltar
                </Button>
                <Button className="flex-1" loading={submitting} onClick={handleSubmit}>
                  <CheckCircle2 size={14} /> Enviar
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
