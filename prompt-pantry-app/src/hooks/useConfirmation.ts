import { useCallback, useState } from 'react';

export interface ConfirmationState {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: 'danger' | 'info';
}

export function useConfirmation() {
    const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

    const show = useCallback((state: ConfirmationState) => {
        setConfirmation(state);
    }, []);

    const dismiss = useCallback(() => {
        setConfirmation(null);
    }, []);

    const handleCancel = useCallback(() => {
        if (confirmation?.onCancel) confirmation.onCancel();
        setConfirmation(null);
    }, [confirmation]);

    return { confirmation, show, dismiss, handleCancel };
}
