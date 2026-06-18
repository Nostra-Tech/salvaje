import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../services/firebase'

/**
 * V6 Ajuste 26 — Payroll projection.
 *
 * Splits the coach's earnings within a period into:
 *   - confirmedAmount  → from `classes/` with status === 'completed'
 *   - projectedAmount  → from `classes/` with status in ['scheduled','in_progress']
 *
 * Uses `coaches/{uid}.hourlyRate` * class duration (or default 1h) for the
 * monetary value. Clients still call this for rich UI; backend payroll docs
 * remain the source of truth for confirmed pay.
 */
export function usePayrollProjection(coachId, periodStart, periodEnd) {
  const [data, setData] = useState({
    loading: true,
    confirmedClasses: 0,
    confirmedAmount: 0,
    projectedClasses: 0,
    projectedAmount: 0,
    totalClasses: 0,
    totalAmount: 0,
    hourlyRate: 0,
  })

  useEffect(() => {
    if (!coachId || !periodStart || !periodEnd) {
      setData((d) => ({ ...d, loading: false }))
      return
    }
    let cancelled = false

    const load = async () => {
      try {
        const coachSnap = await getDoc(doc(db, 'coaches', coachId))
        const hourlyRate = coachSnap.exists() ? (coachSnap.data().hourlyRate || 0) : 0

        const q = query(
          collection(db, 'classes'),
          where('coachId', '==', coachId),
          where('scheduledDate', '>=', Timestamp.fromDate(periodStart)),
          where('scheduledDate', '<=', Timestamp.fromDate(periodEnd))
        )
        const snap = await getDocs(q)
        let confirmedClasses = 0, confirmedAmount = 0, projectedClasses = 0, projectedAmount = 0
        snap.forEach((d) => {
          const c = d.data()
          const duration = (c.durationMinutes || 60) / 60
          const earn = duration * hourlyRate
          if (c.status === 'completed') {
            confirmedClasses++
            confirmedAmount += earn
          } else if (c.status === 'scheduled' || c.status === 'in_progress') {
            projectedClasses++
            projectedAmount += earn
          }
        })

        if (!cancelled) {
          setData({
            loading: false,
            confirmedClasses,
            confirmedAmount,
            projectedClasses,
            projectedAmount,
            totalClasses: confirmedClasses + projectedClasses,
            totalAmount: confirmedAmount + projectedAmount,
            hourlyRate,
          })
        }
      } catch (e) {
        console.warn('usePayrollProjection failed:', e)
        if (!cancelled) setData((d) => ({ ...d, loading: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [coachId, periodStart?.getTime?.(), periodEnd?.getTime?.()])

  return data
}
