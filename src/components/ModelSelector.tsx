/**
 * Model selector dropdown component
 * Displays available models with loading/error states and refresh capability
 */

import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useModels } from '../contexts/ModelsContext';

interface ModelSelectorProps {
    className?: string;
    filterByCategory?: 'text-to-image' | 'image-to-image' | null;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ className, filterByCategory }) => {
    const { models, isLoading, error, selectedModel, setSelectedModel, refreshModels } = useModels();

    // Memoize filtered models to prevent unnecessary re-renders
    const filteredModels = useMemo(
        () => filterByCategory
            ? models.filter(m => m.category === filterByCategory)
            : models,
        [models, filterByCategory]
    );

    // Track previous filterByCategory to detect actual changes
    const prevFilterRef = useRef(filterByCategory);

    // Auto-select first model when filter changes and current selection is not in filtered list
    useEffect(() => {
        const filterChanged = prevFilterRef.current !== filterByCategory;
        prevFilterRef.current = filterByCategory;

        // Only auto-select when filter actually changes (not on every render)
        if (filterChanged && filteredModels.length > 0) {
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
        const model = models.find(m => m.endpointId === endpointId);
        if (model) {
            setSelectedModel(model);
        }
    };

    const handleRefresh = async () => {
        await refreshModels();
    };

    if (isLoading && filteredModels.length === 0) {
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
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="refresh-btn"
                    title="Refresh model list"
                >
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {error && (
                <p className="model-error">{error}</p>
            )}

            <select
                id="model-selector"
                value={selectedModel?.endpointId || ''}
                onChange={handleChange}
                className="model-dropdown"
                disabled={filteredModels.length === 0}
            >
                {filteredModels.length === 0 ? (
                    <option value="">No models available</option>
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
