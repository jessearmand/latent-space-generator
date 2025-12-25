/**
 * Dynamic configuration panel for model-specific settings
 * Renders different options based on model category
 */

import type React from 'react';
import { useState } from 'react';
import type { ModelConfig } from '../types/models';
import { useConfig } from '../config';

interface ModelConfigPanelProps {
    selectedModel: ModelConfig | null;
    uploadedImage: File | null;
    imagePreview: string | null;
    onImageChange: (file: File | null) => void;
}

export const ModelConfigPanel: React.FC<ModelConfigPanelProps> = ({
    selectedModel,
    uploadedImage,
    imagePreview,
    onImageChange,
}) => {
    const config = useConfig();
    const [isExpanded, setIsExpanded] = useState(true);

    if (!selectedModel) {
        return null;
    }

    const isImageToImage = selectedModel.supportsImageInput;
    const isGptModel = selectedModel.endpointId.includes('gpt-image');

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
                    {isGptModel ? (
                        <GptConfigOptions config={config} />
                    ) : (
                        <FluxConfigOptions
                            config={config}
                            supportsImageInput={isImageToImage}
                            uploadedImage={uploadedImage}
                            imagePreview={imagePreview}
                            onImageChange={onImageChange}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

interface FluxConfigOptionsProps {
    config: ReturnType<typeof useConfig>;
    supportsImageInput: boolean;
    uploadedImage: File | null;
    imagePreview: string | null;
    onImageChange: (file: File | null) => void;
}

const FluxConfigOptions: React.FC<FluxConfigOptionsProps> = ({
    config,
    supportsImageInput,
    imagePreview,
    onImageChange,
}) => {
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

            {supportsImageInput && (
                <>
                    <div className="form-group">
                        <label htmlFor="image-prompt-strength">Image Prompt Strength:</label>
                        <input
                            id="image-prompt-strength"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={config.imagePromptStrength}
                            onChange={(e) => config.setImagePromptStrength(parseFloat(e.target.value) || 0.1)}
                            placeholder="e.g., 0.1"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="upload-image">Upload Image:</label>
                        <input
                            id="upload-image"
                            type="file"
                            accept="image/*"
                            onChange={(e) => onImageChange(e.target.files ? e.target.files[0] : null)}
                        />
                        {imagePreview && (
                            <img src={imagePreview} alt="Preview" className="image-preview" />
                        )}
                    </div>
                </>
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
