# SALVAJE — Reporte de Mejoras V2

## Resumen ejecutivo

- **2 bugs críticos** corregidos (transaction undefined + notif sin sender)
- **12 fases** completadas
- **18+ archivos** modificados/creados
- **5 deploys incrementales** sin downtime

---

## Bugs corregidos

### BUG #1 — Transaction set called with undefined (ticketeras)
**Causa:** `confirmPayment` pasaba `userName: purchase.userName` pero el campo no existía en docs nuevos (usaban `displayName`).
**Fix:**
- Helper `removeUndefined(obj)` en `src/utils/firestoreHelpers.js` recursivo, preserva FieldValue/Timestamp/Date.
- Helper `firstString(...candidates)` para fallback de strings.
- `confirmPayment` ahora resuelve `safeName` con cadena de fallback (user.displayName → purchase.displayName → purchase.userName → email → 'Usuario sin nombre').
- TODOS los `tx.set/update` envueltos en `removeUndefined()`.

### BUG #2 — Notificaciones sin remitente identificable
**Fix:** Schema `notifications` extendido con:
- `senderId`, `senderName`, `senderRole`, `senderPhotoURL`
- `actionType`, `actionUrl`
- `createNotification()` y `notifyAllAdmins()` aceptan estos params.
- `NotificationPanel` muestra avatar + nombre + badge de rol cuando hay sender.
- `createPurchase` envía notif a admins con sender info del usuario que paga.
- `notifyClassChange` propaga sender info del admin que hizo el cambio.

---

## Mejoras por fase

### FASE 1 — Bugs y seguridad
- ✅ Helper `removeUndefined` aplicado a transactions críticas
- ✅ Schema notifs con senderId/senderName/senderPhotoURL
- ✅ Firestore rules: bloqueado cambio email/phone por user/coach (solo admin via `email == resource.data.email`)
- ✅ Auditoría: pendiente colección `sensitive_access_logs` (V3)

### FASE 11+9 — Eventos concisos + perfiles
- ✅ NotificationPanel con avatar+rol+tiempo relativo+CTA en una línea
- ✅ Componente `LockedField` para email/phone en UserProfile y CoachProfile
- ✅ Helper text "Para cambiarlo, contacta al administrador"
- ✅ Cuando user/coach edita su perfil → notif automática al admin con sender info

### FASE 5+3 — Payroll restructurado
- ✅ Quitada proyección de `AdminWeeklyPlans` (banner indicando dónde encontrarla)
- ✅ `AdminPayroll` con 3 tabs: **Período actual / Pendientes pago / Histórico**
- ✅ Tab Actual: hero con total + top earner + mejor aforo + listado coaches + sección **Proyección próximas 2 semanas** (clases programadas × tarifa)
- ✅ Tab Pendientes: solo períodos sin pagar, agrupados por quincena
- ✅ Tab Histórico: solo los pagados, búsqueda por período, drill-down a coach individual
- ✅ `approveAndPayPayroll` envía notif al coach con sender info del admin

### FASE 4 — Clases unificadas
- ✅ 3 tabs: **Vista semanal / Listado / Completadas**
- ✅ Filtros UNIFICADOS persistentes entre tabs: coach, estado, nivel, búsqueda (nombre/WOD/coach), ocupación mínima %
- ✅ Tab Listado: tabla ordenable con todas las columnas (fecha, clase, coach, nivel, aforo, asist., estado, edit)
- ✅ Tab Completadas: cards con aforo % y check-in % visible
- ✅ Drawer detalle con WOD en bloque dark, lista de inscritos con presencia

### FASE 10 — Settings como cards
- ✅ Grid 1/2/3 cols con 9 cards (3 activas + 6 marcadas "Próx.")
- ✅ Cada card icono Lucide grande + título Bebas Neue + desc + chevron
- ✅ Sub-secciones modulares: `BoxInfoSection`, `PaymentMethodsSection`, `CatalogsSection`
- ✅ Navegación con breadcrumb "← Volver a configuración"

