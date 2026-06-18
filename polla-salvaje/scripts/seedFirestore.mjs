// Siembra pronósticos de PRUEBA en Firestore (proyecto salvaje-app).
// Marca cada doc con seed:true e ids con prefijo "seed_" para borrarlos luego.
// Uso: node scripts/seedFirestore.mjs
import { initializeApp } from 'firebase/app'
import { initializeFirestore, doc, setDoc } from 'firebase/firestore'

const cfg = {
  apiKey: 'AIzaSyCVAmWO1xnvbKJT14rAtRPe48Ee0x4mqII',
  authDomain: 'salvaje-app.firebaseapp.com',
  projectId: 'salvaje-app',
  storageBucket: 'salvaje-app.firebasestorage.app',
  messagingSenderId: '862256463582',
  appId: '1:862256463582:web:fb233538fb6557ae6a8c4f',
}
const app = initializeApp(cfg)
const db = initializeFirestore(app, { experimentalForceLongPolling: true })

const GROUPS = {
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
}
const LETTERS = Object.keys(GROUPS)

const genScores = (off, count) => {
  const s = {}
  for (let i = 0; i < count; i++) s[`g${i + 1}`] = { a: String((off + i) % 4), b: String((off + i * 2 + 1) % 3) }
  return s
}
const genQuals = (off) => {
  const q = {}
  LETTERS.forEach((g, gi) => {
    const t = GROUPS[g]
    q[g] = { first: t[(off + gi) % 4], second: t[(off + gi + 1) % 4] }
  })
  return q
}
const genThirds = (off) => LETTERS.slice(0, 8).map((g, gi) => GROUPS[g][(off + gi + 2) % 4])

const PEOPLE = [
  { name: 'Carlos Ramírez', off: 1, scores: 72, avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { name: 'Valentina Ortiz', off: 2, scores: 72, avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { name: 'Andrés Gómez', off: 3, scores: 60, avatar: 'https://randomuser.me/api/portraits/men/45.jpg' },
  { name: 'Laura Méndez', off: 0, scores: 50, avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
  { name: 'Juan Díaz', off: 2, scores: 72, avatar: 'https://randomuser.me/api/portraits/men/12.jpg' },
  { name: 'Camila Torres', off: 1, scores: 45, avatar: 'https://randomuser.me/api/portraits/women/21.jpg' },
  { name: 'Mateo Rojas', off: 3, scores: 72, avatar: 'https://randomuser.me/api/portraits/men/76.jpg' },
  { name: 'Daniela Castro', off: 0, scores: 30, avatar: 'https://randomuser.me/api/portraits/women/9.jpg' },
]

const slug = (n) =>
  n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '')

const run = async () => {
  for (let i = 0; i < PEOPLE.length; i++) {
    const p = PEOPLE[i]
    const id = `seed_${slug(p.name)}@demo.polla`
    await setDoc(doc(db, 'polla_users', id), {
      fullName: p.name,
      email: id,
      phone: `30${String(20000000 + i * 311).slice(0, 8)}`,
      avatar: p.avatar,
      createdAt: Date.now(),
      seed: true,
    })
    await setDoc(doc(db, 'polla_predictions', id), {
      scores: genScores(p.off, p.scores),
      qualifiers: genQuals(p.off),
      bestThirds: genThirds(p.off),
      seed: true,
    })
    console.log('sembrado:', p.name)
  }
  console.log('Listo:', PEOPLE.length, 'participantes de prueba')
  process.exit(0)
}
run().catch((e) => {
  console.error('ERROR:', e)
  process.exit(1)
})
