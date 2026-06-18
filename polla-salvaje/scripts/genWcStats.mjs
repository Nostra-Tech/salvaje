import fs from 'fs'
import path from 'path'

const ROOT = process.argv[2]
const OUT = process.argv[3]

// Nombres openfootball (EN, incl. variantes históricas) -> canónico ES de la app.
const RAW_MAP = {
  Mexico: 'México',
  'South Africa': 'Sudáfrica',
  'South Korea': 'República de Corea',
  'Korea Republic': 'República de Corea',
  'Korea South': 'República de Corea',
  'Czech Republic': 'Rep. Checa',
  Czechia: 'Rep. Checa',
  Czechoslovakia: 'Rep. Checa',
  Canada: 'Canadá',
  Qatar: 'Catar',
  Switzerland: 'Suiza',
  'Bosnia and Herzegovina': 'Bosnia',
  'Bosnia-Herzegovina': 'Bosnia',
  Brazil: 'Brasil',
  Morocco: 'Marruecos',
  Haiti: 'Haití',
  Scotland: 'Escocia',
  'United States': 'Estados Unidos',
  USA: 'Estados Unidos',
  Paraguay: 'Paraguay',
  Australia: 'Australia',
  Turkey: 'Turquía',
  Germany: 'Alemania',
  'West Germany': 'Alemania',
  'Germany FR': 'Alemania',
  Curacao: 'Curazao',
  'Ivory Coast': 'Costa de Marfil',
  "Cote d'Ivoire": 'Costa de Marfil',
  Ecuador: 'Ecuador',
  Netherlands: 'Países Bajos',
  Japan: 'Japón',
  Tunisia: 'Túnez',
  Sweden: 'Suecia',
  Belgium: 'Bélgica',
  Egypt: 'Egipto',
  Iran: 'RI de Irán',
  'IR Iran': 'RI de Irán',
  'New Zealand': 'Nueva Zelanda',
  Spain: 'España',
  'Cape Verde': 'Islas de Cabo Verde',
  'Saudi Arabia': 'Arabia Saudí',
  Uruguay: 'Uruguay',
  France: 'FRANCIA',
  Senegal: 'Senegal',
  Norway: 'Noruega',
  Iraq: 'Irak',
  Argentina: 'Argentina',
  Algeria: 'Argelia',
  Austria: 'Austria',
  Jordan: 'Jordania',
  Portugal: 'Portugal',
  Colombia: 'Colombia',
  Uzbekistan: 'Uzbekistán',
  'DR Congo': 'RD Congo',
  Zaire: 'RD Congo',
  England: 'Inglaterra',
  Croatia: 'Croacia',
  Ghana: 'Ghana',
  Panama: 'Panamá',
}
const MAP = {}
for (const [k, v] of Object.entries(RAW_MAP)) MAP[k.toLowerCase()] = v
const mapTeam = (en) => MAP[en.trim().toLowerCase()] || null

function parseLine(line) {
  if (!line || line.includes('|') || line.includes('Group') || /^\s*\(/.test(line)) return null
  const at = line.indexOf('@')
  if (at < 0) return null // los partidos reales traen "@ estadio"
  const core = line.slice(0, at)
  const sm = /(\d{1,2})-(\d{1,2})/.exec(core) // primer marcador = tiempo reglamentario
  if (!sm) return null
  const g1 = +sm[1]
  const g2 = +sm[2]

  let a = core
    .slice(0, sm.index)
    .replace(/^\s*\w{3,}\s+\w{3,}\s+\d{1,2}\s+/, ' ') // "Sat Jul 3 "
    .replace(/^\s*\d{1,2}\s+\w+\.?\s+/, ' ') // "31 May ", "8 July "
    .replace(/\d{1,2}[:.]\d{2}\s*(?:UTC\S*)?\s*/, ' ') // "16:00 UTC-3 "
    .trim()

  let b = core
    .slice(sm.index + sm[0].length)
    .replace(/^\s*a\.?e\.?t\.?/i, ' ') // "a.e.t."
    .replace(/\([^)]*\)/g, ' ') // "(0-0, 0-0)"
    .replace(/,?\s*\d{1,2}-\d{1,2}\s*pen\.?/i, ' ') // "2-4 pen."
    .trim()

  if (!a || !b) return null
  if (!/[A-Za-zÀ-ÿ]/.test(a) || !/[A-Za-zÀ-ÿ]/.test(b)) return null
  return { a, b, g1, g2 }
}

