# SALVAJE V5 — Changelog

**URL**: https://salvaje-app.web.app

V5 son mejoras estructurales sobre lógica de negocio: liquidación retroactiva,
notificaciones contextuales, flujo de usuario nuevo bloqueado, membresías
especiales, ticketera con vencimiento, y códigos promo del admin.

---

## ✅ Implementado en este deploy

### Ajuste 1 — Liquidación retroactiva de clases pasadas
`addLateRegistration` en `attendance.service.js` ahora corre **la misma
lógica de cobro** que el registro en vivo:

- Si el usuario tiene **membresía activa** → marca `consumedFromMembership: true`, no consume tickets.
- Si tiene **ticketera con saldo y no vencida** → `ticketeraBalance -= 1`, marca `ticketeraConsumed: true`.
- Si tiene **cortesía disponible** → consume cortesía aquí mismo (porque la clase ya está cerrada, no hay finalize posterior). Setea `hasUsedFreeTrial: true`, `freeTrialUsedAt`, `freeTrialUsedClassId`, `freeTrialUsedCoachId`.
- Si **no tiene saldo** → registra igual con `debt: true` para gestión posterior del admin.
- Notifica al admin con detalle del cobro aplicado.

### Ajuste 4 — Feed del usuario: filtro "Mis reservas" + banner
`UserClasses` ahora tiene 3 pestañas: **Hoy / Próximos / Mis reservas**. Y arriba del feed aparece un **`ReservationReminderBanner`** cuando tienes una clase reservada en las próximas 36h.

### Ajuste 3 (refuerzo) — Ocultar clases pasadas del día
`UserClasses` ahora también filtra clases cuyo `start < ahora` (a menos que sean `in_progress`). Antes solo escondía las terminadas; ahora una clase de las 6am no le aparece al usuario si abre la app a las 8am.

### Ajuste 7 — Cortesía consumida al FINALIZAR la clase
- `recordAttendance` **ya no marca** `hasUsedFreeTrial: true` al escanear el QR.
- En su lugar, marca el `attendeeList` con `paidWithFreeTrial: true`.
- Nueva función `consumeCourtesyOnFinalize(classId)` se llama **al cerrar la clase** (manual o auto-finalize) y ahí sí flipa `hasUsedFreeTrial: true` para todos los que entraron con cortesía.
- Idempotente: marca `courtesyConsumedAt` en la clase para no duplicar.
- Notifica al admin: "1 cortesía usada · en {clase} con {coach}".

### Ajuste 8 — Referidos: precio fijo + códigos únicos
- **Precio fijo $120.000** cuando un usuario nuevo paga su primer plan **mensual** con código de referido (en lugar del 5% anterior).
- Para planes no-mensuales (ticketera, etc.) cae a 10% de descuento.
- Recompensa al referidor sigue siendo **10% para su próxima renovación** (válido 60 días).
- **Códigos únicos**: nuevo `utils/referral.js` con `generateUniqueReferralCode()` que verifica colisiones contra `users/` y `referral_codes/` antes de asignar (5 reintentos + fallback timestamp).

### Ajuste 11 — Notificación de corte de nómina (15, 30, 31)
Nuevo hook `usePayrollCutReminder(userId, role)`:
- Se ejecuta al montar `CoachHome` y `AdminHome`.
- Detecta si hoy es día 15, 30 o 31.
- Crea notificación in-app con texto contextual ("primera quincena" / "segunda quincena").
- **Idempotencia**: marca un doc en `payrollReminders/{uid}_{YYYY}_{MM}_{DD}` para no duplicar si la app se abre varias veces el mismo día.
- Plan Spark friendly: sin scheduler externo.

### Ajuste 12 — Planes especiales por usuario
- Campo `specialPlans: string[]` en `users/{uid}`.
- En `AdminEditUserModal`: nueva sección "Planes especiales habilitados" con checkboxes para 6 planes pre-definidos (`colegios_papa_hijo`, `colegios_papa`, `pareja`, `familiar`, `corporativo`, `campaign_promo`).
- En `UserMembership` (catálogo): planes con `isSpecial: true` solo aparecen si están en el array `specialPlans` del usuario. El resto no los ve.

### Ajuste 14 — Ticketera 60 días de vencimiento
- `confirmPayment` para ticketera ahora setea `ticketeraExpDate` = `Timestamp(now + 60 días)` en `users/{uid}` y en el doc `ticketeras/{id}`.
- `validateUserCanAttend` ahora verifica el vencimiento:
  - Si `ticketeraExpDate < ahora` → bloquea con "Tu ticketera venció (60 días). Compra otra para seguir." (no la usa aunque queden tickets).
  - Si vigente → muestra `días restantes` en la razón ("Ticketera · 8 clases · vence en 23d").

