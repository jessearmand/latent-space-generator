/**
 * React context for managing model state
 * Handles fetching, caching, and selection of fal.ai models
 */

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { ModelConfig, VideoModelCategory } from '../types/models';
import {
    fetchImageGenerationModels,
    fetchVideoGenerationModels,
    getCachedModels,
    cacheModels,
    clearModelsCache,
    getCachedVideoModels,
    cacheVideoModels,
} from '../services/models';
import {
    getCuratedVideoModels,
    filterModelsByQuery,
} from '../services/videoModels';

interface ModelsContextType {
    // Image models (existing)
    models: ModelConfig[];
    isLoading: boolean;
    error: string | null;
    selectedModel: ModelConfig | null;
    setSelectedModel: (model: ModelConfig | null) => void;
    refreshModels: () => Promise<void>;

    // Video models (new)
    videoModels: ModelConfig[];
    allVideoModels: ModelConfig[];
    showAllVideoModels: boolean;
    setShowAllVideoModels: (show: boolean) => void;
    videoSearchQuery: string;
    setVideoSearchQuery: (query: string) => void;
    isLoadingAllVideoModels: boolean;
    loadAllVideoModels: () => Promise<void>;
    getFilteredVideoModels: (category?: VideoModelCategory) => ModelConfig[];
}

const ModelsContext = createContext<ModelsContextType | undefined>(undefined);

interface ModelsProviderProps {
    children: ReactNode;
}

/** Storage key for selected model */
const SELECTED_MODEL_KEY = 'fal_selected_model';

export const ModelsProvider: React.FC<ModelsProviderProps> = ({ children }) => {
    // Image models state (existing)
    const [models, setModels] = useState<ModelConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModelState] = useState<ModelConfig | null>(null);

    // Video models state (new)
    const [allVideoModels, setAllVideoModels] = useState<ModelConfig[]>([]);
    const [showAllVideoModels, setShowAllVideoModels] = useState(false);
    const [videoSearchQuery, setVideoSearchQuery] = useState('');
    const [isLoadingAllVideoModels, setIsLoadingAllVideoModels] = useState(false);

    // Curated video models (static, no API call needed)
    const curatedVideoModels = useMemo(() => getCuratedVideoModels(), []);

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

    // Load all video models from API (on demand)
    const loadAllVideoModels = useCallback(async () => {
        // Skip if already loaded or loading
        if (allVideoModels.length > 0 || isLoadingAllVideoModels) {
            console.log('[VideoModels] Skipping load - already loaded or loading', {
                loaded: allVideoModels.length,
                isLoading: isLoadingAllVideoModels
            });
            return;
        }

        console.log('[VideoModels] Starting to load all video models...');
        setIsLoadingAllVideoModels(true);

        try {
            // Try cache first
            const cached = getCachedVideoModels();
            if (cached && cached.length > 0) {
                console.log('[VideoModels] Loaded from cache:', cached.length, 'models');
                setAllVideoModels(cached);
                setIsLoadingAllVideoModels(false);
                return;
            }

            // Fetch from API
            console.log('[VideoModels] Fetching from API...');
            const fetchedModels = await fetchVideoGenerationModels();
            console.log('[VideoModels] Fetched from API:', fetchedModels.length, 'models');
            setAllVideoModels(fetchedModels);
            cacheVideoModels(fetchedModels);
        } catch (err) {
            console.error('[VideoModels] Failed to load all video models:', err);

            // Try cached data as fallback
            const cached = getCachedVideoModels();
            if (cached && cached.length > 0) {
                console.log('[VideoModels] Using cached fallback:', cached.length, 'models');
                setAllVideoModels(cached);
            } else {
                console.error('[VideoModels] No cache available, models will be empty');
            }
        } finally {
            setIsLoadingAllVideoModels(false);
        }
    }, [allVideoModels.length, isLoadingAllVideoModels]);

    // Get filtered video models based on current settings
    const getFilteredVideoModels = useCallback((category?: VideoModelCategory): ModelConfig[] => {
        // Choose source: curated or all models
        const sourceModels = showAllVideoModels ? allVideoModels : curatedVideoModels;

        console.log('[VideoModels] getFilteredVideoModels called:', {
            showAllVideoModels,
            sourceCount: sourceModels.length,
            category,
            searchQuery: videoSearchQuery
        });

        // Filter by category if specified
        let filtered = category
            ? sourceModels.filter(m => m.category === category)
            : sourceModels;

        // Apply search filter if showing all models
        if (showAllVideoModels && videoSearchQuery) {
            filtered = filterModelsByQuery(filtered, videoSearchQuery);
        }

        console.log('[VideoModels] Returning', filtered.length, 'models');
        return filtered;
    }, [showAllVideoModels, allVideoModels, curatedVideoModels, videoSearchQuery]);

    // Computed video models list (for convenience)
    const videoModels = useMemo(() => {
        return showAllVideoModels ? allVideoModels : curatedVideoModels;
    }, [showAllVideoModels, allVideoModels, curatedVideoModels]);

    return (
        <ModelsContext.Provider
            value={{
                // Image models
                models,
                isLoading,
                error,
                selectedModel,
                setSelectedModel,
                refreshModels,

                // Video models
                videoModels,
                allVideoModels,
                showAllVideoModels,
                setShowAllVideoModels,
                videoSearchQuery,
                setVideoSearchQuery,
                isLoadingAllVideoModels,
                loadAllVideoModels,
                getFilteredVideoModels,
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
