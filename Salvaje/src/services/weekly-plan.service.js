import {
  collection, getDocs, getDoc, addDoc, updateDoc, doc, query,
  where, orderBy, serverTimestamp, Timestamp, writeBatch, setDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { PLAN_STATUS, CLASS_STATUS } from '../utils/constants'
import { addDays } from 'date-fns'

/**
 * Build a Date object combining a calendar date + 'HH:mm' string.
 */
function combineDateTime(date, hhmm) {
  const [h, m] = (hhmm || '00:00').split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d
}

/**
 * Sanitize a class snapshot to be safe for Firestore (no undefined, normalized exercises).
 */
function sanitizeClass(cls) {
  const exercises = Array.isArray(cls.exercises)
    ? cls.exercises.map((e) => (e || '').toString().trim()).filter(Boolean)
    : []
  // V6 Ajuste 2 — keep structured circuit data when present.
  let circuit = null
  if (cls.circuit && typeof cls.circuit === 'object' && Array.isArray(cls.circuit.exercises)) {
    const cleanExercises = cls.circuit.exercises
      .map((ex) => ({
        id: ex.id || `ex_${Math.random().toString(36).slice(2, 8)}`,
        order: parseInt(ex.order) || 1,
        name: (ex.name || '').toString().trim(),
        sets: parseInt(ex.sets) || 1,
        reps: ex.reps != null && ex.reps !== '' ? parseInt(ex.reps) : null,
        seconds: ex.seconds != null && ex.seconds !== '' ? parseInt(ex.seconds) : null,
        notes: (ex.notes || '').toString().trim(),
      }))
      .filter((ex) => ex.name)
    if (cleanExercises.length > 0) {
      circuit = {
        name: (cls.circuit.name || 'WOD Principal').toString().trim(),
        rounds: parseInt(cls.circuit.rounds) || 1,
        restBetweenRounds: parseInt(cls.circuit.restBetweenRounds) || 0,
        exercises: cleanExercises,
      }
    }
  }
  return {
    id: cls.id || null,
    name: (cls.name || '').toString().trim(),
    startTime: cls.startTime || '06:00',
    endTime: cls.endTime || '07:00',
    wod: (cls.wod || '').toString().trim(),
    exercises,
    circuit,
    maxCapacity: parseInt(cls.maxCapacity) || 15,
    level: cls.level || 'all',
    status: cls.status || CLASS_STATUS.SCHEDULED,
  }
}

export async function getCoachPlans(coachId) {
  // Sort client-side to avoid requiring a composite index (coachId + createdAt).
  const q = query(collection(db, 'weekly_plans'), where('coachId', '==', coachId))
  const snaps = await getDocs(q)
  const list = snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
  list.sort((a, b) => {
    const ad = a.createdAt?.toMillis?.() || 0
    const bd = b.createdAt?.toMillis?.() || 0
    return bd - ad
  })
  return list
}

export async function getAllPendingPlans() {
  const q = query(
    collection(db, 'weekly_plans'),
    where('status', '==', PLAN_STATUS.PENDING),
    orderBy('createdAt', 'desc')
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getAllPlans() {
  const q = query(collection(db, 'weekly_plans'), orderBy('createdAt', 'desc'))
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createWeeklyPlan(data) {
  const ref = await addDoc(collection(db, 'weekly_plans'), {
    ...data,
    status: data.status || PLAN_STATUS.DRAFT,
    generatedClassIds: data.generatedClassIds || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/**
 * Ensure a plan exists for this coach + week. Creates a draft plan if not.
 * Returns { planId, planSnapshot }.
 *
 * Idempotent — safe to call repeatedly.
 */
export async function ensurePlanForWeek({ coachId, coachName, coachPhotoURL, weekStart }) {
  const weekStartDate = weekStart instanceof Date ? weekStart : weekStart.toDate?.() || new Date(weekStart)
  const ws = new Date(weekStartDate); ws.setHours(0, 0, 0, 0)
  const weekEnd = addDays(ws, 6)

  // Look up existing plan for this coach + week
  const q = query(
    collection(db, 'weekly_plans'),
    where('coachId', '==', coachId),
    where('weekStart', '==', Timestamp.fromDate(ws))
  )
  const snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0]
    return { planId: d.id, plan: { id: d.id, ...d.data() } }
  }

  // Create fresh draft
  const planId = await createWeeklyPlan({
    coachId,
    coachName: coachName || '',
    coachPhotoURL: coachPhotoURL || '',
    weekStart: Timestamp.fromDate(ws),
    weekEnd: Timestamp.fromDate(weekEnd),
    days: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
    status: PLAN_STATUS.DRAFT,
  })
  return { planId, plan: null }
}

/**
 * Publish a class IMMEDIATELY when the coach adds it to the plan.
 * Creates the class doc in `classes/` (visible to admin) and appends to plan.days[dayKey].
 * Notifies admins.
 */
export async function publishClassFromPlan({
  planId, coachId, coachName, coachPhotoURL,
  weekStart, dayIdx, dayKey, cls, isNewPlan = false,
}) {
  const ws = weekStart instanceof Date ? weekStart : weekStart.toDate?.() || new Date(weekStart)
  const dayDate = addDays(ws, dayIdx)

  const clean = sanitizeClass(cls)
  const startDate = combineDateTime(dayDate, clean.startTime)
  const endDate = combineDateTime(dayDate, clean.endTime)

  // Guard: prevent two classes for the same coach at the same day+startTime.
  // Catches concurrent submits and stale UI state that the client-side check
  // in CoachWeeklyPlan can miss.
  const dayStart = new Date(dayDate); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayDate); dayEnd.setHours(23, 59, 59, 999)
  const dupQuery = query(
    collection(db, 'classes'),
    where('coachId', '==', coachId),
    where('scheduledDate', '>=', Timestamp.fromDate(dayStart)),
    where('scheduledDate', '<=', Timestamp.fromDate(dayEnd)),
  )
  const dupSnap = await getDocs(dupQuery)
  const startMs = startDate.getTime()
  const collision = dupSnap.docs.find((d) => {
    const data = d.data()
    if (data.status === CLASS_STATUS.CANCELLED) return false
    const existing = data.scheduledDate?.toDate?.() || new Date(data.scheduledDate)
    return existing.getTime() === startMs
  })
  if (collision) {
    throw new Error(`Ya tienes una clase a las ${clean.startTime} ese día`)
  }

  // 1) Create the class doc
  const classRef = doc(collection(db, 'classes'))
  const classDoc = {
    id: classRef.id,
    name: clean.name,
    description: '',
    scheduledDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    durationMinutes: Math.max(1, Math.round((endDate - startDate) / 60000)),
    coachId,
    coachName: coachName || '',
    coachPhotoURL: coachPhotoURL || '',
    maxCapacity: clean.maxCapacity,
    currentBookings: 0,
    level: clean.level,
    wod: clean.wod,
    exercises: clean.exercises,
    circuit: clean.circuit,
    attendeeList: [],
    attendedCount: 0,
    status: CLASS_STATUS.SCHEDULED,
    cancellationReason: '',
    weeklyPlanId: planId,
    payrollPeriod: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: coachId,
    createdByRole: 'coach',
  }
  await setDoc(classRef, classDoc)

  // 2) Append to plan.days[dayKey] with the class id snapshot
  const planSnap = await getDoc(doc(db, 'weekly_plans', planId))
  const planData = planSnap.exists() ? planSnap.data() : { days: {} }
  const days = { ...(planData.days || {}) }
  const arr = Array.isArray(days[dayKey]) ? [...days[dayKey]] : []
  arr.push({ ...clean, id: classRef.id })
  days[dayKey] = arr
  const generatedClassIds = Array.isArray(planData.generatedClassIds) ? [...planData.generatedClassIds, classRef.id] : [classRef.id]
  await updateDoc(doc(db, 'weekly_plans', planId), {
    days,
    generatedClassIds,
    updatedAt: serverTimestamp(),
  })

  // 3) Notify admins (best effort, never blocks)
  try {
    const { notifyAllAdmins } = await import('./admin-notifications.service')
    await notifyAllAdmins({
      type: isNewPlan ? 'plan_started' : 'plan_class_added',
      title: `${coachName || 'Coach'} ${isNewPlan ? 'inició su plan' : 'agregó una clase'}`,
      body: `${clean.name} · ${dayDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })} ${clean.startTime}`,
      senderId: coachId,
      senderName: coachName || '',
      senderRole: 'coach',
      senderPhotoURL: coachPhotoURL || null,
      relatedId: classRef.id,
      relatedCollection: 'classes',
      actionType: 'view',
      actionUrl: '/admin/classes',
    })
  } catch (e) { console.warn('notifyAllAdmins failed:', e) }

  return { classId: classRef.id, classDoc }
}

/**
 * Remove a class from a plan. If the class doc exists in `classes/`, soft-cancel it
 * (status='cancelled') so we don't violate the no-delete rule for coaches.
 * If the class never made it to `classes/` (legacy data), just drop from plan.days[].
 */
export async function removeClassFromPlan({ planId, classId, dayKey, dayIdx, coachId, coachName }) {
  // 1) Soft cancel the class doc if it exists
  if (classId) {
    try {
      const classRef = doc(db, 'classes', classId)
      const snap = await getDoc(classRef)
      if (snap.exists() && snap.data().status !== CLASS_STATUS.COMPLETED) {
        await updateDoc(classRef, {
          status: CLASS_STATUS.CANCELLED,
          cancellationReason: 'Removed from weekly plan by coach',
          updatedAt: Timestamp.now(),
        })
      }
    } catch (e) { console.warn('cancel class failed:', e) }
  }

  // 2) Remove from plan.days[dayKey]
  const planSnap = await getDoc(doc(db, 'weekly_plans', planId))
  if (!planSnap.exists()) return
  const planData = planSnap.data()
  const days = { ...(planData.days || {}) }
  const arr = Array.isArray(days[dayKey]) ? days[dayKey] : []
  days[dayKey] = arr.filter((c) => (classId ? c.id !== classId : true))
  const generatedClassIds = Array.isArray(planData.generatedClassIds)
    ? planData.generatedClassIds.filter((id) => id !== classId)
    : []
  await updateDoc(doc(db, 'weekly_plans', planId), {
    days,
    generatedClassIds,
    updatedAt: serverTimestamp(),
  })

  // 3) Notify admins
  try {
    const { notifyAllAdmins } = await import('./admin-notifications.service')
    await notifyAllAdmins({
      type: 'plan_class_removed',
      title: `${coachName || 'Coach'} canceló una clase del plan`,
      body: `Día: ${dayKey}`,
      senderId: coachId,
      senderName: coachName || '',
      senderRole: 'coach',
      relatedId: classId || planId,
      relatedCollection: 'classes',
      actionType: 'view',
      actionUrl: '/admin/classes',
    })
  } catch (e) { console.warn('notify removal failed:', e) }
}

export async function updateWeeklyPlan(planId, data) {
  await updateDoc(doc(db, 'weekly_plans', planId), { ...data, updatedAt: serverTimestamp() })
}

export async function submitForApproval(planId) {
  await updateDoc(doc(db, 'weekly_plans', planId), {
    status: PLAN_STATUS.PENDING,
    updatedAt: serverTimestamp(),
  })
  // Notify all admins with sender info
  try {
    const planSnap = await getDoc(doc(db, 'weekly_plans', planId))
    if (planSnap.exists()) {
      const plan = planSnap.data()
      const totalClasses = Object.values(plan.days || {}).reduce((acc, d) => acc + (d?.length || 0), 0)
      const { notifyAllAdmins } = await import('./admin-notifications.service')
      await notifyAllAdmins({
        type: 'plan_submitted',
        title: `${plan.coachName} envió su plan semanal`,
        body: `${totalClasses} clases para aprobar`,
        senderId: plan.coachId,
        senderName: plan.coachName,
        senderRole: 'coach',
        senderPhotoURL: plan.coachPhotoURL || null,
        relatedId: planId,
        relatedCollection: 'weekly_plans',
        actionType: 'view',
        actionUrl: '/admin/weekly-plans',
      })
    }
  } catch {}
}

/**
 * Approve a weekly plan.
 *
 * Backward-compatible: if `days[][].id` is present (live-published path),
 * the class already exists — we skip creation. Otherwise (legacy plans
 * created before V5), we create the missing class docs in batch.
 */
export async function approvePlan(planId, adminId, planData) {
  const batch = writeBatch(db)
  const classIds = []
  const dayMap = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 }
  const weekStart = planData.weekStart?.toDate ? planData.weekStart.toDate() : new Date(planData.weekStart)

  for (const [day, classes] of Object.entries(planData.days || {})) {
    const dayOffset = dayMap[day] ?? 0
    const classDate = addDays(weekStart, dayOffset)

    for (const cls of (classes || [])) {
      // Live-published class — already in `classes/`, just track its id
      if (cls.id) {
        classIds.push(cls.id)
        continue
      }

      // Legacy: create the doc now
      const [sh, sm] = (cls.startTime || '06:00').split(':').map(Number)
      const [eh, em] = (cls.endTime || '07:00').split(':').map(Number)
      const start = new Date(classDate)
      start.setHours(sh, sm, 0, 0)
      const end = new Date(classDate)
      end.setHours(eh, em, 0, 0)

      const classRef = doc(collection(db, 'classes'))
      classIds.push(classRef.id)
      batch.set(classRef, {
        id: classRef.id,
        name: cls.name,
        description: cls.description || '',
        scheduledDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        durationMinutes: cls.durationMinutes || Math.max(1, Math.round((end - start) / 60000)),
        coachId: planData.coachId,
        coachName: planData.coachName,
        coachPhotoURL: planData.coachPhotoURL || '',
        maxCapacity: cls.maxCapacity || 15,
        currentBookings: 0,
        level: cls.level || 'all',
        wod: cls.wod || '',
        exercises: Array.isArray(cls.exercises)
          ? cls.exercises.map((e) => (e || '').toString().trim()).filter(Boolean)
          : [],
        attendeeList: [],
        attendedCount: 0,
        status: CLASS_STATUS.SCHEDULED,
        cancellationReason: '',
        weeklyPlanId: planId,
        payrollPeriod: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: adminId,
        createdByRole: 'admin',
      })
    }
  }

  batch.update(doc(db, 'weekly_plans', planId), {
    status: PLAN_STATUS.APPROVED,
    approvedBy: adminId,
    approvedAt: serverTimestamp(),
    generatedClassIds: classIds,
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
  return classIds
}

export async function rejectPlan(planId, reason) {
  await updateDoc(doc(db, 'weekly_plans', planId), {
    status: PLAN_STATUS.REJECTED,
    rejectionReason: reason,
    updatedAt: serverTimestamp(),
  })
}
