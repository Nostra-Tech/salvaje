export const ROLES = {
  ADMIN: 'admin',
  COACH: 'coach',
  USER: 'user',
}

export const CLASS_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const MEMBERSHIP_TYPES = {
  NONE: 'none',
  FREE_TRIAL: 'free_trial',
  MONTHLY: 'monthly',
  TICKETERA: 'ticketera',
}

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
}

export const PLAN_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export const PAYROLL_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
}

export const TIMEZONE = 'America/Bogota'

// Tiempo en minutos despues del fin de clase para auto-cerrarla.
// Si el coach inicia la clase pero no la finaliza, igual se cierra
// pasados estos minutos del horario de fin programado.
export const CLASS_AUTO_FINALIZE_MIN = 10

export const ACHIEVEMENTS = [
  // V6 Ajuste 12 — first_class se desbloquea con la primera asistencia (incluye cortesía).
  { key: 'first_class', name: 'Primera Batalla', description: 'Completaste tu primera clase en SALVAJE', requirement: 1, type: 'classes_count', icon: 'Swords' },
  { key: 'warrior_10', name: 'Guerrero de 10', description: '10 clases completadas. La tribu te reconoce.', requirement: 10, type: 'classes_count', icon: 'Shield' },
  { key: 'full_month', name: 'Mes Completo', description: '20 clases en un mes', requirement: 20, type: 'classes_count', icon: 'Calendar' },
  { key: 'savage_streak', name: 'Racha Salvaje', description: '7 días consecutivos entrenando.', requirement: 7, type: 'streak', icon: 'Flame' },
  { key: 'godfather', name: 'Padrino de la Tribu', description: 'Trajiste a 1 salvaje a la tribu.', requirement: 1, type: 'referrals', icon: 'Users' },
  { key: 'legend', name: 'Leyenda Salvaje', description: '50 clases completadas', requirement: 50, type: 'classes_count', icon: 'Trophy' },
  { key: 'immortal', name: 'Inmortal', description: '30 días consecutivos', requirement: 30, type: 'streak', icon: 'Zap' },
  { key: 'alpha', name: 'Alfa', description: '100 clases completadas', requirement: 100, type: 'classes_count', icon: 'Crown' },
  // V6 Ajuste 12 — first_membership se desbloquea SOLO con un plan pagado (no cortesía).
  { key: 'first_membership', name: 'Ya eres Salvaje', description: 'Activaste tu primera membresía pagada.', requirement: 1, type: 'paid_memberships', icon: 'Star' },
]

export const SALVAJE_PHRASES = [
  'Sin excusas. Sin límites.',
  'Entrena salvaje. Vive salvaje.',
  'Tu único competidor eres tú de ayer.',
  'La incomodidad es el precio del progreso.',
  'Hoy se suda, mañana se presume.',
  'La bestia se despierta aquí.',
  'Bienvenido a la tribu.',
]

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
export const DAYS_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
