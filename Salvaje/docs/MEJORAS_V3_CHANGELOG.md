# SALVAJE V3 — Changelog

**URL**: https://salvaje-app.web.app

---

## 🚨 Bug crítico resuelto

### Registro requería refresh
**Causa raíz:** `onAuthStateChanged` se disparaba inmediatamente tras `createUserWithEmailAndPassword` pero el doc `/users/{uid}` aún no existía → `getUserRole` retornaba null → RoleGuard redirigía a `/unauthorized`.

**Fix:**
1. Nuevo flag `registering` en `authStore` que pausa al `RoleGuard`.
2. `Register.jsx` setea `registering=true` antes de crear, y `false` solo al terminar.
3. `useAuth` hace **retry** de `getUserRole` (800ms) si la primera lectura falla — race condition resuelto.
4. `Register.jsx` setea manualmente `setRole('user')` tras el registro para garantizar flujo inmediato.

---

## FASE 1 — Panel Coach (rediseño completo)

### CoachHome
- Saludo + fecha capitalizada
- Card de **próxima clase** con gradiente naranja, hora, aforo, botón "Iniciar" inteligente
- Lógica del botón: activo desde 15 min antes hasta 15 min después del fin programado
- Card "Esta semana": stats + **gráfica visual de clases por día** (Lun-Dom)
- Card "Quincena actual" con acumulado en tiempo real + link a nómina
- Card "Plan próxima semana" con estado (sin plan/borrador/pendiente/aprobado)

### CoachClasses
- Tabs: **Programadas / Histórico**
- Programadas: agrupadas por día con encabezado "Hoy/Mañana/etc"
- Histórico: muestra %aforo y %check-in
- **Late registration**: botón en clases completadas para agregar registro tardío con búsqueda por teléfono → modal con bandera "registro tardío" en audit

### CoachClassActive (rediseño completo)
- **Auto-start**: si entra dentro de la ventana válida (15 min antes a 15 min después del fin), se inicia automáticamente
- **Auto-finalize**: timer cada segundo verifica si pasaron 15 min después del fin → cierra clase + crea payroll automáticamente
- **Aforo en vivo** con tarjeta blanca destacada
- **Botón Escanear QR** (camera fullscreen con marco, cierre fácil)
- **Botón Registrar por teléfono** → modal de 4 pasos: input → found/not_found → opción de crear walk-in user con cortesía + registrar en una sola acción
- Lista de asistentes en tiempo real con timestamp + método (QR/manual/walk-in/tardío)
- Notif al admin al iniciar y al finalizar (con sender info del coach)

### CoachPayroll
- **KPI hero "Total ganado en SALVAJE"**: solo cuenta nóminas con `status === 'paid'`
- Período en curso con badge "En curso" + acumulado tiempo real
- Tarifa por hora visible
- **Histórico solo de pagados** (los draft/pending no aparecen aquí)
- **Modal "Colilla de pago"** con desglose por clase + notas del admin

### Servicios nuevos
- `attendance.service.js`:
  - `validateUserCanAttend(userData)` → membresía / ticketera / cortesía / bloqueado
  - `registerAttendanceByQR(token, classId)` con transacción atómica
  - `registerAttendanceManually(userId, classId)` para flujo telefónico
  - `addLateRegistration(classId, userId, coachUid)` para clases ya completadas
  - `createWalkInUser({phone, displayName, useFreeTrial, createdByCoachUid})` para shadow accounts
- `users.service.searchUserByPhone(phone)` para búsqueda por celular

---

## FASE 2 — Admin

### Calendario responsive
- Mobile (< 640px): nuevo `MobileDayView` con strip selector de 7 días + vista de 1 día con cards verticales + barra de ocupación
- Desktop (≥ 640px): mantiene `WeeklyCalendarGrid` original (no tocado)
- Hook `useMediaQuery` reutilizable

### Actividad agrupada por persona
- Antes: lista de eventos individuales
- Ahora: **lista de personas** con stats agregadas (acciones / minutos / sesiones / última actividad)
- Tabs: Usuarios / Coaches / Admins
- Filtros de período: Hoy / 7 días / 30 días
- **Drawer al click**: resumen de la persona + top 5 páginas visitadas + timeline de últimas 50 acciones
- Eventos concisos: `12:34 · Visitó "Mis Clases"`

---

## FASE 3 — Sincronización en tiempo real

### Live classes en AdminHome
- Hook `useLiveClasses` con `onSnapshot` a `where('status', '==', 'in_progress')`
- Card en AdminHome con dot pulsante verde + lista de clases en vivo
- Click → navega a `/admin/classes`
- Se actualiza instantáneamente cuando un coach inicia/finaliza

---

## Lenguaje SALVAJE

### `src/utils/messages.js`
Mensajes centralizados con voz SALVAJE: directa, sin diminutivos, motivadora, tutea al usuario.

Ejemplos:
- `err_invalid_creds`: "No pudimos identificarte. Revisa tus datos."
- `err_class_full`: "Clase llena. Apúntate a otra."
- `confirm_delete_user`: "¿Eliminar a este salvaje? No hay vuelta atrás."
- `empty_classes`: "Aquí no hay nada todavía. Es tu turno."
- `load_classes`: "Calentando..."

Ya aplicado en Register, CoachHome, CoachClasses, CoachClassActive, CoachPayroll, registros tardíos, búsqueda por teléfono.

---

## Archivos creados (V3)

```
src/utils/messages.js
src/services/attendance.service.js
src/hooks/useMediaQuery.js
src/hooks/useLiveClasses.js
src/components/admin/MobileDayView.jsx
```

## Archivos modificados (V3)

```
src/services/auth.service.js          (registerUser ya correcto)
src/store/authStore.js                (flag registering)
src/hooks/useAuth.js                  (retry de getUserRole)
src/components/layout/RoleGuard.jsx   (espera registering)
src/services/users.service.js         (searchUserByPhone)
src/pages/Register.jsx                (flujo registering + role manual)
src/pages/coach/CoachHome.jsx         (rediseño completo)
src/pages/coach/CoachClasses.jsx      (tabs + late registration)
src/pages/coach/CoachClassActive.jsx  (rediseño QR + teléfono + auto-finalize)
src/pages/coach/CoachPayroll.jsx      (KPI total + histórico solo pagados)
src/pages/admin/AdminClasses.jsx      (MobileDayView responsive)
src/pages/admin/AdminActivityLog.jsx  (agrupado por persona + drawer)
src/pages/admin/AdminHome.jsx         (LiveClasses card)
```

---

## Pendiente para V4 (transparente)

- Tablet 3-day calendar view (V3 hace fallback a desktop grid)
- Sync denorm batch para cambios de coachName/photo en clases existentes
- React Query / TanStack Query (V3 usa hooks directos + cachés simples)
- Pre-aggregated `analytics_cache` collection
- Encriptación cliente-side de datos bancarios
- Marketing campaigns con métricas de open/click

---

*Sin excusas. Sin límites.*
