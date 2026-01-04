import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate Vue framework
          if (id.includes('node_modules/vue')) {
            return 'vue-vendor'
          }
          // Separate elkjs (auto-layout library, large ~1.5MB)
          if (id.includes('node_modules/elkjs')) {
            return 'elkjs-vendor'
          }
          // Group other node_modules into vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
