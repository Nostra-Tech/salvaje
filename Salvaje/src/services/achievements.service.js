import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion, collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import { ACHIEVEMENTS } from '../utils/constants'

export async function checkAndUnlockAchievements(userId) {
  const userSnap = await getDoc(doc(db, 'users', userId))
  if (!userSnap.exists()) return []
  const user = userSnap.data()

  // V6 Ajuste 12: count paid (confirmed) memberships, excluding cortesía.
  let paidMemberships = 0
  try {
    const pq = query(
      collection(db, 'membership_purchases'),
      where('userId', '==', userId),
      where('paymentStatus', '==', 'confirmed')
    )
    const ps = await getDocs(pq)
    paidMemberships = ps.docs.filter((d) => {
      const t = (d.data().membershipType || '').toLowerCase()
      return t && t !== 'free_trial' && t !== 'courtesy' && t !== 'trial'
    }).length
  } catch { /* ignore */ }

  const unlocked = [...(user.unlockedAchievements || [])]
  const newUnlocks = []

  for (const ach of ACHIEVEMENTS) {
    if (unlocked.includes(ach.key)) continue
    let shouldUnlock = false

    if (ach.type === 'classes_count' && user.classesAttended >= ach.requirement) shouldUnlock = true
    if (ach.type === 'streak' && user.currentStreak >= ach.requirement) shouldUnlock = true
    if (ach.type === 'referrals' && user.referralsCount >= ach.requirement) shouldUnlock = true
    if (ach.type === 'paid_memberships' && paidMemberships >= ach.requirement) shouldUnlock = true

    if (shouldUnlock) newUnlocks.push(ach.key)
  }

  if (newUnlocks.length > 0) {
    await updateDoc(doc(db, 'users', userId), {
      unlockedAchievements: arrayUnion(...newUnlocks),
      updatedAt: serverTimestamp(),
    })

    for (const key of newUnlocks) {
      const ach = ACHIEVEMENTS.find((a) => a.key === key)
      await addDoc(collection(db, 'notifications'), {
        recipientId: userId,
        recipientRole: 'user',
        type: 'achievement_unlocked',
        title: `Logro desbloqueado: ${ach.name}`,
        body: ach.description,
        relatedId: key,
        relatedCollection: 'achievements',
        isRead: false,
        sentAt: serverTimestamp(),
        readAt: null,
        createdAt: serverTimestamp(),
      })
    }
  }

  return newUnlocks
}
