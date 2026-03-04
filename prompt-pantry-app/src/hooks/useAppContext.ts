import { useContext } from 'react';
import { AppContext, type AppContextValue } from '../contexts/AppContext';

/**
 * Access shared app-level state (permissions, settings).
 * Must be used within an AppProvider.
 */
export function useAppContext(): AppContextValue {
    const ctx = useContext(AppContext);
    if (!ctx) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return ctx;
}

