# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at localhost:5173
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # ESLint (zero warnings policy)
npm test          # Vitest single run
npm run test:watch # Vitest watch mode
```

## ⚠️ CRÍTICO — `vite build` borra la sub-app "Polla Mundialista" del dist

Este hosting (`salvaje-app`) sirve DOS apps en el mismo `dist/`:
1. La app principal (raíz `/`), que es este proyecto.
2. La **Polla Mundialista Salvaje**, un proyecto Vite SEPARADO en `../polla-salvaje`, que se sirve bajo `/pollamundialistasalvaje/` y vive físicamente en `dist/pollamundialistasalvaje/`.

`npm run build` de la app principal hace `emptyOutDir` y **BORRA todo `dist/`, incluida `dist/pollamundialistasalvaje/`**. Si después se hace `firebase deploy` sin restaurar esa carpeta, la polla queda fuera del hosting y `/pollamundialistasalvaje/` devuelve **404 / la app principal equivocada** (el rewrite `/pollamundialistasalvaje/** → /pollamundialistasalvaje/index.html` de `firebase.json` solo funciona si ese archivo existe en el deploy).

**REGLA OBLIGATORIA — cada vez que hagas `vite build` / `npm run build` aquí y vayas a desplegar, SIEMPRE en este orden:**
```powershell
npm run build                                                    # 1. app principal (borra dist/)
Push-Location ..\polla-salvaje; npm run build; Pop-Location      # 2. build de la polla
New-Item -ItemType Directory -Force .\dist\pollamundialistasalvaje | Out-Null
Copy-Item ..\polla-salvaje\dist\* .\dist\pollamundialistasalvaje\ -Recurse -Force  # 3. restaurar la polla
firebase deploy --only hosting                                   # 4. deploy
```

NUNCA hagas `firebase deploy` justo después de un `npm run build` de la app principal sin antes reconstruir y copiar `../polla-salvaje/dist` dentro de `dist/pollamundialistasalvaje/`. Antes de desplegar, verifica que exista `dist/pollamundialistasalvaje/index.html` con su carpeta `assets/`.

## Architecture

**Stack:** React 18 + Vite, Firebase (Auth + Firestore + Storage), TanStack Query v5, Zustand, Tailwind CSS, Framer Motion, React Router v6.

**Path alias:** `@` → `./src`

### Role System

Four roles: `superadmin`, `admin`, `coach`, `user`. Auth state lives in `src/store/authStore.js` (Zustand). `src/hooks/useAuth.js` wraps the store. Route protection is layered:
- `ProtectedRoute` → requires authenticated user
- `RoleGuard` → checks role against `allowedRoles`
- `MembershipGate` → locks users who exhausted free trial and have no active plan — redirects to `/app/membership`

`src/utils/permissions.js` defines the full permissions matrix and `isUserLocked()`.

### Firestore Collections

Key collections: `users`, `classes`, `notifications`, `admins`, `qr_tokens`, `memberships`, `payments`, `payroll`, `weekly_plans`, `cashflow`, `surveys`.

### Service Layer (`src/services/`)

Every Firestore operation goes through a service file — never query Firestore directly from components. Key services:
- `firebase.js` — exports `auth`, `db`, `storage`
- `users.service.js` — CRUD + `searchUserByPhone`, `getUserPermanentQR`
- `notifications.service.js` — `createNotification`, `notifyClassChange`, subscriptions
- `admin-notifications.service.js` — `notifyAllAdmins` (broadcasts to all admin UIDs cached from `admins` collection)
- `classes.service.js` — class CRUD, check-in, `findActiveClassForUser`
- `qr.service.js` — QR token validation
- `membership.service.js` — purchase, activate, `getPendingPayments`
- `attendance.service.js` — no-show notifications, courtesy consumption, survey creation on finalize
- `achievements.service.js` — unlock logic
- `payroll.service.js` — quincena periods, payroll CRUD
- `recommendations.service.js` — AI-driven admin dashboard banners

### Component Layout Shells

- `AppShell` — used by both `user` and `coach` roles. Sidebar on desktop, `BottomNav` on mobile. Mounts `NotificationPanel`, `AchievementUnlockedModal`, `BattleSurveyModal`.
- `AdminShell` — used by `admin`/`superadmin` routes.

### Notification System

`createNotification()` writes to `notifications` collection with `recipientId`, `recipientRole`, `type`, `title`, `body`. The `NotificationPanel` subscribes in real time via `useNotifications`. `notifyAllAdmins()` reads from `admins` collection (cached per session). Admin notifications fire whenever users submit payments, plans are submitted, etc.

### User Lock Flow

`isUserLocked(profile)` returns true when: free trial used + no `membershipIsActive` + `ticketeraBalance === 0`. Locked users only see `/app/membership` and `/app/profile`. `MembershipGate` enforces this at the router level.

### Class Check-In

Coach check-in (`CoachCheckIn`) scans QR via `@zxing/browser`, validates token with `validateQRToken()`, finds the user's active class, then calls `checkInUser()`. The active class window is ±15 min around class start/end. Past scheduled classes auto-finalize in `CoachHome` via `autoFinalizePastClasses()` (writes `autoFinalized: true` to Firestore).

### Design System

Tailwind custom tokens in `tailwind.config.js`:
- Colors: `salvaje-brown`, `salvaje-orange`, `salvaje-fire`, `salvaje-gold`, `salvaje-success`, `salvaje-danger`, `salvaje-gray`, `salvaje-light`, `salvaje-dark`, `salvaje-cream`
- Fonts: `font-display` (Bebas Neue), `font-body` (DM Sans), `font-mono` (JetBrains Mono)
- Shadows: `shadow-salvaje`, `shadow-salvaje-md`, `shadow-salvaje-lg`
- Border radius: `rounded-salvaje` (16px)

### Data Fetching Pattern

Components use `useCachedQuery` (custom hook, `src/hooks/useCachedQuery.js`) for cache-first loading with configurable TTL, especially on dashboards. Real-time subscriptions use `onSnapshot` directly in hooks or services, returning the unsubscribe function.

### Environment Variables

All Firebase config via `.env` (`VITE_FIREBASE_*`). See `.env.example` for required keys.
