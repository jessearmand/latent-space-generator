import { useState, useCallback } from 'react';

export type StatusType = 'info' | 'error' | 'success';

export interface UseStatusMessageReturn {
    statusMessage: string;
    statusType: StatusType;
    setStatus: (message: string, type?: StatusType) => void;
    clearStatus: () => void;
}

/**
 * Hook for managing status messages with type-based styling.
 * Centralizes status state and provides helper functions.
 */
export function useStatusMessage(): UseStatusMessageReturn {
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [statusType, setStatusType] = useState<StatusType>('info');

    const setStatus = useCallback((message: string, type: StatusType = 'info') => {
        setStatusMessage(message);
        setStatusType(type);
    }, []);

    const clearStatus = useCallback(() => {
        setStatusMessage('');
        setStatusType('info');
    }, []);

    return {
        statusMessage,
        statusType,
        setStatus,
        clearStatus,
    };
}
