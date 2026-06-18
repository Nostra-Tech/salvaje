# SALVAJE — Decisiones Técnicas (V1 Mejoras)

Registro de decisiones de arquitectura y diseño tomadas durante el desarrollo de mejoras V1.

---

## Convenciones generales

### D-001 — Iconos: SVG (lucide-react), no emojis
**Decisión:** Toda iconografía de la UI usa lucide-react (SVG), NO emojis Unicode.
**Razón:** Look corporativo consistente, no depende del set de emojis del SO/navegador, color/tamaño controlables.
**Excepción:** Asuntos de email/notificaciones in-app pueden usar emojis (🎁 ⏰ 💰) en el cuerpo del texto.

### D-002 — Sin Firebase Functions
**Decisión:** Toda la lógica reactiva (nómina automática, recordatorios, cashflow auto) se ejecuta en cliente o en cron externo (script Node).
**Razón:** Plan Spark gratuito.
**Implicación:** Triggers como "al finalizar clase → crear payroll" se ejecutan en el cliente del coach al pulsar "Finalizar". Cron jobs (recordatorios) corren externamente vía GitHub Actions cada hora.

### D-003 — Validación de email existente: fetchSignInMethodsForEmail
**Decisión:** Para "¿Olvidaste tu contraseña?" usar `fetchSignInMethodsForEmail` de Firebase Auth + fallback con `sendPasswordResetEmail` (auth/user-not-found).
**Razón:** No requiere acceso a Firestore (las reglas no permiten leer /users sin auth). Es una API pública de Firebase Auth.
**Trade-off:** Permite enumeración de emails. Aceptable para SALVAJE (box pequeño, no objetivo de ataques masivos).

### D-004 — Activity tracking client-side
**Decisión:** Hook `useActivityTracker` en AppShell + AdminShell registra `page_enter`/`page_exit` en `/activity_logs` con duration. Sesiones identificadas por sessionId en sessionStorage.
**Razón:** Sin Functions, no hay tracking automático server-side. Privacidad: solo guardamos browser name (no full UA), no IP.

### D-005 — Activity logs: cliente escribe, admin lee
**Reglas Firestore:** `allow create: if isAuth() && request.resource.data.userId == request.auth.uid;` — cada usuario solo puede crear logs para sí mismo. Admin lee todo, usuario lee solo los suyos.

---

## FASE A — Visual y UX

### D-A1 — Login: layout columna única centrada
**Decisión:** Eliminar layout side-by-side. Pantalla de login es una sola columna vertical: logo centrado arriba, divisor sutil, tagline "SIN EXCUSAS. SIN LÍMITES.", form, "LA TRIBU TE ESPERA" abajo. Animaciones slideDown/fadeIn por etapas.
**Razón:** Especificación V1 explícita. Más limpio mobile + desktop, menos ruido visual.

### D-A2 — ForgotPassword: modal "no registrado"
**Decisión:** Si el email NO existe, mostrar modal con CTA "Registrarme" (lleva a `/register?email=X`). Register pre-rellena.
**Razón:** Reduce fricción de conversión.

### D-A3 — Admin nav mobile: tab "Más" con drawer
**Decisión:** BottomNav admin con 4 tabs principales (Dashboard / Usuarios / Clases / Finanzas) + tab "Más" que abre drawer slide-up con grid 2 columnas de las 9 secciones restantes.
**Razón:** Bottom nav móvil estándar tiene 5 tabs máx. Drawer permite acceso a todo en máximo 2 taps.
**Agrupación "Finanzas" mobile:** Página `/admin/finances` que agrupa Pagos + Nómina + Flujo de Caja.

### D-A4 — Sidebar desktop agrupado
**Decisión:** Sidebar admin desktop con 4 secciones: Gestión / Financiero / Analytics / Sistema. Cada grupo tiene su label sutil arriba.
**Razón:** 14 secciones sueltas eran caóticas. Agrupación mejora discoverability.

---

## FASE B — CRUDs y control admin

### D-B1 — Pre-creación de usuarios y coaches via "pending invites"
**Decisión:** Sin Admin SDK no podemos crear cuentas directamente. Solución: docs en `/pending_users` y `/pending_coaches` con `status='pending'`. Admin recibe URL `/register?email=X&invite=ID` para compartir. Al registrarse: el sistema lee la invitación pendiente y vincula los datos preconfigurados.
**Reglas:** Lectura pública de `pending_users/coaches` (necesario en registro anónimo); escritura solo admin.

