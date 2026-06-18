# SALVAJE — Entrega Final

App de gestión de box CrossFit desplegada y funcional.

## URLs

- **App**: https://salvaje-app.web.app
- **Setup** (uso único): https://salvaje-app.web.app/setup?secret=SALVAJE_SETUP_2026
- **Firebase Console**: https://console.firebase.google.com/project/salvaje-app

---

## Credenciales

### Super Admin
- **Email**: `admin@salvaje.app`
- **Password**: `Salvaje2026*`
- **Acceso**: `/admin` (dashboard, usuarios, coaches, clases, pagos, nómina, etc.)

### Coaches (5) — todos password `Coach2026*`
- `carlos@salvaje.app` — Carlos Mendoza ($25.000/h)
- `maria@salvaje.app` — María Gómez ($22.000/h)
- `andres@salvaje.app` — Andrés Torres ($23.000/h)
- `laura@salvaje.app` — Laura Pérez ($20.000/h)
- `diego@salvaje.app` — Diego Ramírez ($24.000/h)

### Usuarios demo (10) — todos password `User2026*`
- `juan@demo.app` — Juan Rodríguez (Mensual)
- `sofia@demo.app` — Sofía Martínez (Ticketera 10)
- `miguel@demo.app` — Miguel Ángel (Ticketera 20)
- `valentina@demo.app` — Valentina López (Free trial)
- `nicolas@demo.app` — Nicolás Herrera (Mensual)
- `camila@demo.app` — Camila Vargas (Ticketera 10)
- `andres@demo.app` — Andrés Castillo (Ticketera 20)
- `paula@demo.app` — Paula Moreno (Free trial)
- `felipe@demo.app` — Felipe Jiménez (Mensual)
- `laura@demo.app` — Laura Suárez (Ticketera 10)

---

## Datos sembrados (Firestore)

| Colección | Cantidad | Notas |
|-----------|----------|-------|
| `admins` | 1 | Super Admin |
| `coaches` | 5 | Con tarifas, especializaciones |
| `users` | 10 | Con membresías, rachas, clases asistidas |
| `memberships_catalog` | 4 | Mensual ($180k), Ticketera 10 ($120k), Ticketera 20 ($220k), Cortesía ($0) |
| `classes` | ~92 | CrossFit, Olympic, Gymnastics, Open Gym, Mobility — pasadas y próximas |
| `membership_purchases` | 10 | 7 aprobadas, 3 pendientes |
| `ticketeras` | 5 | Para usuarios con plan ticketera |
| `referral_codes` | 5 | Códigos `SALV*` para programa de referidos |
| `achievements` | 8 | Catálogo de logros desbloqueables |
| `app_config/main` | 1 | Datos del box, métodos de pago |

---

## Funcionalidades verificadas ✅

### Admin (`/admin`)
- Dashboard con stats reales (miembros activos, clases semana, pagos pendientes, gráficas)
- Lista de usuarios + modal de perfil + bloqueo
- Lista de coaches + tarifas
- Lista de clases (calendario completo)
- Catálogo de membresías con precios
- Pagos pendientes (Nequi, Daviplata, Transferencia) con aprobación
- Planes Semanales, Nómina, Configuración

### Usuario (`/app`)
- Home con saludo, membresía vigente, racha, clases del día
- Mis Clases (hoy / próximos 14 días)
- Mi QR (código permanente para asistencia)
- Progreso (total clases, racha, gráfica semanal, logros)
- Membresía (plan actual + planes disponibles para activar)
- Referidos (código personal, programa de descuentos)
- Perfil

### Coach (`/coach`)
- Home con stats del día
- Mis Clases (rango ±14 días)
- Plan Semanal
- Nómina personal
- Perfil

---

## Stack & Configuración

- **Frontend**: React 18 + Vite 5 + Tailwind CSS + Framer Motion
- **Backend**: Firebase (Firestore + Auth + Hosting) — plan Spark gratis
- **Hosting**: https://salvaje-app.web.app (CDN global)
- **Auth**: Email/Password
- **Firestore Rules**: Reglas estrictas por rol (admin/coach/user)
- **Indexes**: 11 composite indexes desplegados

---

## Operaciones

### Re-deploy front
```bash
npm run build
firebase deploy --only hosting
```

### Re-deploy reglas/índices
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### Re-sembrar datos (idempotente)
```bash
node scripts/seed-rest.js     # crea/actualiza coaches + users + clases
node scripts/patch-users.js   # parchea campos membershipType
node scripts/patch-purchases.js  # parchea amountPaid + catalogName
node scripts/patch-classes.js    # parchea scheduledDate Timestamp
```

---

## Limitaciones conocidas

1. **Storage**: NO disponible (requiere plan Blaze de pago). Las fotos de perfil están vacías por ahora.
2. **Setup endpoint**: Solo se debe usar 1 vez, ya fue ejecutado. Está protegido con secret.
3. **Notificaciones push (FCM)**: Servicio configurado pero requiere setup adicional de claves VAPID.
4. **EmailJS**: Las claves están vacías en `.env` — completar si se requiere envío de correos transaccionales.

---

## Decisiones técnicas clave

- **Sin Admin SDK / sin service account**: El setup y sembrado se hacen directamente con Firebase Auth REST API + Firestore REST API, evitando exponer credenciales.
- **Bootstrap controlado**: Página `/setup?secret=...` para inicializar el primer admin sin necesitar Admin SDK.
- **Reglas mínimas privilegio**: Cada rol solo puede leer/escribir lo que necesita (ver `firestore.rules`).
