# SALVAJE — Roles y permisos

## Roles

| Rol | Cantidad | Cómo se asigna |
|---|---|---|
| **superadmin** | 1 | Crea un doc en `admins/{uid}` con `isSuperAdmin: true` desde Firebase Console |
| **admin** | hasta 2 | Doc en `admins/{uid}` (sin `isSuperAdmin`) |
| **coach** | n | Doc en `coaches/{uid}` |
| **user** | n | Doc en `users/{uid}` (auto al registrarse) |

## Cuadro de permisos (V6 Ajuste 28)

| Permiso | superadmin | admin | coach | user |
|---|---|---|---|---|
| `canModifyConfig` | ✅ | ❌ | ❌ | ❌ |
| `canManageAdmins` | ✅ | ❌ | ❌ | ❌ |
| `canViewAllData` | ✅ | ✅ | ❌ | ❌ |
| `canModifyPrices` | ✅ | ❌ | ❌ | ❌ |
| `canDeleteUsers` | ✅ | ❌ | ❌ | ❌ |
| `canAccessAIAssistant` | ✅ | ✅ | ❌ | ❌ |
| `canManagePaymentMethods` | ✅ | ❌ | ❌ | ❌ |
| `canManageServiceHours` | ✅ | ❌ | ❌ | ❌ |
| `canViewActivityLog` | ✅ | ✅ | ❌ | ❌ |

## Rutas por rol

```
/login, /register, /verify-email, /forgot-password         → todos
/app/*                                                     → user (verificado)
  ├ /app/membership, /app/profile, /app/survey/:id         → user incluso si está locked
  └ resto bloqueado por MembershipGate si locked
/coach/*                                                   → coach
/admin/*                                                   → admin + superadmin (RoleGuard auto-eleva)
/superadmin/*                                              → superadmin only
```

## Activar primer SuperAdmin

1. Tener una cuenta admin existente (`admins/{uid}` ya creado).
2. En Firestore Console, abrir ese doc.
3. Agregar campo `isSuperAdmin: true`.
4. La cuenta verá el sidebar "SuperAdmin" al recargar.

## Limitar admin a 2

No hay enforcement automático en el código (Firestore no tiene unique constraints). El SuperAdmin debe revisar `admins/` periódicamente. Posible mejora: hook en el momento de crear admin que cuente y rechace si > 2.

---

*Sin excusas. Sin permisos confusos.*
