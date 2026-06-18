import { useEffect } from 'react'
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../services/firebase'

/**
 * V5 Ajuste 11: payroll cut reminder.
 *
 * Days 15, 30 and 31 are nómina-cut days. When the coach (or admin) opens the
 * app on those days, fire a single in-app notification per user per day.
 * Idempotency: a marker doc `payrollReminders/{uid}_{YYYY}_{MM}_{DD}` is
 * written so it never duplicates.
 *
 * Plan Spark friendly — no scheduler, runs on dashboard mount.
 */
export function usePayrollCutReminder(userId, role) {
  useEffect(() => {
    if (!userId || !role) return
    let cancelled = false

    const run = async () => {
      const today = new Date()
      const day = today.getDate()
      if (day !== 15 && day !== 30 && day !== 31) return

      const month = today.getMonth() + 1
      const year = today.getFullYear()
      const markerId = `${userId}_${year}_${String(month).padStart(2, '0')}_${String(day).padStart(2, '0')}`
      const markerRef = doc(db, 'payrollReminders', markerId)

      try {
        const existing = await getDoc(markerRef)
        if (cancelled || existing.exists()) return

        const periodLabel = day === 15 ? 'primera quincena' : 'segunda quincena'
        const title = role === 'coach' ? 'Hoy es corte de nómina' : 'Corte de nómina hoy'
        const body = role === 'coach'
          ? `Tus clases de la ${periodLabel} se cierran hoy. Revisa que todo esté en orden en /coach/payroll.`
          : `Hoy cierra la ${periodLabel}. Revisa pagos y aprueba nómina en /admin/payroll.`

        await addDoc(collection(db, 'notifications'), {
          recipientId: userId,
          recipientRole: role,
          type: 'payroll_reminder',
          title,
          body,
          relatedCollection: role === 'coach' ? 'payroll' : 'payroll',
          actionType: 'view',
          actionUrl: role === 'coach' ? '/coach/payroll' : '/admin/payroll',
          isRead: false,
          sentAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        })

        await setDoc(markerRef, {
          userId,
          role,
          day,
          month,
          year,
          sentAt: serverTimestamp(),
        })
      } catch (e) {
        console.warn('usePayrollCutReminder failed:', e)
      }
    }

    run()
    return () => { cancelled = true }
  }, [userId, role])
}
