import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStoreSections } from '../../src/hooks/useStoreSections';

vi.mock('../../src/utils/apiRequest', () => ({
    apiRequest: vi.fn(),
    apiJson: vi.fn(),
}));

import { apiRequest, apiJson } from '../../src/utils/apiRequest';
const mockApiRequest = vi.mocked(apiRequest);
const mockApiJson = vi.mocked(apiJson);

const unsortedSections = [
    { name: 'Produce' },
    { name: 'Unassigned' },
    { name: 'Dairy' },
    { name: 'Meat' },
];

const sortedNames = ['Dairy', 'Meat', 'Produce', 'Unassigned'];

describe('useStoreSections', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns sections sorted alphabetically with Unassigned last after fetch', async () => {
        mockApiRequest.mockResolvedValueOnce({ success: true, data: unsortedSections });

        const { result } = renderHook(() => useStoreSections());

        await act(async () => {
            await result.current.fetchStoreSections();
        });

        expect(result.current.storeSections.map((d: { name: string }) => d.name)).toEqual(sortedNames);
    });

    it('returns sections sorted after a successful create', async () => {
        // initial fetch
        mockApiRequest.mockResolvedValueOnce({ success: true, data: [] });
        // POST /api/store-sections
        mockApiJson.mockResolvedValueOnce({ success: true, data: { name: 'Bakery' } });
        // re-fetch after create
        mockApiRequest.mockResolvedValueOnce({
            success: true,
            data: [{ name: 'Produce' }, { name: 'Bakery' }, { name: 'Unassigned' }],
        });

        const { result } = renderHook(() => useStoreSections());

        await act(async () => {
            await result.current.fetchStoreSections();
        });

        await act(async () => {
            await result.current.saveSection({ name: 'Bakery' }, true);
        });

        expect(result.current.storeSections.map((d: { name: string }) => d.name)).toEqual([
            'Bakery', 'Produce', 'Unassigned',
        ]);
    });
});
