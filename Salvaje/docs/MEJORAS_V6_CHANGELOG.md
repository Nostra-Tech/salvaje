# SALVAJE V6 — Changelog

**URL**: https://salvaje-app.web.app

V6 es una entrega masiva de 33 ajustes. Esta primera ola incluye los ajustes
**críticos de lógica de negocio**, **roles y permisos**, **circuitos de clase**,
**proyecciones semanales**, **scaffold del agente IA**, y **suite de testing
inicial**. Los items que quedaron fuera están en `docs/BLOCKERS.md`.

---

## ✅ Implementados en este deploy

### Ajuste 1 — Notificación de logros + modal celebratorio
- `achievements.service.checkAndUnlockAchievements` ya creaba notificaciones en V4.
- **Nuevo `<AchievementUnlockedModal>`** (montado globalmente en `AppShell`) escucha en tiempo real `notifications` de tipo `achievement_unlocked` y dispara un modal animado: ícono Lucide grande, título, descripción y CTA "¡A seguir!". Al cerrar, marca la notificación como leída.

### Ajuste 2 — CircuitBuilder estructurado
- Nuevo `<CircuitBuilder>` reemplaza/complementa el textarea de ejercicios.
- Permite definir un circuito con: **nombre, rondas, descanso entre rondas**, y **N ejercicios** con `{ sets, reps, seconds, notes }`.
- Persistencia: `circuit` se guarda en el doc de la clase como objeto estructurado, junto al campo `exercises[]` legacy.
- Integrado en el modal "Agregar clase" del `CoachWeeklyPlan` debajo del listado simple.
- Listo para visualización en `CircuitViewer` (placeholder reutilizando datos).

### Ajuste 4 — Renovación anticipada inteligente
- Nuevo `computeRenewalStartDate(userId, planType)` en `membership.service`.
- **Tiquetera** + buying tiquetera: bloquea si quedan tickets vigentes (mensaje claro al usuario).
- **Mensual** con fecha de fin vigente: la nueva membresía arranca al día siguiente del vencimiento (no pierde días).
- En `UserMembership` aparece banner naranja: *"Tu plan actual vence el [fecha]. El nuevo arranca el [fecha+1] sin perder días."*
- `confirmPayment` ahora honra `requestedStartDate` del purchase para activar la membresía en la fecha correcta.

### Ajuste 6 — Feed live: clases pasadas desaparecen sin recargar
- Tick de 60s en `UserClasses` re-evalúa el filtro de `start < ahora` automáticamente. Una clase de las 9am desaparece sola al pasar las 9:01.

### Ajuste 11 — Historial de clases asistidas en perfil
- Nueva entrada **"Mis clases asistidas"** en `UserProfile` con icono `History`.
- Modal lazy-loaded: trae las últimas 300 clases y filtra en cliente las que el usuario asistió (`attendeeList[].userId === uid && checkedIn`).
- Cada fila: nombre, fecha, hora, coach, método (QR/Manual/Walk-in/Tardío).

### Ajuste 12 — `first_battle` vs `first_membership`
- Nuevo logro `first_membership` en `ACHIEVEMENTS`: tipo `paid_memberships`, requirement 1.
- `checkAndUnlockAchievements` ahora consulta `membership_purchases` con `paymentStatus: confirmed` filtrando out cortesía/free_trial/trial.
- `confirmPayment` llama `checkAndUnlockAchievements` después de activar la membresía → se desbloquea el logro al confirmar el primer pago real.
- `first_class` (Primera Batalla) sigue desbloqueándose con la primera asistencia (incluye cortesía).

### Ajuste 13 — Coach plans: solo semana actual + siguiente
- En `CoachWeeklyPlan`, el `weekOffset` se acota a `[0, 1]`.
- Botones de navegación se deshabilitan en los extremos.
- Etiqueta visible: *"Actual"* o *"Siguiente"* junto al rango de fechas.

### Ajuste 14 — Referidos con tope mensual de 30%
- Nueva constante `REFERRER_DISCOUNT_MAX_PERCENT = 30` y `REFERRER_DISCOUNT_PERCENT_PER_REFERRAL = 10`.
- **Función pura `calculateReferralDiscountPercent(n)`** exportada para tests.
- `processReferralAfterPayment` ahora cuenta los pagos confirmados del referidor en el mes actual y aplica `min(n*10, 30)` al `referralDiscountPercent`.
- Sección de **T&C completos** agregada en `UserReferrals` con la explicación oficial: 10% por referido, 30% tope mensual, una vez por par, no canjeable, vigencia 60 días.

