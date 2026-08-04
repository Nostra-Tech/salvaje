import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Rocket, LayoutDashboard, CalendarCheck, Users, Sparkles } from 'lucide-react'
import { AdminShell } from '../../../components/layout/AdminShell'
import {
  subscribeSplashRows, subscribeDays, computeStats, computeSuggestions,
} from '../../../services/splashAdmin.service'
import { TabDashboard } from './TabDashboard'
import { TabPlan } from './TabPlan'
import { TabCrm } from './TabCrm'
import { TabIA } from './TabIA'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'plan', label: 'Plan Diario', icon: CalendarCheck },
  { key: 'crm', label: 'CRM', icon: Users },
  { key: 'ia', label: 'Centro IA', icon: Sparkles },
]

const SEMAFORO = {
  verde: { dot: 'bg-salvaje-success', text: 'text-salvaje-success', label: 'En ritmo' },
  amarillo: { dot: 'bg-salvaje-gold', text: 'text-salvaje-gold', label: 'Atención' },
  rojo: { dot: 'bg-salvaje-danger', text: 'text-salvaje-danger', label: 'Plan de choque' },
}

export function SplashAdmin() {
  const [tab, setTab] = useState('dashboard')
  const [rows, setRows] = useState(null)
  const [daysMap, setDaysMap] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    const u1 = subscribeSplashRows(setRows, (e) => { console.error(e); setError(e?.message) })
    const u2 = subscribeDays(setDaysMap, (e) => { console.error(e); setError(e?.message) })
    return () => { u1(); u2() }
  }, [])

  const stats = useMemo(() => computeStats(rows || [], daysMap), [rows, daysMap])
  const suggestions = useMemo(() => computeSuggestions(stats), [stats])
  const sem = SEMAFORO[stats.semaforo]
  const loading = rows === null

  return (
    <AdminShell title="Splash Admin">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto px-4 pt-4 pb-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Rocket size={28} className="text-salvaje-orange" />
            <div>
              <h1 className="font-display text-4xl uppercase text-salvaje-dark leading-none">Splash Admin</h1>
              <p className="font-body text-xs text-salvaje-gray">Mission Control comercial · meta {stats.meta} entradas · evento 22 de agosto</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-salvaje text-sm font-body font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${sem.dot}`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${sem.dot}`} />
            </span>
            <span className={sem.text}>{sem.label}</span>
            <span className="text-salvaje-gray font-normal">· {stats.vendidas}/{stats.meta} · {stats.daysLeft} días</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-salvaje-danger font-body bg-salvaje-danger/5 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm uppercase tracking-widest transition-colors ${
                  active ? 'bg-salvaje-orange text-white shadow-salvaje' : 'bg-white text-salvaje-gray hover:bg-salvaje-light-alt border border-salvaje-cream'
                }`}
              >
                <Icon size={16} /> {t.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 bg-white rounded-salvaje animate-pulse" />)}</div>
        ) : tab === 'dashboard' ? (
          <TabDashboard stats={stats} suggestions={suggestions} daysMap={daysMap} />
        ) : tab === 'plan' ? (
          <TabPlan stats={stats} suggestions={suggestions} daysMap={daysMap} />
        ) : tab === 'crm' ? (
          <TabCrm rows={rows || []} stats={stats} />
        ) : (
          <TabIA stats={stats} suggestions={suggestions} />
        )}
      </motion.div>
    </AdminShell>
  )
}
