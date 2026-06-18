import { format, startOfWeek, endOfWeek, addDays, isToday, isSameDay, differenceInDays, addMonths, startOfDay, endOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Bogota'

export function nowBogota() {
  return toZonedTime(new Date(), TZ)
}

export function toBogota(date) {
  if (!date) return null
  const d = date?.toDate ? date.toDate() : new Date(date)
  return toZonedTime(d, TZ)
}

export function getWeekStart(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function getWeekEnd(date = new Date()) {
  return endOfWeek(date, { weekStartsOn: 1 })
}

export function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function formatWeekLabel(weekStart) {
  const start = format(weekStart, 'd MMM')
  const end = format(addDays(weekStart, 6), 'd MMM yyyy')
  return `${start} – ${end}`
}

export function getDaysUntil(date) {
  if (!date) return null
  const d = date?.toDate ? date.toDate() : new Date(date)
  return differenceInDays(d, new Date())
}

export function isClassToday(scheduledDate) {
  if (!scheduledDate) return false
  const d = scheduledDate?.toDate ? scheduledDate.toDate() : new Date(scheduledDate)
  return isToday(d)
}

export function isSameDate(a, b) {
  const da = a?.toDate ? a.toDate() : new Date(a)
  const db = b?.toDate ? b.toDate() : new Date(b)
  return isSameDay(da, db)
}

export function getMembershipEndDate(startDate, durationDays) {
  const d = startDate?.toDate ? startDate.toDate() : new Date(startDate)
  return addMonths(d, 1)
}

export function getPeriodLabel(date = new Date()) {
  return format(date, 'yyyy-MM')
}

/**
 * Compute age in completed years from a birth date.
 * Accepts a JS Date, Firestore Timestamp, or ISO date string.
 * Returns null if the input can't be parsed.
 */
export function ageFromBirthDate(birth) {
  if (!birth) return null
  const d = birth?.toDate ? birth.toDate() : new Date(birth)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const beforeBirthday =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())
  if (beforeBirthday) age--
  return age
}

/**
 * Filter a list of catalog plans by what the user is eligible to buy / be
 * assigned. Rules:
 *   - `maxAge` is EXCLUSIVE: Sub 21 means strictly under 21. The day the user
 *     turns 21 the plan disappears from their picker (and from any future
 *     renewal). This matches the gym's pricing intent.
 *   - `minAge` is INCLUSIVE: a plan with minAge=18 shows from the user's 18th
 *     birthday onward.
 *   - `requiresColegioMonteluna`: plan only shows for users flagged as having
 *     kids at Colegio Monteluna.
 *
 * If the plan declares any age constraint and we can't read the user's birth
 * date, the plan is hidden — better to hide than to let a 40-year-old buy a
 * Sub 21 plan because their birth date wasn't entered. Same for the Colegio
 * Monteluna flag: missing = hidden.
 *
 * `profile` may be the user profile object, an admin-create form, or any
 * object exposing `dateOfBirth` / `birthDate` / `colegioMonteluna`.
 */
export function filterPlansForUser(plans, profile) {
  if (!Array.isArray(plans)) return []
  const dob = profile?.dateOfBirth || profile?.birthDate || null
  const age = ageFromBirthDate(dob)
  const hasMonteluna = !!profile?.colegioMonteluna
  return plans.filter((p) => {
    if (p.requiresColegioMonteluna && !hasMonteluna) return false
    const hasMax = Number.isFinite(p.maxAge)
    const hasMin = Number.isFinite(p.minAge)
    if (!hasMax && !hasMin) return true
    if (age == null) return false
    if (hasMax && age >= p.maxAge) return false
    if (hasMin && age < p.minAge) return false
    return true
  })
}

export function getPeriodStart(period) {
  const [year, month] = period.split('-')
  return new Date(parseInt(year), parseInt(month) - 1, 1)
}

export function getPeriodEnd(period) {
  const [year, month] = period.split('-')
  return endOfDay(new Date(parseInt(year), parseInt(month), 0))
}
