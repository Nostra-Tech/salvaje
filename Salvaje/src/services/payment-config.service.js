import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const CONFIG_DOC = 'payment_qr_config/main'

export async function getPaymentConfig() {
  const snap = await getDoc(doc(db, 'payment_qr_config', 'main'))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function savePaymentConfig(data, adminUid) {
  await setDoc(doc(db, 'payment_qr_config', 'main'), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
  }, { merge: true })
}
