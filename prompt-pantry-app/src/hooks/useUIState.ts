import {useCallback, useEffect, useRef, useState} from 'react';
import {apiRequest, apiJson} from '../utils/apiRequest';

export interface MacroLimits {
    proteinPercentMin: number;
    proteinPercentMax: number;
    fatPercentMin: number;
    fatPercentMax: number;
    calorieDeficitMax: number;
}

const MACRO_LIMITS_DEFAULTS: MacroLimits = {
    proteinPercentMin: 0,
    proteinPercentMax: 100,
    fatPercentMin: 0,
    fatPercentMax: 100,
    calorieDeficitMax: 25
};

function normalizeMacroLimits(data: unknown): MacroLimits {
    if (data != null && typeof data === 'object' && !Array.isArray(data)) {
        const o = data as Record<string, unknown>;
        return {
            proteinPercentMin: typeof o.proteinPercentMin === 'number' ? o.proteinPercentMin : MACRO_LIMITS_DEFAULTS.proteinPercentMin,
            proteinPercentMax: typeof o.proteinPercentMax === 'number' ? o.proteinPercentMax : MACRO_LIMITS_DEFAULTS.proteinPercentMax,
            fatPercentMin: typeof o.fatPercentMin === 'number' ? o.fatPercentMin : MACRO_LIMITS_DEFAULTS.fatPercentMin,
            fatPercentMax: typeof o.fatPercentMax === 'number' ? o.fatPercentMax : MACRO_LIMITS_DEFAULTS.fatPercentMax,
            calorieDeficitMax: typeof o.calorieDeficitMax === 'number' ? o.calorieDeficitMax : MACRO_LIMITS_DEFAULTS.calorieDeficitMax
        };
    }
    return { ...MACRO_LIMITS_DEFAULTS };
}

export function useUIState(user: string | null = null) {
    const [view, setView] = useState<'recipes' | 'calendar' | 'shopping' | 'weekly' | 'participants' | 'ingredients' | 'admin'>('recipes');
    const [searchQuery, setSearchQuery] = useState('');
    const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial' | 'both'>('metric');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [advancedMode, setAdvancedMode] = useState(() => {
        const saved = localStorage.getItem('advancedMode');
        return saved === 'true';
    });
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved === null ? true : saved === 'true';
    });
    const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
    const [macroLimits, setMacroLimits] = useState<MacroLimits>(MACRO_LIMITS_DEFAULTS);
    const advancedModeUserChanged = useRef(false);

    const fetchSettings = useCallback(async () => {
        const result = await apiRequest<{ advancedMode?: boolean; registrationEnabled?: boolean; macroLimits?: unknown }>('/api/settings');
        if (result.success && result.data) {
            const data = result.data;
            if (typeof data.advancedMode === 'boolean') {
                advancedModeUserChanged.current = false;
                setAdvancedMode(data.advancedMode);
            }
            if (typeof data.registrationEnabled === 'boolean') {
                setRegistrationEnabled(data.registrationEnabled);
            }
            if (data.macroLimits != null) {
                setMacroLimits(normalizeMacroLimits(data.macroLimits));
            }
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchSettings();
        }
    }, [user, fetchSettings]);

    useEffect(() => {
        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (darkMode) {
            document.documentElement.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
            if (themeColor) themeColor.setAttribute('content', '#030712');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.colorScheme = 'light';
            if (themeColor) themeColor.setAttribute('content', '#f9fafb');
        }
        localStorage.setItem('darkMode', darkMode.toString());
    }, [darkMode]);

    useEffect(() => {
        localStorage.setItem('advancedMode', advancedMode.toString());
        if (!advancedModeUserChanged.current) {
            return;
        }
        apiJson('/api/settings', 'PUT', {advancedMode}).catch(err =>
            console.error('Failed to update advanced mode', err)
        );
    }, [advancedMode]);

    const toggleRegistration = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        if (registrationEnabled === null) return { success: false, error: 'Settings not loaded yet' };
        const newValue = !registrationEnabled;
        const result = await apiJson<{ registrationEnabled: boolean }>('/api/settings', 'PUT', {registrationEnabled: newValue});
        if (result.success && result.data) {
            setRegistrationEnabled(result.data.registrationEnabled);
            return { success: true };
        }
        return { success: false, error: result.error ?? 'Failed to toggle registration' };
    }, [registrationEnabled]);

    return {
        view,
        setView,
        searchQuery,
        setSearchQuery,
        unitSystem,
        setUnitSystem,
        viewMode,
        setViewMode,
        advancedMode,
        setAdvancedMode: useCallback((value: boolean | ((prev: boolean) => boolean)) => {
            advancedModeUserChanged.current = true;
            setAdvancedMode(value);
        }, []),
        darkMode,
        setDarkMode,
        registrationEnabled,
        toggleRegistration,
        macroLimits,
        setMacroLimits,
        fetchSettings
    };
}