### D-B2 — Activación manual de membresía
**Decisión:** Admin puede activar membresía directamente desde el modal `AdminActivateMembershipModal`. Crea `membership_purchase` con `paymentStatus='confirmed'` + actualiza usuario + crea ticketera (si aplica) + log de cashflow automático.
**Razón:** Pago en efectivo, cortesías, casos especiales sin requerir flujo de upload de comprobante.

### D-B3 — Cambio de precio de membresía: aplica solo a renovación
**Decisión:** Al editar precio de un plan, default `applyToExistingOnRenewal=true`. Membresías activas mantienen su precio hasta vencer; al renovar, toman el nuevo precio. Modal de confirmación obligatorio.
**Razón:** Evitar cobrar diferencias retroactivas a usuarios actuales (mala UX, posibles disputas).

### D-B4 — Notificaciones automáticas de cambio en clase
**Decisión:** Función `notifyClassChange(classId, type, ...)` en `notifications.service`. Tres tipos:
  - `SCHEDULE_CHANGED`: notif a inscritos + coach
  - `COACH_CHANGED`: notif a inscritos + coach viejo + coach nuevo
  - `CLASS_CANCELLED`: notif a todos los inscritos + coach
Modal de confirmación si la clase tiene inscritos.

### D-B5 — Datos bancarios coach: solo admin los ve
**Decisión:** Datos bancarios (banco, cuenta, titular) almacenados en `coaches/{uid}.bankInfo`. Solo admin puede leerlos en formularios. Coach NO los ve en su perfil.
**Razón:** Prevenir cambio no autorizado por el coach. Cualquier ajuste va por el admin.

---

## FASE C — Analytics

### D-C1 — Aggregaciones client-side con cache mental
**Decisión:** `analytics.service.js` hace queries directas a Firestore y agrega en memoria. Sin pre-cálculo, sin caché formal — confiamos en que el admin no abre analytics constantemente.
**Razón:** Sin Functions no hay scheduled aggregations. Para 100-500 usuarios y ~1000 clases/mes esto es perfectamente performante.
**Si crece:** considerar Cloud Functions con scheduled aggregations a una colección `/analytics_snapshots`.

### D-C2 — Heatmap CSS Grid custom
**Decisión:** Componente `KPIHeatmap` propio con CSS Grid + interpolación de color cream→orange. Sin dependencia adicional.
**Razón:** Heatmaps de recharts/d3 son overkill para 7×16 celdas. Custom es más liviano y respeta el diseño SALVAJE.

### D-C3 — Coach performance: tendencia vs período anterior
**Decisión:** `fetchCoachPerformance(daysBack=30)` calcula también el período anterior y muestra delta (▲▼ %).
**Razón:** El número absoluto importa menos que la dirección. Permite identificar coaches que están subiendo/bajando.

### D-C4 — Tracking: filtros por usuario/coach + recordatorio
**Decisión:** AdminTracking con 3 tabs (Usuarios filtrable / Coaches con proyección quincenal / Pronóstico financiero con punto de equilibrio). Botón "Recordar" envía notif in-app al usuario directamente.
**Razón:** Acción inmediata sin pasar a otra pantalla.

---

## FASE D — Clases y planes

### D-D1 — Vista semanal: CSS Grid + slots fijos
**Decisión:** `WeeklyCalendarGrid` con 11 horarios picos (5,6,7,8,9,12,13,17,18,19,20). Cada celda permite múltiples clases apiladas.
**Razón:** Box CrossFit típico tiene clases en horarios concentrados (madrugada/mediodía/tarde). Mostrar 24h sería ruido.

### D-D2 — AdminWeeklyPlans: una fila por coach activo
**Decisión:** En lugar de listar solo planes existentes, mostrar TODOS los coaches activos. Si no tienen plan: badge ❌ "Sin plan" rojo.
**Razón:** Visibilidad inmediata de quién falta. La pregunta "¿quién no ha entregado plan?" se responde al cargar la página.

### D-D3 — Cron via GitHub Actions
**Decisión:** `cron/send-reminders.mjs` corre cada hora en GitHub Actions (free tier). El script chequea internamente la hora de Bogotá y solo actúa en sábado≥4pm o día 15/último del mes.
**Razón:** Sin Functions ni servidor. GitHub Actions es gratis para repos públicos y privados (con límite generoso).
**Configuración:** secrets `SALVAJE_API_KEY`, `SALVAJE_PROJECT`, `SALVAJE_ADMIN_EMAIL`, `SALVAJE_ADMIN_PASS`.

