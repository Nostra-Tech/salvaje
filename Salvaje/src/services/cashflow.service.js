import {
  collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export const CASHFLOW_CATEGORIES = [
  { value: 'rent',          label: 'Arriendo' },
  { value: 'equipment',     label: 'Equipo' },
  { value: 'utilities',     label: 'Servicios públicos' },
  { value: 'marketing',     label: 'Marketing' },
  { value: 'maintenance',   label: 'Mantenimiento' },
  { value: 'supplies',      label: 'Insumos' },
  { value: 'salary',        label: 'Salario admin' },
  { value: 'coach_payroll', label: 'Nómina coaches' },
  { value: 'other',         label: 'Otro' },
]

function monthRange(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return { start: new Date(y, m - 1, 1, 0, 0, 0), end: new Date(y, m, 1, 0, 0, 0) }
}

function toJSDate(t) {
  if (!t) return null
  if (t.toDate) return t.toDate()
  return new Date(t)
}

function monthKeyFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

let _allCache = null
let _allCacheTs = 0
const CACHE_TTL_MS = 60 * 1000 // 1 min

/**
 * Single-batch fetch of ALL data needed for cashflow (entries + purchases + payroll).
 * Cached for 1 min to avoid hammering Firestore.
 */
async function fetchAllData(force = false) {
  if (!force && _allCache && (Date.now() - _allCacheTs < CACHE_TTL_MS)) {
    return _allCache
  }
  const [entriesSnap, purchasesSnap, payrollSnap] = await Promise.all([
    getDocs(collection(db, 'cashflow_entries')),
    getDocs(query(collection(db, 'membership_purchases'), where('paymentStatus', '==', 'confirmed'))),
    getDocs(query(collection(db, 'payroll'), where('status', '==', 'paid'))),
  ])
  _allCache = {
    entries: entriesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    purchases: purchasesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    payroll: payrollSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  }
  _allCacheTs = Date.now()
  return _allCache
}

export function invalidateCashflowCache() {
  _allCache = null
}

/**
 * Bucket data into derived entries for a specific month.
 */
function bucketForMonth(allData, monthKey) {
  const { start, end } = monthRange(monthKey)
  const manualEntries = allData.entries
    .filter((e) => e.period === monthKey)
    .map((e) => ({ ...e, source: 'manual' }))

  const seenRelated = new Set(manualEntries.filter((e) => e.relatedId).map((e) => e.relatedId))

  const derivedIncome = []
  for (const p of allData.purchases) {
    const ts = toJSDate(p.confirmedAt) || toJSDate(p.createdAt)
    if (!ts || ts < start || ts >= end) continue
    if (seenRelated.has(p.id)) continue
    const amount = p.amountPaid || p.amount || 0
    if (amount <= 0) continue
    derivedIncome.push({
      id: 'pur_' + p.id,
      source: 'derived',
      type: 'income',
      category: p.membershipType === 'ticketera' ? 'ticketera_payment' : 'membership_payment',
      description: `${p.catalogName || 'Membresía'} — ${p.displayName || p.email || 'Usuario'}`,
      amount,
      date: p.confirmedAt || p.createdAt,
      period: monthKey,
      relatedId: p.id,
      relatedType: 'membership_purchase',
      isAutomatic: true,
    })
  }

  const derivedExpense = []
  for (const pay of allData.payroll) {
    const ts = toJSDate(pay.paidAt) || toJSDate(pay.updatedAt)
    if (!ts || ts < start || ts >= end) continue
    if (seenRelated.has(pay.id)) continue
    const amount = pay.totalEarned || 0
    if (amount <= 0) continue
    derivedExpense.push({
      id: 'pay_' + pay.id,
      source: 'derived',
      type: 'expense',
      category: 'coach_payroll',
      description: `Nómina ${pay.coachName} — ${pay.period}`,
      amount,
      date: pay.paidAt,
      period: monthKey,
      relatedId: pay.id,
      relatedType: 'payroll',
      isAutomatic: true,
    })
  }

  const all = [...manualEntries, ...derivedIncome, ...derivedExpense]
  all.sort((a, b) => (toJSDate(b.date)?.getTime() || 0) - (toJSDate(a.date)?.getTime() || 0))

  let income = 0, expense = 0
  for (const e of all) {
    if (e.type === 'income') income += e.amount || 0
    else if (e.type === 'expense') expense += e.amount || 0
  }
  return { entries: all, income, expense, profit: income - expense }
}

export async function fetchCashflowMonthSummary(monthKey) {
  const all = await fetchAllData()
  return bucketForMonth(all, monthKey)
}

/**
 * Computes income/expense/profit for an arbitrary date range.
 * Uses the same cached allData batch — no extra Firestore calls.
 */
export async function fetchCashflowRangeSummary(start, end) {
  const all = await fetchAllData()

  // Manual entries that fall within the range
  const manualEntries = all.entries.filter((e) => {
    const d = toJSDate(e.date)
    return d && d >= start && d <= end
  })

  // relatedIds already covered by manual entries (avoid double-counting)
  const seenRelated = new Set(
    manualEntries.filter((e) => e.relatedId).map((e) => e.relatedId)
  )

  let income = 0
  let expense = 0

  for (const e of manualEntries) {
    if (e.type === 'income')  income  += e.amount || 0
    if (e.type === 'expense') expense += e.amount || 0
  }

  // Derived income from confirmed membership purchases
  for (const p of all.purchases) {
    if (seenRelated.has(p.id)) continue
    const ts = toJSDate(p.confirmedAt) || toJSDate(p.createdAt)
    if (!ts || ts < start || ts > end) continue
    const amount = p.amountPaid || p.amount || 0
    if (amount > 0) income += amount
  }

  // Derived expense from paid payroll
  for (const pay of all.payroll) {
    if (seenRelated.has(pay.id)) continue
    const ts = toJSDate(pay.paidAt) || toJSDate(pay.updatedAt)
    if (!ts || ts < start || ts > end) continue
    const amount = pay.totalEarned || 0
    if (amount > 0) expense += amount
  }

  return { income, expense, profit: income - expense }
}

/**
 * Fetch last 6 months in ONE pass (single fetch, bucket client-side).
 */
export async function fetchLastSixMonths() {
  const all = await fetchAllData()
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = monthKeyFromDate(d)
    const summary = bucketForMonth(all, key)
    months.push({
      key,
      label: d.toLocaleDateString('es-CO', { month: 'short' }),
      income: summary.income,
      expense: summary.expense,
      profit: summary.profit,
      isCurrent: i === 0,
    })
  }
  return months
}

