import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', full: 'max-w-full mx-4' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-salvaje-dark/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full ${sizes[size]} bg-white rounded-t-2xl sm:rounded-2xl shadow-salvaje-lg max-h-[90vh] overflow-y-auto`}
          >
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-salvaje-cream">
                <h3 className="font-display text-xl uppercase text-salvaje-dark">{title}</h3>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-salvaje-light transition-colors text-salvaje-gray hover:text-salvaje-dark">
                  <X size={18} />
                </button>
              </div>
            )}
            {!title && (
              <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-salvaje-light hover:bg-salvaje-cream transition-colors text-salvaje-gray">
                <X size={18} />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
