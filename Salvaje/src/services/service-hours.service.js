/**
 * V6 — Service hours configuration.
 * Stored at `config/serviceHours` as a single doc.
 *
 * Each day: { active, startHour, endHour, slots: [{start:'HH:MM', end:'HH:MM'}] }
 * slots: fixed class time blocks shown in the coach class-creation picker.
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const WEEKDAY_SLOTS = [
  { start: '05:30', end: '06:30' },
  { start: '06:30', end: '07:30' },
  { start: '08:00', end: '09:00' },
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '12:00', end: '13:00' },
  { start: '17:00', end: '18:00' },
  { start: '18:00', end: '19:00' },
  { start: '19:00', end: '20:00' },
  { start: '20:00', end: '21:00' },
]

const SATURDAY_SLOTS = [
  { start: '07:00', end: '08:00' },
  { start: '08:00', end: '09:00' },
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
]

const DEFAULT_HOURS = {
  monday:    { active: true,  startHour: 5, endHour: 22, slots: WEEKDAY_SLOTS },
  tuesday:   { active: true,  startHour: 5, endHour: 22, slots: WEEKDAY_SLOTS },
  wednesday: { active: true,  startHour: 5, endHour: 22, slots: WEEKDAY_SLOTS },
  thursday:  { active: true,  startHour: 5, endHour: 22, slots: WEEKDAY_SLOTS },
  friday:    { active: true,  startHour: 5, endHour: 22, slots: WEEKDAY_SLOTS },
  saturday:  { active: true,  startHour: 7, endHour: 14, slots: SATURDAY_SLOTS },
  sunday:    { active: false, startHour: 0, endHour: 0,  slots: [] },
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export async function getServiceHours() {
  try {
    const snap = await getDoc(doc(db, 'config', 'serviceHours'))
    if (snap.exists()) {
      const data = snap.data()
      // Deep merge per day so legacy docs without `slots` get the default slots
      const merged = { ...DEFAULT_HOURS }
      for (const day of Object.keys(DEFAULT_HOURS)) {
        if (data[day]) {
          merged[day] = { ...DEFAULT_HOURS[day], ...data[day] }
        }
      }
      return merged
    }
  } catch {}
  return DEFAULT_HOURS
}

export async function saveServiceHours(hours, adminUid) {
  await setDoc(doc(db, 'config', 'serviceHours'), {
    ...hours,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
  }, { merge: true })
}

export function isWithinServiceHours(date, hours = DEFAULT_HOURS) {
  if (!date) return false
  const dayKey = DAY_KEYS[date.getDay()]
  const cfg = hours[dayKey]
  if (!cfg || !cfg.active) return false
  const h = date.getHours()
  return h >= cfg.startHour && h < cfg.endHour
}

export const SERVICE_HOURS_DEFAULT = DEFAULT_HOURS
