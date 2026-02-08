/**
 * Model selector dropdown component
 * Displays available models with loading/error states
 * Supports image, video, and audio models with "show all" toggle and search
 */

import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useModels } from '../contexts/ModelsContext';
import type { GenerationMode } from './GenerationTabs';
import { isVideoMode, isAudioMode } from './GenerationTabs';
import type { ImageModelCategory, VideoModelCategory, AudioModelCategory } from '../types/models';

interface ModelSelectorProps {
    className?: string;
    filterByCategory?: GenerationMode | null;
}

/** Check if category is a video mode */
function isVideoCategory(category: GenerationMode | null | undefined): category is VideoModelCategory {
    return category !== null && category !== undefined && isVideoMode(category);
}

/** Check if category is an audio mode */
function isAudioCategory(category: GenerationMode | null | undefined): category is AudioModelCategory {
    return category !== null && category !== undefined && isAudioMode(category);
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ className, filterByCategory }) => {
    const {
        // Image models
        error,
        selectedModel,
        setSelectedModel,
        // Video models
        showAllVideoModels,
        setShowAllVideoModels,
        videoSearchQuery,
        setVideoSearchQuery,
        isLoadingAllVideoModels,
        loadAllVideoModels,
        getFilteredVideoModels,
        allVideoModels,
        // Video model selection
        selectedVideoModel,
        setSelectedVideoModel,
        // Audio models
        showAllAudioModels,
        setShowAllAudioModels,
        audioSearchQuery,
        setAudioSearchQuery,
        isLoadingAllAudioModels,
        loadAllAudioModels,
        getFilteredAudioModels,
        allAudioModels,
        // Audio model selection
        selectedAudioModel,
        setSelectedAudioModel,
        // Image models (show all / search)
        showAllImageModels,
        setShowAllImageModels,
        imageSearchQuery,
        setImageSearchQuery,
        isLoadingAllImageModels,
        loadAllImageModels,
        getFilteredImageModels,
        allImageModels,
    } = useModels();

    const isVideoTab = isVideoCategory(filterByCategory);
    const isAudioTab = isAudioCategory(filterByCategory);

    // Use the appropriate selection based on tab type
    const currentSelectedModel = isAudioTab
        ? selectedAudioModel
        : isVideoTab
        ? selectedVideoModel
        : selectedModel;
    const setCurrentSelectedModel = isAudioTab
        ? setSelectedAudioModel
        : isVideoTab
        ? setSelectedVideoModel
        : setSelectedModel;

    // Memoize filtered models to prevent unnecessary re-renders
    const filteredModels = useMemo(() => {
        if (isAudioTab) {
            // Use audio models with filtering
            return getFilteredAudioModels(filterByCategory as AudioModelCategory);
        }
        if (isVideoTab) {
            // Use video models with filtering
            return getFilteredVideoModels(filterByCategory as VideoModelCategory);
        }
        // Use image models with filtering
        return getFilteredImageModels(filterByCategory as ImageModelCategory);
    }, [isAudioTab, isVideoTab, filterByCategory, getFilteredVideoModels, getFilteredAudioModels, getFilteredImageModels]);

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
            const isInFiltered = currentSelectedModel
                ? filteredModels.some(m => m.endpointId === currentSelectedModel.endpointId)
                : false;
            if (!isInFiltered) {
                setCurrentSelectedModel(filteredModels[0]);
            }
        }
    }, [filterByCategory, filteredModels, currentSelectedModel, setCurrentSelectedModel]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const endpointId = e.target.value;
        // Search in filteredModels first (works for both image and video)
        const model = filteredModels.find(m => m.endpointId === endpointId);
        if (model) {
            setCurrentSelectedModel(model);
        }
    };

    // Handle "Show all models" toggle for all tabs
    const handleShowAllToggle = () => {
        if (isAudioTab) {
            const newValue = !showAllAudioModels;
            console.log('[ModelSelector] Toggle show all audio:', newValue, 'current allAudioModels:', allAudioModels.length);
            setShowAllAudioModels(newValue);
            if (newValue && allAudioModels.length === 0) {
                console.log('[ModelSelector] Triggering loadAllAudioModels');
                loadAllAudioModels();
            }
        } else if (isVideoTab) {
            const newValue = !showAllVideoModels;
            console.log('[ModelSelector] Toggle show all video:', newValue, 'current allVideoModels:', allVideoModels.length);
            setShowAllVideoModels(newValue);
            if (newValue && allVideoModels.length === 0) {
                console.log('[ModelSelector] Triggering loadAllVideoModels');
                loadAllVideoModels();
            }
        } else {
            const newValue = !showAllImageModels;
            console.log('[ModelSelector] Toggle show all image:', newValue, 'current allImageModels:', allImageModels.length);
            setShowAllImageModels(newValue);
            if (newValue && allImageModels.length === 0) {
                console.log('[ModelSelector] Triggering loadAllImageModels');
                loadAllImageModels();
            }
        }
    };

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isAudioTab) {
            setAudioSearchQuery(e.target.value);
        } else if (isVideoTab) {
            setVideoSearchQuery(e.target.value);
        } else {
            setImageSearchQuery(e.target.value);
        }
    };

    // Determine loading state based on tab type
    const isCurrentlyLoading = isAudioTab
        ? isLoadingAllAudioModels
        : isVideoTab
        ? isLoadingAllVideoModels
        : isLoadingAllImageModels;

    // Get the appropriate "show all" and search state
    const showAllModels = isAudioTab
        ? showAllAudioModels
        : isVideoTab
        ? showAllVideoModels
        : showAllImageModels;
    const searchQuery = isAudioTab
        ? audioSearchQuery
        : isVideoTab
        ? videoSearchQuery
        : imageSearchQuery;

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
            </div>

            {/* Model controls: Show All toggle and Search */}
            <div className="model-controls">
                <label className="show-all-toggle">
                    <input
                        type="checkbox"
                        checked={showAllModels}
                        onChange={handleShowAllToggle}
                        disabled={isCurrentlyLoading}
                    />
                    <span>
                        Show all models
                        {showAllModels && filteredModels.length > 0 && ` (${filteredModels.length})`}
                    </span>
                </label>

                {showAllModels && (
                    <input
                        type="text"
                        placeholder="Search models..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="model-search-input"
                        disabled={isCurrentlyLoading}
                    />
                )}

                {isCurrentlyLoading && (
                    <span className="loading-indicator">Loading all models...</span>
                )}
            </div>

            {error && !isVideoTab && !isAudioTab && (
                <p className="model-error">{error}</p>
            )}

            <select
                id="model-selector"
                value={currentSelectedModel?.endpointId || ''}
                onChange={handleChange}
                className="model-dropdown"
                disabled={filteredModels.length === 0 || isCurrentlyLoading}
            >
                {filteredModels.length === 0 ? (
                    <option value="">
                        {showAllModels && searchQuery
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

            {currentSelectedModel?.description && (
                <p className="model-description">{currentSelectedModel.description}</p>
            )}
        </div>
    );
};
