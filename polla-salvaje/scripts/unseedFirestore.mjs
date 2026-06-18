// Borra los pronósticos de PRUEBA sembrados (ids con prefijo "seed_").
// Uso: node scripts/unseedFirestore.mjs
import { initializeApp } from 'firebase/app'
import { initializeFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

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

const run = async () => {
  let n = 0
  for (const col of ['polla_users', 'polla_predictions']) {
    const snap = await getDocs(collection(db, col))
    for (const d of snap.docs) {
      if (d.id.startsWith('seed_') || d.data()?.seed === true) {
        await deleteDoc(doc(db, col, d.id))
        n++
      }
    }
  }
  console.log('Borrados', n, 'documentos de prueba')
  process.exit(0)
}
run().catch((e) => {
  console.error('ERROR:', e)
  process.exit(1)
})
