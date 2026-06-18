/**
 * Analytics service — client-side aggregations from Firestore.
 * No backend / Functions required. All computation in browser.
 */
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from './firebase'

function toJSDate(d) {
  if (!d) return null
  if (d.toDate) return d.toDate()
  return new Date(d)
}

function startOfMonth(d) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x }
function startOfWeek(d) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0,0,0,0); return x }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

// ── USER METRICS ────────────────────────────────────────────────────────────
export async function fetchUserMetrics() {
  const usersSnap = await getDocs(collection(db, 'users'))
  const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const now = new Date()
  const monthStart = startOfMonth(now)
  const weekStart = startOfWeek(now)
  const lastMonthStart = startOfMonth(addDays(monthStart, -1))

  const activeUsers = users.filter((u) => u.membershipIsActive).length
  const blockedUsers = users.filter((u) => u.isBlocked).length
  const totalUsers = users.length

  const newThisMonth = users.filter((u) => {
    const d = toJSDate(u.createdAt)
    return d && d >= monthStart
  }).length
  const newLastMonth = users.filter((u) => {
    const d = toJSDate(u.createdAt)
    return d && d >= lastMonthStart && d < monthStart
  }).length

  // At-risk: active membership but no class in 14 days
  const fourteenDaysAgo = addDays(now, -14)
  const atRisk = users.filter((u) => {
    if (!u.membershipIsActive) return false
    const last = toJSDate(u.lastClassDate)
    return !last || last < fourteenDaysAgo
  })

  // Dormant: expired membership 7-30 days ago
  const sevenDaysAgo = addDays(now, -7)
  const thirtyDaysAgo = addDays(now, -30)
  const dormant = users.filter((u) => {
    const end = toJSDate(u.membershipEndDate)
    return end && end >= thirtyDaysAgo && end <= sevenDaysAgo
  })

  // Expiring soon
  const expiringIn5 = users.filter((u) => {
    const end = toJSDate(u.membershipEndDate)
    if (!end || !u.membershipIsActive) return false
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 5
  })

  // Membership distribution
  const distribution = { monthly: 0, ticketera: 0, free_trial: 0, none: 0 }
  for (const u of users) {
    const t = u.membershipType || 'none'
    distribution[t] = (distribution[t] || 0) + 1
  }

  return {
    totalUsers,
    activeUsers,
    blockedUsers,
    newThisMonth,
    newLastMonth,
    growthRate: newLastMonth ? ((newThisMonth - newLastMonth) / newLastMonth * 100) : (newThisMonth > 0 ? 100 : 0),
    atRisk,
    dormant,
    expiringIn5,
    distribution,
    users,
  }
}

// ── HEATMAP: classes attendance by day-of-week × hour ───────────────────────
export async function fetchAttendanceHeatmap(daysBack = 28) {
  const since = addDays(new Date(), -daysBack)
  const q = query(
    collection(db, 'classes'),
    where('scheduledDate', '>=', Timestamp.fromDate(since)),
    orderBy('scheduledDate', 'asc')
  )
  const snap = await getDocs(q)
  // Grid: 7 days × 24 hours
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
  let totalAttendances = 0
  for (const doc of snap.docs) {
    const d = doc.data()
    const date = toJSDate(d.scheduledDate)
    if (!date) continue
    const day = date.getDay()
    const hour = date.getHours()
    const checkedIn = (d.attendeeList || []).filter((a) => a.checkedIn).length
    grid[day][hour] += checkedIn
    totalAttendances += checkedIn
  }
  // Reorder to start with Monday
  const ordered = [grid[1], grid[2], grid[3], grid[4], grid[5], grid[6], grid[0]]
  return { grid: ordered, totalAttendances }
}

// ── CLASS OCCUPANCY ─────────────────────────────────────────────────────────
export async function fetchClassMetrics(daysBack = 7) {
  const since = addDays(new Date(), -daysBack)
  const q = query(
    collection(db, 'classes'),
    where('scheduledDate', '>=', Timestamp.fromDate(since)),
    orderBy('scheduledDate', 'asc')
  )
  const snap = await getDocs(q)
  const classes = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const total = classes.length
  let totalCapacity = 0, totalBookings = 0, totalCheckedIn = 0
  for (const c of classes) {
    totalCapacity += c.maxCapacity || 0
    totalBookings += c.currentBookings || c.attendeeList?.length || 0
    totalCheckedIn += (c.attendeeList || []).filter((a) => a.checkedIn).length
  }
  const occupancyRate = totalCapacity ? (totalBookings / totalCapacity * 100) : 0
  const showUpRate = totalBookings ? (totalCheckedIn / totalBookings * 100) : 0
  return { total, totalCapacity, totalBookings, totalCheckedIn, occupancyRate, showUpRate, classes }
}