function parseFile(file, year, seen, matches) {
  let txt
  try {
    txt = fs.readFileSync(file, 'utf8')
  } catch {
    return
  }
  for (const line of txt.split(/\r?\n/)) {
    const p = parseLine(line)
    if (!p) continue
    const key = `${year}|${p.a}|${p.b}|${p.g1}-${p.g2}`
    if (seen.has(key)) continue
    seen.add(key)
    matches.push({ year, a: p.a, b: p.b, g1: p.g1, g2: p.g2 })
  }
}

const teams = {}
const h2h = {}
const teamRec = (es) =>
  teams[es] || (teams[es] = { editions: new Set(), played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0 })

const dirs = fs.readdirSync(ROOT).filter((d) => /^\d{4}--/.test(d))
const all = []
for (const d of dirs) {
  const year = +d.slice(0, 4)
  const seen = new Set()
  const matches = []
  parseFile(path.join(ROOT, d, 'cup.txt'), year, seen, matches)
  parseFile(path.join(ROOT, d, 'cup_finals.txt'), year, seen, matches)
  all.push(...matches)
}

for (const m of all) {
  const e1 = mapTeam(m.a)
  const e2 = mapTeam(m.b)
  if (e1) {
    const r = teamRec(e1)
    r.editions.add(m.year)
    r.played++
    r.gf += m.g1
    r.ga += m.g2
    if (m.g1 > m.g2) r.win++
    else if (m.g1 < m.g2) r.loss++
    else r.draw++
  }
  if (e2) {
    const r = teamRec(e2)
    r.editions.add(m.year)
    r.played++
    r.gf += m.g2
    r.ga += m.g1
    if (m.g2 > m.g1) r.win++
    else if (m.g2 < m.g1) r.loss++
    else r.draw++
  }
  if (e1 && e2 && e1 !== e2) {
    const [x, y] = [e1, e2].sort()
    const rec = h2h[`${x}__${y}`] || (h2h[`${x}__${y}`] = { played: 0, w1: 0, draws: 0, w2: 0, gf1: 0, gf2: 0, scorelines: {} })
    const gx = e1 === x ? m.g1 : m.g2
    const gy = e1 === x ? m.g2 : m.g1
    rec.played++
    rec.gf1 += gx
    rec.gf2 += gy
    if (gx > gy) rec.w1++
    else if (gx < gy) rec.w2++
    else rec.draws++
    const sl = `${gx}-${gy}`
    rec.scorelines[sl] = (rec.scorelines[sl] || 0) + 1
  }
}

const teamsOut = {}
for (const [es, r] of Object.entries(teams)) {
  teamsOut[es] = { editions: r.editions.size, played: r.played, win: r.win, draw: r.draw, loss: r.loss, gf: r.gf, ga: r.ga }
}
const h2hOut = {}
for (const [k, r] of Object.entries(h2h)) {
  const top = Object.entries(r.scorelines)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s, c]) => ({ s, c }))
  h2hOut[k] = { played: r.played, w1: r.w1, draws: r.draws, w2: r.w2, gf1: r.gf1, gf2: r.gf2, top }
}

const out =
  '// AUTO-GENERADO desde openfootball/worldcup (https://github.com/openfootball/worldcup)\n' +
  '// Estadísticas históricas de Mundiales (1930-2022) por selección y head-to-head.\n' +
  '// Claves de equipo = nombres canónicos ES usados en la app.\n' +
  `export const WC_STATS = ${JSON.stringify({ teams: teamsOut, h2h: h2hOut })}\n`
fs.writeFileSync(OUT, out)

console.log('matches parsed:', all.length)
console.log('teams:', Object.keys(teamsOut).length, '· h2h pairs:', Object.keys(h2hOut).length)
console.log('Brasil:', JSON.stringify(teamsOut['Brasil']))
console.log('Alemania:', JSON.stringify(teamsOut['Alemania']))
console.log('Argentina:', JSON.stringify(teamsOut['Argentina']))
console.log('Curazao:', JSON.stringify(teamsOut['Curazao'] || 'sin historial'))
