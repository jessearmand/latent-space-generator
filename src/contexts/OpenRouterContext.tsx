/**
 * React context for managing OpenRouter model state
 * Handles fetching, caching, and selection of OpenRouter models for prompt optimization
 */

import type React from "react";
import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    type ReactNode,
} from "react";
import type {
    OpenRouterModel,
    OpenRouterModelFilters,
} from "../types/openrouter";
import { filterModels, getUniqueProviders, isTextOutputModel } from "../types/openrouter";
import {
    getOpenRouterModels,
    clearOpenRouterModelsCache,
} from "../services/openrouter";
import { useOpenRouterAuth } from "./OpenRouterAuthContext";

interface OpenRouterContextType {
    /** All available models */
    models: OpenRouterModel[];
    /** Models filtered by current filters */
    filteredModels: OpenRouterModel[];
    /** Available providers for filter dropdown (derived from model IDs) */
    availableProviders: string[];
    /** Loading state */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Currently selected model */
    selectedModel: OpenRouterModel | null;
    /** Set the selected model */
    setSelectedModel: (model: OpenRouterModel | null) => void;
    /** Current filter settings */
    filters: OpenRouterModelFilters;
    /** Update filter settings */
    setFilters: (filters: OpenRouterModelFilters) => void;
    /** Force refresh models from API */
    refreshModels: () => Promise<void>;
}

const OpenRouterContext = createContext<OpenRouterContextType | undefined>(undefined);

interface OpenRouterProviderProps {
    children: ReactNode;
}

/** Storage key for selected model */
const SELECTED_MODEL_KEY = "openrouter_selected_model";
const FILTERS_KEY = "openrouter_model_filters";

export const OpenRouterProvider: React.FC<OpenRouterProviderProps> = ({ children }) => {
    const { userApiKey } = useOpenRouterAuth();
    const [models, setModels] = useState<OpenRouterModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModelState] = useState<OpenRouterModel | null>(null);
    const [filters, setFiltersState] = useState<OpenRouterModelFilters>(() => {
        // Restore filters from localStorage
        try {
            const saved = localStorage.getItem(FILTERS_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch {
            // Ignore parse errors
        }
        // Default: show only text output models
        return { textOnly: true };
    });

    // Persist filters to localStorage
    const setFilters = useCallback((newFilters: OpenRouterModelFilters) => {
        setFiltersState(newFilters);
        try {
            localStorage.setItem(FILTERS_KEY, JSON.stringify(newFilters));
        } catch {
            // Ignore storage errors
        }
    }, []);

    // Compute filtered models
    const filteredModels = useMemo(() => {
        return filterModels(models, filters);
    }, [models, filters]);

    // Auto-select model when current selection is not in filtered list
    useEffect(() => {
        // Skip during initial load when models haven't loaded yet
        if (models.length === 0) return;

        // If no filtered models available, clear selection
        if (filteredModels.length === 0) {
            setSelectedModelState(null);
            localStorage.removeItem(SELECTED_MODEL_KEY);
            return;
        }

        // If current selection exists in filtered list, keep it
        if (selectedModel && filteredModels.some((m) => m.id === selectedModel.id)) {
            return;
        }

        // Auto-select first model from filtered list
        setSelectedModelState(filteredModels[0]);
        localStorage.setItem(SELECTED_MODEL_KEY, filteredModels[0].id);
    }, [filteredModels, selectedModel, models.length]);

    // Compute available providers (derived from model IDs)
    const availableProviders = useMemo(() => {
        // Get providers from text-only models if textOnly filter is active
        const modelsToCheck = filters.textOnly
            ? models.filter(isTextOutputModel)
            : models;
        return getUniqueProviders(modelsToCheck);
    }, [models, filters.textOnly]);

    // Persist selected model to localStorage
    const setSelectedModel = useCallback((model: OpenRouterModel | null) => {
        setSelectedModelState(model);
        if (model) {
            localStorage.setItem(SELECTED_MODEL_KEY, model.id);
        } else {
            localStorage.removeItem(SELECTED_MODEL_KEY);
        }
    }, []);

    // Restore selected model from localStorage
    const restoreSelectedModel = useCallback((modelList: OpenRouterModel[]) => {
        const savedId = localStorage.getItem(SELECTED_MODEL_KEY);
        if (savedId) {
            const saved = modelList.find((m) => m.id === savedId);
            if (saved) {
                setSelectedModelState(saved);
                return;
            }
        }
        // Default to first text-output model if no saved selection
        const textModels = modelList.filter(isTextOutputModel);
        if (textModels.length > 0) {
            setSelectedModelState(textModels[0]);
        } else if (modelList.length > 0) {
            setSelectedModelState(modelList[0]);
        }
    }, []);

    // Fetch models from API or cache
    const loadModels = useCallback(
        async (forceRefresh = false) => {
            setIsLoading(true);
            setError(null);

            try {
                // Clear cache if force refresh
                if (forceRefresh) {
                    clearOpenRouterModelsCache();
                }

                // Fetch from API (with caching handled by service)
                const fetchedModels = await getOpenRouterModels(forceRefresh, userApiKey);

                if (fetchedModels.length === 0) {
                    setError("No models available");
                } else {
                    setModels(fetchedModels);
                    restoreSelectedModel(fetchedModels);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load models";
                setError(message);
                console.error("Failed to load OpenRouter models:", err);
            } finally {
                setIsLoading(false);
            }
        },
        [restoreSelectedModel, userApiKey]
    );

    // Initial load on mount
    useEffect(() => {
        loadModels();
    }, [loadModels]);

    // Refresh function exposed to consumers
    const refreshModels = useCallback(async () => {
        await loadModels(true);
    }, [loadModels]);

    return (
        <OpenRouterContext.Provider
            value={{
                models,
                filteredModels,
                availableProviders,
                isLoading,
                error,
                selectedModel,
                setSelectedModel,
                filters,
                setFilters,
                refreshModels,
            }}
        >
            {children}
        </OpenRouterContext.Provider>
    );
};

export const useOpenRouter = (): OpenRouterContextType => {
    const context = useContext(OpenRouterContext);
    if (!context) {
        throw new Error("useOpenRouter must be used within an OpenRouterProvider");
    }
    return context;
};