// ── COACH PERFORMANCE ───────────────────────────────────────────────────────
export async function fetchCoachPerformance(daysBack = 30) {
  const since = addDays(new Date(), -daysBack)
  const sincePrev = addDays(since, -daysBack)

  const [coachesSnap, classesSnap] = await Promise.all([
    getDocs(collection(db, 'coaches')),
    getDocs(query(collection(db, 'classes'), where('scheduledDate', '>=', Timestamp.fromDate(sincePrev)))),
  ])
  const coaches = coachesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const allClasses = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  return coaches.map((coach) => {
    const myClasses = allClasses.filter((c) => c.coachId === coach.id)
    const thisPeriod = myClasses.filter((c) => toJSDate(c.scheduledDate) >= since)
    const prevPeriod = myClasses.filter((c) => {
      const d = toJSDate(c.scheduledDate)
      return d >= sincePrev && d < since
    })
    const computeStats = (list) => {
      let attendees = 0, capacity = 0, hours = 0
      const studentIds = new Set()
      for (const c of list) {
        const checkedIn = (c.attendeeList || []).filter((a) => a.checkedIn)
        attendees += checkedIn.length
        capacity += c.maxCapacity || 0
        hours += (c.durationMinutes || 60) / 60
        for (const a of checkedIn) studentIds.add(a.userId)
      }
      const avg = list.length ? attendees / list.length : 0
      const occ = capacity ? (attendees / capacity * 100) : 0
      return { count: list.length, attendees, hours, avgAttendance: avg, occupancyRate: occ, uniqueStudents: studentIds.size }
    }
    const cur = computeStats(thisPeriod)
    const prev = computeStats(prevPeriod)
    const trend = prev.occupancyRate ? cur.occupancyRate - prev.occupancyRate : 0
    return {
      coachId: coach.id,
      name: coach.displayName,
      photoURL: coach.profilePhotoURL,
      hourlyRate: coach.hourlyRate || 0,
      ...cur,
      trend,
    }
  }).filter((c) => c.count > 0).sort((a, b) => b.occupancyRate - a.occupancyRate)
}

// ── REVENUE & FORECAST ──────────────────────────────────────────────────────
export async function fetchRevenue() {
  const purchasesSnap = await getDocs(query(
    collection(db, 'membership_purchases'),
    where('paymentStatus', '==', 'confirmed')
  ))
  const purchases = purchasesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthsAgo = (n) => startOfMonth(new Date(now.getFullYear(), now.getMonth() - n, 1))

  // Revenue per month (last 6 months)
  const months = []
  for (let i = 5; i >= 0; i--) {
    const start = monthsAgo(i)
    const end = i === 0 ? now : monthsAgo(i - 1)
    const sum = purchases
      .filter((p) => {
        const d = toJSDate(p.confirmedAt) || toJSDate(p.createdAt)
        return d && d >= start && d < end
      })
      .reduce((acc, p) => acc + (p.amountPaid || p.amount || 0), 0)
    months.push({
      label: start.toLocaleDateString('es-CO', { month: 'short' }),
      revenue: sum,
      isCurrent: i === 0,
    })
  }

  const currentMonthRevenue = months[months.length - 1].revenue

  // Forecast: active memberships that will expire this month
  const usersSnap = await getDocs(collection(db, 'users'))
  const users = usersSnap.docs.map((d) => d.data())
  const expiringThisMonth = users.filter((u) => {
    const end = toJSDate(u.membershipEndDate)
    if (!end || !u.membershipIsActive) return false
    return end >= now && end <= addDays(monthStart, 35)
  })
  const projectedRenewals = expiringThisMonth.reduce((acc, u) => {
    // Use last paid amount or default monthly price (180000)
    return acc + 180000
  }, 0)

  return {
    months,
    currentMonthRevenue,
    expiringThisMonthCount: expiringThisMonth.length,
    projectedRenewalRevenue: projectedRenewals,
    totalConfirmed: purchases.length,
  }
}

// ── CONVERSION ──────────────────────────────────────────────────────────────
export async function fetchConversion() {
  const purchasesSnap = await getDocs(collection(db, 'membership_purchases'))
  const purchases = purchasesSnap.docs.map((d) => d.data())
  const usersSnap = await getDocs(collection(db, 'users'))
  const users = usersSnap.docs.map((d) => d.data())

  const trialUsers = users.filter((u) => u.hasUsedFreeTrial)
  const paidUsers = users.filter((u) => u.hasUsedFreeTrial && u.membershipType !== 'free_trial' && u.membershipType !== 'none')
  const conversionRate = trialUsers.length ? (paidUsers.length / trialUsers.length * 100) : 0

  return {
    trialCount: trialUsers.length,
    convertedCount: paidUsers.length,
    conversionRate,
  }
}
