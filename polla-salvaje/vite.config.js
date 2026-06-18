import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
// En producción la app se sirve bajo /pollamundialistasalvaje/ (https://salvaje-app.web.app/pollamundialistasalvaje).
// En desarrollo se sirve en la raíz para no estorbar el dev local.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pollamundialistasalvaje/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
  },
}))
