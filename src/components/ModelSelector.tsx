/**
 * Model selector dropdown component
 * Displays available models with loading/error states and refresh capability
 */

import type React from 'react';
import { useModels } from '../contexts/ModelsContext';

interface ModelSelectorProps {
    className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ className }) => {
    const { models, isLoading, error, selectedModel, setSelectedModel, refreshModels } = useModels();

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

    if (isLoading && models.length === 0) {
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
                disabled={models.length === 0}
            >
                {models.length === 0 ? (
                    <option value="">No models available</option>
                ) : (
                    models.map((model) => (
                        <option key={model.endpointId} value={model.endpointId}>
                            {model.displayName}
                            {model.supportsImageInput ? ' (Image-to-Image)' : ''}
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