export async function addManualExpense({ category, description, amount, date, adminUid }) {
  const d = date || new Date()
  const period = monthKeyFromDate(d)
  await addDoc(collection(db, 'cashflow_entries'), {
    type: 'expense', category, description: description.trim(), amount: parseInt(amount),
    date: Timestamp.fromDate(d), period,
    relatedId: null, relatedType: 'manual',
    createdBy: adminUid,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    isAutomatic: false,
  })
  invalidateCashflowCache()
}

export async function addManualIncome({ description, amount, date, adminUid }) {
  const d = date || new Date()
  const period = monthKeyFromDate(d)
  await addDoc(collection(db, 'cashflow_entries'), {
    type: 'income', category: 'other', description: description.trim(), amount: parseInt(amount),
    date: Timestamp.fromDate(d), period,
    relatedId: null, relatedType: 'manual',
    createdBy: adminUid,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    isAutomatic: false,
  })
  invalidateCashflowCache()
}

export async function deleteEntry(entryId) {
  if (entryId.startsWith('pur_') || entryId.startsWith('pay_')) {
    throw new Error('No puedes eliminar movimientos derivados de pagos/nómina.')
  }
  await deleteDoc(doc(db, 'cashflow_entries', entryId))
  invalidateCashflowCache()
}

export async function logIncomeFromPayment({ purchaseId, amount, description, adminUid }) {
  const now = new Date()
  await addDoc(collection(db, 'cashflow_entries'), {
    type: 'income', category: 'membership_payment', description, amount,
    date: serverTimestamp(), period: monthKeyFromDate(now),
    relatedId: purchaseId, relatedType: 'membership_purchase',
    createdBy: adminUid,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    isAutomatic: true,
  })
  invalidateCashflowCache()
}

export async function logExpenseFromPayroll({ payrollId, amount, description, adminUid }) {
  const now = new Date()
  await addDoc(collection(db, 'cashflow_entries'), {
    type: 'expense', category: 'coach_payroll', description, amount,
    date: serverTimestamp(), period: monthKeyFromDate(now),
    relatedId: payrollId, relatedType: 'payroll',
    createdBy: adminUid,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    isAutomatic: true,
  })
  invalidateCashflowCache()
}
