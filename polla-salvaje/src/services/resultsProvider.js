/**
 * Proveedor interno de resultados oficiales del Mundial 2026.
 *
 * Descarga los marcadores desde un dataset abierto, los empareja con las
 * fixtures de la polla (g1..g72) y escribe los resultados FINALIZADOS en
 * `polla_results/current`, de modo que el ranking existente los use
 * automáticamente. La fuente es de uso interno y NO se muestra en la interfaz.
 */
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { GROUP_MATCHES } from '../data/worldCup'

const FEED = 'https://raw.githubusercontent.com/martj42/international_results/master'

const norm = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

// Nombre en la polla (es) → posibles nombres en el feed (en). Se comparan normalizados.
const ALIASES = {
  'México': ['Mexico'],
  'Sudáfrica': ['South Africa'],
  'República de Corea': ['South Korea', 'Korea Republic'],
  'Rep. Checa': ['Czech Republic', 'Czechia'],
  'Canadá': ['Canada'],
  'Catar': ['Qatar'],
  'Suiza': ['Switzerland'],
  'Bosnia': ['Bosnia and Herzegovina'],
  'Brasil': ['Brazil'],
  'Marruecos': ['Morocco'],
  'Haití': ['Haiti'],
  'Escocia': ['Scotland'],
  'Estados Unidos': ['United States', 'USA'],
  'Paraguay': ['Paraguay'],
  'Australia': ['Australia'],
  'Turquía': ['Turkey', 'Türkiye', 'Turkiye'],
  'Alemania': ['Germany'],
  'Curazao': ['Curaçao', 'Curacao'],
  'Costa de Marfil': ['Ivory Coast', "Côte d'Ivoire", 'Cote d Ivoire'],
  'Ecuador': ['Ecuador'],
  'Países Bajos': ['Netherlands'],
  'Japón': ['Japan'],
  'Túnez': ['Tunisia'],
  'Suecia': ['Sweden'],
  'Bélgica': ['Belgium'],
  'Egipto': ['Egypt'],
  'RI de Irán': ['Iran', 'IR Iran'],
  'Nueva Zelanda': ['New Zealand'],
  'España': ['Spain'],
  'Islas de Cabo Verde': ['Cape Verde', 'Cabo Verde'],
  'Arabia Saudí': ['Saudi Arabia'],
  'Uruguay': ['Uruguay'],
  'FRANCIA': ['France'],
  'Senegal': ['Senegal'],
  'Noruega': ['Norway'],
  'Irak': ['Iraq'],
  'Argentina': ['Argentina'],
  'Argelia': ['Algeria'],
  'Austria': ['Austria'],
  'Jordania': ['Jordan'],
  'Portugal': ['Portugal'],
  'Colombia': ['Colombia'],
  'Uzbekistán': ['Uzbekistan'],
  'RD Congo': ['DR Congo', 'Democratic Republic of the Congo', 'Congo DR'],
  'Inglaterra': ['England'],
  'Croacia': ['Croatia'],
  'Ghana': ['Ghana'],
  'Panamá': ['Panama'],
}

const aliasNorms = (teamEs) => (ALIASES[teamEs] || [teamEs]).map(norm)

async function fetchFeed() {
  const cb = '?cb=' + Date.now()
  const r = await fetch(`${FEED}/results.csv${cb}`)
  if (!r.ok) throw new Error('feed')
  return r.text()
}

function parseResults(text) {
  const out = []
  const lines = text.split('\n')
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(',')
    if (p.length < 6) continue
    if (p[5] !== 'FIFA World Cup') continue // excluye eliminatorias
    if (p[0] < '2026-06-01') continue // solo 2026
    const hs = parseInt(p[3], 10)
    const as = parseInt(p[4], 10)
    const finished = !Number.isNaN(hs) && !Number.isNaN(as)
    out.push({ date: p[0], home: norm(p[1]), away: norm(p[2]), hs, as, finished })
  }
  return out
}

/** Construye { g1:{a,b}, ... } SOLO con partidos finalizados emparejados. */
function mapToFixtures(results) {
  const scores = {}
  for (const m of GROUP_MATCHES) {
    const A = aliasNorms(m.teamA)
    const B = aliasNorms(m.teamB)
    const r = results.find((x) =>
      x.finished &&
      ((A.includes(x.home) && B.includes(x.away)) || (A.includes(x.away) && B.includes(x.home))),
    )
    if (!r) continue
    const aIsHome = A.includes(r.home)
    scores[m.id] = aIsHome
      ? { a: String(r.hs), b: String(r.as) }
      : { a: String(r.as), b: String(r.hs) }
  }
  return scores
}

/**
 * Sincroniza los resultados oficiales finalizados hacia `polla_results/current`
 * (merge: no borra los ya existentes). Devuelve el objeto de marcadores o null.
 */
export async function syncOfficialResults() {
  try {
    const text = await fetchFeed()
    const scores = mapToFixtures(parseResults(text))
    if (Object.keys(scores).length === 0) return null
    await setDoc(
      doc(db, 'polla_results', 'current'),
      { scores, updatedAt: serverTimestamp() },
      { merge: true },
    )
    return scores
  } catch {
    // Silencioso: nunca exponemos la fuente.
    return null
  }
}
