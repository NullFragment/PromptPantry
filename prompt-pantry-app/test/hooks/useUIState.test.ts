import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {useUIState} from '../../src/hooks/useUIState';
import {mockFetchResponse} from '../testHelpers';

describe('useUIState', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        // Reset document classes
        document.documentElement.classList.remove('dark');

        // Mock fetch for settings
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url === '/api/settings') {
                return Promise.resolve(mockFetchResponse({registrationEnabled: true, advancedMode: false}));
            }
            return Promise.resolve(mockFetchResponse({}));
        }));
    });

    describe('initialization', () => {
        it('initializes with default values', () => {
            const {result} = renderHook(() => useUIState('testuser'));

            expect(result.current.view).toBe('recipes');
            expect(result.current.searchQuery).toBe('');
            expect(result.current.unitSystem).toBe('metric');
            expect(result.current.viewMode).toBe('grid');
        });

        it('initializes darkMode to true by default', () => {
            const {result} = renderHook(() => useUIState('testuser'));

            expect(result.current.darkMode).toBe(true);
        });

        it('reads darkMode from localStorage', () => {
            localStorage.setItem('darkMode', 'false');

            const {result} = renderHook(() => useUIState('testuser'));

            expect(result.current.darkMode).toBe(false);
        });

        it('defaults darkMode to true when localStorage is null', () => {
            // localStorage.clear() was called in beforeEach
            const {result} = renderHook(() => useUIState('testuser'));

            expect(result.current.darkMode).toBe(true);
        });

        it('does not fetch settings when user is null', () => {
            const fetchSpy = vi.fn(() => Promise.resolve(mockFetchResponse({})));
            vi.stubGlobal('fetch', fetchSpy);

            renderHook(() => useUIState(null));

            expect(fetchSpy).not.toHaveBeenCalledWith('/api/settings');
        });

        it('fetches settings when user is provided', async () => {
            const fetchSpy = vi.fn((url: string) => {
                if (url === '/api/settings') {
                    return Promise.resolve(mockFetchResponse({registrationEnabled: true, advancedMode: true}));
                }
                return Promise.resolve(mockFetchResponse({}));
            });
            vi.stubGlobal('fetch', fetchSpy);

            const {result} = renderHook(() => useUIState('testuser'));

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            expect(fetchSpy).toHaveBeenCalledWith('/api/settings', expect.any(Object));
            expect(result.current.registrationEnabled).toBe(true);
        });
    });

    describe('view navigation', () => {
        it('changes view', () => {
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setView('calendar');
            });

            expect(result.current.view).toBe('calendar');
        });

        it('supports all view types', () => {
            const {result} = renderHook(() => useUIState());

            const views: Array<'recipes' | 'calendar' | 'shopping' | 'weekly' | 'participants'> =
                ['recipes', 'calendar', 'shopping', 'weekly', 'participants'];

            views.forEach(view => {
                act(() => {
                    result.current.setView(view);
                });
                expect(result.current.view).toBe(view);
            });
        });
    });

    describe('search', () => {
        it('updates search query', () => {
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setSearchQuery('pasta');
            });

            expect(result.current.searchQuery).toBe('pasta');
        });

        it('clears search query', () => {
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setSearchQuery('pasta');
            });

            act(() => {
                result.current.setSearchQuery('');
            });

            expect(result.current.searchQuery).toBe('');
        });
    });

    describe('unit system', () => {
        it('changes unit system to imperial', () => {
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setUnitSystem('imperial');
            });

            expect(result.current.unitSystem).toBe('imperial');
        });

        it('changes unit system to both', () => {
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setUnitSystem('both');
            });

            expect(result.current.unitSystem).toBe('both');
        });

        it('changes unit system back to metric', () => {
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setUnitSystem('imperial');
            });

            act(() => {
                result.current.setUnitSystem('metric');
            });

            expect(result.current.unitSystem).toBe('metric');
        });
    });

    describe('view mode', () => {
        it('changes view mode to table', () => {
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setViewMode('table');
            });

            expect(result.current.viewMode).toBe('table');
        });

        it('changes view mode back to grid', () => {
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setViewMode('table');
            });

            act(() => {
                result.current.setViewMode('grid');
            });

            expect(result.current.viewMode).toBe('grid');
        });
    });

    describe('dark mode', () => {
        it('toggles dark mode on', () => {
            localStorage.setItem('darkMode', 'false');
            const {result} = renderHook(() => useUIState());

            expect(result.current.darkMode).toBe(false);

            act(() => {
                result.current.setDarkMode(true);
            });

            expect(result.current.darkMode).toBe(true);
        });

        it('toggles dark mode off', () => {
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setDarkMode(false);
            });

            expect(result.current.darkMode).toBe(false);
        });

        it('persists dark mode to localStorage', () => {
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setDarkMode(false);
            });

            expect(localStorage.getItem('darkMode')).toBe('false');
        });

        it('adds dark class to document when dark mode is on', () => {
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setDarkMode(true);
            });

            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });

        it('removes dark class from document when dark mode is off', () => {
            document.documentElement.classList.add('dark');
            const {result} = renderHook(() => useUIState());

            act(() => {
                result.current.setDarkMode(false);
            });

            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });
    });
});

