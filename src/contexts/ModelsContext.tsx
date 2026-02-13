/**
 * React context for managing model state
 * Handles fetching, caching, and selection of fal.ai models
 */

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { ModelConfig, ImageModelCategory, VideoModelCategory, AudioModelCategory } from '../types/models';
import {
    fetchImageGenerationModels,
    fetchVideoGenerationModels,
    fetchAudioGenerationModels,
    getCachedModels,
    cacheModels,
    clearModelsCache,
    getCachedVideoModels,
    cacheVideoModels,
    getCachedAudioModels,
    cacheAudioModels,
} from '../services/models';
import {
    getCuratedVideoModels,
    filterModelsByQuery,
} from '../services/videoModels';
import {
    getCuratedAudioModels,
    filterAudioModelsByQuery,
} from '../services/audioModels';
import {
    getCuratedImageModels,
    filterImageModelsByQuery,
} from '../services/imageModels';

interface ModelsContextType {
    // Image models
    models: ModelConfig[];
    allImageModels: ModelConfig[];
    showAllImageModels: boolean;
    setShowAllImageModels: (show: boolean) => void;
    imageSearchQuery: string;
    setImageSearchQuery: (query: string) => void;
    isLoading: boolean;
    isLoadingAllImageModels: boolean;
    loadAllImageModels: () => Promise<void>;
    getFilteredImageModels: (category?: ImageModelCategory) => ModelConfig[];
    error: string | null;
    selectedModel: ModelConfig | null;
    setSelectedModel: (model: ModelConfig | null) => void;
    refreshModels: () => Promise<void>;

    // Video models
    videoModels: ModelConfig[];
    allVideoModels: ModelConfig[];
    showAllVideoModels: boolean;
    setShowAllVideoModels: (show: boolean) => void;
    videoSearchQuery: string;
    setVideoSearchQuery: (query: string) => void;
    isLoadingAllVideoModels: boolean;
    loadAllVideoModels: () => Promise<void>;
    getFilteredVideoModels: (category?: VideoModelCategory) => ModelConfig[];

    // Video model selection (separate from image model selection)
    selectedVideoModel: ModelConfig | null;
    setSelectedVideoModel: (model: ModelConfig | null) => void;

    // Audio models
    audioModels: ModelConfig[];
    allAudioModels: ModelConfig[];
    showAllAudioModels: boolean;
    setShowAllAudioModels: (show: boolean) => void;
    audioSearchQuery: string;
    setAudioSearchQuery: (query: string) => void;
    isLoadingAllAudioModels: boolean;
    loadAllAudioModels: () => Promise<void>;
    getFilteredAudioModels: (category?: AudioModelCategory) => ModelConfig[];

    // Audio model selection
    selectedAudioModel: ModelConfig | null;
    setSelectedAudioModel: (model: ModelConfig | null) => void;
}

const ModelsContext = createContext<ModelsContextType | undefined>(undefined);

interface ModelsProviderProps {
    children: ReactNode;
}

/** Storage key for selected image model */
const SELECTED_MODEL_KEY = 'fal_selected_model';
/** Storage key for selected video model */
const SELECTED_VIDEO_MODEL_KEY = 'fal_selected_video_model';
/** Storage key for selected audio model */
const SELECTED_AUDIO_MODEL_KEY = 'fal_selected_audio_model';

