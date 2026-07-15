/**
 * Datos del Mundial 2026 — fase de grupos.
 * Extraído del proyecto Calendario (luxury-calendar / worldCupData.js).
 *
 * - GROUPS: las 12 selecciones por grupo (nombres canónicos, resuelven escudo).
 * - GROUP_MATCHES: los 72 partidos de fase de grupos con ID estable (g1..g72).
 *
 * Cada partido: { id, group, teamA, teamB, date, time, stadium }
 */

export const GROUPS = {
  A: ['México', 'Sudáfrica', 'República de Corea', 'Rep. Checa'],
  B: ['Canadá', 'Catar', 'Suiza', 'Bosnia'],
  C: ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
  D: ['Estados Unidos', 'Paraguay', 'Australia', 'Turquía'],
  E: ['Alemania', 'Curazao', 'Costa de Marfil', 'Ecuador'],
  F: ['Países Bajos', 'Japón', 'Túnez', 'Suecia'],
  G: ['Bélgica', 'Egipto', 'RI de Irán', 'Nueva Zelanda'],
  H: ['España', 'Islas de Cabo Verde', 'Arabia Saudí', 'Uruguay'],
  I: ['FRANCIA', 'Senegal', 'Noruega', 'Irak'],
  J: ['Argentina', 'Argelia', 'Austria', 'Jordania'],
  K: ['Portugal', 'Colombia', 'Uzbekistán', 'RD Congo'],
  L: ['Inglaterra', 'Croacia', 'Ghana', 'Panamá'],
};

export const GROUP_LETTERS = Object.keys(GROUPS);

