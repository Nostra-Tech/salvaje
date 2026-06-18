import { useEffect, useState } from 'react'
import { subscribeToNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } from '../services/notifications.service'

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const unsub = subscribeToNotifications(
      userId,
      (notifs) => {
        setNotifications(notifs)
        setLoading(false)
      },
      (err) => {
        console.error('[useNotifications] error:', err?.code, err?.message)
        setLoading(false)
      }
    )

    return unsub
  }, [userId])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const read = (notifId) => markAsRead(notifId)
  const readAll = () => markAllAsRead(userId)
  const remove = (notifId) => {
    // Optimista: quítala de la lista al instante.
    setNotifications((prev) => prev.filter((n) => n.id !== notifId))
    return deleteNotification(notifId)
  }
  const removeAll = () => {
    setNotifications([])
    return deleteAllNotifications(userId)
  }

  return { notifications, unreadCount, loading, read, readAll, remove, removeAll }
}
