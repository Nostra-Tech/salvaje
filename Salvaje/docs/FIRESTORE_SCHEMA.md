# SALVAJE — Firestore Schema

Snapshot post-V6. Todos los Timestamp son UTC con timezone manejado en cliente.

---

## `users/{uid}`

```ts
{
  uid: string
  email: string
  displayName: string
  phone?: string
  birthDate?: Timestamp        // V5: usado por filtro Sub-21
  dateOfBirth?: Timestamp      // alias legacy
  profilePhotoURL?: string
  role: 'user'
  // Membresía
  membershipType: 'none' | 'monthly' | 'ticketera' | 'free_trial'
  membershipIsActive: boolean
  membershipStartDate?: Timestamp
  membershipEndDate?: Timestamp
  activeMembershipPurchaseId?: string
  // Tiquetera
  ticketeraId?: string
  ticketeraBalance: number
  ticketeraExpDate?: Timestamp  // V5: 60 días desde compra
  // Cortesía
  hasUsedFreeTrial: boolean
  freeTrialUsedAt?: Timestamp
  freeTrialUsedClassId?: string
  freeTrialUsedCoachId?: string
  // Referidos
  referralCode: string          // único, generado al registrarse
  referredBy?: string           // uid del referidor
  referredByCode?: string
  referralPendingFirstPayment?: boolean
  referralsCount: number
  referralDiscountActive: boolean
  referralDiscountPercent: number
  referralDiscountExpiresAt?: Timestamp
  // Stats
  classesAttended: number
  currentStreak: number
  longestStreak: number
  lastClassDate?: Timestamp
  unlockedAchievements: string[] // keys de ACHIEVEMENTS
  // Estado
  isActive: boolean
  isBlocked: boolean
  blockReason?: string
  // V5/V6
  specialPlans?: string[]       // V5: planes especiales habilitados
  // Notificaciones
  enableEmailNotifications: boolean
  enablePushNotifications: boolean
  fcmToken?: string
  // Timestamps
  createdAt, updatedAt, lastLoginAt: Timestamp
}
```

## `admins/{uid}`

```ts
{
  uid, email, displayName, role: 'admin'
  isSuperAdmin?: boolean   // V6: flag para distinguir el rol
  createdAt: Timestamp
}
```

## `coaches/{uid}`

```ts
{
  uid, email, displayName, profilePhotoURL?
  hourlyRate: number
  bio?, specializations?: string[], certifications?: string[]
  availableSchedule?: object
  isActive: boolean
  createdAt, updatedAt: Timestamp
}
```

## `classes/{id}`

```ts
{
  id, name, description?
  scheduledDate: Timestamp
  endDate: Timestamp
  durationMinutes: number
  coachId, coachName, coachPhotoURL
  maxCapacity: number
  currentBookings: number
  level: 'all' | 'beginner' | 'intermediate' | 'advanced'
  wod: string                // texto libre
  exercises: string[]        // V4: lista simple
  circuit?: {                // V6: estructurado
    name: string
    rounds: number
    restBetweenRounds: number
    exercises: { id, order, name, sets, reps?, seconds?, notes? }[]
  }
  attendeeList: {
    userId, userName, userPhotoURL?
    reservedAt?, checkedIn, checkedInAt?
    qrScanned?, manualEntry?, walkIn?, lateRegistration?
    consumedFromMembership?, ticketeraConsumed?, paidWithFreeTrial?
    debt?
  }[]
  attendedCount: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  cancellationReason?: string
  weeklyPlanId?: string
  payrollPeriod?: string
  // Lifecycle markers
  actualStartTime?, actualEndTime?, completedAt?: Timestamp
  autoFinalized?: boolean
  autoFinalizedReason?: string
  noShowNotificationsSent?: boolean
  noShowCount?: number
  courtesyConsumedAt?: Timestamp
  courtesyConsumedCount?: number
  surveysCreatedAt?: Timestamp     // V6: pending surveys creadas
  surveysCreatedCount?: number
  createdAt, updatedAt: Timestamp
  createdBy, createdByRole: string
}
```

## `weekly_plans/{id}`

```ts
{
  coachId, coachName, coachPhotoURL?
  weekStart, weekEnd: Timestamp
  days: { monday: ClassSnap[], tuesday: ..., sunday: ClassSnap[] }
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  generatedClassIds: string[]
  approvedBy?, approvedAt?: ...
  rejectionReason?: string
  createdAt, updatedAt: Timestamp
}
```

## `membership_purchases/{id}`

