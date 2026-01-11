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

    // Different models support different durations
    const getDurationOptions = (): string[] => {
        const modelId = selectedModel.endpointId.toLowerCase();

        // Kling models support 5s and 10s
        if (modelId.includes('kling')) {
            return ['5s', '10s'];
        }

        // Veo models support 5s-8s
        if (modelId.includes('veo')) {
            return ['5s', '6s', '7s', '8s'];
        }

        // Default duration options
        return ['5s', '6s', '7s', '8s', '10s'];
    };

    // Different models support different aspect ratios
    const getAspectRatioOptions = (): string[] => {
        const modelId = selectedModel.endpointId.toLowerCase();

        // Kling models support 16:9, 9:16, 1:1
        if (modelId.includes('kling')) {
            return ['16:9', '9:16', '1:1'];
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
        const modelId = selectedModel.endpointId.toLowerCase();

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
