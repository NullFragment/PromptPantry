import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': 'http://127.0.0.1:3001'
        }
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './test/setup.ts',
        include: ['test/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*'],
            exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
            thresholds: {
                branches: 68, // Target: 80% - incrementally improve
            }
        }
    }
})
