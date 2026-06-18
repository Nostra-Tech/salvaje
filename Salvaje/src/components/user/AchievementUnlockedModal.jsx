import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, Swords, Shield, Calendar, Flame, Users, Trophy, Zap, Crown, Star, X,
} from 'lucide-react'
import {
  collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../hooks/useAuth'
import { ACHIEVEMENTS } from '../../utils/constants'
import { Button } from '../ui/Button'

// Map icon name → Lucide component (corporate SVG, no emojis)
const ICON_MAP = {
  Swords, Shield, Calendar, Flame, Users, Trophy, Zap, Crown, Star, Award,
}

/**
 * V6 Ajuste 1 — Achievement unlock modal.
 *
 * Listens for unread `achievement_unlocked` notifications for the current user
 * and pops a celebratory modal with the achievement details. Marks the
 * notification as read once dismissed.
 */
export function AchievementUnlockedModal() {
  const { user, role } = useAuth()
  const [pending, setPending] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user?.uid || role !== 'user') return
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('type', '==', 'achievement_unlocked'),
      where('isRead', '==', false),
      orderBy('sentAt', 'desc'),
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
    }, (err) => console.warn('AchievementUnlockedModal listener:', err))
    return unsub
  }, [user?.uid, role])

  const achievement = useMemo(() => {
    if (!pending?.relatedId) return null
    return ACHIEVEMENTS.find((a) => a.key === pending.relatedId)
  }, [pending?.relatedId])

  const handleClose = async () => {
    setOpen(false)
    if (pending?.id) {
      try {
        await updateDoc(doc(db, 'notifications', pending.id), {
          isRead: true,
          readAt: serverTimestamp(),
        })
      } catch (e) { console.warn('mark achievement notif read failed:', e) }
    }
    setPending(null)
  }

  if (!achievement) return null
  const Icon = ICON_MAP[achievement.icon] || Award

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-salvaje-dark/80 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 30 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="relative w-full max-w-sm bg-gradient-to-br from-salvaje-orange via-salvaje-fire to-salvaje-dark rounded-salvaje p-6 shadow-salvaje-lg text-white text-center"
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white/90 transition-colors"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>

            {/* Animated icon */}
            <motion.div
              initial={{ scale: 0, rotate: -120 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', damping: 12, stiffness: 200 }}
              className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm ring-4 ring-white/30"
            >
              <Icon size={48} className="text-white" strokeWidth={1.6} />
            </motion.div>

            <p className="font-mono text-[10px] uppercase tracking-widest text-white/80 mb-1">
              ¡Logro desbloqueado!
            </p>
            <h2 className="font-display text-3xl uppercase leading-tight mb-2">
              {achievement.name}
            </h2>
            <p className="font-body text-sm text-white/90 mb-5 leading-snug">
              {achievement.description}
            </p>

            <Button
              variant="secondary"
              size="lg"
              className="w-full bg-white text-salvaje-orange border-white hover:bg-salvaje-light font-display uppercase tracking-wide"
              onClick={handleClose}
            >
              ¡A seguir!
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
