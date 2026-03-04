import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {useParticipants} from '../../src/hooks/useParticipants';
import {Participant} from '../../src/types';
import {mockFetchResponse, mockFetchError} from '../testHelpers';

const mockParticipants: Participant[] = [
    {
        name: 'Alice',
        maintenanceCalories: 2000,
        calorieDeficit: 10,
        proteinPercent: 30,
        carbsPercent: 40,
        fatPercent: 30
    },
    {
        name: 'Bob',
        maintenanceCalories: 2500,
        calorieDeficit: 15,
        proteinPercent: 35,
        carbsPercent: 35,
        fatPercent: 30
    }
];

describe('useParticipants', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('initializes with empty participants array', () => {
            const {result} = renderHook(() => useParticipants());

            expect(result.current.participants).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe('fetchParticipants', () => {
        it('fetches participants successfully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchResponse(mockParticipants))
            ));

            const {result} = renderHook(() => useParticipants());

            await act(async () => {
                await result.current.fetchParticipants();
            });

            expect(result.current.participants).toHaveLength(2);
            expect(result.current.participants[0].name).toBe('Alice');
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('sets isLoading during fetch', async () => {
            let resolvePromise: (value: any) => void;
            const delayedPromise = new Promise(resolve => {
                resolvePromise = resolve;
            });

            vi.stubGlobal('fetch', vi.fn(() => delayedPromise));

            const {result} = renderHook(() => useParticipants());

            act(() => {
                result.current.fetchParticipants();
            });

            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                resolvePromise!(mockFetchResponse([]));
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('handles fetch error gracefully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchError({error: ''}, 500))
            ));

            const {result} = renderHook(() => useParticipants());

            await act(async () => {
                await result.current.fetchParticipants();
            });

            expect(result.current.error).toBe('Failed to fetch participants');
            expect(result.current.isLoading).toBe(false);
        });

        it('handles network error gracefully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.reject(new Error('Network error'))
            ));

            const {result} = renderHook(() => useParticipants());

            await act(async () => {
                await result.current.fetchParticipants();
            });

            expect(result.current.error).toBe('Network error');
            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('saveParticipants', () => {
        it('saves participants successfully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchResponse({}))
            ));

            const {result} = renderHook(() => useParticipants());

            let success: boolean = false;
            await act(async () => {
                success = await result.current.saveParticipants(mockParticipants);
            });

            expect(success).toBe(true);
            expect(result.current.participants).toEqual(mockParticipants);
            expect(result.current.error).toBeNull();
        });

        it('handles save error', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchError('Error', 500))
            ));

            const {result} = renderHook(() => useParticipants());

            let success: boolean = true;
            await act(async () => {
                success = await result.current.saveParticipants(mockParticipants);
            });

            expect(success).toBe(false);
            expect(result.current.error).toBe('Failed to save participants');
        });

        it('handles network error during save', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.reject(new Error('Network error'))
            ));

            const {result} = renderHook(() => useParticipants());

            let success: boolean = true;
            await act(async () => {
                success = await result.current.saveParticipants(mockParticipants);
            });

            expect(success).toBe(false);
            expect(result.current.error).toBe('Failed to save participants');
        });

        it('clears previous error on successful save', async () => {
            // First, create an error state
            vi.stubGlobal('fetch', vi.fn()
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce(mockFetchResponse({}))
            );

            const {result} = renderHook(() => useParticipants());

            // First save fails
            await act(async () => {
                await result.current.saveParticipants(mockParticipants);
            });

            expect(result.current.error).toBe('Failed to save participants');

            // Second save succeeds
            await act(async () => {
                await result.current.saveParticipants(mockParticipants);
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('setParticipants', () => {
        it('allows direct setting of participants', () => {
            const {result} = renderHook(() => useParticipants());

            act(() => {
                result.current.setParticipants(mockParticipants);
            });

            expect(result.current.participants).toEqual(mockParticipants);
        });
    });
});