// prettier-ignore
const RAW = [
  ['A', 'México', 'Sudáfrica', 'Jueves, 11 de junio 2026', '14:00', 'Estadio Ciudad de México'],
  ['A', 'República de Corea', 'Rep. Checa', 'Jueves, 11 de junio 2026', '21:00', 'Estadio Guadalajara'],
  ['B', 'Canadá', 'Bosnia', 'Viernes, 12 de junio 2026', '14:00', 'Estadio Toronto'],
  ['D', 'Estados Unidos', 'Paraguay', 'Viernes, 12 de junio 2026', '20:00', 'Estadio Los Ángeles'],
  ['B', 'Catar', 'Suiza', 'Sábado, 13 de junio 2026', '14:00', 'Estadio Bahía de San Francisco'],
  ['C', 'Brasil', 'Marruecos', 'Sábado, 13 de junio 2026', '17:00', 'Estadio Nueva York Nueva Jersey'],
  ['C', 'Haití', 'Escocia', 'Sábado, 13 de junio 2026', '20:00', 'Estadio Boston'],
  ['D', 'Australia', 'Turquía', 'Sábado, 13 de junio 2026', '23:00', 'Estadio BC Place Vancouver'],
  ['E', 'Alemania', 'Curazao', 'Domingo, 14 de junio 2026', '12:00', 'Estadio Houston'],
  ['F', 'Países Bajos', 'Japón', 'Domingo, 14 de junio 2026', '15:00', 'Estadio Dallas'],
  ['E', 'Costa de Marfil', 'Ecuador', 'Domingo, 14 de junio 2026', '18:00', 'Estadio Filadelfia'],
  ['F', 'Suecia', 'Túnez', 'Domingo, 14 de junio 2026', '21:00', 'Estadio Monterrey'],
  ['H', 'España', 'Islas de Cabo Verde', 'Lunes, 15 de junio 2026', '11:00', 'Estadio Atlanta'],
  ['G', 'Bélgica', 'Egipto', 'Lunes, 15 de junio 2026', '14:00', 'Estadio Seattle'],
  ['H', 'Arabia Saudí', 'Uruguay', 'Lunes, 15 de junio 2026', '17:00', 'Estadio Miami'],
  ['G', 'RI de Irán', 'Nueva Zelanda', 'Lunes, 15 de junio 2026', '20:00', 'Estadio Los Ángeles'],
  ['I', 'FRANCIA', 'Senegal', 'Martes, 16 de junio 2026', '14:00', 'Estadio Nueva York Nueva Jersey'],
  ['I', 'Irak', 'Noruega', 'Martes, 16 de junio 2026', '17:00', 'Estadio Boston'],
  ['J', 'Argentina', 'Argelia', 'Martes, 16 de junio 2026', '20:00', 'Estadio Kansas City'],
  ['J', 'Austria', 'Jordania', 'Martes, 16 de junio 2026', '23:00', 'Estadio Bahía de San Francisco'],
  ['K', 'Portugal', 'RD Congo', 'Miércoles, 17 de junio 2026', '12:00', 'Estadio Houston'],
  ['L', 'Inglaterra', 'Croacia', 'Miércoles, 17 de junio 2026', '15:00', 'Estadio Dallas'],
  ['L', 'Ghana', 'Panamá', 'Miércoles, 17 de junio 2026', '18:00', 'Estadio Toronto'],
  ['K', 'Uzbekistán', 'Colombia', 'Miércoles, 17 de junio 2026', '21:00', 'Estadio Ciudad de México'],
  ['A', 'Rep. Checa', 'Sudáfrica', 'Jueves, 18 de junio 2026', '11:00', 'Estadio Atlanta'],
  ['B', 'Suiza', 'Bosnia', 'Jueves, 18 de junio 2026', '14:00', 'Estadio Los Ángeles'],
  ['B', 'Canadá', 'Catar', 'Jueves, 18 de junio 2026', '17:00', 'Estadio BC Place Vancouver'],
  ['A', 'México', 'República de Corea', 'Jueves, 18 de junio 2026', '20:00', 'Estadio Guadalajara'],
  ['D', 'Estados Unidos', 'Australia', 'Viernes, 19 de junio 2026', '14:00', 'Estadio Seattle'],
  ['C', 'Escocia', 'Marruecos', 'Viernes, 19 de junio 2026', '17:00', 'Estadio Boston'],
  ['C', 'Brasil', 'Haití', 'Viernes, 19 de junio 2026', '20:00', 'Estadio Filadelfia'],
  ['D', 'Turquía', 'Paraguay', 'Viernes, 19 de junio 2026', '23:00', 'Estadio Bahía de San Francisco'],
  ['F', 'Países Bajos', 'Suecia', 'Sábado, 20 de junio 2026', '12:00', 'Estadio Houston'],
  ['E', 'Alemania', 'Costa de Marfil', 'Sábado, 20 de junio 2026', '15:00', 'Estadio Toronto'],
  ['E', 'Ecuador', 'Curazao', 'Sábado, 20 de junio 2026', '21:00', 'Estadio Kansas City'],
  ['F', 'Túnez', 'Japón', 'Sábado, 20 de junio 2026', '23:00', 'Estadio Monterrey'],
  ['H', 'España', 'Arabia Saudí', 'Domingo, 21 de junio 2026', '11:00', 'Estadio Atlanta'],
  ['G', 'Bélgica', 'RI de Irán', 'Domingo, 21 de junio 2026', '14:00', 'Estadio Los Ángeles'],
  ['H', 'Uruguay', 'Islas de Cabo Verde', 'Domingo, 21 de junio 2026', '17:00', 'Estadio Miami'],
  ['G', 'Nueva Zelanda', 'Egipto', 'Domingo, 21 de junio 2026', '20:00', 'Estadio BC Place Vancouver'],
  ['J', 'Argentina', 'Austria', 'Lunes, 22 de junio 2026', '12:00', 'Estadio Dallas'],
  ['I', 'FRANCIA', 'Irak', 'Lunes, 22 de junio 2026', '16:00', 'Estadio Filadelfia'],
  ['I', 'Noruega', 'Senegal', 'Lunes, 22 de junio 2026', '19:00', 'Estadio Nueva York Nueva Jersey'],
  ['J', 'Jordania', 'Argelia', 'Lunes, 22 de junio 2026', '22:00', 'Estadio Bahía de San Francisco'],
  ['K', 'Portugal', 'Uzbekistán', 'Martes, 23 de junio 2026', '12:00', 'Estadio Houston'],
  ['L', 'Inglaterra', 'Ghana', 'Martes, 23 de junio 2026', '15:00', 'Estadio Boston'],
  ['L', 'Panamá', 'Croacia', 'Martes, 23 de junio 2026', '18:00', 'Estadio Toronto'],
  ['K', 'Colombia', 'RD Congo', 'Martes, 23 de junio 2026', '21:00', 'Estadio Guadalajara'],
  ['B', 'Suiza', 'Canadá', 'Miércoles, 24 de junio 2026', '14:00', 'Estadio BC Place Vancouver'],
  ['B', 'Bosnia', 'Catar', 'Miércoles, 24 de junio 2026', '14:00', 'Estadio Seattle'],
  ['C', 'Brasil', 'Escocia', 'Miércoles, 24 de junio 2026', '17:00', 'Estadio Miami'],
  ['C', 'Marruecos', 'Haití', 'Miércoles, 24 de junio 2026', '17:00', 'Estadio Atlanta'],
  ['A', 'Rep. Checa', 'México', 'Miércoles, 24 de junio 2026', '20:00', 'Estadio Ciudad de México'],
  ['A', 'Sudáfrica', 'República de Corea', 'Miércoles, 24 de junio 2026', '20:00', 'Estadio Monterrey'],
  ['E', 'Curazao', 'Costa de Marfil', 'Jueves, 25 de junio 2026', '15:00', 'Estadio Filadelfia'],
  ['E', 'Ecuador', 'Alemania', 'Jueves, 25 de junio 2026', '15:00', 'Estadio Nueva York Nueva Jersey'],
  ['F', 'Japón', 'Suecia', 'Jueves, 25 de junio 2026', '18:00', 'Estadio Dallas'],
  ['F', 'Túnez', 'Países Bajos', 'Jueves, 25 de junio 2026', '18:00', 'Estadio Kansas City'],
  ['D', 'Turquía', 'Estados Unidos', 'Jueves, 25 de junio 2026', '21:00', 'Estadio Los Ángeles'],
  ['D', 'Paraguay', 'Australia', 'Jueves, 25 de junio 2026', '21:00', 'Estadio Bahía de San Francisco'],
  ['I', 'Noruega', 'FRANCIA', 'Viernes, 26 de junio 2026', '14:00', 'Estadio Boston'],
  ['I', 'Senegal', 'Irak', 'Viernes, 26 de junio 2026', '14:00', 'Estadio Toronto'],
  ['H', 'Islas de Cabo Verde', 'Arabia Saudí', 'Viernes, 26 de junio 2026', '19:00', 'Estadio Houston'],
  ['H', 'Uruguay', 'España', 'Viernes, 26 de junio 2026', '19:00', 'Estadio Guadalajara'],
  ['G', 'Egipto', 'RI de Irán', 'Viernes, 26 de junio 2026', '22:00', 'Estadio Seattle'],
  ['G', 'Nueva Zelanda', 'Bélgica', 'Viernes, 26 de junio 2026', '22:00', 'Estadio BC Place Vancouver'],
  ['L', 'Panamá', 'Inglaterra', 'Sábado, 27 de junio 2026', '16:00', 'Estadio Nueva York Nueva Jersey'],
  ['L', 'Croacia', 'Ghana', 'Sábado, 27 de junio 2026', '16:00', 'Estadio Filadelfia'],
  ['K', 'Colombia', 'Portugal', 'Sábado, 27 de junio 2026', '18:30', 'Estadio Miami'],
  ['K', 'RD Congo', 'Uzbekistán', 'Sábado, 27 de junio 2026', '18:30', 'Estadio Atlanta'],
  ['J', 'Argelia', 'Austria', 'Sábado, 27 de junio 2026', '21:00', 'Estadio Kansas City'],
  ['J', 'Jordania', 'Argentina', 'Sábado, 27 de junio 2026', '21:00', 'Estadio Dallas'],
];

