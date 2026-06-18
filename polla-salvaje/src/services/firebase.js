import { initializeApp } from 'firebase/app'
import { initializeFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

// Auto-detecta si la red necesita long-polling (proxies/redes corporativas que
// bloquean WebSocket). Sin esto, Firestore se cuelga y la app cae a modo local.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
})

export default app
