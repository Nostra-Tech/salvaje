/**
 * Generic catalog management — editable lists for dropdowns/selects.
 * Stored in /app_config/catalogs.{name}.
 * Soft-delete: items marked isActive=false stay until purged from "Papelera".
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const CATALOGS_DOC = doc(db, 'app_config', 'catalogs')

export const DEFAULT_CATALOGS = {
  expense_categories: [
    { value: 'rent',          label: 'Arriendo',          isActive: true },
    { value: 'equipment',     label: 'Equipo',            isActive: true },
    { value: 'utilities',     label: 'Servicios públicos', isActive: true },
    { value: 'marketing',     label: 'Marketing',         isActive: true },
    { value: 'maintenance',   label: 'Mantenimiento',     isActive: true },
    { value: 'supplies',      label: 'Insumos',           isActive: true },
    { value: 'salary',        label: 'Salario admin',     isActive: true },
    { value: 'other',         label: 'Otro',              isActive: true },
  ],
  specializations: [
    { value: 'CrossFit Level 1', label: 'CrossFit Level 1', isActive: true },
    { value: 'CrossFit Level 2', label: 'CrossFit Level 2', isActive: true },
    { value: 'Olympic Lifting',  label: 'Olympic Lifting',  isActive: true },
    { value: 'Strength',         label: 'Strength',         isActive: true },
    { value: 'Gymnastics',       label: 'Gymnastics',       isActive: true },
    { value: 'Endurance',        label: 'Endurance',        isActive: true },
    { value: 'Mobility',         label: 'Mobility',         isActive: true },
    { value: 'Nutrition',        label: 'Nutrition',        isActive: true },
  ],
  payment_methods: [
    { value: 'cash',      label: 'Efectivo',                isActive: true },
    { value: 'nequi',     label: 'Nequi',                   isActive: true },
    { value: 'daviplata', label: 'Daviplata',               isActive: true },
    { value: 'transfer',  label: 'Transferencia bancaria',  isActive: true },
    { value: 'admin',     label: 'Cortesía / Manual',       isActive: true },
  ],
  class_levels: [
    { value: 'all',          label: 'Todos los niveles', isActive: true },
    { value: 'beginner',     label: 'Principiante',      isActive: true },
    { value: 'intermediate', label: 'Intermedio',        isActive: true },
    { value: 'advanced',     label: 'Avanzado',          isActive: true },
  ],
}

export async function getCatalogs() {
  const snap = await getDoc(CATALOGS_DOC)
  const data = snap.exists() ? (snap.data().catalogs || {}) : {}
  // Merge with defaults for missing keys
  const merged = {}
  for (const key of Object.keys(DEFAULT_CATALOGS)) {
    merged[key] = data[key] || DEFAULT_CATALOGS[key]
  }
  return merged
}

export async function saveCatalog(catalogName, items, adminUid) {
  const snap = await getDoc(CATALOGS_DOC)
  const current = snap.exists() ? (snap.data().catalogs || {}) : {}
  await setDoc(CATALOGS_DOC, {
    catalogs: { ...current, [catalogName]: items },
    lastUpdatedBy: adminUid,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function getCatalog(catalogName) {
  const all = await getCatalogs()
  return (all[catalogName] || []).filter((i) => i.isActive !== false)
}

export const CATALOG_LABELS = {
  expense_categories: { title: 'Categorías de egresos', desc: 'Categorías para clasificar gastos en el flujo de caja.' },
  specializations:    { title: 'Especializaciones de coaches', desc: 'Etiquetas que aparecen al editar/crear un coach.' },
  payment_methods:    { title: 'Métodos de pago', desc: 'Opciones disponibles al activar membresías.' },
  class_levels:       { title: 'Niveles de clase', desc: 'Niveles de dificultad para clases.' },
}
