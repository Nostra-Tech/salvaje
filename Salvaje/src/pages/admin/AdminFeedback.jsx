import { useEffect, useMemo, useState } from 'react'
import { Star, MessageSquare, Award, MapPin, Dumbbell, Users, TrendingUp, Calendar } from 'lucide-react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { formatShortDate } from '../../utils/formatters'

const QUESTION_LABELS = {
  place:      { label: 'Lugar', icon: MapPin },
  activities: { label: 'Actividades', icon: Dumbbell },
  coach:      { label: 'Coach', icon: Award },
  tribe:      { label: 'Tribu', icon: Users },
}

function avg(arr) {
  if (!arr.length) return 0
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
}

function StarBar({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= Math.round(value) ? 'fill-salvaje-orange text-salvaje-orange' : 'text-salvaje-cream'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  )
}

export function AdminFeedback() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'))
        const snap = await getDocs(q)
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (e) { console.error('feedback fetch failed:', e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const stats = useMemo(() => {
    // V6 Ajuste 15 — distribution by star rating + evolution per week.
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    items.forEach((i) => {
      const r = Math.round(i.averageRating || i.ratings?.coach || 0)
      if (r >= 1 && r <= 5) distribution[r]++
    })

    // Group by ISO week
    const byWeek = {}
    items.forEach((i) => {
      const d = i.createdAt?.toDate?.()
      if (!d) return
      const wk = `${d.getFullYear()}-W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const r = i.averageRating || i.ratings?.coach || 0
      if (!byWeek[wk]) byWeek[wk] = { wk, ratings: [], count: 0 }
      byWeek[wk].ratings.push(r)
      byWeek[wk].count++
    })
    const evolution = Object.values(byWeek)
      .map((w) => ({ wk: w.wk, avg: avg(w.ratings), count: w.count }))
      .sort((a, b) => a.wk.localeCompare(b.wk))
      .slice(-8)

    const result = {
      count: items.length,
      avgOverall: avg(items.map((i) => i.averageRating || 0)),
      avgRecommend: avg(items.map((i) => i.recommend).filter((v) => v != null)),
      perKey: {
        place:      avg(items.map((i) => i.ratings?.place || 0).filter(Boolean)),
        activities: avg(items.map((i) => i.ratings?.activities || 0).filter(Boolean)),
        coach:      avg(items.map((i) => i.ratings?.coach || 0).filter(Boolean)),
        tribe:      avg(items.map((i) => i.ratings?.tribe || 0).filter(Boolean)),
      },
      distribution,
      evolution,
      perCoach: {},
    }
    for (const f of items) {
      if (!f.coachName) continue
      const key = f.coachId || f.coachName
      if (!result.perCoach[key]) {
        result.perCoach[key] = { name: f.coachName, ratings: [], count: 0 }
      }
      result.perCoach[key].ratings.push(f.ratings?.coach || f.averageRating || 0)
      result.perCoach[key].count++
    }
    return result
  }, [items])

  const topCoaches = Object.values(stats.perCoach)
    .map((c) => ({ ...c, avg: avg(c.ratings) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)

  return (
    <AdminShell title="Feedback">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <MessageSquare size={28} className="text-salvaje-orange" />
          <div>
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Feedback</h1>
            <p className="font-body text-xs text-salvaje-gray">Encuestas de salvajes que estrenaron su clase de cortesía</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <MessageSquare size={32} className="text-salvaje-cream mx-auto mb-2" />
              <p className="font-display text-lg uppercase text-salvaje-dark">Aún sin opiniones</p>
              <p className="font-body text-sm text-salvaje-gray mt-1">Cuando un salvaje use su cortesía y conteste la encuesta, aparece aquí.</p>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-salvaje-brown to-salvaje-dark text-white rounded-salvaje p-4 shadow-salvaje-md">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">Respuestas</p>
                <p className="font-display text-3xl mt-0.5">{stats.count}</p>
              </div>
              <div className="bg-white rounded-salvaje p-4 shadow-salvaje">
                <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">Calificación promedio</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="font-display text-3xl text-salvaje-orange">{stats.avgOverall}</p>
                  <span className="text-xs text-salvaje-gray">/5</span>
                </div>
                <StarBar value={stats.avgOverall} />
              </div>
              <div className="bg-white rounded-salvaje p-4 shadow-salvaje">
                <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">Recomendación</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="font-display text-3xl text-salvaje-orange">{stats.avgRecommend}</p>
                  <span className="text-xs text-salvaje-gray">/10</span>
                </div>
                <p className="font-mono text-[10px] text-salvaje-gray uppercase tracking-widest">NPS-style</p>
              </div>
              <div className="bg-white rounded-salvaje p-4 shadow-salvaje">
                <p className="font-mono text-[10px] uppercase tracking-widest text-salvaje-gray">Mejor calificación</p>
                {(() => {
                  const top = Object.entries(stats.perKey).sort((a, b) => b[1] - a[1])[0]
                  if (!top) return <p className="font-display text-2xl mt-0.5">—</p>
                  const Q = QUESTION_LABELS[top[0]]
                  return (
                    <>
                      <p className="font-display text-2xl text-salvaje-dark mt-0.5 capitalize">{Q?.label || top[0]}</p>
                      <p className="font-mono text-[10px] text-salvaje-gray">{top[1]} / 5</p>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* V6 Ajuste 15 — Distribution by stars */}
            <Card>
              <CardBody className="py-4">
                <h2 className="font-display text-base uppercase text-salvaje-dark mb-3">Distribución de calificaciones</h2>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = stats.distribution[rating] || 0
                    const pct = stats.count > 0 ? Math.round((count / stats.count) * 100) : 0
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-12 flex-shrink-0">
                          {Array.from({ length: rating }).map((_, i) => (
                            <Star key={i} size={10} className="fill-salvaje-orange text-salvaje-orange" strokeWidth={1.5} />
                          ))}
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-salvaje-light overflow-hidden">
                          <div className="h-full bg-salvaje-orange" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-xs text-salvaje-dark w-16 text-right">{count} ({pct}%)</span>
                      </div>
                    )
                  })}
                </div>
              </CardBody>
            </Card>

            {/* V6 Ajuste 15 — Evolution last 8 weeks */}
            {stats.evolution.length > 0 && (
              <Card>
                <CardBody className="py-4">
                  <h2 className="font-display text-base uppercase text-salvaje-dark mb-3">Evolución (últimas semanas)</h2>
                  <div className="flex items-end gap-2 h-24">
                    {stats.evolution.map((w) => {
                      const h = Math.round(((w.avg || 0) / 5) * 100)
                      return (
                        <div key={w.wk} className="flex-1 flex flex-col items-center gap-1">
                          <p className="font-mono text-[9px] text-salvaje-orange">{w.avg ? w.avg.toFixed(1) : '—'}</p>
                          <div className="w-full bg-salvaje-light rounded-t-md flex items-end" style={{ height: '100%' }}>
                            <div className="w-full bg-gradient-to-t from-salvaje-orange to-salvaje-fire rounded-t-md" style={{ height: `${h}%` }} />
                          </div>
                          <p className="font-mono text-[8px] text-salvaje-gray">{w.count}</p>
                        </div>
                      )
                    })}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Per-aspect breakdown */}
            <Card>
              <CardBody className="py-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-salvaje-orange" />
                  <h2 className="font-display text-base uppercase text-salvaje-dark">Por aspecto</h2>
                </div>
                {Object.entries(stats.perKey).map(([key, val]) => {
                  const Q = QUESTION_LABELS[key]
                  if (!Q) return null
                  const Icon = Q.icon
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <Icon size={14} className="text-salvaje-orange flex-shrink-0" />
                      <p className="font-body text-sm text-salvaje-dark w-28 flex-shrink-0">{Q.label}</p>
                      <div className="flex-1 h-2 rounded-full bg-salvaje-light overflow-hidden">
                        <div className="h-full bg-salvaje-orange rounded-full" style={{ width: `${(val / 5) * 100}%` }} />
                      </div>
                      <span className="font-mono text-xs text-salvaje-dark w-10 text-right">{val}/5</span>
                    </div>
                  )
                })}
              </CardBody>
            </Card>

            {/* Per coach */}
            {topCoaches.length > 0 && (
              <Card>
                <CardBody className="py-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Award size={16} className="text-salvaje-orange" />
                    <h2 className="font-display text-base uppercase text-salvaje-dark">Coaches mejor evaluados</h2>
                  </div>
                  {topCoaches.map((c) => (
                    <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-salvaje-cream/50 last:border-0">
                      <p className="font-body text-sm text-salvaje-dark">{c.name}</p>
                      <div className="flex items-center gap-2">
                        <StarBar value={c.avg} />
                        <span className="font-mono text-xs text-salvaje-gray">({c.count})</span>
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}

            {/* Recent comments */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} className="text-salvaje-orange" />
                <h2 className="font-display text-2xl uppercase text-salvaje-dark">Opiniones recientes</h2>
              </div>
              <div className="space-y-2">
                {items.map((f) => (
                  <Card key={f.id}>
                    <CardBody className="py-3">
                      <div className="flex items-start gap-3">
                        <Avatar src={f.userPhotoURL} name={f.userName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{f.userName}</p>
                            <div className="flex items-center gap-2">
                              <StarBar value={f.averageRating || 0} />
                              <span className="font-mono text-[10px] text-salvaje-gray">{f.averageRating?.toFixed?.(1) || '—'}</span>
                            </div>
                          </div>
                          <p className="font-mono text-[10px] text-salvaje-gray flex items-center gap-1 mt-0.5">
                            <Calendar size={10} />
                            {f.createdAt?.toDate ? formatShortDate(f.createdAt.toDate()) : '—'}
                            {f.className && <> · {f.className}</>}
                            {f.coachName && <> · {f.coachName}</>}
                          </p>
                          {f.comments && (
                            <p className="font-body text-sm text-salvaje-dark mt-2 leading-snug bg-salvaje-light rounded-lg px-3 py-2">
                              "{f.comments}"
                            </p>
                          )}
                          {!f.comments && (
                            <p className="font-body text-xs text-salvaje-gray italic mt-1">Sin comentario adicional</p>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  )
}
