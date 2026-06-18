/**
 * Escudos de selecciones del Mundial 2026 (mismo set que usa la app de la polla).
 * Resuelve un URL de escudo a partir del nombre canónico ES de la selección.
 */
export const worldCupBadges = {
  'México': 'https://r2.thesportsdb.com/images/media/team/badge/3rmosi1748525208.png',
  'Sudáfrica': 'https://r2.thesportsdb.com/images/media/team/badge/xjz9j91553368824.png',
  'República de Corea': 'https://r2.thesportsdb.com/images/media/team/badge/a8nqfs1589564916.png',
  'Canadá': 'https://r2.thesportsdb.com/images/media/team/badge/2t631f1595154867.png',
  'Catar': 'https://r2.thesportsdb.com/images/media/team/badge/rs3ir31642708685.png',
  'Suiza': 'https://r2.thesportsdb.com/images/media/team/badge/mb7yqe1717365808.png',
  'Brasil': 'https://r2.thesportsdb.com/images/media/team/badge/jl6dip1726167280.png',
  'Marruecos': 'https://r2.thesportsdb.com/images/media/team/badge/hbmwkj1731791275.png',
  'Haití': 'https://r2.thesportsdb.com/images/media/team/badge/gml8wx1598135302.png',
  'Escocia': 'https://r2.thesportsdb.com/images/media/team/badge/3691i11552945146.png',
  'Estados Unidos': 'https://r2.thesportsdb.com/images/media/team/badge/21f0oi1597948195.png',
  'Paraguay': 'https://r2.thesportsdb.com/images/media/team/badge/khgav41553419195.png',
  'Australia': 'https://r2.thesportsdb.com/images/media/team/badge/lark6k1661780848.png',
  'Alemania': 'https://r2.thesportsdb.com/images/media/team/badge/1xysi51726167152.png',
  'Curazao': 'https://r2.thesportsdb.com/images/media/team/badge/itygvb1600955363.png',
  'Costa de Marfil': 'https://r2.thesportsdb.com/images/media/team/badge/rwxuuu1455465643.png',
  'Ecuador': 'https://r2.thesportsdb.com/images/media/team/badge/47wv2y1591989301.png',
  'Países Bajos': 'https://r2.thesportsdb.com/images/media/team/badge/1p0hr41593787110.png',
  'Japón': 'https://r2.thesportsdb.com/images/media/team/badge/ffsyxz1591989843.png',
  'Túnez': 'https://r2.thesportsdb.com/images/media/team/badge/7r89rg1526727277.png',
  'Bélgica': 'https://r2.thesportsdb.com/images/media/team/badge/8xlvxv1592062265.png',
  'Egipto': 'https://r2.thesportsdb.com/images/media/team/badge/uheyzo1742102234.png',
  'RI de Irán': 'https://r2.thesportsdb.com/images/media/team/badge/uttpvw1455465617.png',
  'Nueva Zelanda': 'https://r2.thesportsdb.com/images/media/team/badge/91xpk81742982935.png',
  'España': 'https://r2.thesportsdb.com/images/media/team/badge/ncgqyr1726166942.png',
  'Islas de Cabo Verde': 'https://r2.thesportsdb.com/images/media/team/badge/5jn0o71593280376.png',
  'Arabia Saudí': 'https://r2.thesportsdb.com/images/media/team/badge/24xwpq1594125742.png',
  'Uruguay': 'https://r2.thesportsdb.com/images/media/team/badge/6vjbr11726167756.png',
  'FRANCIA': 'https://r2.thesportsdb.com/images/media/team/badge/p3n0z51726166851.png',
  'Senegal': 'https://r2.thesportsdb.com/images/media/team/badge/wh8dya1526727459.png',
  'Noruega': 'https://r2.thesportsdb.com/images/media/team/badge/gyfn811591973155.png',
  'Argentina': 'https://r2.thesportsdb.com/images/media/team/badge/3zplhu1726167477.png',
  'Argelia': 'https://r2.thesportsdb.com/images/media/team/badge/rrwpry1455460218.png',
  'Austria': 'https://r2.thesportsdb.com/images/media/team/badge/874p631628721400.png',
  'Jordania': 'https://r2.thesportsdb.com/images/media/team/badge/59fo2s1742100034.png',
  'Portugal': 'https://r2.thesportsdb.com/images/media/team/badge/swqvpy1455466083.png',
  'Colombia': 'https://r2.thesportsdb.com/images/media/team/badge/4ymyku1691180081.png',
  'Uzbekistán': 'https://r2.thesportsdb.com/images/media/team/badge/u5bgze1597943605.png',
  'Inglaterra': 'https://r2.thesportsdb.com/images/media/team/badge/vf5ttc1726166739.png',
  'Croacia': 'https://r2.thesportsdb.com/images/media/team/badge/vvtsyu1455465317.png',
  'Ghana': 'https://r2.thesportsdb.com/images/media/team/badge/j589xw1751526124.png',
  'Panamá': 'https://r2.thesportsdb.com/images/media/team/badge/asp2ck1715849700.png',
  'Rep. Checa': 'https://r2.thesportsdb.com/images/media/team/badge/1o0cx31654205806.png',
  'Irak': 'https://r2.thesportsdb.com/images/media/team/badge/aqidfn1742100110.png',
  'RD Congo': 'https://r2.thesportsdb.com/images/media/team/badge/s85jjw1728749022.png/medium',
}

export const WC_FALLBACK_BADGE =
  'https://r2.thesportsdb.com/images/media/league/badge/e7er5g1696521789.png'

function _norm(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const _cache = new Map()
for (const [k, v] of Object.entries(worldCupBadges)) _cache.set(_norm(k), v)

/** Devuelve el escudo de un equipo (con fallback garantizado). */
export function getBadge(teamName) {
  if (!teamName) return WC_FALLBACK_BADGE
  if (worldCupBadges[teamName]) return worldCupBadges[teamName]
  const norm = _norm(teamName)
  if (_cache.has(norm)) return _cache.get(norm)
  for (const [key, url] of _cache) {
    if (key.length >= 4 && (norm.includes(key) || key.includes(norm))) return url
  }
  return WC_FALLBACK_BADGE
}
