/**
 * Design Tokens - Centralized styling constants for the PromptPantry application
 *
 * This file consolidates all design-related constants to enable:
 * - Consistent styling across the application
 * - Easy theming and customization
 * - Single source of truth for design decisions
 */

// ============================================================================
// COLOR TOKENS
// ============================================================================

export const colors = {
    // Primary brand color
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
    },

    // Status colors
    status: {
        success: '#22c55e',
        warning: '#eab308',
        error: '#ef4444',
        info: '#3b82f6',
    },
} as const;

// ============================================================================
// MEAL TYPE STYLES
// ============================================================================

export const mealTypeStyles = {
    breakfast: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-100 dark:border-orange-900/30',
        combined: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-900/30',
    },
    lunch: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-100 dark:border-green-900/30',
        combined: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900/30',
    },
    dinner: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-100 dark:border-blue-900/30',
        combined: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/30',
    },
    snacks: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-100 dark:border-purple-900/30',
        combined: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/30',
    },
    drinks: {
        bg: 'bg-cyan-50 dark:bg-cyan-900/20',
        text: 'text-cyan-700 dark:text-cyan-300',
        border: 'border-cyan-100 dark:border-cyan-900/30',
        combined: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-cyan-900/30',
    },
} as const;

export type MealTypeKey = keyof typeof mealTypeStyles;

export function getMealTypeStyle(type: MealTypeKey): string {
    return mealTypeStyles[type].combined;
}

export function getMealTypeBg(type: MealTypeKey): string {
    return mealTypeStyles[type].bg;
}

export function getMealTypeText(type: MealTypeKey): string {
    return mealTypeStyles[type].text;
}

export function getMealTypeBorder(type: MealTypeKey): string {
    return mealTypeStyles[type].border;
}

// ============================================================================
// STATUS INDICATOR STYLES
// ============================================================================

export const statusStyles = {
    success: {
        bg: 'bg-green-500',
        text: 'text-green-600 dark:text-green-400',
        light: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-200 dark:border-green-800',
    },
    warning: {
        bg: 'bg-yellow-500',
        text: 'text-yellow-600 dark:text-yellow-400',
        light: 'bg-yellow-100 dark:bg-yellow-900/30',
        border: 'border-yellow-200 dark:border-yellow-800',
    },
    error: {
        bg: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
        light: 'bg-red-100 dark:bg-red-900/30',
        border: 'border-red-200 dark:border-red-800',
    },
    info: {
        bg: 'bg-blue-500',
        text: 'text-blue-600 dark:text-blue-400',
        light: 'bg-blue-100 dark:bg-blue-900/30',
        border: 'border-blue-200 dark:border-blue-800',
    },
    neutral: {
        bg: 'bg-gray-500',
        text: 'text-gray-600 dark:text-gray-400',
        light: 'bg-gray-100 dark:bg-gray-800',
        border: 'border-gray-200 dark:border-gray-700',
    },
} as const;

// ============================================================================
// BUTTON STYLES
// ============================================================================

export const buttonStyles = {
    base: 'inline-flex items-center justify-center gap-2 font-bold text-xs transition-all rounded-lg shadow-sm',

    variants: {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
        secondary: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400',
        danger: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-100 dark:border-red-900/30',
        ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400',
        success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    },

    sizes: {
        sm: 'px-2 py-1.5 text-[10px]',
        md: 'px-3 py-2.5',
        lg: 'px-4 py-3 text-sm',
    },

    disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
} as const;

export function getButtonClasses(
    variant: keyof typeof buttonStyles.variants = 'primary',
    size: keyof typeof buttonStyles.sizes = 'md',
    disabled = false
): string {
    const classes: string[] = [
        buttonStyles.base,
        buttonStyles.variants[variant],
        buttonStyles.sizes[size],
    ];

    if (disabled) {
        classes.push(buttonStyles.disabled);
    }

    return classes.join(' ');
}

// ============================================================================
// CARD STYLES
// ============================================================================

export const cardStyles = {
    base: 'bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors duration-300',
    padded: 'bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 max-w-full mx-auto transition-colors duration-300',
    soft: 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm',
    muted: 'bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800',
    interactive: 'bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer',
} as const;

// ============================================================================
// INPUT STYLES
// ============================================================================

export const inputStyles = {
    base: 'w-full px-3 py-2 rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0',
    default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-indigo-500/20',
    error: 'bg-white dark:bg-gray-800 border-red-300 dark:border-red-700 text-gray-900 dark:text-gray-100 focus:border-red-500 focus:ring-red-500/20',
    disabled: 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed',
} as const;

export function getInputClasses(state: 'default' | 'error' | 'disabled' = 'default'): string {
    return `${inputStyles.base} ${inputStyles[state]}`;
}

// ============================================================================
// BADGE STYLES
// ============================================================================

export const badgeStyles = {
    base: 'inline-flex items-center px-2 py-1 text-xs font-bold rounded-full',
    variants: {
        primary: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
        success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    },
} as const;

export function getBadgeClasses(variant: keyof typeof badgeStyles.variants = 'primary'): string {
    return `${badgeStyles.base} ${badgeStyles.variants[variant]}`;
}

// ============================================================================
// MODAL STYLES
// ============================================================================

export const modalStyles = {
    overlay: 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50',
    container: 'fixed inset-0 flex items-center justify-center z-50 p-4',
    content: 'bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-h-[90vh] overflow-hidden',
    header: 'px-6 py-4 border-b border-gray-100 dark:border-gray-800',
    body: 'p-6 overflow-y-auto',
    footer: 'px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3',
} as const;

// ============================================================================
// TYPOGRAPHY STYLES
// ============================================================================

export const typographyStyles = {
    eyebrow: 'text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest',
    label: 'text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]',
    sectionTitle: 'text-3xl font-bold flex items-center dark:text-gray-100 gap-3',
    heading1: 'text-2xl font-bold text-gray-900 dark:text-gray-100',
    heading2: 'text-xl font-semibold text-gray-900 dark:text-gray-100',
    heading3: 'text-lg font-medium text-gray-900 dark:text-gray-100',
    body: 'text-sm text-gray-700 dark:text-gray-300',
    caption: 'text-xs text-gray-500 dark:text-gray-400',
    muted: 'text-[9px] text-gray-300 dark:text-gray-600 italic text-center',
} as const;

// ============================================================================
// LAYOUT STYLES
// ============================================================================

export const layoutStyles = {
    appShell: 'min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300',
    pageShell: 'max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300',
    navSurface: 'bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-10',
    navContainer: 'max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8',
} as const;

// ============================================================================
// SPACING CONSTANTS
// ============================================================================

export const spacing = {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
} as const;

// ============================================================================
// TRANSITION STYLES
// ============================================================================

export const transitionStyles = {
    default: 'transition-all duration-200 ease-in-out',
    fast: 'transition-all duration-150 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
    colors: 'transition-colors duration-200',
} as const;

// ============================================================================
// MACRO NUTRIENT COLORS
// ============================================================================

export const macroColors = {
    calories: {
        bg: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        light: 'bg-amber-100 dark:bg-amber-900/30',
    },
    protein: {
        bg: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
        light: 'bg-red-100 dark:bg-red-900/30',
    },
    carbs: {
        bg: 'bg-blue-500',
        text: 'text-blue-600 dark:text-blue-400',
        light: 'bg-blue-100 dark:bg-blue-900/30',
    },
    fat: {
        bg: 'bg-yellow-500',
        text: 'text-yellow-600 dark:text-yellow-400',
        light: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
} as const;

