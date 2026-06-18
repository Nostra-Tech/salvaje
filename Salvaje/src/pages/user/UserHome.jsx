import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Flame, Calendar, ArrowRight, Award, Zap, PartyPopper } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { MembershipCard } from '../../components/membership/MembershipCard'
import { ClassCard } from '../../components/classes/ClassCard'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { getUpcomingClasses } from '../../services/classes.service'
import { SALVAJE_PHRASES, ACHIEVEMENTS } from '../../utils/constants'

export function UserHome() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [todayClasses, setTodayClasses] = useState([])
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUpcomingClasses(1)
      .then((classes) => {
        const today = new Date()
        const todays = classes.filter((c) => {
          const d = c.scheduledDate?.toDate
            ? c.scheduledDate.toDate()
            : new Date(c.scheduledDate)
          return d.toDateString() === today.toDateString()
        })
        setTodayClasses(todays)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const interval = setInterval(
      () => setPhraseIdx((i) => (i + 1) % SALVAJE_PHRASES.length),
      4000
    )
    return () => clearInterval(interval)
  }, [])

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Buenos dias' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile?.displayName?.split(' ')[0] || 'Salvaje'
  const unlockedAchs = (profile?.unlockedAchievements || []).slice(-3)


  return (
    <AppShell title="Inicio">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-5">

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-body text-salvaje-gray text-sm">{greeting},</p>
          <h1 className="font-display text-5xl uppercase text-salvaje-dark leading-none">
            {firstName}
          </h1>
        </motion.div>

        {/* Motivational phrase */}
        <motion.div
          key={phraseIdx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 px-3 py-2 bg-salvaje-orange/10 rounded-xl border border-salvaje-orange/20"
        >
          <Zap size={14} className="text-salvaje-orange flex-shrink-0" />
          <p className="text-xs font-body font-semibold text-salvaje-orange italic">
            {SALVAJE_PHRASES[phraseIdx]}
          </p>
        </motion.div>

        {/* Membership */}
        {profile && (
          <MembershipCard user={profile} onRenew={() => navigate('/app/membership')} />
        )}

        {/* Streak */}
        {(profile?.currentStreak ?? 0) > 0 && (
          <Card>
            <CardBody className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 bg-salvaje-orange/10 rounded-xl flex items-center justify-center">
                <Flame size={24} className="text-salvaje-orange" />
              </div>
              <div>
                <p className="text-xs font-body text-salvaje-gray uppercase tracking-wide">
                  Racha actual
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-3xl text-salvaje-orange">
                    {profile?.currentStreak || 0}
                  </span>
                  <span className="font-body text-sm text-salvaje-gray">
                    dias consecutivos
                  </span>
                </div>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs font-mono text-salvaje-gray">Record</p>
                <p className="font-display text-xl text-salvaje-gold">
                  {profile?.longestStreak || 0}d
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Today's classes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl uppercase text-salvaje-dark">
              Hoy en Salvaje
            </h2>
            <button
              onClick={() => navigate('/app/classes')}
              className="flex items-center gap-1 text-salvaje-orange text-xs font-body font-semibold hover:text-salvaje-fire transition-colors"
            >
              Ver todo <ArrowRight size={12} />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-white rounded-salvaje animate-pulse" />
              ))}
            </div>
          ) : todayClasses.length > 0 ? (
            <div className="space-y-3">
              {todayClasses.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  userId={user?.uid}
                  onClick={() => navigate('/app/classes')}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardBody className="text-center py-8">
                <Calendar size={32} className="text-salvaje-cream mx-auto mb-2" />
                <p className="font-body text-salvaje-gray text-sm">No hay clases hoy</p>
                <Button size="sm" className="mt-3" onClick={() => navigate('/app/classes')}>
                  Ver semana
                </Button>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Achievements */}
        {unlockedAchs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-2xl uppercase text-salvaje-dark">
                Logros Recientes
              </h2>
            </div>
            <div className="flex gap-3">
              {unlockedAchs.map((key) => {
                const ach = ACHIEVEMENTS.find((a) => a.key === key)
                return ach ? (
                  <div
                    key={key}
                    className="flex-1 bg-white rounded-xl shadow-salvaje p-3 text-center"
                  >
                    <Award size={20} className="text-salvaje-gold mx-auto mb-1" />
                    <p className="text-xs font-body font-semibold text-salvaje-dark leading-tight">
                      {ach.name}
                    </p>
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <Button size="lg" className="w-full" onClick={() => navigate('/app/classes')}>
          <Calendar size={18} />
          Explorar Clases
        </Button>
      </div>
    </AppShell>
  )
}
