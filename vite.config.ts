import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                // Longer timeout for streaming responses (2 minutes)
                timeout: 120000,
            }
        }
    },
    build: {
        outDir: 'build'
    }
})
