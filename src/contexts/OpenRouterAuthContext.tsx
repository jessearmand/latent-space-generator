/**
 * React context for OpenRouter OAuth PKCE authentication
 * Manages user-specific API keys obtained via OAuth flow
 */

import type React from 'react';
import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { initiateLogin, handleCallback } from '../services/openrouterAuth';

const STORAGE_KEY = 'OPENROUTER_USER_KEY';

interface OpenRouterAuthContextType {
    /** OAuth-obtained API key */
    userApiKey: string | null;
    /** Whether the user has an active OAuth key */
    isAuthenticated: boolean;
    /** Loading state during OAuth callback exchange */
    isLoading: boolean;
    /** Error message from OAuth flow */
    error: string | null;
    /** Initiate OAuth PKCE login redirect */
    login: () => Promise<void>;
    /** Clear the stored OAuth key */
    logout: () => void;
}

const OpenRouterAuthContext = createContext<OpenRouterAuthContextType | undefined>(undefined);

interface OpenRouterAuthProviderProps {
    children: ReactNode;
}

export const OpenRouterAuthProvider: React.FC<OpenRouterAuthProviderProps> = ({ children }) => {
    const [userApiKey, setUserApiKey] = useState<string | null>(() => {
        return localStorage.getItem(STORAGE_KEY);
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Handle OAuth callback on mount (check for ?code= in URL)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('code')) return;

        setIsLoading(true);
        setError(null);

        handleCallback()
            .then((key) => {
                if (key) {
                    setUserApiKey(key);
                    localStorage.setItem(STORAGE_KEY, key);
                }
                // Clean the URL by removing the code parameter
                window.history.replaceState({}, '', window.location.pathname);
            })
            .catch((err) => {
                const message = err instanceof Error ? err.message : 'OAuth callback failed';
                setError(message);
                console.error('OpenRouter OAuth callback error:', err);
                // Clean the URL even on error
                window.history.replaceState({}, '', window.location.pathname);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const login = useCallback(async () => {
        setError(null);
        try {
            await initiateLogin();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to initiate login';
            setError(message);
            console.error('OpenRouter OAuth login error:', err);
        }
    }, []);

    const logout = useCallback(() => {
        setUserApiKey(null);
        setError(null);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return (
        <OpenRouterAuthContext.Provider
            value={{
                userApiKey,
                isAuthenticated: !!userApiKey,
                isLoading,
                error,
                login,
                logout,
            }}
        >
            {children}
        </OpenRouterAuthContext.Provider>
    );
};

export const useOpenRouterAuth = (): OpenRouterAuthContextType => {
    const context = useContext(OpenRouterAuthContext);
    if (!context) {
        throw new Error('useOpenRouterAuth must be used within an OpenRouterAuthProvider');
    }
    return context;
};
