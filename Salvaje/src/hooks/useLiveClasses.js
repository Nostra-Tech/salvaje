import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'

/**
 * Real-time listener of all classes currently in_progress.
 * Used in AdminHome to show "live classes" card.
 */
export function useLiveClasses() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'classes'), where('status', '==', 'in_progress'))
    const unsub = onSnapshot(q, (snap) => {
      setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  return { classes, loading }
}
