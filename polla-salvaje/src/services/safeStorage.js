/**
 * Almacenamiento resiliente con interfaz tipo `Storage`.
 *
 * Usa localStorage cuando está disponible; si el navegador lo tiene bloqueado o
 * con cuota en cero (lanza QuotaExceededError / SecurityError), cae a un almacén
 * EN MEMORIA para que la app siga funcionando durante la sesión (sin persistir
 * entre recargas). Lo usan el backend demo y la sesión (zustand persist).
 */

const mem = new Map()
let useMem = false

export function isMemoryFallback() {
  return useMem
}

export const safeStorage = {
  getItem(key) {
    if (useMem) return mem.has(key) ? mem.get(key) : null
    try {
      return localStorage.getItem(key)
    } catch {
      useMem = true
      return mem.has(key) ? mem.get(key) : null
    }
  },

  setItem(key, value) {
    const v = String(value)
    // Siempre guarda en memoria primero (fuente de verdad si localStorage falla).
    mem.set(key, v)
    if (useMem) return
    try {
      localStorage.setItem(key, v)
    } catch {
      // Cuota/seguridad: a partir de aquí, todo en memoria.
      useMem = true
    }
  },

  removeItem(key) {
    mem.delete(key)
    if (useMem) return
    try {
      localStorage.removeItem(key)
    } catch {
      useMem = true
    }
  },
}
