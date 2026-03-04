import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
    // Ignore patterns
    {
        ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.config.js', '*.config.ts', 'server.js']
    },

    // Base JavaScript config
    js.configs.recommended,

    // TypeScript and React files config
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parser: tsparser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                }
            },
            globals: {
                ...globals.browser,
                ...globals.es2021
            }
        },
        plugins: {
            '@typescript-eslint': tseslint,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh
        },
        rules: {
            // TypeScript rules
            ...tseslint.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'warn',

            // React hooks rules
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // React refresh rules
            'react-refresh/only-export-components': ['warn', {allowConstantExport: true}],

            // General rules
            'no-console': ['warn', {allow: ['warn', 'error']}],
            'no-unused-vars': 'off', // Use TypeScript's instead
            'prefer-const': 'error',
            'no-var': 'error',
            'eqeqeq': ['error', 'always', {null: 'ignore'}]
        }
    },

    // Test files config
    {
        files: ['test/**/*.{ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                vi: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly'
            }
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-console': 'off'
        }
    }
];