export const ModelsProvider: React.FC<ModelsProviderProps> = ({ children }) => {
    // Image models state - allImageModels holds API-fetched models
    const [allImageModels, setAllImageModels] = useState<ModelConfig[]>([]);
    const [showAllImageModels, setShowAllImageModels] = useState(false);
    const [imageSearchQuery, setImageSearchQuery] = useState('');
    const [isLoadingAllImageModels, setIsLoadingAllImageModels] = useState(false);
    // isLoading is now an alias for isLoadingAllImageModels (curated models load instantly)
    const isLoading = isLoadingAllImageModels;
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModelState] = useState<ModelConfig | null>(null);

    // Video models state
    const [allVideoModels, setAllVideoModels] = useState<ModelConfig[]>([]);
    const [showAllVideoModels, setShowAllVideoModels] = useState(false);
    const [videoSearchQuery, setVideoSearchQuery] = useState('');
    const [isLoadingAllVideoModels, setIsLoadingAllVideoModels] = useState(false);
    const [selectedVideoModel, setSelectedVideoModelState] = useState<ModelConfig | null>(null);

    // Audio models state
    const [allAudioModels, setAllAudioModels] = useState<ModelConfig[]>([]);
    const [showAllAudioModels, setShowAllAudioModels] = useState(false);
    const [audioSearchQuery, setAudioSearchQuery] = useState('');
    const [isLoadingAllAudioModels, setIsLoadingAllAudioModels] = useState(false);
    const [selectedAudioModel, setSelectedAudioModelState] = useState<ModelConfig | null>(null);

    // Curated image models (static, no API call needed)
    const curatedImageModels = useMemo(() => getCuratedImageModels(), []);

    // Curated video models (static, no API call needed)
    const curatedVideoModels = useMemo(() => getCuratedVideoModels(), []);

    // Curated audio models (static, no API call needed)
    const curatedAudioModels = useMemo(() => getCuratedAudioModels(), []);

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
    // Searches modelList first, then falls back to curatedList (consistent with video/audio)
    const restoreSelectedModel = useCallback((modelList: ModelConfig[], curatedList?: ModelConfig[]) => {
        const savedEndpointId = localStorage.getItem(SELECTED_MODEL_KEY);
        if (savedEndpointId) {
            let saved = modelList.find(m => m.endpointId === savedEndpointId);
            if (!saved && curatedList) {
                saved = curatedList.find(m => m.endpointId === savedEndpointId);
            }
            if (saved) {
                setSelectedModelState(saved);
                return;
            }
        }
        // Default to first curated model if available, otherwise first in list
        const fallback = curatedList && curatedList.length > 0 ? curatedList : modelList;
        if (fallback.length > 0) {
            setSelectedModelState(fallback[0]);
        }
    }, []);

    // Persist selected video model to localStorage
    const setSelectedVideoModel = useCallback((model: ModelConfig | null) => {
        setSelectedVideoModelState(model);
        if (model) {
            localStorage.setItem(SELECTED_VIDEO_MODEL_KEY, model.endpointId);
        } else {
            localStorage.removeItem(SELECTED_VIDEO_MODEL_KEY);
        }
    }, []);

    // Restore selected video model from localStorage
    // Searches both curated and all video models
    const restoreSelectedVideoModel = useCallback((videoModelList: ModelConfig[], curatedList: ModelConfig[]) => {
        const savedEndpointId = localStorage.getItem(SELECTED_VIDEO_MODEL_KEY);
        if (savedEndpointId) {
            // First check in the provided list (all video models if loaded)
            let saved = videoModelList.find(m => m.endpointId === savedEndpointId);
            // Fall back to curated list
            if (!saved) {
                saved = curatedList.find(m => m.endpointId === savedEndpointId);
            }
            if (saved) {
                setSelectedVideoModelState(saved);
                return;
            }
        }
        // Default to first curated model if no saved selection
        if (curatedList.length > 0) {
            setSelectedVideoModelState(curatedList[0]);
        }
    }, []);

    // Persist selected audio model to localStorage
    const setSelectedAudioModel = useCallback((model: ModelConfig | null) => {
        setSelectedAudioModelState(model);
        if (model) {
            localStorage.setItem(SELECTED_AUDIO_MODEL_KEY, model.endpointId);
        } else {
            localStorage.removeItem(SELECTED_AUDIO_MODEL_KEY);
        }
    }, []);

    // Restore selected audio model from localStorage
    const restoreSelectedAudioModel = useCallback((audioModelList: ModelConfig[], curatedList: ModelConfig[]) => {
        const savedEndpointId = localStorage.getItem(SELECTED_AUDIO_MODEL_KEY);
        if (savedEndpointId) {
            let saved = audioModelList.find(m => m.endpointId === savedEndpointId);
            if (!saved) {
                saved = curatedList.find(m => m.endpointId === savedEndpointId);
            }
            if (saved) {
                setSelectedAudioModelState(saved);
                return;
            }
        }
        // Default to first curated model if no saved selection
        if (curatedList.length > 0) {
            setSelectedAudioModelState(curatedList[0]);
        }
    }, []);

    // Fetch all image models from API or cache (used by refreshModels)
    const loadModels = useCallback(async (forceRefresh = false) => {
        setIsLoadingAllImageModels(true);
        setError(null);

        try {
            // Try cache first unless force refresh
            if (!forceRefresh) {
                const cached = getCachedModels();
                if (cached && cached.length > 0) {
                    setAllImageModels(cached);
                    restoreSelectedModel(cached, curatedImageModels);
                    setIsLoadingAllImageModels(false);
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
                setError('No models available from API');
            } else {
                setAllImageModels(fetchedModels);
                cacheModels(fetchedModels);
                restoreSelectedModel(fetchedModels, curatedImageModels);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load models';
            setError(message);
            console.error('Failed to load models:', err);

            // Try to use cached data as fallback
            const cached = getCachedModels();
            if (cached && cached.length > 0) {
                setAllImageModels(cached);
                restoreSelectedModel(cached, curatedImageModels);
                setError(`${message} (using cached data)`);
            }
        } finally {
            setIsLoadingAllImageModels(false);
        }
    }, [restoreSelectedModel, curatedImageModels]);

    // Note: Initial image model load is no longer needed since we use curated models by default
    // loadAllImageModels() is called when showAllImageModels is toggled on

    // Restore video model selection on mount (from curated models)
    useEffect(() => {
        restoreSelectedVideoModel([], curatedVideoModels);
    }, [curatedVideoModels, restoreSelectedVideoModel]);

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
                // Re-restore video model selection in case it's in the full list but not curated
                restoreSelectedVideoModel(cached, curatedVideoModels);
                setIsLoadingAllVideoModels(false);
                return;
            }

            // Fetch from API
            console.log('[VideoModels] Fetching from API...');
            const fetchedModels = await fetchVideoGenerationModels();
            console.log('[VideoModels] Fetched from API:', fetchedModels.length, 'models');
            setAllVideoModels(fetchedModels);
            cacheVideoModels(fetchedModels);
            // Re-restore video model selection in case it's in the full list but not curated
            restoreSelectedVideoModel(fetchedModels, curatedVideoModels);
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
    }, [allVideoModels.length, isLoadingAllVideoModels, curatedVideoModels, restoreSelectedVideoModel]);

    // Get filtered video models based on current settings
    const getFilteredVideoModels = useCallback((category?: VideoModelCategory): ModelConfig[] => {
        const sourceModels = showAllVideoModels ? allVideoModels : curatedVideoModels;

        let filtered = category
            ? sourceModels.filter(m => m.category === category)
            : sourceModels;

        if (showAllVideoModels && videoSearchQuery) {
            filtered = filterModelsByQuery(filtered, videoSearchQuery);
        }

        return filtered;
    }, [showAllVideoModels, allVideoModels, curatedVideoModels, videoSearchQuery]);

    // Load all audio models from API (on demand)
    const loadAllAudioModels = useCallback(async () => {
        // Skip if already loaded or loading
        if (allAudioModels.length > 0 || isLoadingAllAudioModels) {
            console.log('[AudioModels] Skipping load - already loaded or loading', {
                loaded: allAudioModels.length,
                isLoading: isLoadingAllAudioModels
            });
            return;
        }

        console.log('[AudioModels] Starting to load all audio models...');
        setIsLoadingAllAudioModels(true);

        try {
            // Try cache first
            const cached = getCachedAudioModels();
            if (cached && cached.length > 0) {
                console.log('[AudioModels] Loaded from cache:', cached.length, 'models');
                setAllAudioModels(cached);
                restoreSelectedAudioModel(cached, curatedAudioModels);
                setIsLoadingAllAudioModels(false);
                return;
            }

            // Fetch from API
            console.log('[AudioModels] Fetching from API...');
            const fetchedModels = await fetchAudioGenerationModels();
            console.log('[AudioModels] Fetched from API:', fetchedModels.length, 'models');
            setAllAudioModels(fetchedModels);
            cacheAudioModels(fetchedModels);
            restoreSelectedAudioModel(fetchedModels, curatedAudioModels);
        } catch (err) {
            console.error('[AudioModels] Failed to load all audio models:', err);

            // Try cached data as fallback
            const cached = getCachedAudioModels();
            if (cached && cached.length > 0) {
                console.log('[AudioModels] Using cached fallback:', cached.length, 'models');
                setAllAudioModels(cached);
            } else {
                console.error('[AudioModels] No cache available, models will be empty');
            }
        } finally {
            setIsLoadingAllAudioModels(false);
        }
    }, [allAudioModels.length, isLoadingAllAudioModels, curatedAudioModels, restoreSelectedAudioModel]);

    // Get filtered audio models based on current settings
    const getFilteredAudioModels = useCallback((category?: AudioModelCategory): ModelConfig[] => {
        const sourceModels = showAllAudioModels ? allAudioModels : curatedAudioModels;

        let filtered = category
            ? sourceModels.filter(m => m.category === category)
            : sourceModels;

        if (showAllAudioModels && audioSearchQuery) {
            filtered = filterAudioModelsByQuery(filtered, audioSearchQuery);
        }

        return filtered;
    }, [showAllAudioModels, allAudioModels, curatedAudioModels, audioSearchQuery]);

    // Computed video models list (for convenience)
    const videoModels = useMemo(() => {
        return showAllVideoModels ? allVideoModels : curatedVideoModels;
    }, [showAllVideoModels, allVideoModels, curatedVideoModels]);

    // Computed audio models list (for convenience)
    const audioModels = useMemo(() => {
        return showAllAudioModels ? allAudioModels : curatedAudioModels;
    }, [showAllAudioModels, allAudioModels, curatedAudioModels]);

    // Computed image models list (for convenience) - replaces old `models` state
    const models = useMemo(() => {
        return showAllImageModels ? allImageModels : curatedImageModels;
    }, [showAllImageModels, allImageModels, curatedImageModels]);

    // Load all image models from API (on demand)
    const loadAllImageModels = useCallback(async () => {
        // Skip if already loaded or loading
        if (allImageModels.length > 0 || isLoadingAllImageModels) {
            console.log('[ImageModels] Skipping load - already loaded or loading', {
                loaded: allImageModels.length,
                isLoading: isLoadingAllImageModels
            });
            return;
        }

        console.log('[ImageModels] Starting to load all image models...');
        setIsLoadingAllImageModels(true);

        try {
            // Try cache first
            const cached = getCachedModels();
            if (cached && cached.length > 0) {
                console.log('[ImageModels] Loaded from cache:', cached.length, 'models');
                setAllImageModels(cached);
                // Re-restore model selection in case it's in the full list but not curated
                restoreSelectedModel(cached, curatedImageModels);
                setIsLoadingAllImageModels(false);
                return;
            }

            // Fetch from API
            console.log('[ImageModels] Fetching from API...');
            const fetchedModels = await fetchImageGenerationModels();
            console.log('[ImageModels] Fetched from API:', fetchedModels.length, 'models');
            setAllImageModels(fetchedModels);
            cacheModels(fetchedModels);
            // Re-restore model selection in case it's in the full list but not curated
            restoreSelectedModel(fetchedModels, curatedImageModels);
        } catch (err) {
            console.error('[ImageModels] Failed to load all image models:', err);

            // Try cached data as fallback
            const cached = getCachedModels();
            if (cached && cached.length > 0) {
                console.log('[ImageModels] Using cached fallback:', cached.length, 'models');
                setAllImageModels(cached);
            } else {
                console.error('[ImageModels] No cache available, models will be empty');
            }
        } finally {
            setIsLoadingAllImageModels(false);
        }
    }, [allImageModels.length, isLoadingAllImageModels, restoreSelectedModel, curatedImageModels]);

    // Get filtered image models based on current settings
    const getFilteredImageModels = useCallback((category?: ImageModelCategory): ModelConfig[] => {
        const sourceModels = showAllImageModels ? allImageModels : curatedImageModels;

        let filtered = category
            ? sourceModels.filter(m => m.category === category)
            : sourceModels;

        if (showAllImageModels && imageSearchQuery) {
            filtered = filterImageModelsByQuery(filtered, imageSearchQuery);
        }

        return filtered;
    }, [showAllImageModels, allImageModels, curatedImageModels, imageSearchQuery]);

    // Restore audio model selection on mount (from curated models)
    useEffect(() => {
        restoreSelectedAudioModel([], curatedAudioModels);
    }, [curatedAudioModels, restoreSelectedAudioModel]);

    // Restore image model selection on mount (from curated models)
    useEffect(() => {
        restoreSelectedModel(curatedImageModels);
    }, [curatedImageModels, restoreSelectedModel]);

    return (
        <ModelsContext.Provider
            value={{
                // Image models
                models,
                allImageModels,
                showAllImageModels,
                setShowAllImageModels,
                imageSearchQuery,
                setImageSearchQuery,
                isLoading,
                isLoadingAllImageModels,
                loadAllImageModels,
                getFilteredImageModels,
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

                // Video model selection
                selectedVideoModel,
                setSelectedVideoModel,

                // Audio models
                audioModels,
                allAudioModels,
                showAllAudioModels,
                setShowAllAudioModels,
                audioSearchQuery,
                setAudioSearchQuery,
                isLoadingAllAudioModels,
                loadAllAudioModels,
                getFilteredAudioModels,

                // Audio model selection
                selectedAudioModel,
                setSelectedAudioModel,
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
