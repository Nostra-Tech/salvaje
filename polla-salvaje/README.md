# Polla Mundialista Salvaje ⚽🔥

Polla mundialista de la comunidad **Salvaje** para el Mundial 2026. Los usuarios se
registran, pronostican **marcadores** de los 72 partidos de fase de grupos y eligen
los **clasificados a dieciseisavos** (1º y 2º de cada grupo + los 8 mejores terceros
= 32 equipos), y compiten en un **ranking** en tiempo real.

Mismo branding que el sistema Salvaje (colores, tipografías y sombras de marca).

## Stack

- React 18 + Vite
- Tailwind CSS (tokens de marca `salvaje-*`)
- Firebase Firestore (reutiliza el proyecto `salvaje-app`)
- Zustand (sesión) · React Router · Framer Motion · lucide-react

Datos de partidos y escudos extraídos del proyecto **Calendario** (`luxury-calendar`).

## Puntaje (Estándar)

| Acierto                         | Puntos |
| ------------------------------- | ------ |
| Marcador exacto                 | 3      |
| Resultado correcto (gana/empata)| 1      |
| Clasificado a dieciseisavos      | 2      |

Clasificados = los 32 que avanzan: 1º y 2º de cada grupo + los 8 mejores terceros.
Se puntúa por equipo acertado (posición-independiente).

Se ajusta en `src/services/scoring.js` (`SCORING`).

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # build de producción en dist/
npm run preview  # previsualiza el build
```

### Configuración (.env)

Ya viene con la config de Firebase de Salvaje. Define los administradores:

```
VITE_POLLA_ADMINS=correo1@dominio.com,correo2@dominio.com
```

Los admins ven la pestaña **Admin** para cargar los resultados oficiales (marcadores
y clasificados). Al guardar, el ranking de todos se recalcula.

### Reglas de Firestore (IMPORTANTE)

El registro es **sin contraseña**, así que las colecciones de la polla deben permitir
escritura abierta. Aplica las reglas de [`firestore.rules.txt`](./firestore.rules.txt)
en la consola de Firebase (proyecto `salvaje-app`) **sin borrar** las reglas del gimnasio.

Colecciones que usa: `polla_users`, `polla_predictions`, `polla_results`.

## Flujo

1. **Registro** — nombre completo, correo y celular. El correo es el identificador;
   para volver a entrar se usa solo el correo (pestaña "Ya tengo cuenta").
2. **Mis pronósticos** — pestaña *Marcadores* (72 partidos por fecha) y *Clasificados*
   (1º/2º por grupo). Se guarda en Firestore; se puede editar hasta que el admin cargue
   el resultado oficial (ahí se bloquea ese partido/grupo).
3. **Ranking** — tabla de posiciones recalculada contra los resultados oficiales.
4. **Admin** — panel para cargar marcadores y clasificados oficiales.

## Estructura

```
src/
  data/        worldCup.js (72 partidos + grupos) · worldCupBadges.js (escudos)
  services/    firebase.js · polla.service.js · scoring.js
  store/       pollaStore.js (sesión persistida)
  components/  Header · Logo · Countdown · TeamBadge · MatchScoreCard · QualifierGroupCard · Toast · Spinner
  pages/       Register · Predict · Leaderboard · Admin
```
