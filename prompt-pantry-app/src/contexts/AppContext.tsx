import { createContext, type ReactNode } from 'react';

export interface AppContextValue {
    /** Current user's permission tier */
    userTier: 'Viewer' | 'Editor' | 'Admin' | null;
    /** Whether the user has edit permissions (Editor or Admin) */
    canEdit: boolean;
    /** Unit system preference */
    unitSystem: 'metric' | 'imperial' | 'both';
    /** Whether advanced mode is active (Admin only) */
    advancedMode: boolean;
    /** Whether dark mode is enabled */
    darkMode: boolean;
}

export const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
    children: ReactNode;
    value: AppContextValue;
}

export function AppProvider({ children, value }: AppProviderProps) {
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}


