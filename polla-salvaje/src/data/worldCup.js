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

// Finales (Campeón, Subcampeón, Goleador): editables hasta el 18 de junio de 2026
// a las 11:59 p. m. (hora Colombia).
export const FINALS_DEADLINE_MS = new Date('2026-06-18T23:59:00-05:00').getTime();
export const FINALS_DEADLINE_LABEL = '18 jun 2026, 11:59 p. m.';

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

/** Día corto legible a partir del `date` largo en español. */
export function shortDate(date) {
  // "Jueves, 11 de junio 2026" -> "Jue 11 jun"
  const m = /^(\w{3})\w*, (\d{1,2}) de (\w{3})/.exec(date);
  if (!m) return date;
  return `${m[1]} ${m[2]} ${m[3]}`;
}
