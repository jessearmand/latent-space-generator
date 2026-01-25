import { useState, useEffect, useRef, useCallback } from 'react';
import { type GenerationMode, isValidGenerationMode } from '../components/GenerationTabs';
import type { ModelConfig } from '../types/models';

/** Storage key for active tab */
const ACTIVE_TAB_KEY = 'fal_active_tab';

/** Get initial active tab from localStorage */
function getInitialActiveTab(): GenerationMode {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY);
    if (saved && isValidGenerationMode(saved)) {
        return saved;
    }
    return 'text-to-image';
}

export interface UseGenerationTabsReturn {
    activeTab: GenerationMode;
    setActiveTab: (tab: GenerationMode) => void;
    handleTabChange: (tab: GenerationMode) => void;
}

/**
 * Hook for managing generation mode tabs with localStorage persistence.
 * Also handles auto-switching when the selected model's category changes.
 */
export function useGenerationTabs(selectedModel: ModelConfig | null): UseGenerationTabsReturn {
    const [activeTab, setActiveTab] = useState<GenerationMode>(getInitialActiveTab);

    // Track previous selected model to detect user-initiated changes vs initial load
    const prevSelectedModelRef = useRef<ModelConfig | null>(null);

    // Auto-switch tab when selected model's category changes
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
            // Handle both image and video model categories
            if (modelCategory === 'text-to-image' || modelCategory === 'image-to-image' ||
                modelCategory === 'text-to-video' || modelCategory === 'image-to-video') {
                setActiveTab(modelCategory as GenerationMode);
            }
        }
    }, [selectedModel]);

    // Persist active tab to localStorage
    useEffect(() => {
        localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
    }, [activeTab]);

    // Handle tab change - keeps uploaded image (ignored during T2I generation)
    const handleTabChange = useCallback((tab: GenerationMode) => {
        setActiveTab(tab);
    }, []);

    return {
        activeTab,
        setActiveTab,
        handleTabChange,
    };
}