// ── Fechas y horas en hora de Colombia (UTC−05:00, sin horario de verano) ────
const MONTHS = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

/**
 * Convierte "Jueves, 11 de junio 2026" + "14:00" a un instante absoluto (ms),
 * interpretando la hora como hora Colombia (UTC−05:00).
 */
export function kickoffMs(date, time) {
  const m = /(\d{1,2}) de (\w+)\s+(\d{4})/.exec(date || '');
  if (!m) return NaN;
  const day = +m[1];
  const month = MONTHS[m[2].toLowerCase()];
  const year = +m[3];
  if (month == null) return NaN;
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  // ISO con offset fijo −05:00 → instante correcto sin depender del huso del navegador.
  return new Date(`${year}-${pad(month + 1)}-${pad(day)}T${pad(hh)}:${pad(mm)}:00-05:00`).getTime();
}

export const GROUP_MATCHES = RAW.map(([group, teamA, teamB, date, time, stadium], i) => ({
  id: `g${i + 1}`,
  group,
  teamA,
  teamB,
  date,
  time,
  stadium,
  kickoff: kickoffMs(date, time), // instante de inicio (ms, UTC)
}));

// ── Fase eliminatoria (rondas) ──────────────────────────────────────────────
// Solo los cruces YA DEFINIDOS. Cada ronda se pronostica igual que la fase de
// grupos: marcador editable hasta 5 min antes del partido y mismo motor de
// puntaje (5 pts exacto / 2 pts resultado). Nombres canónicos para resolver el
// escudo (deben existir en GROUPS). Los ids NO se renumeran (hay predicciones
// guardadas): dieciseisavos = k*, octavos = o*, etc.