### Ajuste 17 — Plan Sub-21 visible solo si `<21`
- Filtro en el catálogo de `UserMembership`:
  - Detecta planes con `id` o `name` que incluyan "sub21"/"sub-21" o con `maxAge` definido.
  - Calcula edad desde `profile.birthDate` (o fallback `dateOfBirth`).
  - Si `edad >= maxAge` (default 21) → no aparece.
  - Sin fecha de nacimiento → no aparece (forzar a registrarla).

### Ajuste 18 — Fecha de nacimiento en registro
- Nuevo campo `birthDate` en `Register.jsx` (input `type="date"`, requerido).
- Validación: mínimo 10 años, máximo 100 años.
- `max` del input pone el límite a 10 años atrás (no se puede elegir una fecha menor).
- `auth.service.registerUser` recibe y persiste `birthDate` y `dateOfBirth` como `Timestamp` en `users/{uid}`.

### Ajuste 19 — Códigos promo del admin
- Nueva colección `discountCodes` con campos: `type` (fixed|percentage), `value`, `maxUses`, `usedCount`, `assignedToUserId`, `validFrom`, `validUntil`, `isActive`.
- Nueva página **`/admin/discount-codes`** (link en sidebar admin → "Financiero"):
  - Crear / editar / eliminar / activar-desactivar códigos.
  - Validación: solo letras/números/guion (3-20 chars), uppercase.
- Nuevo servicio `discount-codes.service.js`: `validateDiscountCode`, `bumpDiscountCodeUsage`, `setDiscountCodeActive`, etc.
- En `UserMembership` modal de pago:
  - Nueva caja **"¿Tienes un código promo?"** debajo del resumen.
  - El usuario escribe el código y le da "Aplicar" → valida (vigencia, máximo de usos, asignación a usuario).
  - Se aplica **sobre el precio ya con descuento de referido**.
  - El total se actualiza en vivo, mostrando línea "Promo SALV20 · -$50.000".
  - Al pagar se incrementa `usedCount` del código (best-effort, no bloquea).
- Reglas Firestore: `discountCodes` lectura para todos autenticados, escritura solo admin (excepto bump de `usedCount` que cualquier auth puede hacer).

---

## ⛔ Bloqueadores documentados (ver `docs/BLOCKERS.md`)

- **Ajuste 6** (verificación de correo con EmailJS) — requiere cuenta externa de EmailJS y credenciales que no están en el repo.
- **Ajuste 15** (membresía Pareja) y **Ajuste 16** (Familiar) — requieren refactor del modelo de membresías de embebido a colección dedicada. Es 1 sprint aparte.

## ✅ Ya implementado en V4 (no se rehace)

- **Ajuste 2** — Notificación motivacional por no-show: `notifyNoShowsForClass()` ya hace esto con 7 frases rotativas.
- **Ajuste 5** — Notificaciones de admin/coach/usuario: la mayoría ya están conectadas (registro, pago, plan semanal, asistencia, etc.).
- **Ajuste 9** — Historial de pagos arriba: `UserMembership` ya está reorganizado en 3 secciones con historial separado.
- **Ajuste 10** — Nómina del coach por período: `CoachPayroll` ya muestra acumulado del período actual + histórico en drawer.
- **Ajuste 13** — Flujo de usuario nuevo bloqueado: `MembershipGate` redirige al usuario locked solo a `/app/membership`.

---

## Archivos creados (V5)

```
src/utils/referral.js                              (Ajuste 8)
src/hooks/usePayrollCutReminder.js                 (Ajuste 11)
src/services/discount-codes.service.js             (Ajuste 19)
src/pages/admin/AdminDiscountCodes.jsx             (Ajuste 19)
docs/MEJORAS_V5_CHANGELOG.md                       (este doc)
docs/BLOCKERS.md                                   (Ajustes 6/15/16)
```

## Archivos modificados (V5)

```
src/pages/Register.jsx                             (Ajuste 18 - birthDate)
src/services/auth.service.js                       (Ajuste 18 + Ajuste 8 unique code)
src/services/attendance.service.js                 (Ajustes 1, 7, 14)
src/services/membership.service.js                 (Ajuste 14 - ticketera 60d)
src/services/referrals.service.js                  (Ajuste 8 - precio fijo)
src/pages/user/UserMembership.jsx                  (Ajustes 17, 19, 8)
src/pages/user/UserClasses.jsx                     (Ajustes 3, 4)
src/pages/coach/CoachHome.jsx                      (Ajustes 7, 11)
src/pages/coach/CoachClassActive.jsx               (Ajuste 7)
src/pages/admin/AdminHome.jsx                      (Ajuste 11)
src/components/admin/AdminEditUserModal.jsx        (Ajuste 12)
src/components/layout/AdminShell.jsx               (Ajuste 19 - nav link)
src/Router.jsx                                     (Ajuste 19 - route)
firestore.rules                                    (Ajustes 11, 19)
```

---

*Sin excusas. Sin límites — pero sin Functions ni cuentas externas.*
