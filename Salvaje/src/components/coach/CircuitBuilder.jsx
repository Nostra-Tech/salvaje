import { Plus, X, Timer, Repeat, Hash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * V6 Ajuste 2 — Structured circuit builder.
 *
 * Replaces a free-text exercise list with a typed structure:
 *   { name, rounds, restBetweenRounds, exercises: [{ id, order, name, sets, reps, seconds, notes }] }
 *
 * Backwards-compatible: classes that only have `exercises: string[]` keep working;
 * the builder will create a `circuit` block instead. Both fields can coexist.
 */
const emptyCircuit = () => ({
  name: 'WOD Principal',
  rounds: 3,
  restBetweenRounds: 60,
  exercises: [],
})

export function CircuitBuilder({ value, onChange }) {
  const circuit = value || emptyCircuit()

  const update = (patch) => onChange({ ...circuit, ...patch })

  const addExercise = () => {
    const ex = {
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      order: (circuit.exercises?.length || 0) + 1,
      name: '',
      sets: 3,
      reps: 10,
      seconds: null,
      notes: '',
    }
    update({ exercises: [...(circuit.exercises || []), ex] })
  }

  const updateExercise = (id, field, val) => {
    update({
      exercises: (circuit.exercises || []).map((ex) =>
        ex.id === id ? { ...ex, [field]: val } : ex
      ),
    })
  }

  const removeExercise = (id) => {
    update({
      exercises: (circuit.exercises || [])
        .filter((ex) => ex.id !== id)
        .map((ex, i) => ({ ...ex, order: i + 1 })),
    })
  }

  return (
    <div className="space-y-4">
      {/* Circuit header */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3">
          <label className="block text-xs font-semibold text-salvaje-gray uppercase tracking-wide mb-1">
            Nombre del circuito
          </label>
          <input
            type="text"
            value={circuit.name || ''}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="WOD Principal"
            className="w-full px-3 py-2 rounded-lg bg-white border border-salvaje-cream font-body text-sm focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-salvaje-gray uppercase tracking-wide mb-1 flex items-center gap-1">
            <Hash size={11} /> Rondas
          </label>
          <input
            type="number" min="1" max="20"
            value={circuit.rounds ?? 1}
            onChange={(e) => update({ rounds: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 rounded-lg bg-white border border-salvaje-cream font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-salvaje-gray uppercase tracking-wide mb-1 flex items-center gap-1">
            <Timer size={11} /> Descanso entre rondas (seg)
          </label>
          <input
            type="number" min="0" max="600"
            value={circuit.restBetweenRounds ?? 0}
            onChange={(e) => update({ restBetweenRounds: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 rounded-lg bg-white border border-salvaje-cream font-mono text-sm focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
          />
        </div>
      </div>

      {/* Exercises list */}
      <div>
        <label className="block text-xs font-semibold text-salvaje-gray uppercase tracking-wide mb-2">
          Ejercicios del circuito
        </label>

        <AnimatePresence initial={false}>
          {(circuit.exercises || []).map((ex, index) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-salvaje-light rounded-xl p-3 mb-2 border border-salvaje-cream"
            >
              {/* Row 1: number + name + remove */}
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm font-bold text-salvaje-orange w-6 flex-shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <input
                  type="text"
                  value={ex.name}
                  onChange={(e) => updateExercise(ex.id, 'name', e.target.value)}
                  placeholder="Nombre del ejercicio (Front Squat...)"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-salvaje-cream font-body text-sm focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
                />
                <button
                  type="button"
                  onClick={() => removeExercise(ex.id)}
                  className="w-7 h-7 flex items-center justify-center text-salvaje-gray hover:text-salvaje-danger hover:bg-salvaje-danger/10 rounded-lg flex-shrink-0"
                  aria-label="Eliminar ejercicio"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Row 2: sets / reps / seconds */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-salvaje-gray mb-0.5 flex items-center gap-1 uppercase tracking-widest">
                    <Repeat size={10} /> Series
                  </label>
                  <input
                    type="number" min="1" max="20"
                    value={ex.sets ?? 1}
                    onChange={(e) => updateExercise(ex.id, 'sets', parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-salvaje-cream font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-salvaje-gray mb-0.5 uppercase tracking-widest">Reps</label>
                  <input
                    type="number" min="0" max="200"
                    value={ex.reps ?? ''}
                    onChange={(e) => updateExercise(ex.id, 'reps', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="—"
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-salvaje-cream font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-salvaje-gray mb-0.5 flex items-center gap-1 uppercase tracking-widest">
                    <Timer size={10} /> Seg
                  </label>
                  <input
                    type="number" min="0" max="3600"
                    value={ex.seconds ?? ''}
                    onChange={(e) => updateExercise(ex.id, 'seconds', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="—"
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-salvaje-cream font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange"
                  />
                </div>
              </div>

              {/* Notes */}
              <input
                type="text"
                value={ex.notes || ''}
                onChange={(e) => updateExercise(ex.id, 'notes', e.target.value)}
                placeholder="Notas (opcional): agarre neutro, carga sugerida..."
                className="mt-2 w-full px-3 py-1.5 rounded-lg bg-white border border-salvaje-cream font-body text-xs text-salvaje-gray focus:outline-none focus:ring-2 focus:ring-salvaje-orange/20 focus:border-salvaje-orange/50"
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          type="button"
          onClick={addExercise}
          className="mt-1 inline-flex items-center gap-2 text-sm font-display uppercase text-salvaje-orange hover:text-salvaje-orange/80 px-3 py-2 rounded-lg border border-dashed border-salvaje-orange/40 hover:bg-salvaje-orange/5 transition-colors"
        >
          <Plus size={14} />
          Agregar ejercicio
        </button>
      </div>
    </div>
  )
}