// Dieciseisavos de final (1/16) — en orden de fecha/hora.
const R32_RAW = [
  ['k1', 'Sudáfrica', 'Canadá', 'Domingo, 28 de junio 2026', '14:00'],
  ['k2', 'Brasil', 'Japón', 'Lunes, 29 de junio 2026', '12:00'],
  ['k5', 'Alemania', 'Paraguay', 'Lunes, 29 de junio 2026', '15:30'],
  ['k3', 'Países Bajos', 'Marruecos', 'Lunes, 29 de junio 2026', '20:00'],
  ['k6', 'Costa de Marfil', 'Noruega', 'Martes, 30 de junio 2026', '12:00'],
  ['k7', 'FRANCIA', 'Suecia', 'Martes, 30 de junio 2026', '16:00'],
  ['k10', 'México', 'Ecuador', 'Martes, 30 de junio 2026', '20:00'],
  ['k11', 'Inglaterra', 'RD Congo', 'Miércoles, 1 de julio 2026', '11:00'],
  ['k12', 'Bélgica', 'Senegal', 'Miércoles, 1 de julio 2026', '15:00'],
  ['k4', 'Estados Unidos', 'Bosnia', 'Miércoles, 1 de julio 2026', '19:00'],
  ['k13', 'España', 'Austria', 'Jueves, 2 de julio 2026', '14:00'],
  ['k14', 'Portugal', 'Croacia', 'Jueves, 2 de julio 2026', '18:00'],
  ['k15', 'Suiza', 'Argelia', 'Jueves, 2 de julio 2026', '22:00'],
  ['k8', 'Australia', 'Egipto', 'Viernes, 3 de julio 2026', '13:00'],
  ['k9', 'Argentina', 'Islas de Cabo Verde', 'Viernes, 3 de julio 2026', '17:00'],
  ['k16', 'Colombia', 'Ghana', 'Viernes, 3 de julio 2026', '20:30'],
];

// Octavos de final (1/8), en orden de fecha/hora.
const O16_RAW = [
  ['o1', 'Canadá', 'Marruecos', 'Sábado, 4 de julio 2026', '12:00'],
  ['o2', 'Paraguay', 'FRANCIA', 'Sábado, 4 de julio 2026', '16:00'],
  ['o3', 'Brasil', 'Noruega', 'Domingo, 5 de julio 2026', '15:00'],
  ['o4', 'México', 'Inglaterra', 'Domingo, 5 de julio 2026', '19:00'],
  ['o6', 'Portugal', 'España', 'Lunes, 6 de julio 2026', '14:00'],
  ['o5', 'Estados Unidos', 'Bélgica', 'Lunes, 6 de julio 2026', '19:00'],
  ['o7', 'Argentina', 'Egipto', 'Martes, 7 de julio 2026', '11:00'],
  ['o8', 'Suiza', 'Colombia', 'Martes, 7 de julio 2026', '15:00'],
];

// Cuartos de final (1/4), en orden de fecha/hora.
const Q8_RAW = [
  ['q1', 'FRANCIA', 'Marruecos', 'Jueves, 9 de julio 2026', '15:00'],
  ['q2', 'España', 'Bélgica', 'Viernes, 10 de julio 2026', '14:00'],
  ['q3', 'Noruega', 'Inglaterra', 'Sábado, 11 de julio 2026', '16:00'],
  ['q4', 'Argentina', 'Suiza', 'Sábado, 11 de julio 2026', '20:00'],
];