### Ajuste 16 — Coach no puede cerrar antes del 80% de la clase
- En `CoachClassActive.handleFinish`, validación previa al `confirm`:
  - Si `now < startTime` → "No puedes finalizar antes de que empiece la clase."
  - Si elapsed < 80% de duración → "Faltan N min para que puedas cerrar la clase (mínimo 80%)."
- El auto-finalize (15 min después del fin) sigue funcionando intacto.

### Ajuste 22 — Proyecciones semanales para admin
- Nueva página `/admin/weekly-projections` (link en sidebar Analytics).
- KPIs en cards: Clases programadas / Reservas / Ocupación / Clases en riesgo.
- Lista de clases con barra de aforo coloreada según tier (verde ≥80%, naranja ≥50%, gold ≥30%, rojo <30%).
- Navegación entre semanas con flechas.
- Badges por estado (Completada / En vivo / nivel de aforo).

### Ajuste 28 — Permissions + role superadmin
- Nuevo módulo `utils/permissions.js` con matriz `PERMISSIONS` por rol y helpers `hasPermission`, `isAdminOrSuper`, `isSuperAdmin`.
- `getUserRole` distingue `admin` vs `superadmin` leyendo el campo `isSuperAdmin: true` en `admins/{uid}` (sin migración de schema).
- `RoleGuard` permite a `superadmin` acceder a cualquier ruta marcada para `admin` automáticamente.
- `AdminShell` filtra los nav groups `superAdminOnly` y los muestra solo cuando `role === 'superadmin'`.

**Para activar el primer SuperAdmin** en producción:
1. Asegúrate de tener un doc en `admins/{uid}`.
2. Edita ese doc en Firestore Console → agrega `isSuperAdmin: true`.
3. El usuario verá la sección "SuperAdmin" en su sidebar al recargar.

### Ajuste 18 — Horarios de servicio (config superadmin)
- Nuevo servicio `service-hours.service.js`: `getServiceHours`, `saveServiceHours`, `isWithinServiceHours`.
- Doc único en `config/serviceHours` con la estructura por día.
- Default: domingo inactivo. Lunes-viernes 5–22, sábado 7–14.
- Nueva página `/superadmin/service-hours` con toggle por día y selector de hora inicio/fin.

### Ajuste 27 (scaffold) — Salvaje IA
- Nueva página `/admin/ai` lista para activar.
- Detecta `import.meta.env.VITE_ANTHROPIC_API_KEY` automáticamente:
  - Sin key → muestra banner amarillo *"Pendiente de activación"* + instrucciones.
  - Con key → chat funcional con la API directa de Anthropic (`claude-sonnet-4-20250514`).
- Memoria de conversación dentro de la sesión (últimos 10 mensajes) — prompt cache lo aprovechará.
- Detalle del bloqueo en `docs/BLOCKERS.md`.

### Ajuste 30 — Favicon
- `index.html` ahora prioriza `/Favicon.png` si existe, con fallback a `/favicon.svg`.
- Nuevos `apple-touch-icon` y `apple-mobile-web-app-title="SALVAJE"`.

### Ajuste 31 (scaffold) — Vitest
- `package.json`: scripts `test` y `test:watch` agregados.
- Setup file en `src/test/setup.js`.
- 2 suites de ejemplo cubriendo lo más sensible:
  - `src/test/utils/referral.test.js` — tope 30% del referido (5 casos).
  - `src/test/services/attendance.test.js` — `validateUserCanAttend` con todos los caminos (6 casos).
- Para correr: `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom` y luego `npm run test`.

---

## ⛔ Bloqueadores documentados (`docs/BLOCKERS.md`)

- **Ajuste 6/8** (verificación EmailJS) — sin credenciales externas (heredado de V5).
- **Ajuste 27** (Salvaje IA con datos de negocio) — sin API key de Anthropic. Scaffold listo, falta env var.
- **Ajuste 31** (suite completa) — solo se incluyen 2 tests de ejemplo. La cobertura completa requiere sprint dedicado.

