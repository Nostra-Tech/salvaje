/**
 * V6 Ajuste 19 — Global app settings managed by SuperAdmin.
 *
 * Single doc at `config/appSettings`. Default-merged so missing fields
 * never crash the UI.
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export const APP_SETTINGS_DEFAULT = {
  referral: {
    percentPerReferral: 10,
    maxDiscountPercent: 30,
    fixedPriceMonthlyCOP: 120000,
    discountValidityDays: 60,
  },
  tiquetera: {
    ticketsIncluded: 12,
    expiryDays: 60,
  },
  courtesy: {
    validDays: 30,
  },
  payroll: {
    cutDays: [15, 'last'],
    retroactiveDays: 7,
  },
  sub21: {
    maxAge: 21,
  },
  achievements: {
    thresholds: { warrior_10: 10, full_month: 20, legend: 50, alpha: 100, savage_streak: 7, immortal: 30 },
  },
  notifications: {
    sendNoShow: true,
    sendCourtesySurvey: true,
    sendPayrollReminders: true,
  },
}

export async function getAppSettings() {
  try {
    const snap = await getDoc(doc(db, 'config', 'appSettings'))
    if (snap.exists()) return mergeDeep(APP_SETTINGS_DEFAULT, snap.data())
  } catch (e) { console.warn('getAppSettings failed:', e) }
  return APP_SETTINGS_DEFAULT
}

export async function saveAppSettings(patch, adminUid) {
  await setDoc(doc(db, 'config', 'appSettings'), {
    ...patch,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
  }, { merge: true })
}

function mergeDeep(base, overlay) {
  const out = { ...base }
  for (const k of Object.keys(overlay || {})) {
    if (overlay[k] && typeof overlay[k] === 'object' && !Array.isArray(overlay[k])) {
      out[k] = mergeDeep(base[k] || {}, overlay[k])
    } else {
      out[k] = overlay[k]
    }
  }
  return out
}