// Semifinales (1/2).
const S4_RAW = [
  ['s1', 'FRANCIA', 'España', 'Martes, 14 de julio 2026', '14:00'],
  ['s2', 'Inglaterra', 'Argentina', 'Miércoles, 15 de julio 2026', '14:00'],
];

// Tercer puesto (3ª posición).
const P3_RAW = [
  ['t1', 'FRANCIA', 'Inglaterra', 'Sábado, 18 de julio 2026', '16:00'],
];

// La Final.
const F_RAW = [
  ['f1', 'España', 'Argentina', 'Domingo, 19 de julio 2026', '14:00'],
];

// Definición de rondas (orden cronológico). `minDate` (ISO) evita emparejar por
// error con un partido anterior entre las mismas selecciones al sincronizar los
// resultados oficiales desde la API.
const KNOCKOUT_ROUND_DEFS = [
  { key: 'R32', label: 'Dieciseisavos de final', short: '1/16', minDate: '2026-06-28', raw: R32_RAW },
  { key: 'R16', label: 'Octavos de final', short: '1/8', minDate: '2026-07-04', raw: O16_RAW },
  { key: 'R8', label: 'Cuartos de final', short: '1/4', minDate: '2026-07-09', raw: Q8_RAW },
  { key: 'R4', label: 'Semifinales', short: '1/2', minDate: '2026-07-14', raw: S4_RAW },
  { key: 'P3', label: 'Tercer puesto', short: '3ª posición', minDate: '2026-07-18', raw: P3_RAW },
  { key: 'F', label: 'La Final', short: 'Final', minDate: '2026-07-19', raw: F_RAW },
];

function buildKnockoutRound(def) {
  return def.raw.map(([id, teamA, teamB, date, time]) => ({
    id,
    round: def.key,
    roundLabel: def.label,
    teamA,
    teamB,
    date,
    time,
    stadium: '',
    kickoff: kickoffMs(date, time),
  }));
}

// Rondas con sus partidos ya construidos (para render por sección).
export const KNOCKOUT_ROUNDS = KNOCKOUT_ROUND_DEFS.map((d) => ({
  key: d.key,
  label: d.label,
  short: d.short,
  minDate: d.minDate,
  matches: buildKnockoutRound(d),
}));

// TODOS los partidos de eliminatorias (todas las rondas).
export const KNOCKOUT_MATCHES = KNOCKOUT_ROUNDS.flatMap((r) => r.matches);

// Etiqueta de la primera ronda (compatibilidad con imports existentes).
export const KNOCKOUT_ROUND_LABEL = KNOCKOUT_ROUNDS[0].label;

// Todos los partidos con marcador pronosticable (grupos + eliminatorias), en
// orden cronológico (los grupos terminan antes de que empiecen las eliminatorias).
export const ALL_MATCHES = [...GROUP_MATCHES, ...KNOCKOUT_MATCHES];
const MATCH_BY_ID = Object.fromEntries(ALL_MATCHES.map((m) => [m.id, m]));

/** Devuelve un partido (grupos o eliminatorias) por su id. */
export function getMatchById(id) {
  return MATCH_BY_ID[id] || null;
}

// ── Reglas de edición ────────────────────────────────────────────────────────
// Marcadores: editables hasta 5 minutos antes del inicio de cada partido.
export const SCORE_LOCK_MS = 5 * 60 * 1000;

// Clasificados (1º/2º/terceros): editables solo hasta el inicio de la Jornada 2,
// es decir el 18 de junio de 2026 a las 11:00 a. m. (hora Colombia).
export const QUALIFIERS_DEADLINE_MS = new Date('2026-06-18T11:00:00-05:00').getTime();

const _coDateTime = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  weekday: 'short', day: 'numeric', month: 'short',
  hour: 'numeric', minute: '2-digit', hour12: true,
});

/** Formatea un instante (ms) en hora Colombia, p. ej. "lun 15 jun, 2:00 p. m.". */
export function formatCO(ms) {
  if (!ms || Number.isNaN(ms)) return '';
  return _coDateTime.format(new Date(ms));
}

/** Etiqueta legible del cierre de clasificados (para mostrar al usuario). */
export const QUALIFIERS_DEADLINE_LABEL = '18 jun 2026, 11:00 a. m.';