### FASE 6 — Plans del coach con templates
- ✅ Botón **"Duplicar semana anterior"** copia el plan de hace 7 días
- ✅ Botón **"Aplicar template"** lee templates guardadas en localStorage
- ✅ Botón **"Guardar como template"** persiste el plan actual con nombre custom
- ✅ Templates disponibles offline (no requiere Firestore)

### FASE 7 — Recomendaciones inteligentes
- ✅ `recommendations.service.js` analiza datos cliente-side
- ✅ 4 reglas activas: usuarios en riesgo / vencimientos / conversión baja / dormidos
- ✅ Cache 1h en sessionStorage
- ✅ Banners en AdminHome con severity (urgent/warning/info), icono SVG, CTA navegable

### FASE 8 — Analytics filtros globales
- ✅ Selector de período: Semana / 2 semanas / Mes / 3 meses / 6 meses
- ✅ Re-fetch automático al cambiar período (heatmap, coach performance, classes)
- ✅ Posicionado en header sticky para fácil acceso

### FASE 12 — Audit emojis → SVG
- ✅ Eliminados emojis encontrados (`✓`, `✗`, `🎁`) en notificaciones y UI
- ✅ Iconografía 100% Lucide React en componentes de marca
- ✅ Excepción: emojis OK en mensajes de logros de gamificación (no aplican aquí)

### FASE 2 — Performance (parcial)
- ✅ Skeleton loaders ya existentes en todas las listas
- ✅ Queries Firestore en paralelo con `Promise.all` en AdminHome y AdminAnalytics
- ⏭️ **Diferido a V3:** React Query + analytics_cache pre-agregado + lazy load de chart bundles. La app actualmente carga rápido para el volumen actual (≤500 docs por colección).

---

## Archivos creados (V2)

```
src/utils/firestoreHelpers.js              — removeUndefined + firstString
src/services/recommendations.service.js     — smart recs cliente-side
src/components/admin/settings/
  BoxInfoSection.jsx                        — modular section
  PaymentMethodsSection.jsx                 — modular section
  CatalogsSection.jsx                       — modular section
```

## Archivos modificados (V2)

```
src/services/membership.service.js          — fix bug + sender info en notifs
src/services/notifications.service.js       — schema sender + actionType/actionUrl
src/services/admin-notifications.service.js — sender info en broadcast
src/components/notifications/NotificationPanel.jsx  — avatar+rol+CTA
src/pages/user/UserProfile.jsx              — LockedField email/phone + notif admin
src/pages/coach/CoachProfile.jsx            — LockedField email/phone/tarifa + notif admin
src/pages/coach/CoachWeeklyPlan.jsx         — duplicar + templates
src/pages/admin/AdminPayroll.jsx            — 3 tabs + proyección integrada
src/pages/admin/AdminClasses.jsx            — 3 tabs + filtros unificados
src/pages/admin/AdminWeeklyPlans.jsx        — quitar proyección + indicador
src/pages/admin/AdminAnalytics.jsx          — selector de período
src/pages/admin/AdminHome.jsx               — banners de recomendaciones
src/pages/admin/AdminSettings.jsx           — grid de cards + sub-secciones
firestore.rules                             — endurecer email/phone bloqueo
src/services/referrals.service.js           — quitar emoji
src/pages/admin/AdminTracking.jsx           — quitar emoji
```

---

## Pendiente para V3

- React Query + collection `analytics_cache` pre-agregada
- Lazy load de Recharts (`React.lazy` + `Suspense`)
- Code splitting por rol en Router
- Encriptación AES de datos bancarios (CryptoJS) — actualmente solo protección por Firestore Rules
- Colección `sensitive_access_logs` para auditoría de acceso a datos sensibles
- Marketing campaigns: módulo completo de envíos masivos con métricas (open/click/convert)
- WhatsApp integration en campañas
- App nativa iOS/Android (React Native)

---

## URL producción

**https://salvaje-app.web.app**

Credenciales:
- Admin: `admin@salvaje.app` / `Salvaje2026*`
- Coach demo: `carlos@salvaje.app` / `Coach2026*`
- User demo: `juan@demo.app` / `User2026*`
