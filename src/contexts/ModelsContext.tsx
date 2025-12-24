/**
 * React context for managing model state
 * Handles fetching, caching, and selection of fal.ai models
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ModelConfig } from '../types/models';
import {
    fetchImageGenerationModels,
    getCachedModels,
    cacheModels,
    clearModelsCache,
} from '../services/models';

interface ModelsContextType {
    models: ModelConfig[];
    isLoading: boolean;
    error: string | null;
    selectedModel: ModelConfig | null;
    setSelectedModel: (model: ModelConfig | null) => void;
    refreshModels: () => Promise<void>;
}

const ModelsContext = createContext<ModelsContextType | undefined>(undefined);

interface ModelsProviderProps {
    children: ReactNode;
}

/** Storage key for selected model */
const SELECTED_MODEL_KEY = 'fal_selected_model';

export const ModelsProvider: React.FC<ModelsProviderProps> = ({ children }) => {
    const [models, setModels] = useState<ModelConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModelState] = useState<ModelConfig | null>(null);

    // Persist selected model to localStorage
    const setSelectedModel = useCallback((model: ModelConfig | null) => {
        setSelectedModelState(model);
        if (model) {
            localStorage.setItem(SELECTED_MODEL_KEY, model.endpointId);
        } else {
            localStorage.removeItem(SELECTED_MODEL_KEY);
        }
    }, []);

    // Restore selected model from localStorage
    const restoreSelectedModel = useCallback((modelList: ModelConfig[]) => {
        const savedEndpointId = localStorage.getItem(SELECTED_MODEL_KEY);
        if (savedEndpointId) {
            const saved = modelList.find(m => m.endpointId === savedEndpointId);
            if (saved) {
                setSelectedModelState(saved);
                return;
            }
        }
        // Default to first model if no saved selection
        if (modelList.length > 0) {
            setSelectedModelState(modelList[0]);
        }
    }, []);

    // Fetch models from API or cache
    const loadModels = useCallback(async (forceRefresh = false) => {
        setIsLoading(true);
        setError(null);

        try {
            // Try cache first unless force refresh
            if (!forceRefresh) {
                const cached = getCachedModels();
                if (cached && cached.length > 0) {
                    setModels(cached);
                    restoreSelectedModel(cached);
                    setIsLoading(false);
                    return;
                }
            }

            // Clear cache if force refresh
            if (forceRefresh) {
                clearModelsCache();
            }

            // Fetch from API (routes through proxy)
            const fetchedModels = await fetchImageGenerationModels();

            if (fetchedModels.length === 0) {
                setError('No models available');
            } else {
                setModels(fetchedModels);
                cacheModels(fetchedModels);
                restoreSelectedModel(fetchedModels);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load models';
            setError(message);
            console.error('Failed to load models:', err);

            // Try to use cached data as fallback
            const cached = getCachedModels();
            if (cached && cached.length > 0) {
                setModels(cached);
                restoreSelectedModel(cached);
                setError(`${message} (using cached data)`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [restoreSelectedModel]);

    // Initial load on mount
    useEffect(() => {
        loadModels();
    }, [loadModels]);

    // Refresh function exposed to consumers
    const refreshModels = useCallback(async () => {
        await loadModels(true);
    }, [loadModels]);

    return (
        <ModelsContext.Provider
            value={{
                models,
                isLoading,
                error,
                selectedModel,
                setSelectedModel,
                refreshModels,
            }}
        >
            {children}
        </ModelsContext.Provider>
    );
};

export const useModels = (): ModelsContextType => {
    const context = useContext(ModelsContext);
    if (!context) {
        throw new Error('useModels must be used within a ModelsProvider');
    }
    return context;
};
