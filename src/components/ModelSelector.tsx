/**
 * Model selector dropdown component
 * Displays available models with loading/error states and refresh capability
 * Supports both image and video models with search for video tabs
 */

import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useModels } from '../contexts/ModelsContext';
import type { GenerationMode } from './GenerationTabs';
import type { VideoModelCategory } from '../types/models';

interface ModelSelectorProps {
    className?: string;
    filterByCategory?: GenerationMode | null;
}

/** Check if category is a video mode */
function isVideoCategory(category: GenerationMode | null | undefined): category is VideoModelCategory {
    return category === 'text-to-video' || category === 'image-to-video';
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ className, filterByCategory }) => {
    const {
        // Image models
        models,
        isLoading,
        error,
        selectedModel,
        setSelectedModel,
        refreshModels,
        // Video models
        showAllVideoModels,
        setShowAllVideoModels,
        videoSearchQuery,
        setVideoSearchQuery,
        isLoadingAllVideoModels,
        loadAllVideoModels,
        getFilteredVideoModels,
        allVideoModels,
    } = useModels();

    const isVideoTab = isVideoCategory(filterByCategory);

    // Memoize filtered models to prevent unnecessary re-renders
    const filteredModels = useMemo(() => {
        if (isVideoTab) {
            // Use video models with filtering
            return getFilteredVideoModels(filterByCategory as VideoModelCategory);
        }
        // Use image models
        return filterByCategory
            ? models.filter(m => m.category === filterByCategory)
            : models;
    }, [isVideoTab, filterByCategory, models, getFilteredVideoModels]);

    // Track previous values to detect actual changes
    const prevFilterRef = useRef(filterByCategory);
    const prevFilteredModelsRef = useRef(filteredModels);

    // Auto-select first model when filter/search changes and current selection is not in filtered list
    useEffect(() => {
        const filterChanged = prevFilterRef.current !== filterByCategory;
        const modelsChanged = prevFilteredModelsRef.current !== filteredModels;
        prevFilterRef.current = filterByCategory;
        prevFilteredModelsRef.current = filteredModels;

        // Auto-select when filter or search changes and current selection is not in filtered list
        if ((filterChanged || modelsChanged) && filteredModels.length > 0) {
            const isInFiltered = selectedModel
                ? filteredModels.some(m => m.endpointId === selectedModel.endpointId)
                : false;
            if (!isInFiltered) {
                setSelectedModel(filteredModels[0]);
            }
        }
    }, [filterByCategory, filteredModels, selectedModel, setSelectedModel]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const endpointId = e.target.value;
        // Search in filteredModels first (works for both image and video)
        const model = filteredModels.find(m => m.endpointId === endpointId);
        if (model) {
            setSelectedModel(model);
        }
    };

    // Handle "Show all models" toggle for video tabs
    const handleShowAllToggle = () => {
        const newValue = !showAllVideoModels;
        console.log('[ModelSelector] Toggle show all:', newValue, 'current allVideoModels:', allVideoModels.length);
        setShowAllVideoModels(newValue);
        if (newValue && allVideoModels.length === 0) {
            console.log('[ModelSelector] Triggering loadAllVideoModels');
            loadAllVideoModels();
        }
    };

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVideoSearchQuery(e.target.value);
    };

    const handleRefresh = async () => {
        await refreshModels();
    };

    // Determine loading state based on tab type
    const isCurrentlyLoading = isVideoTab ? isLoadingAllVideoModels : isLoading;

    if (isCurrentlyLoading && filteredModels.length === 0) {
        return (
            <div className={className}>
                <label htmlFor="model-selector">Select Model:</label>
                <select id="model-selector" disabled className="model-dropdown">
                    <option>Loading models...</option>
                </select>
            </div>
        );
    }

    return (
        <div className={className}>
            <div className="model-selector-header">
                <label htmlFor="model-selector">Select Model:</label>
                {!isVideoTab && (
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="refresh-btn"
                        title="Refresh model list"
                    >
                        {isLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                )}
            </div>

            {/* Video tab controls: Show All toggle and Search */}
            {isVideoTab && (
                <div className="video-model-controls">
                    <label className="show-all-toggle">
                        <input
                            type="checkbox"
                            checked={showAllVideoModels}
                            onChange={handleShowAllToggle}
                            disabled={isLoadingAllVideoModels}
                        />
                        <span>
                            Show all models
                            {showAllVideoModels && filteredModels.length > 0 && ` (${filteredModels.length})`}
                        </span>
                    </label>

                    {showAllVideoModels && (
                        <input
                            type="text"
                            placeholder="Search models..."
                            value={videoSearchQuery}
                            onChange={handleSearchChange}
                            className="model-search-input"
                            disabled={isLoadingAllVideoModels}
                        />
                    )}

                    {isLoadingAllVideoModels && (
                        <span className="loading-indicator">Loading all models...</span>
                    )}
                </div>
            )}

            {error && !isVideoTab && (
                <p className="model-error">{error}</p>
            )}

            <select
                id="model-selector"
                value={selectedModel?.endpointId || ''}
                onChange={handleChange}
                className="model-dropdown"
                disabled={filteredModels.length === 0 || isCurrentlyLoading}
            >
                {filteredModels.length === 0 ? (
                    <option value="">
                        {isVideoTab && showAllVideoModels && videoSearchQuery
                            ? 'No matching models'
                            : 'No models available'}
                    </option>
                ) : (
                    filteredModels.map((model) => (
                        <option key={model.endpointId} value={model.endpointId}>
                            {model.displayName}
                        </option>
                    ))
                )}
            </select>

            {selectedModel?.description && (
                <p className="model-description">{selectedModel.description}</p>
            )}
        </div>
    );
};