// Inicio de los dieciseisavos de final = el primer partido (menor kickoff).
export const KNOCKOUT_START_MS = KNOCKOUT_MATCHES.reduce(
  (min, m) => (m.kickoff && !Number.isNaN(m.kickoff) ? Math.min(min, m.kickoff) : min),
  Infinity,
);

// Finales (Campeón, Subcampeón, Goleador): editables hasta el INICIO de los
// dieciseisavos de final (primer partido, hora Colombia). Después se bloquean.
export const FINALS_DEADLINE_MS = KNOCKOUT_START_MS;

const _coFinalsDeadlineFmt = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric', month: 'long', year: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true,
});
// p. ej. "28 de junio de 2026, 2:00 p. m."
export const FINALS_DEADLINE_LABEL = Number.isFinite(FINALS_DEADLINE_MS)
  ? _coFinalsDeadlineFmt.format(new Date(FINALS_DEADLINE_MS))
  : '';

/** ¿Ya cerró la edición de Campeón/Subcampeón/Goleador? */
export function isFinalsLocked(now = Date.now()) {
  return now >= FINALS_DEADLINE_MS;
}

/** Las 48 selecciones del Mundial (orden alfabético) — para los selectores. */
export const ALL_TEAMS = Array.from(new Set(Object.values(GROUPS).flat())).sort((a, b) =>
  a.localeCompare(b, 'es'),
);

/** ¿El marcador de este partido ya está bloqueado? (5 min antes del inicio). */
export function isScoreLocked(match, now = Date.now()) {
  if (!match?.kickoff || Number.isNaN(match.kickoff)) return false;
  return now >= match.kickoff - SCORE_LOCK_MS;
}

/**
 * ¿El partido YA COMENZÓ? (a partir de su kickoff, hora real). Se usa para
 * revelar los pronósticos de otros usuarios: nadie puede ver lo que pusieron los
 * demás antes de que empiece el partido.
 */
export function hasMatchStarted(match, now = Date.now()) {
  if (!match?.kickoff || Number.isNaN(match.kickoff)) return false;
  return now >= match.kickoff;
}

/** Instante (ms) en que se cierra la edición del marcador de un partido. */
export function scoreDeadlineMs(match) {
  if (!match?.kickoff || Number.isNaN(match.kickoff)) return NaN;
  return match.kickoff - SCORE_LOCK_MS;
}

/** ¿Ya cerró la edición de clasificados? (inicio de la Jornada 2). */
export function isQualifiersLocked(now = Date.now()) {
  return now >= QUALIFIERS_DEADLINE_MS;
}

/** Devuelve los partidos agrupados por fecha (manteniendo el orden cronológico). */
export function matchesByDate(matches = GROUP_MATCHES) {
  const map = new Map();
  for (const m of matches) {
    if (!map.has(m.date)) map.set(m.date, []);
    map.get(m.date).push(m);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

// Clave de día (YYYY-MM-DD) en hora Colombia. 'en-CA' formatea como YYYY-MM-DD,
// así que comparar dos claves con < / >= equivale a comparar fechas.
const _coDayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
});

/** Día calendario (YYYY-MM-DD, hora Colombia) de un instante en ms. */
export function coDateKey(ms) {
  if (!ms || Number.isNaN(ms)) return '';
  return _coDayKey.format(new Date(ms));
}

/**
 * Filtra grupos de días (los que devuelve `matchesByDate`) y deja SOLO el día de
 * hoy y los siguientes (hora Colombia). Los días ya pasados se ocultan: al día
 * siguiente, los partidos de ayer desaparecen y quedan los de hoy en adelante.
 * Un partido sigue visible todo su día aunque ya se haya jugado/bloqueado.
 */
export function upcomingDays(dayGroups = [], now = Date.now()) {
  const today = coDateKey(now);
  return dayGroups.filter(({ items }) => {
    const k = items.find((m) => m.kickoff && !Number.isNaN(m.kickoff))?.kickoff;
    return k ? coDateKey(k) >= today : true;
  });
}

/** Día corto legible a partir del `date` largo en español. */
export function shortDate(date) {
  // "Jueves, 11 de junio 2026" -> "Jue 11 jun"
  const m = /^(\w{3})\w*, (\d{1,2}) de (\w{3})/.exec(date);
  if (!m) return date;
  return `${m[1]} ${m[2]} ${m[3]}`;
}
