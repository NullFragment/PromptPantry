import { useCallback, useState } from 'react';
import { StoreSectionDefinition } from '../types';
import { apiRequest, apiJson } from '../utils/apiRequest';
import { sortSectionDefs } from '../utils/storeSectionUtils';

interface SaveSectionResult {
    success: boolean;
    error?: string;
    section?: StoreSectionDefinition;
}

interface DeleteSectionResult {
    success: boolean;
    error?: string;
}

export function useStoreSections() {
    const [storeSections, setStoreSections] = useState<StoreSectionDefinition[]>([]);

    const fetchStoreSections = useCallback(async () => {
        const result = await apiRequest<StoreSectionDefinition[]>('/api/store-sections');
        if (result.success && Array.isArray(result.data)) {
            setStoreSections(sortSectionDefs(result.data));
        }
    }, []);

    const saveSection = useCallback(async (
        section: Partial<StoreSectionDefinition> & { name: string },
        isNew: boolean
    ): Promise<SaveSectionResult> => {
        const url = isNew
            ? '/api/store-sections'
            : `/api/store-sections/${section.id}`;
        const method = isNew ? 'POST' : 'PUT';

        const result = await apiJson<StoreSectionDefinition>(url, method, { name: section.name, emoji: section.emoji });
        if (result.success && result.data) {
            await fetchStoreSections();
            return { success: true, section: result.data };
        }
        return { success: false, error: result.error || 'Failed to save section' };
    }, [fetchStoreSections]);

    const deleteSection = useCallback(async (
        id: string,
        action: 'uncategorize' | 'merge',
        targetSection?: string
    ): Promise<DeleteSectionResult> => {
        const result = await apiJson(
            `/api/store-sections/${id}`,
            'DELETE',
            { action, targetSection }
        );
        if (result.success) {
            await fetchStoreSections();
            return { success: true };
        }
        return { success: false, error: result.error || 'Failed to delete section' };
    }, [fetchStoreSections]);

    return {
        storeSections,
        fetchStoreSections,
        saveSection,
        deleteSection
    };
}
