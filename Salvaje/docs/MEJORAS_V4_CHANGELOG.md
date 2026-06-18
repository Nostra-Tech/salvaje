# SALVAJE V4 — Changelog

**URL**: https://salvaje-app.web.app

---

## Bugs críticos resueltos

### AJUSTE 1 · Login borraba campos al primer intento
**Síntoma:** al ingresar email + contraseña por primera vez, los campos se vaciaban y había que volver a escribirlos. Solo al segundo intento entraba.

**Causa raíz:** clásico desfase entre el autofill del navegador (Chrome/Safari) y el `useState` de React. El navegador rellena el atributo `value` del `<input>` pero NO dispara `onChange`, así que las variables `email` y `password` siguen vacías. Al hacer clic en "Entrar", se enviaba `""` / `""` → fallaba con `auth/invalid-credential` → React rerenderiza con `value={email}` vacío → el campo "se borra" visualmente.

**Fix (`src/pages/Login.jsx`):**
1. Lectura por `FormData` al hacer submit — toma el valor real del DOM, sin depender de que `onChange` se haya disparado.
2. Sincronización de state después del submit, así el campo no se "vacía" si el login falla.
3. Atributos `name="email"` / `name="password"` para que `FormData` los capture.
4. Mensajes de error específicos: credenciales / muchos intentos / red.

### AJUSTE 5 · "Agregar clase" no guardaba (lunes)
**Síntoma:** al darle a "Agregar clase" en el plan semanal del coach, el modal abría, dejaba escribir, pero al guardar no pasaba nada.

**Causa raíz:** en `CoachWeeklyPlan.jsx` la guardia era:
```js
if (!addingClass) return
```
Cuando el día seleccionado era **lunes** (`dayIdx === 0`), `!0` es `true`, entonces el handler retornaba antes de guardar. Para martes-domingo (1-6) sí guardaba.

**Fix (`src/pages/coach/CoachWeeklyPlan.jsx`):**
1. Guardia explícita: `if (addingClass === null || addingClass === undefined) return`.
2. Validación de campos: nombre obligatorio, hora fin > hora inicio.
3. Toast de confirmación: *"Clase agregada · recuerda guardar el plan"*.
4. Botón "Cancelar" agregado al modal.

---

## Mejoras de UX

### AJUSTE 5b · Lista de ejercicios línea por línea
- Nuevo campo `exercises: string[]` en cada clase del plan semanal.
- Textarea con monospace que se parte por `\n` al guardar.
- Contador en vivo: "N ejercicios".
- Se muestra en la card del día: badge naranja con cantidad de ejercicios.
- `weekly-plan.service.approvePlan` propaga `exercises` al documento `classes/{id}` cuando el admin aprueba el plan.

### AJUSTE 2 · Tarifa por hora oculta para el coach
- Eliminada la card "Tarifa por hora" en `CoachPayroll`.
- Eliminado `{hourlyRate}/h` en el modal "Colilla de pago".
- El admin sigue viendo la tarifa en su panel — el coach solo ve totales.

### AJUSTE 3 · Histórico de pagos en drawer aparte
- Antes: lista inline al final de `CoachPayroll`, mezclada con período en curso.
- Ahora: botón "Histórico de pagos" → abre `PayrollHistoryDrawer` (panel lateral derecho).
- El drawer muestra:
  - Cantidad de períodos pagados.
  - Cards con período / clases / horas / fecha de pago / total ganado.
  - Botón "Ver colilla" por período → modal con detalle por clase.

### AJUSTE 4 · Fechas exactas de la quincena
- En `CoachHome`, card "Quincena actual" ahora muestra: `1 al 15 de mayo 2025` (rango real, no solo el código `2025-05-Q1`).
- Cálculo desde `periodForDate(now)` con `startDate.getDate()` y `endDate.getDate()`.

### AJUSTE 6 · Banner de clase activa en CoachHome
La `NextClassCard` ahora cambia de estado según la ventana horaria:

**🟢 VERDE — clase EN VIVO** (`status === 'in_progress'`)
- Gradiente verde + ring + dot pulsante.
- Badge blanco "EN VIVO".
- Botón "Continuar clase" + acción rápida "Registrar otro asistente".

**🟠 NARANJA — listo para iniciar** (15 min antes a 15 min después del fin)
- Gradiente naranja + ring + dot pulsante.
- Botón grande "INICIAR REGISTRO".

**Default — próxima clase**
- Card blanca normal con countdown ("Disponible para iniciar en N min").
- No distrae cuando aún no es hora.

**Tick auto:** un `setInterval` de 30s en `CoachHome` re-evalúa la ventana sin necesidad de recargar — el coach abre la app, espera, y la card cambia sola a naranja cuando se acerca la clase.

---

## Archivos modificados (V4)

```
src/pages/Login.jsx                       (FormData submit + autofill fix)
src/pages/coach/CoachWeeklyPlan.jsx       (bug lunes + ejercicios línea por línea)
src/services/weekly-plan.service.js       (propaga exercises al aprobar plan)
src/pages/coach/CoachPayroll.jsx          (oculta tarifa + drawer histórico)
src/pages/coach/CoachHome.jsx             (rango quincena + banner activo NARANJA/VERDE + tick 30s)
```

---

## Pendiente para V5

- Bundle splitting: `firebase` y `ui` chunks pasan 500KB.
- Limpieza de import dinámico/estático mixto en `notifications.service` y `payroll.service` (warnings de Vite).
- Pre-aggregated `analytics_cache` collection.
- Encriptación cliente-side de datos bancarios.

---

*Sin excusas. Sin límites.*
