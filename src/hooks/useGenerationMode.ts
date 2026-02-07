import { useState, useEffect, useRef, useCallback } from 'react';
import { type GenerationMode, isValidGenerationMode } from '../components/GenerationTabs';
import type { ModelConfig } from '../types/models';

/** Storage key for active mode */
const ACTIVE_MODE_KEY = 'fal_active_mode';

/** Get initial active mode from localStorage */
function getInitialActiveMode(): GenerationMode {
    const saved = localStorage.getItem(ACTIVE_MODE_KEY);
    if (saved && isValidGenerationMode(saved)) {
        return saved;
    }
    return 'text-to-image';
}

export interface UseGenerationModeReturn {
    activeMode: GenerationMode;
    setActiveMode: (mode: GenerationMode) => void;
    handleModeChange: (mode: GenerationMode) => void;
    // Backwards compatibility aliases
    activeTab: GenerationMode;
    handleTabChange: (mode: GenerationMode) => void;
}

/**
 * Hook for managing generation mode with localStorage persistence.
 * Supports all generation modes: image, video, and audio.
 * Also handles auto-switching when the selected model's category changes.
 */
export function useGenerationMode(selectedModel: ModelConfig | null): UseGenerationModeReturn {
    const [activeMode, setActiveMode] = useState<GenerationMode>(getInitialActiveMode);

    // Track previous selected model to detect user-initiated changes vs initial load
    const prevSelectedModelRef = useRef<ModelConfig | null>(null);

    // Auto-switch mode when selected model's category changes
    // Only triggers when user manually changes model selection (not on initial load)
    useEffect(() => {
        // Skip if this is the initial load (selectedModel going from null to a value)
        // Only auto-switch when changing from one model to another
        if (prevSelectedModelRef.current === null && selectedModel !== null) {
            // Initial load - don't auto-switch, just record the model
            prevSelectedModelRef.current = selectedModel;
            return;
        }

        // Skip if model hasn't actually changed
        if (prevSelectedModelRef.current?.endpointId === selectedModel?.endpointId) {
            return;
        }

        prevSelectedModelRef.current = selectedModel;

        if (selectedModel) {
            const modelCategory = selectedModel.category;
            // Handle all valid generation mode categories
            if (isValidGenerationMode(modelCategory)) {
                setActiveMode(modelCategory);
            }
        }
    }, [selectedModel]);

    // Persist active mode to localStorage
    useEffect(() => {
        localStorage.setItem(ACTIVE_MODE_KEY, activeMode);
    }, [activeMode]);

    // Handle mode change
    const handleModeChange = useCallback((mode: GenerationMode) => {
        setActiveMode(mode);
    }, []);

    return {
        activeMode,
        setActiveMode,
        handleModeChange,
        // Backwards compatibility aliases
        activeTab: activeMode,
        handleTabChange: handleModeChange,
    };
}

// Re-export with old name for backwards compatibility during transition
export { useGenerationMode as useGenerationTabs };
export type { UseGenerationModeReturn as UseGenerationTabsReturn };
