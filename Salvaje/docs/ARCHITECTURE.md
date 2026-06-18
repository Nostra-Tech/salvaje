# SALVAJE — Arquitectura

## Stack

- **Frontend**: React 18 + Vite 5 + Tailwind CSS + Framer Motion
- **State**: Zustand (`authStore`)
- **Routing**: React Router v6
- **Iconos**: lucide-react (SVG corporativos, no emojis)
- **Forms**: react-hook-form + zod (en pages que lo necesitan)
- **Notificaciones UI**: react-hot-toast
- **QR**: @zxing/browser (scanner) + qrcode.react (generación)
- **Charts**: recharts (algunos panel admin) + diagramas inline para dashboards simples
- **Backend**: Firebase (Auth + Firestore + Hosting + Storage) — **plan Spark, sin Functions**
- **Cron**: cliente-evaluado (hooks tipo `usePayrollCutReminder` + dedupe via Firestore markers)
- **Email tx**: EmailJS (cuando esté configurado, ver BLOCKERS)
- **IA**: API directa de Anthropic desde cliente (cuando esté la key, ver BLOCKERS)

## Capas

```
┌─────────────────────────────────────────────┐
│  pages/                                     │  Rutas / vistas
│   ├── Login, Register, VerifyEmail          │
│   ├── user/                                 │
│   ├── coach/                                │
│   ├── admin/                                │
│   └── superadmin/                           │
├─────────────────────────────────────────────┤
│  components/                                │  UI reusable
│   ├── ui/  (Button, Card, Input, Modal...)  │
│   ├── shared, user, coach, admin            │
│   ├── classes, memberships, payment         │
│   └── notifications, layout                 │
├─────────────────────────────────────────────┤
│  hooks/                                     │  Estado / queries
│   ├── useAuth, useLiveClasses               │
│   ├── usePayrollProjection                  │
│   ├── usePayrollCutReminder                 │
│   └── useMediaQuery, useCachedQuery         │
├─────────────────────────────────────────────┤
│  services/                                  │  Lógica de negocio + Firestore
│   ├── auth, users, coaches                  │
│   ├── classes, attendance, weekly-plan      │
│   ├── memberships, payroll, cashflow        │
│   ├── referrals, achievements               │
│   ├── notifications, admin-notifications    │
│   ├── service-hours, app-settings           │
│   ├── activity-log, discount-codes          │
│   └── firebase (init)                       │
├─────────────────────────────────────────────┤
│  utils/                                     │  Helpers puros
│   ├── permissions, referral, formatters     │
│   ├── constants, dateHelpers                │
│   ├── firestoreHelpers, imageCompress       │
│   └── messages (SALVAJE voice)              │
└─────────────────────────────────────────────┘
```

## Reglas de oro

1. **Nunca lógica de negocio en componentes.** Va en `services/`.
2. **Nunca `undefined` a Firestore.** Usa `removeUndefined` de `firestoreHelpers`.
3. **Nunca emojis.** Solo iconos Lucide. Reglas de marca.
4. **Nunca `Date.now()` para fechas Firestore.** Usa `Timestamp.now()` o `serverTimestamp()`.
5. **Idempotencia obligatoria** en operaciones que pueden disparar varias veces (cortesía consumida, no-show notif, payroll-reminder, surveys creadas). Marca con flag en el doc origen.

## Auto-finalize y eventos pasivos

El plan Spark no tiene Functions. Para eventos "diferidos":

- **Auto-finalize de clases**: `CoachHome.useEffect` corre `autoFinalizePastClasses()` al montar. Marca `status: completed`, `autoFinalized: true` y dispara consume-cortesía + crear-surveys + notif-no-shows.
- **Recordatorio nómina**: `usePayrollCutReminder` corre al montar Coach/Admin Home, sólo días 15/30/31, dedupe con `payrollReminders/{uid}_YYYY_MM_DD`.
- **Logros**: `checkAndUnlockAchievements` se llama tras `recordAttendance` y `confirmPayment`.

## Roles y rutas

```
Usuario sin verificar → /verify-email
Usuario verificado    → /app/* (sujeto a MembershipGate si está locked)
Coach                 → /coach/*
Admin                 → /admin/*  (RoleGuard también admite superadmin)
SuperAdmin            → /admin/* + /superadmin/*
```

`MembershipGate` es la pieza clave para el flujo "post-cortesía sin pago": rediriges a `/app/membership` y oculta el resto.

## Secciones nuevas en V6

- `superadmin/`: ConfigServiceHours, ConfigAppSettings, ConfigPaymentMethods, SuperAdminUsers, SuperAdminAnalytics
- `admin/`: AdminAIAssistant, AdminWeeklyProjections, AdminPayrollHistory
- `components/coach/CircuitBuilder`
- `components/user/AchievementUnlockedModal`, `BattleSurveyModal`
- `services/service-hours`, `app-settings`, `activity-log`, `discount-codes`
- `hooks/usePayrollCutReminder`, `usePayrollProjection`

## Decisiones técnicas con motivo

- **Membresía embebida en `users/{uid}`** (no colección dedicada). Razón: simpler queries, menor costo de lecturas. Costo: planes Pareja/Familiar requieren refactor (documentado en BLOCKERS).
- **Asistencias dentro de `classes/{id}.attendeeList[]`**. Razón: una sola transacción por scan. Costo: querys de "mis asistencias" filtran client-side las últimas 200-300 clases.
- **`config/appSettings` como doc único**. Razón: app-wide config se lee una vez por sesión, merge profundo con defaults garantiza que cambios incrementales nunca rompen consumidores.
- **Notificaciones como simple sub-colección plana**. Razón: `recipientId` filter eficiente, `onSnapshot` para campanita en vivo.

---

*Sin excusas. Sin atajos arquitectónicos.*
