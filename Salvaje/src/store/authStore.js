import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  profile: null,
  loading: true,
  initialized: false,
  // Pauses RoleGuard while a registration flow is creating the user doc
  registering: false,

  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  setRegistering: (registering) => set({ registering }),

  reset: () => set({ user: null, role: null, profile: null, loading: false }),
}))
