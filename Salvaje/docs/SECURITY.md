# SALVAJE — Seguridad

## 1. Reglas de Firestore

`firestore.rules` aplica role-based access:

- `isAuth()` — usuario autenticado.
- `isAdmin()` — doc en `admins/{uid}`.
- `isSuperAdmin()` — `admins/{uid}.isSuperAdmin === true`.
- `isCoach()` — doc en `coaches/{uid}`.
- `isUser()` — doc en `users/{uid}`.
- `isOwner(uid)` — request.auth.uid coincide.

### Colecciones críticas

| Colección | Read | Write |
|---|---|---|
| `users/{uid}` | owner / admin / coach | owner (campos limitados) / admin / coach (campos limitados) |
| `admins/{uid}` | self / admin | locked (escritura solo via consola Firebase) |
| `coaches/{uid}` | auth | admin / owner (campos limitados) |
| `classes/{id}` | auth | admin / coach (clase propia) |
| `weekly_plans/{id}` | auth | admin / coach (plan propio) |
| `payroll/{id}` | admin / coach (su uid) | admin |
| `notifications/{id}` | recipient | auth (create) / recipient (mark read) |
| `membership_purchases/{id}` | admin / userId | userId (create pending) / admin (update) |
| `feedback/{id}` | admin / userId | userId (create) / admin |
| `pendingSurveys/{id}` | userId / admin | auth (create) / userId (status update only) |
| `discountCodes/{id}` | auth | admin (CRUD) / auth (bump usedCount only) |
| `payment_qr_config/main` | auth | **superadmin only** |
| `config/{id}` (serviceHours, appSettings) | auth | **superadmin only** |
| `payrollReminders/{id}` | auth | self (create) / admin (update/delete) |
| `activityLogs/{id}` | admin | auth (create) / admin (update/delete) |

## 2. Variables de entorno

`.env.local` (NO commiteado, verificar `.gitignore`):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_EMAILJS_SERVICE_ID=        # cuando se active V5 Ajuste 6
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
VITE_ANTHROPIC_API_KEY=         # cuando se active V6 Ajuste 27
```

## 3. Riesgos conocidos

### A) Firebase API key visible en el bundle
Es la misma key que cualquier app web; lo crítico son las **reglas de Firestore + Auth + App Check**. Cuando estés listo, activa App Check con reCAPTCHA v3 desde la consola de Firebase para frenar abuso desde scripts externos.

### B) Anthropic API key en cliente (cuando se active)
Plan Spark no permite Functions. Para mitigar:
1. Restringir la key en el dashboard de Anthropic por **dominio** `salvaje-app.web.app`.
2. Limitar el uso al rol `admin` / `superadmin` (la página `/admin/ai` ya está bajo `RoleGuard allowedRoles={['admin']}`).
3. Migrar a Blaze + Cloud Function como proxy es la solución correcta a mediano plazo.

### C) Cámara para QR scanner
- Solo se solicita en HTTPS (Firebase Hosting cumple).
- `Permissions-Policy: camera=(self)` enviado por Hosting headers.
- El stream se cierra en `stopScanner()` (todos los tracks).

### D) Subida de comprobantes de pago
- Path: `payment_receipts/{userId}/{timestamp}_{filename}`. Storage rules deben restringir al `userId`.
- Imágenes se comprimen a 1280px JPEG q=0.85 antes de subir (V5).

### E) Datos sensibles en notificaciones
- Las notificaciones in-app no contienen datos de pago, contraseñas ni tokens.
- Solo nombres de plan, montos, asistentes — todo ya derivado, sin PII de tarjeta.

## 4. Auditoría sugerida cada release

- [ ] `git status` — ¿`.env*` aparece como modificado? Reverte y verifica `.gitignore`.
- [ ] `firebase deploy --only firestore:rules` — confirma que las reglas se publican.
- [ ] Test cruzado: crear usuario coach, intentar leer `users/{otro_uid}` — debe fallar.
- [ ] Test cruzado: usuario logueado intenta escribir en `config/appSettings` — debe fallar.
- [ ] Storage rules: probar upload a `payment_receipts/otro_uid/...` con cuenta distinta — debe fallar.

---

*Sin excusas. Sin descuidos.*
