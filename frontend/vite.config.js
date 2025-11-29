import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Configuración del servidor de desarrollo (permite acceso desde la red local)
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,           // Permite acceder desde otros dispositivos (celular, notebook, etc.)
    port: 5173,           // Puerto por defecto del frontend
    strictPort: true,     // No cambiará de puerto si el 5173 está ocupado
    cors: true            // Habilita CORS en el dev server
  }
})
