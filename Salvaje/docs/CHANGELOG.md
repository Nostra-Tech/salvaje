# SALVAJE — Changelog

## V2 — Correcciones y mejoras (Mayo 2025)

### Fixes
- **fix(payment):** resolve transaction undefined bug en confirmPayment de ticketeras
  - Helper `removeUndefined` recursivo aplicado a todas las transactions críticas
  - `safeName`/`safeEmail` con fallback chain garantizan campos no-null

### Features
- **feat(notifications):** sender info (avatar, name, role, photo) en todas las notifs
  - Schema extendido: senderId, senderName, senderRole, senderPhotoURL, actionType, actionUrl
  - NotificationPanel renderiza avatar+rol+timestamp+CTA en una línea
  - createPurchase notifica al admin con sender info del usuario
  - notifyClassChange propaga sender info del admin

- **feat(security):** bloqueo de campos sensibles en perfiles
  - Componente LockedField para email/phone/tarifa
  - Firestore rule: user/coach NO pueden cambiar email; admin solo si email == resource.data.email
  - Notif al admin cuando user/coach edita su perfil

- **feat(payroll):** módulo restructurado con 3 tabs
  - Tab "Período actual": hero + top earner + top aforo + listado + proyección 2 semanas
  - Tab "Pendientes pago": agrupado por quincena, drill-down a coach
  - Tab "Histórico": búsqueda por período, ver pagos individuales pasados
  - Quitada proyección de AdminWeeklyPlans (ahora vive en Payroll)

- **feat(classes):** vista unificada con 3 tabs
  - Tab "Vista semanal": calendario grid (existente)
  - Tab "Listado": tabla ordenable con filtros
  - Tab "Completadas": cards con aforo + check-in % por clase
  - Filtros UNIFICADOS persistentes: coach, estado, nivel, búsqueda, ocupación %

- **feat(plans):** templates y duplicación para el coach
  - Botón "Duplicar semana anterior" copia plan de hace 7 días
  - Botón "Aplicar template" lista templates guardadas (localStorage)
  - Botón "Guardar como template" persiste plan con nombre custom

- **feat(recommendations):** sistema de recomendaciones smart en AdminHome
  - 4 reglas: usuarios en riesgo / vencimientos próximos / conversión baja / dormidos
  - Cache 1h en sessionStorage
  - Banners por severity con CTA navegable

- **feat(analytics):** filtro global de período
  - Selector Semana / 2 semanas / Mes / 3 meses / 6 meses
  - Re-fetch automático de heatmap, coach perf, classes

- **feat(settings):** grid de cards + secciones modulares
  - 9 cards (3 activas: Box info / Pagos / Catálogos; 6 marcadas Próx.)
  - Sub-secciones extraídas a componentes propios
  - Navegación con breadcrumb

### Style
- **style:** eliminación de emojis residuales (`✓`, `✗`, `🎁`) en notifs y UI
  - 100% iconografía Lucide React en componentes de marca

### Refactor
- **refactor(payroll):** proyección de nómina movida del módulo de Plans → Payroll
- **refactor(profile):** removido edit de phone (ahora locked)

---

## V1 — MVP base (Abril 2025)

### Features iniciales
- Auth Firebase (3 roles: admin/coach/user)
- Dashboard admin con KPIs y gráficos
- CRUD usuarios/coaches/clases/membresías
- Reservas + check-in QR
- Nómina automática al finalizar clase
- Cashflow (income/expense automático + manual)
- Activity log + History page
- Sistema de referidos (5%+10% al pago, no al registro)
- Plan semanal de coaches con auto-generación de clases al aprobar
- Notificaciones in-app
- Cron sábados 4pm (recordatorio plan) + día 15/30 (alerta nómina)
- Centro de envíos masivos
- Catálogos editables con papelera + revertir
- Página /auth-action personalizada SALVAJE para reset password
- Dashboard holistic con filtros (Hoy/Semana/Mes/Trimestre/Custom)

---

*Mantén este log actualizado en cada deploy.*
