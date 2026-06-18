import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarOpen: false,
  notificationPanelOpen: false,
  activeModal: null,
  modalData: null,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}))
