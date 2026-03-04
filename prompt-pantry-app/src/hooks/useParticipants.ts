import {useCallback, useState} from 'react';
import {Participant} from '../types';
import {apiRequest, apiJson} from '../utils/apiRequest';

export function useParticipants() {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchParticipants = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await apiRequest<Participant[]>('/api/participants');
            if (result.success && result.data) {
                setParticipants(result.data);
                setError(null);
            } else {
                setError(result.error || 'Failed to fetch participants');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveParticipants = useCallback(async (updatedParticipants: Participant[]) => {
        const result = await apiJson('/api/participants', 'PUT', updatedParticipants);
        if (result.success) {
            setParticipants(updatedParticipants);
            setError(null);
            return true;
        }
        console.error('Failed to save participants:', result.error);
        setError('Failed to save participants');
        return false;
    }, []);

    return {
        participants,
        setParticipants,
        isLoading,
        error,
        fetchParticipants,
        saveParticipants
    };
}
