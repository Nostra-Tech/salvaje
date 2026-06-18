# SALVAJE — Features marcadas como "Próximamente"

Auditoría de UI con badges "Próximamente" / "En desarrollo" tras V6.

---

## ✅ Ya activadas (badge se quitó)

| Feature | Dónde | Estado |
|---|---|---|
| Pareja / Familiar | UserMembership special plans | Habilitable por SuperAdmin via `users.specialPlans[]` |
| Tarjeta crédito | PaymentQRDisplay | Reemplazado por **PSE - en desarrollo** (V5) |
| Logros | UserHome / Notifications | **Activados V6** con AchievementUnlockedModal |
| Recordatorio nómina | CoachHome | **Activado V5** con usePayrollCutReminder |
| Re-validación de pagos | UserMembership history | **Activada V5** con requestRevalidation |

## ⏳ Aún pendientes (badge legítimo)

| Feature | Dónde | Por qué |
|---|---|---|
| **PSE** | PaymentQRDisplay | Requiere integración con pasarela (Wompi / Mercado Pago / ACH Colombia) |
| **Wompi / Mercado Pago** | Settings PaymentMethodsSection | Requiere cuenta + Functions para webhook (Spark plan no permite Functions) |
| **Notificaciones push** | UserProfile preferencias | Requiere FCM + APNS configurados; el doc de usuario tiene `enablePushNotifications: false` por default |
| **Salvaje IA** | AdminAIAssistant | Requiere `VITE_ANTHROPIC_API_KEY` (ver `BLOCKERS.md`) |
| **Pareja/Familiar como compras directas** | UserMembership | Requiere refactor a colección `memberships/` (ver `BLOCKERS.md` Ajuste 15/16) |
| **Verificación de email con EmailJS** | Register flow | Requiere cuenta EmailJS (ver `BLOCKERS.md` Ajuste 6/8) |

## Acción

- Para activar las pendientes: seguir las instrucciones en `BLOCKERS.md`.
- Para ocultar features pendientes a los usuarios temporalmente: `superadmin/app-settings → notifications` toggle.

---

*Sin excusas. Sin límites — solo lo que está listo se activa.*
