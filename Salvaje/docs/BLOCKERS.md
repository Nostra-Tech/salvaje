# 🔴 BLOCKERS — LIMPIEZA FIRESTORE SALVAJE

## Estado: EN PROGRESO

### Bloqueador 1: Firebase Admin SDK Credentials
- **Problema**: No existe serviceAccountKey.json en el proyecto
- **Solución**: Descargar desde Firebase Console → Project Settings → Service Accounts → Generate new private key
- **Instrucciones**:
  1. Ve a https://console.firebase.google.com
  2. Selecciona proyecto "salvaje-app"
  3. ⚙️ (engranaje) → Project Settings → Service Accounts
  4. Click en "Generate New Private Key"
  5. Se descargará un JSON — nómbralo serviceAccountKey.json y ponlo en la raíz del proyecto
  6. ⚠️ NO hacer commit a Git — está en .gitignore

### Bloqueador 2: Credenciales cargadas

- **Estado**: ⏳ Esperando archivo

---

## Checklist de Ejecución

- [ ] PASO 1: Obtener serviceAccountKey.json
- [ ] PASO 2: Identificar y confirmar UID del superadmin
- [ ] PASO 3: Confirmación explícita del usuario antes de borrar datos
- [ ] PASO 4: Ejecutar script de limpieza (IRREVERSIBLE)
- [ ] PASO 5: Ejecutar script de configuración base
- [ ] PASO 6: Verificar en Firebase Console
- [ ] PASO 7: Limpiar archivos temporales

---

## Notas Técnicas

**Proyecto**: salvaje-app (Firebase)

**Configuración encontrada**:
- ✅ .env con credenciales públicas
- ✅ firebase.json con estructura del proyecto
- ❌ serviceAccountKey.json (REQUERIDO)

**Última actualización**: 2026-04-28
