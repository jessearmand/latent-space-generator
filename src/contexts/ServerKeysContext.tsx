/**
 * React context for server-side API key availability
 * Fetches /health once on mount to determine which backends are configured
 */

import type React from 'react';
import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from 'react';

export interface ServerKeys {
    fal: boolean;
    openai: boolean;
    openrouter: boolean;
}

interface ServerKeysContextType {
    serverKeys: ServerKeys;
    isLoaded: boolean;
}

const defaultKeys: ServerKeys = { fal: false, openai: false, openrouter: false };

const ServerKeysContext = createContext<ServerKeysContextType>({
    serverKeys: defaultKeys,
    isLoaded: false,
});

interface ServerKeysProviderProps {
    children: ReactNode;
}

export const ServerKeysProvider: React.FC<ServerKeysProviderProps> = ({ children }) => {
    const [serverKeys, setServerKeys] = useState<ServerKeys>(defaultKeys);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        fetch('/api/health')
            .then((res) => res.json())
            .then((data) => {
                if (data.keys) {
                    setServerKeys({
                        fal: !!data.keys.fal,
                        openai: !!data.keys.openai,
                        openrouter: !!data.keys.openrouter,
                    });
                }
            })
            .catch((err) => {
                console.warn('Failed to fetch server key availability:', err);
            })
            .finally(() => {
                setIsLoaded(true);
            });
    }, []);

    return (
        <ServerKeysContext.Provider value={{ serverKeys, isLoaded }}>
            {children}
        </ServerKeysContext.Provider>
    );
};

export const useServerKeys = (): ServerKeysContextType => {
    return useContext(ServerKeysContext);
};