## ⏭ Pendientes para V7

Los siguientes ajustes quedan en cola para evitar entregar a medias:

- **Ajuste 3** (pasarela solo en contexto): ya cumple parcialmente; falta auditar que ninguna ruta `/payment` esté en BottomNav.
- **Ajuste 5** (UI tiquetera con vencimiento visible): el dato ya existe en `users.ticketeraExpDate` desde V5, falta surfacing en `MembershipCard`.
- **Ajuste 7** (modales para membresías/historial): ya hay `Section` en `UserMembership` con todo organizado; modales son refactor cosmético.
- **Ajustes 9, 10** (encuesta post-clase + bloqueo): la `BattleSurveyModal` y `MembershipGate` ya existen desde V4/V5 y cumplen el propósito.
- **Ajuste 15** (dashboard encuestas): ya implementado en V5 como `AdminFeedback`.
- **Ajuste 17** (resumen período + detalle): el `CoachPayroll` ya tiene drawer con detalle; falta replicar en admin.
- **Ajuste 19, 20, 21, 23, 24** (SuperAdmin completo): solo entregamos service-hours en este ciclo. Resto en V7.
- **Ajuste 25** (auditoría coming-soon): manual; pendiente.
- **Ajuste 26** (nómina proyectada UI): el dato ya existe; falta hook + UI dedicada.
- **Ajuste 29** (polish dashboards): trabajo iterativo continuo.
- **Ajuste 32, 33** (auditoría seguridad + docs arquitectura): mejor documentar al final del ciclo de SuperAdmin.

---

## Archivos creados (V6)

```
src/components/coach/CircuitBuilder.jsx                (Ajuste 2)
src/components/user/AchievementUnlockedModal.jsx       (Ajuste 1)
src/services/service-hours.service.js                  (Ajuste 18)
src/pages/admin/AdminWeeklyProjections.jsx             (Ajuste 22)
src/pages/admin/AdminAIAssistant.jsx                   (Ajuste 27 scaffold)
src/pages/superadmin/ConfigServiceHours.jsx            (Ajuste 18)
src/test/setup.js                                      (Ajuste 31)
src/test/utils/referral.test.js                        (Ajuste 31)
src/test/services/attendance.test.js                   (Ajuste 31)
docs/MEJORAS_V6_CHANGELOG.md                           (este doc)
```

## Archivos modificados (V6)

```
src/utils/permissions.js                               (Ajuste 28)
src/utils/constants.js                                 (Ajuste 12 - first_membership)
src/services/auth.service.js                           (Ajuste 28 - role superadmin)
src/services/achievements.service.js                   (Ajuste 12 - paid_memberships)
src/services/membership.service.js                     (Ajustes 4, 12)
src/services/referrals.service.js                      (Ajuste 14 - 30% cap + función pura)
src/services/weekly-plan.service.js                    (Ajuste 2 - circuit en sanitizeClass)
src/components/layout/RoleGuard.jsx                    (Ajuste 28 - superadmin pasa admin gates)
src/components/layout/AdminShell.jsx                   (Ajustes 22, 27, 18, 28)
src/components/layout/AppShell.jsx                     (Ajuste 1 - mount AchievementUnlockedModal)
src/pages/Register.jsx                                 (V5 birthDate ya hecho)
src/pages/coach/CoachClassActive.jsx                   (Ajuste 16 - bloqueo finalize 80%)
src/pages/coach/CoachWeeklyPlan.jsx                    (Ajustes 13, 2)
src/pages/user/UserClasses.jsx                         (Ajuste 6 - tick 60s)
src/pages/user/UserMembership.jsx                      (Ajuste 4)
src/pages/user/UserProfile.jsx                         (Ajuste 11)
src/pages/user/UserReferrals.jsx                       (Ajuste 14 - T&C)
src/Router.jsx                                         (Ajustes 22, 27, 18)
index.html                                             (Ajuste 30 - favicon)
package.json                                           (Ajuste 31 - test scripts)
docs/BLOCKERS.md                                       (Ajustes 27, 31)
```

---

*Sin excusas. Sin límites — pero sin Functions ni cuentas externas.*
