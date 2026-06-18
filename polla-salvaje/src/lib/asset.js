// Prefija la base de la app (p. ej. /pollamundialistasalvaje/ en producción) a un asset de /public.
// Vite NO reescribe rutas absolutas en strings de JSX, así que usamos esto.
export const asset = (p) => import.meta.env.BASE_URL + String(p).replace(/^\/+/, '')
