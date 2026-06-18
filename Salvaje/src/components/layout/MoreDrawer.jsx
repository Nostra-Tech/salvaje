import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { logout } from '../../services/auth.service'
import { Avatar } from '../ui/Avatar'

export function MoreDrawer({ open, onClose, items }) {
  const { profile, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-salvaje-light rounded-t-3xl max-h-[85vh] flex flex-col lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle + header */}
            <div className="flex flex-col items-center pt-3 pb-2">
              <div className="w-10 h-1 bg-salvaje-cream rounded-full mb-3" />
              <div className="w-full px-5 flex items-center justify-between">
                <h2 className="font-display text-2xl uppercase text-salvaje-dark">Más</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-salvaje-cream/50 flex items-center justify-center text-salvaje-dark hover:bg-salvaje-cream"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
              <div className="grid grid-cols-3 gap-2.5">
                {items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                        isActive
                          ? 'bg-salvaje-orange text-white shadow-salvaje'
                          : 'bg-white text-salvaje-dark hover:bg-salvaje-cream/30 shadow-salvaje'
                      }`
                    }
                  >
                    <Icon size={24} strokeWidth={1.75} />
                    <span className="font-body text-xs font-medium text-center leading-tight">{label}</span>
                  </NavLink>
                ))}
              </div>

              {/* User block + logout */}
              <div className="mt-5 pt-4 border-t border-salvaje-cream">
                <div className="flex items-center gap-3 px-1 mb-3">
                  <Avatar src={profile?.profilePhotoURL} name={profile?.displayName || user?.email} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{profile?.displayName}</p>
                    <p className="font-body text-xs text-salvaje-gray truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-salvaje-dark text-white font-body text-sm font-medium hover:bg-salvaje-brown transition-all"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
