import SQUADS from './squads.json'

// Algunas selecciones usan un nombre distinto en las fixtures vs. los convocados.
const ALIAS = {
  'RI de Irán': 'Irán',
  'Islas de Cabo Verde': 'Cabo Verde',
  FRANCIA: 'Francia',
}

/**
 * Devuelve los jugadores convocados de una selección, ordenados por goles desc.
 * Cada jugador: { n: nombre, p: posición, g: goles, c: partidos }.
 */
export function getSquad(team) {
  const key = ALIAS[team] || team
  const arr = SQUADS[key] || SQUADS[team] || []
  return [...arr].sort((a, b) => (b.g || 0) - (a.g || 0))
}
