import {useEffect} from 'react';
import {AlertCircle, X} from 'lucide-react';

interface ConfirmationDialogProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'info';
}

export function ConfirmationDialog({
                                       title,
                                       message,
                                       confirmLabel = 'Confirm',
                                       cancelLabel = 'Cancel',
                                       onConfirm,
                                       onCancel,
                                       variant = 'info'
                                   }: ConfirmationDialogProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    const headerBg = variant === 'danger' ? 'bg-red-600' : 'bg-indigo-600';
    const confirmBtnBg = variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700';
    const textColor = variant === 'danger' ? 'text-red-100' : 'text-indigo-100';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={onCancel}></div>
            <div
                className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 transition-colors duration-300">
                <div className={`${headerBg} p-6 text-white relative`}>
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 p-1 hover:bg-white/20 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5"/>
                    </button>
                    <AlertCircle className="h-10 w-10 mb-3 opacity-50"/>
                    <h3 className="text-xl font-black leading-tight">{title}</h3>
                    <p className={`${textColor} mt-2 text-sm font-medium`}>{message}</p>
                </div>

                <div className="p-6 flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className={`w-full py-3 ${confirmBtnBg} text-white rounded-xl font-bold text-sm transition-all shadow-md`}
                    >
                        {confirmLabel}
                    </button>
                    {cancelLabel !== 'none' && (
                        <button
                            onClick={onCancel}
                            className="w-full py-2 text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            {cancelLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
