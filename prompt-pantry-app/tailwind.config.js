/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Primary brand colors
                primary: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                // Semantic colors for meal types
                meal: {
                    breakfast: {
                        light: '#fff7ed',
                        DEFAULT: '#f97316',
                        dark: '#7c2d12',
                    },
                    lunch: {
                        light: '#f0fdf4',
                        DEFAULT: '#22c55e',
                        dark: '#14532d',
                    },
                    dinner: {
                        light: '#eff6ff',
                        DEFAULT: '#3b82f6',
                        dark: '#1e3a8a',
                    },
                    snacks: {
                        light: '#faf5ff',
                        DEFAULT: '#a855f7',
                        dark: '#581c87',
                    },
                    drinks: {
                        light: '#ecfeff',
                        DEFAULT: '#06b6d4',
                        dark: '#164e63',
                    },
                },
                // Status colors
                status: {
                    success: {
                        light: '#dcfce7',
                        DEFAULT: '#22c55e',
                        dark: '#166534',
                    },
                    warning: {
                        light: '#fef9c3',
                        DEFAULT: '#eab308',
                        dark: '#854d0e',
                    },
                    error: {
                        light: '#fee2e2',
                        DEFAULT: '#ef4444',
                        dark: '#991b1b',
                    },
                    info: {
                        light: '#dbeafe',
                        DEFAULT: '#3b82f6',
                        dark: '#1e40af',
                    },
                },
            },
            spacing: {
                // Custom spacing for consistent layout
                'panel': '2rem',
                'section': '1.5rem',
                'element': '1rem',
                'compact': '0.5rem',
            },
            borderRadius: {
                'card': '0.75rem',
                'button': '0.5rem',
                'badge': '9999px',
            },
            fontSize: {
                'eyebrow': ['0.625rem', {letterSpacing: '0.1em', fontWeight: '700'}],
                'label': ['0.75rem', {letterSpacing: '0.05em', fontWeight: '600'}],
            },
            boxShadow: {
                'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                'modal': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': {opacity: '0'},
                    '100%': {opacity: '1'},
                },
                slideUp: {
                    '0%': {opacity: '0', transform: 'translateY(10px)'},
                    '100%': {opacity: '1', transform: 'translateY(0)'},
                },
                scaleIn: {
                    '0%': {opacity: '0', transform: 'scale(0.95)'},
                    '100%': {opacity: '1', transform: 'scale(1)'},
                },
            },
        },
    },
    plugins: [],
}