---

## FASE E — Cashflow y nómina automática

### D-E1 — Cashflow: ingresos automáticos, egresos manuales + auto
**Decisión:** Ingresos siempre se generan automáticamente al confirmar pagos (`logIncomeFromPayment`). Egresos: nóminas pagadas se generan auto (`logExpenseFromPayroll`); otros gastos (arriendo, equipo) los agrega el admin manualmente desde modal.
**Marca:** `isAutomatic: true/false` permite distinguir y bloquear edición de los automáticos.

### D-E2 — Nómina por quincena (Q1 = días 1-15, Q2 = 16-fin)
**Decisión:** `periodForDate(d)` retorna `{period, quincena, monthKey, startDate, endDate}`. Una clase finalizada el día X se agrega al payroll del período correspondiente.
**Razón:** Estándar colombiano de pago quincenal.

### D-E3 — Auto-payroll: idempotente por classId
**Decisión:** Al pulsar "Finalizar clase" en CoachClassActive, se llama `addClassToPayroll(cls, coach)`. Si ya existe payroll del período: increment hours/total + arrayUnion del classDetail. Verifica que el classId no esté ya en classDetails (evita duplicados si el coach pulsa "Finalizar" dos veces).

### D-E4 — Aprobación de nómina = pagada (un solo paso)
**Decisión:** `approveAndPayPayroll(payrollId, adminUid, notes)` cambia status a `paid`, registra `paidAt`, y crea cashflow_entry expense automáticamente.
**Razón:** El usuario V1 spec define el flujo simplificado: aprobar = pagar. No hay paso intermedio "approved → paid".

---

## FASE F — Historial y QR pago

### D-F1 — Activity tracker: mount-once en shells
**Decisión:** `useActivityTracker()` se monta en AppShell y AdminShell. Listens al cambio de location, calcula duration de la página anterior, escribe `page_enter`/`page_exit` en activity_logs.
**Privacy:** Solo guardamos browser name (Chrome/Firefox/Safari/Edge), no full user agent.

### D-F2 — Storage para QRs requiere Blaze
**Decisión:** Admin puede subir QRs de Nequi/Daviplata desde Configuración. Firebase Storage requiere plan Blaze. En Spark, el upload falla con toast informativo. Datos bancarios (texto) sí funcionan en Spark.
**Workaround para Spark:** admin puede subir el QR a un host externo (imgur, etc.) y pegar la URL manualmente — NO implementado, requiere actualizar el schema para aceptar URL en input.

### D-F3 — Pasarela de pago Wompi/MercadoPago: schema preparado, UI "próximamente"
**Decisión:** Schema de `payment_qr_config` incluye campos `wompiPublicKey`, `wompiWidgetEnabled`, `mercadopagoPublicKey`. UI muestra "Próximamente" en checkout y settings.
**Razón:** Listo para implementar pasarela en futura iteración sin migración.

### D-F4 (Corrección R) — Lógica referidos: 5% nuevo + 10% dador, AL PAGO
**Decisión:** Al registrarse con código de referido SOLO se guarda `referredBy` y `referralPendingFirstPayment=true`. NO descuento.
- En el primer **pago** de B: `computeApplicableDiscount` devuelve 5% → se aplica al monto.
- Al **confirmar** ese pago: `processReferralAfterPayment` da a A `referralDiscountActive=true`, `percent=10`, expira en 60 días + notif "🎁 Ganaste 10%".
- Cuando A renueva: 10% se aplica automáticamente, luego se consume.
**Prioridad de descuento:** 10% (referrer reward) gana sobre 5% (new user) si ambos aplican.

---

## Decisiones futuras pendientes (no implementadas en V1)

- **Firebase Functions o backend Express**: necesarias para eventos críticos (reset de quincena, expiración de membresías, batch de notificaciones).
- **Service worker + push notifications (FCM)**: la app guarda fcmToken pero falta el SW que escucha.
- **Storage**: requiere Blaze para Q-pago, fotos de perfil, comprobantes de pago.
- **Pasarela de pago real (Wompi)**: integración del widget + verificación de webhook.
- **Email transaccional via EmailJS**: claves vacías en .env.

---

*Actualizado al cierre de Mejoras V1.*
