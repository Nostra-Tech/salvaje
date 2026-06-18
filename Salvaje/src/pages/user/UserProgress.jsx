import { useMemo } from 'react'
import { Flame, Award, TrendingUp, Target, Lock } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { useAuth } from '../../hooks/useAuth'
import { ACHIEVEMENTS } from '../../utils/constants'

const weekData = [
  { week: 'Sem 1', clases: 2 },
  { week: 'Sem 2', clases: 4 },
  { week: 'Sem 3', clases: 3 },
  { week: 'Sem 4', clases: 5 },
  { week: 'Sem 5', clases: 2 },
  { week: 'Sem 6', clases: 4 },
  { week: 'Esta', clases: 3 },
]

export function UserProgress() {
  const { profile } = useAuth()
  const unlocked = profile?.unlockedAchievements || []
  const attended = profile?.classesAttended || 0
  const streak = profile?.currentStreak || 0

  const recommendation = useMemo(() => {
    if (streak >= 7)
      return { text: 'Imparable. Top 10% de SALVAJE', level: 'elite' }
    if (attended >= 3)
      return { text: 'Vas bien. Los salvajes van 3+ veces por semana', level: 'good' }
    if (attended >= 1)
      return { text: 'Tu tribu te espera. Reagenda ahora', level: 'warn' }
    return { text: 'La bestia se despierta aqui. Comienza hoy', level: 'start' }
  }, [streak, attended])

  const recColors = {
    elite:
      'bg-salvaje-success/10 text-salvaje-success border-salvaje-success/20',
    good: 'bg-salvaje-orange/10 text-salvaje-orange border-salvaje-orange/20',
    warn: 'bg-salvaje-gold/10 text-salvaje-gold border-salvaje-gold/20',
    start: 'bg-salvaje-gray/10 text-salvaje-gray border-salvaje-gray/20',
  }

  return (
    <AppShell title="Progreso">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-5">
        <h1 className="font-display text-4xl uppercase text-salvaje-dark">Tu Progreso</h1>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody className="py-4">
              <p className="text-xs font-body text-salvaje-gray uppercase tracking-wide">
                Total clases
              </p>
              <p className="font-display text-4xl text-salvaje-orange">{attended}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame size={14} className="text-salvaje-orange" />
                <p className="text-xs font-body text-salvaje-gray uppercase tracking-wide">
                  Racha
                </p>
              </div>
              <p className="font-display text-4xl text-salvaje-orange">{streak}d</p>
            </CardBody>
          </Card>
        </div>

        {/* Recommendation */}
        <div
          className={`px-4 py-3 rounded-xl border ${recColors[recommendation.level]}`}
        >
          <div className="flex items-center gap-2">
            <Target size={16} />
            <p className="text-sm font-body font-semibold">{recommendation.text}</p>
          </div>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-salvaje-orange" />
              <h2 className="font-display text-xl uppercase text-salvaje-dark">
                Clases por Semana
              </h2>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekData} barSize={24}>
                <XAxis
                  dataKey="week"
                  tick={{
                    fontSize: 10,
                    fontFamily: 'DM Sans',
                    fill: '#6B5C52',
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    background: '#1A0F0A',
                    border: 'none',
                    borderRadius: 8,
                    color: '#FAF6F0',
                    fontSize: 12,
                    fontFamily: 'DM Sans',
                  }}
                  formatter={(v) => [`${v} clases`, '']}
                />
                <Bar dataKey="clases" fill="#D4521A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Achievements */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Award size={18} className="text-salvaje-gold" />
            <h2 className="font-display text-2xl uppercase text-salvaje-dark">Logros</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((ach) => {
              const isUnlocked = unlocked.includes(ach.key)
              return (
                <div
                  key={ach.key}
                  className={`bg-white rounded-xl shadow-salvaje p-3 transition-all ${
                    isUnlocked ? '' : 'opacity-40 grayscale'
                  }`}
                >
                  <Award
                    size={20}
                    className={isUnlocked ? 'text-salvaje-gold mb-1' : 'text-salvaje-gray mb-1'}
                  />
                  <p className="font-body text-xs font-semibold text-salvaje-dark leading-tight">
                    {ach.name}
                  </p>
                  <p className="font-body text-[11px] text-salvaje-gray mt-0.5">
                    {ach.description}
                  </p>
                  {!isUnlocked && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Lock size={9} className="text-salvaje-gray" />
                      <span className="font-mono text-[10px] text-salvaje-gray">
                        {ach.requirement}{' '}
                        {ach.type === 'classes_count'
                          ? 'clases'
                          : ach.type === 'streak'
                          ? 'dias'
                          : 'referidos'}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