```ts
{
  userId, userName, userEmail, userPhotoURL?
  catalogId, catalogName, membershipType
  amount, amountPaid, originalAmount: number
  discountApplied: number
  discountReason?: 'new_user_referral' | 'referrer_reward'
  referralCodeUsed?: string
  referredByUserId?: string
  promoCodeUsed?: string         // V5: discountCodes
  promoSavings?: number
  paymentMethod: string
  paymentStatus: 'pending' | 'confirmed' | 'rejected'
  paymentReceiptURL?: string
  paymentNotes?: string
  rejectionReason?: string
  rejectedBy?: string, rejectedAt?: Timestamp
  confirmedBy?: string, confirmedAt?: Timestamp
  requestedStartDate?: Timestamp  // V6: renovación anticipada
  startDate?: Timestamp, endDate?: Timestamp
  classesTotal?: number           // ticketera
  // Re-validación
  lastRevalidationRequestAt?: Timestamp
  revalidationRequestCount?: number
  createdAt: Timestamp
}
```

## `payroll/{id}`

```ts
{
  coachId, coachName
  period: string                    // ej "2025-05-Q1"
  startDate, endDate: Timestamp
  classesGiven: number
  hoursWorked: number
  totalEarned: number
  hourlyRate: number
  classDetails: {
    classId, className, classDate, durationHours, studentsAttended, earned
  }[]
  status: 'draft' | 'pending' | 'approved' | 'paid'
  paidAt?, paidBy?, paymentNotes?: ...
}
```

## `notifications/{id}`

```ts
{
  recipientId, recipientRole
  type: string                      // 'achievement_unlocked' | 'payment_pending' | ...
  title, body
  senderId?, senderName?, senderRole?, senderPhotoURL?
  relatedId?, relatedCollection?
  actionType?, actionUrl?
  isRead: boolean
  sentAt, createdAt: Timestamp
  readAt?: Timestamp
}
```

## `feedback/{id}`

```ts
{
  userId, userName, userPhotoURL?
  classId, className, coachId?, coachName?
  type: 'first_class' | 'battle_survey'
  ratings: { place?, activities?, coach?, tribe? }
  averageRating: number
  recommend?: number               // 0-10
  comments?: string
  createdAt: Timestamp
}
```

## `pendingSurveys/{userId_classId}`

```ts
{
  userId, classId
  coachId?, coachName?, className?, classDate?
  status: 'pending' | 'answered' | 'skipped'
  rating?, comment?
  answeredAt?, skippedAt?: Timestamp
  createdAt: Timestamp
}
```

## `discountCodes/{CODE}`

```ts
{
  code: string  (id = code)
  type: 'fixed' | 'percentage'
  value: number
  maxUses?: number
  usedCount: number
  assignedToUserId?: string
  validFrom, validUntil?: Timestamp
  isActive: boolean
  notes?: string
  createdBy, updatedBy?, createdAt, updatedAt: ...
}
```

## `qr_tokens/{id}`

```ts
{
  id, userId, userName
  type: 'permanent'
  classId?: string                  // null en permanentes
  expiresAt: Timestamp              // 99 años en permanentes
  isUsed?, usedAt?, usedByClassId?: ...
  createdAt: Timestamp
}
```

## `payrollReminders/{uid_YYYY_MM_DD}`

```ts
{ userId, role, day, month, year, sentAt: Timestamp }
```

## `activityLogs/{id}`

```ts
{
  actorId, actorName?, actorRole
  action: string                    // 'update_service_hours', 'update_app_settings'
  entity: string                    // 'config', 'user', 'membership_purchase'
  entityId?: string
  before?, after?: any
  notes?: string
  createdAt: Timestamp
}
```

## `config/serviceHours`

```ts
{
  monday:    { active: true, startHour: 5, endHour: 22 },
  ...sunday: { active: false, startHour: 0, endHour: 0 },
  updatedAt, updatedBy
}
```

## `config/appSettings`

```ts
{
  referral: { percentPerReferral, maxDiscountPercent, fixedPriceMonthlyCOP, discountValidityDays }
  tiquetera: { ticketsIncluded, expiryDays }
  courtesy: { validDays }
  payroll: { cutDays, retroactiveDays }
  sub21: { maxAge }
  achievements: { thresholds: {...} }
  notifications: { sendNoShow, sendCourtesySurvey, sendPayrollReminders }
  updatedAt, updatedBy
}
```

## `payment_qr_config/main`

```ts
{
  nequiQrImageURL?, daviplataQrImageURL?
  nequiKey?, daviplataKey?
  bankTransferInfo: { bankName, accountNumber, accountType, accountHolder, nit? }
  updatedAt, updatedBy
}
```

---

*Sin excusas. Sin schemas a ciegas.*
