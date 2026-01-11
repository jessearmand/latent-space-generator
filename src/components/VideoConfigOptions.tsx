/**
 * Configuration options for video generation models
 * Provides controls for duration, aspect ratio, resolution, and other video-specific parameters
 */

import type React from 'react';
import { useConfig } from '../config';
import type { ModelConfig } from '../types/models';

interface VideoConfigOptionsProps {
    selectedModel: ModelConfig;
}

export const VideoConfigOptions: React.FC<VideoConfigOptionsProps> = ({
    selectedModel,
}) => {
    const config = useConfig();
    const modelId = selectedModel.endpointId.toLowerCase();

    // Model detection helpers
    const isKlingModel = modelId.includes('kling');
    const isVeoModel = modelId.includes('veo');
    const isLtx19bModel = modelId.includes('ltx-2-19b');  // 19B version has more params
    const isLtxProFastModel = modelId.includes('ltx-2') && !modelId.includes('ltx-2-19b');  // Pro/Fast versions
    const isLtxModel = modelId.includes('ltx-2');  // Any LTX-2 model
    const isLtxFastModel = modelId.includes('ltx-2') && modelId.includes('fast') && !modelId.includes('ltx-2-19b');
    const supportsAudio = isVeoModel || isLtxModel;
    // Guidance scale: ltx-2-19b has it, but veo, ltx-2 Pro/Fast, and kling don't
    const supportsGuidanceScale = isLtx19bModel || (!isVeoModel && !isLtxProFastModel && !isKlingModel);

    // Different models support different durations
    const getDurationOptions = (): string[] => {
        // Kling models support 5s and 10s
        if (isKlingModel) {
            return ['5s', '10s'];
        }

        // Veo models support 4s, 6s, 8s (per API docs)
        if (isVeoModel) {
            return ['4s', '6s', '8s'];
        }

        // LTX-2 Fast supports extended durations (6-20s, longer ones need 25fps + 1080p)
        if (isLtxFastModel) {
            return ['6s', '8s', '10s', '12s', '14s', '16s', '18s', '20s'];
        }

        // LTX-2 Pro supports 6s, 8s, 10s
        if (isLtxModel) {
            return ['6s', '8s', '10s'];
        }

        // Default duration options
        return ['5s', '6s', '7s', '8s', '10s'];
    };

    // Different models support different aspect ratios
    const getAspectRatioOptions = (): string[] => {
        // Kling models support 16:9, 9:16, 1:1
        if (isKlingModel) {
            return ['16:9', '9:16', '1:1'];
        }

        // Veo models support 16:9 and 9:16
        if (isVeoModel) {
            return ['16:9', '9:16'];
        }

        // LTX-2 only supports 16:9
        if (isLtxModel) {
            return ['16:9'];
        }

        // Luma supports more aspect ratios
        if (modelId.includes('luma')) {
            return ['16:9', '9:16', '4:3', '3:4', '21:9', '9:21'];
        }

        // Default aspect ratio options
        return ['16:9', '9:16', '1:1'];
    };

    // Different models support different resolutions
    const getResolutionOptions = (): string[] => {
        // Veo models support 720p and 1080p
        if (isVeoModel) {
            return ['720p', '1080p'];
        }

        // LTX-2 supports higher resolutions
        if (isLtxModel) {
            return ['1080p', '1440p', '2160p'];
        }

        // Wan Pro and MiniMax Hailuo 2.3 support 1080p
        if (modelId.includes('wan-pro') || modelId.includes('hailuo-2.3')) {
            return ['720p', '1080p'];
        }

        // Hunyuan supports multiple resolutions
        if (modelId.includes('hunyuan')) {
            return ['480p', '580p', '720p'];
        }

        // Luma Ray 2 supports up to 1080p
        if (modelId.includes('luma') && modelId.includes('ray')) {
            return ['540p', '720p', '1080p'];
        }

        // Default is 720p only
        return ['720p'];
    };

    const durationOptions = getDurationOptions();
    const aspectRatioOptions = getAspectRatioOptions();
    const resolutionOptions = getResolutionOptions();

    return (
        <>
            <div className="form-group">
                <label htmlFor="video-duration">Duration:</label>
                <select
                    id="video-duration"
                    value={config.videoDuration}
                    onChange={(e) => config.setVideoDuration(e.target.value)}
                >
                    {durationOptions.map((duration) => (
                        <option key={duration} value={duration}>{duration}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="video-aspect-ratio">Aspect Ratio:</label>
                <select
                    id="video-aspect-ratio"
                    value={config.videoAspectRatio}
                    onChange={(e) => config.setVideoAspectRatio(e.target.value)}
                >
                    {aspectRatioOptions.map((ratio) => (
                        <option key={ratio} value={ratio}>{ratio}</option>
                    ))}
                </select>
            </div>

            {resolutionOptions.length > 1 && (
                <div className="form-group">
                    <label htmlFor="video-resolution">Resolution:</label>
                    <select
                        id="video-resolution"
                        value={config.videoResolution}
                        onChange={(e) => config.setVideoResolution(e.target.value)}
                    >
                        {resolutionOptions.map((res) => (
                            <option key={res} value={res}>{res}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Audio generation option for veo and ltx-2 models */}
            {supportsAudio && (
                <div className="form-group">
                    <label htmlFor="generate-audio">Generate Audio:</label>
                    <input
                        id="generate-audio"
                        type="checkbox"
                        checked={config.generateAudio}
                        onChange={(e) => config.setGenerateAudio(e.target.checked)}
                    />
                    <span className="hint"> (includes sound in the video)</span>
                </div>
            )}

            {/* CFG Scale for Kling models (0-1 range) */}
            {isKlingModel && (
                <div className="form-group">
                    <label htmlFor="video-cfg-scale">CFG Scale:</label>
                    <input
                        id="video-cfg-scale"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.videoCfgScale}
                        onChange={(e) => config.setVideoCfgScale(parseFloat(e.target.value))}
                    />
                    <span className="range-value">{config.videoCfgScale.toFixed(1)}</span>
                    <span className="hint"> (0 = creative, 1 = follow prompt closely)</span>
                </div>
            )}

            {/* Standard Guidance Scale - only for models that support it */}
            {supportsGuidanceScale && (
                <div className="form-group">
                    <label htmlFor="video-guidance-scale">Guidance Scale:</label>
                    <input
                        id="video-guidance-scale"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={config.videoGuidanceScale}
                        onChange={(e) => config.setVideoGuidanceScale(parseFloat(e.target.value) || 3)}
                        placeholder="e.g., 3"
                    />
                </div>
            )}

            {/* LTX-2 19B specific controls */}
            {isLtx19bModel && (
                <>
                    <div className="form-group-divider">
                        <span>LTX-2 19B Settings</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-num-frames">Number of Frames:</label>
                        <input
                            id="ltx-num-frames"
                            type="number"
                            min="9"
                            max="481"
                            value={config.videoNumFrames}
                            onChange={(e) => config.setVideoNumFrames(Math.max(9, Math.min(481, parseInt(e.target.value, 10) || 121)))}
                        />
                        <span className="hint"> (9-481, ~{Math.round(config.videoNumFrames / 25)}s at 25fps)</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-video-size">Video Size:</label>
                        <select
                            id="ltx-video-size"
                            value={config.videoOutputSize}
                            onChange={(e) => config.setVideoOutputSize(e.target.value)}
                        >
                            <option value="landscape_16_9">Landscape 16:9</option>
                            <option value="landscape_4_3">Landscape 4:3</option>
                            <option value="portrait_9_16">Portrait 9:16</option>
                            <option value="portrait_3_4">Portrait 3:4</option>
                            <option value="square">Square</option>
                            <option value="square_hd">Square HD</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-acceleration">Acceleration:</label>
                        <select
                            id="ltx-acceleration"
                            value={config.videoAcceleration}
                            onChange={(e) => config.setVideoAcceleration(e.target.value)}
                        >
                            <option value="none">None (highest quality)</option>
                            <option value="regular">Regular (balanced)</option>
                            <option value="high">High (faster)</option>
                            <option value="full">Full (fastest)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-num-inference-steps">Inference Steps:</label>
                        <input
                            id="ltx-num-inference-steps"
                            type="number"
                            min="8"
                            max="50"
                            value={config.videoNumInferenceSteps}
                            onChange={(e) => config.setVideoNumInferenceSteps(Math.max(8, Math.min(50, parseInt(e.target.value, 10) || 40)))}
                        />
                        <span className="hint"> (8-50, more = better quality)</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-camera-lora">Camera Movement:</label>
                        <select
                            id="ltx-camera-lora"
                            value={config.videoCameraLora}
                            onChange={(e) => config.setVideoCameraLora(e.target.value)}
                        >
                            <option value="none">None</option>
                            <option value="dolly_in">Dolly In</option>
                            <option value="dolly_out">Dolly Out</option>
                            <option value="dolly_left">Dolly Left</option>
                            <option value="dolly_right">Dolly Right</option>
                            <option value="jib_up">Jib Up</option>
                            <option value="jib_down">Jib Down</option>
                            <option value="static">Static</option>
                        </select>
                    </div>

                    {config.videoCameraLora !== 'none' && (
                        <div className="form-group">
                            <label htmlFor="ltx-camera-lora-scale">Camera Movement Strength:</label>
                            <input
                                id="ltx-camera-lora-scale"
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={config.videoCameraLoraScale}
                                onChange={(e) => config.setVideoCameraLoraScale(parseFloat(e.target.value))}
                            />
                            <span className="range-value">{config.videoCameraLoraScale.toFixed(1)}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="ltx-use-multiscale">Use Multiscale:</label>
                        <input
                            id="ltx-use-multiscale"
                            type="checkbox"
                            checked={config.videoUseMultiscale}
                            onChange={(e) => config.setVideoUseMultiscale(e.target.checked)}
                        />
                        <span className="hint"> (better coherence and details)</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-enable-prompt-expansion">Prompt Expansion:</label>
                        <input
                            id="ltx-enable-prompt-expansion"
                            type="checkbox"
                            checked={config.videoEnablePromptExpansion}
                            onChange={(e) => config.setVideoEnablePromptExpansion(e.target.checked)}
                        />
                        <span className="hint"> (auto-enhance prompt)</span>
                    </div>
                </>
            )}

            <div className="form-group">
                <label htmlFor="video-seed">Seed (leave blank for random):</label>
                <input
                    id="video-seed"
                    type="number"
                    value={config.videoSeed !== null ? config.videoSeed : ''}
                    onChange={(e) => config.setVideoSeed(e.target.value ? parseInt(e.target.value, 10) : null)}
                />
            </div>

            <div className="form-group">
                <label htmlFor="video-negative-prompt">Negative Prompt:</label>
                <textarea
                    id="video-negative-prompt"
                    value={config.videoNegativePrompt}
                    onChange={(e) => config.setVideoNegativePrompt(e.target.value)}
                    placeholder="Content to avoid (e.g., blur, distort, low quality)"
                    rows={2}
                    className="negative-prompt-textarea"
                />
            </div>
        </>
    );
};
