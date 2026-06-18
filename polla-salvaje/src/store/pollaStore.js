import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { safeStorage } from '../services/safeStorage'

/**
 * Sesión de Polla Mundialista Salvaje.
 * Guarda el usuario actual para que no tenga que volver a ingresar su correo.
 * Usa `safeStorage` (cae a memoria si el navegador bloquea localStorage).
 */
export const usePollaStore = create(
  persist(
    (set) => ({
      user: null, // { id, fullName, email, phone }
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'polla_salvaje_session', storage: createJSONStorage(() => safeStorage) },
  ),
)
