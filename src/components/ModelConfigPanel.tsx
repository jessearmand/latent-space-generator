/**
 * Dynamic configuration panel for model-specific settings
 * Renders different options based on model category (image or video)
 */

import type React from 'react';
import { useState, useEffect } from 'react';
import type { ModelConfig } from '../types/models';
import { useConfig } from '../config';
import { getImageInputConfig } from '../services/modelParams';
import { VideoConfigOptions } from './VideoConfigOptions';
import type { GenerationMode } from './GenerationTabs';

interface ModelConfigPanelProps {
    selectedModel: ModelConfig | null;
    activeTab?: GenerationMode;
}

export const ModelConfigPanel: React.FC<ModelConfigPanelProps> = ({
    selectedModel,
    activeTab = 'text-to-image',
}) => {
    const config = useConfig();
    const [isExpanded, setIsExpanded] = useState(true);

    if (!selectedModel) {
        return null;
    }

    const isVideoModel = selectedModel.outputType === 'video';
    const isImageToImage = selectedModel.supportsImageInput;
    const isGptModel = selectedModel.endpointId.includes('gpt-image');
    const isQwenModel = selectedModel.endpointId.includes('qwen-image');
    const isQwenLayeredModel = selectedModel.endpointId.includes('qwen-image-layered');

    return (
        <div className="config-panel">
            <div className="config-header">
                <h4>Settings for {selectedModel.displayName}</h4>
                <button
                    type="button"
                    className="expand-config-btn"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? 'Hide Settings' : 'Show Settings'}
                </button>
            </div>

            {isExpanded && (
                <div className="config-options">
                    {isVideoModel ? (
                        <VideoConfigOptions selectedModel={selectedModel} />
                    ) : isGptModel ? (
                        <GptConfigOptions config={config} />
                    ) : (
                        <>
                            <FluxConfigOptions
                                config={config}
                                modelId={selectedModel.endpointId}
                                activeTab={activeTab}
                                isImageToImage={isImageToImage}
                            />
                            {isQwenModel && (
                                <QwenConfigOptions
                                    config={config}
                                    showNumLayers={isQwenLayeredModel}
                                />
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

interface FluxConfigOptionsProps {
    config: ReturnType<typeof useConfig>;
    modelId: string;
    activeTab: GenerationMode;
    isImageToImage: boolean;
}

const FluxConfigOptions: React.FC<FluxConfigOptionsProps> = ({
    config,
    modelId,
    activeTab,
    isImageToImage,
}) => {
    // Check if this model supports strength parameter
    const imageConfig = getImageInputConfig(modelId);
    const showImageStrength = activeTab === 'image-to-image'
        && isImageToImage
        && imageConfig.strengthParam !== null;
    return (
        <>
            <div className="form-group">
                <label htmlFor="safety-tolerance">Safety Tolerance:</label>
                <select
                    id="safety-tolerance"
                    value={config.safetyTolerance}
                    onChange={(e) => config.setSafetyTolerance(e.target.value)}
                >
                    {['1', '2', '3', '4', '5', '6'].map((val) => (
                        <option key={val} value={val}>{val}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="aspect-ratio">Aspect Ratio:</label>
                <select
                    id="aspect-ratio"
                    value={config.aspectRatio}
                    onChange={(e) => config.setAspectRatio(e.target.value)}
                >
                    {['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'].map((ratio) => (
                        <option key={ratio} value={ratio}>{ratio}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="image-size">Image Size:</label>
                <select
                    id="image-size"
                    value={typeof config.imageSize === 'string' ? config.imageSize : 'custom'}
                    onChange={(e) => {
                        if (e.target.value !== 'custom') {
                            config.setImageSize(e.target.value);
                        } else {
                            config.setImageSize({ width: 1024, height: 1280 });
                        }
                    }}
                >
                    {['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'].map((size) => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                    <option value="custom">Custom</option>
                </select>
                {typeof config.imageSize !== 'string' && (
                    <div className="custom-size-inputs">
                        <input
                            type="number"
                            placeholder="Width"
                            value={config.imageSize.width}
                            onChange={(e) => config.setImageSize({
                                ...(config.imageSize as { width: number; height: number }),
                                width: parseInt(e.target.value, 10) || 1024
                            })}
                        />
                        <input
                            type="number"
                            placeholder="Height"
                            value={config.imageSize.height}
                            onChange={(e) => config.setImageSize({
                                ...(config.imageSize as { width: number; height: number }),
                                height: parseInt(e.target.value, 10) || 1280
                            })}
                        />
                    </div>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="raw-output">Raw Output:</label>
                <input
                    id="raw-output"
                    type="checkbox"
                    checked={config.raw}
                    onChange={(e) => config.setRaw(e.target.checked)}
                />
            </div>

            <div className="form-group">
                <label htmlFor="enable-safety-checker">Enable Safety Checker:</label>
                <input
                    id="enable-safety-checker"
                    type="checkbox"
                    checked={config.enableSafetyChecker}
                    onChange={(e) => config.setEnableSafetyChecker(e.target.checked)}
                />
            </div>

            <div className="form-group">
                <label htmlFor="seed">Seed (leave blank for random):</label>
                <input
                    id="seed"
                    type="number"
                    value={config.seed !== null ? config.seed : ''}
                    onChange={(e) => config.setSeed(e.target.value ? parseInt(e.target.value, 10) : null)}
                />
            </div>

            <div className="form-group">
                <label htmlFor="guidance-scale">Guidance Scale:</label>
                <input
                    id="guidance-scale"
                    type="number"
                    step="0.1"
                    value={config.guidanceScale}
                    onChange={(e) => config.setGuidanceScale(parseFloat(e.target.value) || 3.5)}
                    placeholder="e.g., 3.5"
                />
            </div>

            {showImageStrength && (
                <div className="form-group">
                    <label htmlFor="image-prompt-strength">
                        {imageConfig.strengthParam === 'strength' ? 'Strength' : 'Image Prompt Strength'}:
                        <span className="hint"> (0 = preserve original, 1 = full transformation)</span>
                    </label>
                    <input
                        id="image-prompt-strength"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={config.imagePromptStrength}
                        onChange={(e) => config.setImagePromptStrength(parseFloat(e.target.value))}
                    />
                    <span className="range-value">{config.imagePromptStrength.toFixed(2)}</span>
                </div>
            )}
        </>
    );
};

interface GptConfigOptionsProps {
    config: ReturnType<typeof useConfig>;
}

const GptConfigOptions: React.FC<GptConfigOptionsProps> = ({ config }) => {
    return (
        <>
            <div className="form-group">
                <label htmlFor="gpt-image-size">GPT Image Size:</label>
                <select
                    id="gpt-image-size"
                    value={config.gptImageSize}
                    onChange={(e) => config.setGptImageSize(e.target.value)}
                >
                    {['auto', '1024x1024', '1536x1024', '1024x1536'].map((size) => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="gpt-num-images">Number of Images:</label>
                <input
                    id="gpt-num-images"
                    type="number"
                    min="1"
                    value={config.gptNumImages}
                    onChange={(e) => config.setGptNumImages(parseInt(e.target.value, 10) || 1)}
                />
            </div>

            <div className="form-group">
                <label htmlFor="gpt-quality">Quality:</label>
                <select
                    id="gpt-quality"
                    value={config.gptQuality}
                    onChange={(e) => config.setGptQuality(e.target.value)}
                >
                    {['auto', 'low', 'medium', 'high'].map((val) => (
                        <option key={val} value={val}>{val}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="gpt-background">Background:</label>
                <select
                    id="gpt-background"
                    value={config.gptBackground}
                    onChange={(e) => config.setGptBackground(e.target.value)}
                >
                    {['auto', 'transparent', 'opaque'].map((val) => (
                        <option key={val} value={val}>{val}</option>
                    ))}
                </select>
            </div>
        </>
    );
};

interface QwenConfigOptionsProps {
    config: ReturnType<typeof useConfig>;
    showNumLayers: boolean;  // Only show num_layers for qwen-image-layered
}

/**
 * Config options for Qwen image models
 * - acceleration: Speed vs quality tradeoff ("none" | "regular" | "high") - available for all Qwen models
 * - num_layers: Number of layers to decompose into (1-10) - only for qwen-image-layered
 */
const QwenConfigOptions: React.FC<QwenConfigOptionsProps> = ({ config, showNumLayers }) => {
    // Use local string state to allow free typing without immediate clamping
    const [layersInput, setLayersInput] = useState(config.numLayers.toString());

    // Sync local state when config changes externally
    useEffect(() => {
        setLayersInput(config.numLayers.toString());
    }, [config.numLayers]);

    const commitLayersValue = (value: string) => {
        const parsed = parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
            // Clamp to valid range 1-10
            const clamped = Math.max(1, Math.min(10, parsed));
            config.setNumLayers(clamped);
            setLayersInput(clamped.toString());
        } else {
            // Reset to current config value if invalid
            setLayersInput(config.numLayers.toString());
        }
    };

    return (
        <>
            <div className="form-group-divider">
                <span>{showNumLayers ? 'Layer Decomposition Settings' : 'Qwen Model Settings'}</span>
            </div>

            {showNumLayers && (
                <div className="form-group">
                    <label htmlFor="num-layers">Number of Layers:</label>
                    <input
                        id="num-layers"
                        type="number"
                        min="1"
                        max="10"
                        value={layersInput}
                        onChange={(e) => setLayersInput(e.target.value)}
                        onBlur={(e) => commitLayersValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                commitLayersValue(layersInput);
                            }
                        }}
                    />
                    <span className="hint"> (1-10, how many layers to decompose into)</span>
                </div>
            )}

            <div className="form-group">
                <label htmlFor="qwen-acceleration">Acceleration:</label>
                <select
                    id="qwen-acceleration"
                    value={config.acceleration}
                    onChange={(e) => config.setAcceleration(e.target.value)}
                >
                    <option value="none">None (highest quality)</option>
                    <option value="regular">Regular (balanced)</option>
                    <option value="high">High (fastest)</option>
                </select>
            </div>
        </>
    );
};
