import {defineWorkspace} from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest workspace with two projects:
// 1. UI tests run in jsdom environment
// 2. Server tests run in node environment with isolated data directories
//
// Each server test creates its own isolated copy of the data directory,
// so all tests can run in parallel without file conflicts.
export default defineWorkspace([
    {
        // UI tests with jsdom environment
        plugins: [react()],
        test: {
            name: 'ui',
            environment: 'jsdom',
            globals: true,
            setupFiles: './test/setup.ts',
            include: [
                'test/**/*.{test,spec}.{ts,tsx}',
            ],
            exclude: [
                'test/server/**/*.{test,spec}.{ts,tsx}',
            ],
            coverage: {
                provider: 'v8',
                reporter: ['text', 'json', 'html'],
                include: ['src/**/*'],
                exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
            },
        },
    },
    {
        // Server tests with node environment
        // Each test suite uses createTestEnvironment() for complete isolation
        test: {
            name: 'server',
            environment: 'node',
            globals: true,
            include: ['test/server/**/*.{test,spec}.{ts,tsx}'],
        },
    },
]);
