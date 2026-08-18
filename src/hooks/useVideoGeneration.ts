import { useState, useCallback, useRef, useEffect } from 'react';
import type { GenerationMode } from '../components/GenerationTabs';
import type { ModelConfig } from '../types/models';
import type { ConfigState } from '../config';
import { parseFalError } from '../services/errors';
import { getImageInputConfig } from '../services/modelParams';
import {
    describeExtendSourceViolation,
    getExtendCapabilityProfile,
    type ExtendCapabilityProfile,
    type ExtendSourceMetadata,
} from '../services/extendVideoCapabilities';
import { uploadFilesToFalStorage } from '../services/falStorage';
import { FalQueueCancelledError, FalQueueTimeoutError, submitAndPollFalQueue } from '../services/falQueue';
import {
    buildVideoGenerationInput,
    extractVideoUrl,
    validateVideoRequest,
    type VideoAssetUrls,
} from '../services/videoInputBuilders';
import { probeVideoFile } from '../utils/videoMetadata';
import type { StatusType } from './useStatusMessage';

const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const POLL_INTERVAL_MS = 3000; // longer poll interval for video

export interface UseVideoGenerationParams {
    activeTab: GenerationMode;
    uploadedImages: File[];
    uploadedVideoFile: File | null;
    config: ConfigState;
    setStatus: (message: string, type?: StatusType) => void;
}

export interface UseVideoGenerationReturn {
    videoUrl: string | null;
    isGenerating: boolean;
    generateVideo: (prompt: string, model: ModelConfig) => Promise<void>;
    clearVideo: () => void;
}

/**
 * Probe the source clip when the profile has constraints only metadata can
 * check. Returns null when nothing needs probing or the metadata is locally
 * unreadable — the API remains the final validator of the upload.
 */
async function probeExtendSource(profile: ExtendCapabilityProfile, file: File): Promise<ExtendSourceMetadata | null> {
    const needsProbe =
        profile.sourceMinSeconds !== null || profile.sourceMaxSeconds !== null || profile.sourceDimensions.length > 0;
    if (!needsProbe) {
        return null;
    }
    try {
        return await probeVideoFile(file, { capturePoster: false });
    } catch {
        return null;
    }
}

interface UploadVideoAssetsArgs {
    mode: GenerationMode;
    modelId: string;
    modelName: string;
    images: File[];
    videoFile: File | null;
    onStatus: (message: string) => void;
}

/**
 * Upload the media the active mode needs. Returns the resulting URLs, or a
 * user-ready error message when an upload fails.
 */
async function uploadVideoAssets({
    mode,
    modelId,
    modelName,
    images,
    videoFile,
    onStatus,
}: UploadVideoAssetsArgs): Promise<{ assets: VideoAssetUrls } | { error: string }> {
    const assets: VideoAssetUrls = { referenceImageUrls: [] };
    let label = 'media';
    try {
        if (mode === 'image-to-video' && images.length > 0) {
            label = 'image';
            // Start frame plus, on endpoints with a second upload slot
            // (Seedance, MiniMax H3), the optional end frame — independent
            // uploads, so they run in parallel.
            const hasEndFrame = getImageInputConfig(modelId).maxImages >= 2 && images.length >= 2;
            onStatus(`Uploading image${hasEndFrame ? 's' : ''} for ${modelName}...`);
            const [imageUrl, endImageUrl] = await uploadFilesToFalStorage(images.slice(0, hasEndFrame ? 2 : 1));
            assets.imageUrl = imageUrl;
            assets.endImageUrl = endImageUrl;
            onStatus(`Image uploaded. Submitting request for ${modelName}...`);
        } else if (mode === 'reference-to-video' && images.length > 0) {
            label = 'reference images';
            onStatus(`Uploading ${images.length} reference image(s) for ${modelName}...`);
            assets.referenceImageUrls = await uploadFilesToFalStorage(images);
            onStatus(`Reference images uploaded. Submitting request for ${modelName}...`);
        } else if ((mode === 'video-to-video' || mode === 'extend-video') && videoFile) {
            label = 'video';
            onStatus(`Uploading video for ${modelName}...`);
            [assets.videoUrl] = await uploadFilesToFalStorage([videoFile]);
            onStatus(`Video uploaded. Submitting request for ${modelName}...`);
        }
    } catch (error: unknown) {
        return { error: `Error uploading ${label}: ${error instanceof Error ? error.message : String(error)}` };
    }
    return { assets };
}

/**
 * Hook for video generation using fal.ai API. Orchestrates the pipeline —
 * validate → upload → build payload → submit/poll → extract result — with
 * the per-endpoint payload rules in `services/videoInputBuilders.ts`.
 */
export function useVideoGeneration({
    activeTab,
    uploadedImages,
    uploadedVideoFile,
    config,
    setStatus,
}: UseVideoGenerationParams): UseVideoGenerationReturn {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const cancelledRef = useRef(false);

    // Reset cancelled flag on unmount to prevent state updates after cleanup
    useEffect(() => {
        return () => {
            cancelledRef.current = true;
        };
    }, []);

    const generateVideo = useCallback(
        async (prompt: string, model: ModelConfig) => {
            cancelledRef.current = false;

            const modelId = model.endpointId;
            const modelName = model.displayName;
            const isExtendVideo = activeTab === 'extend-video';
            const extendProfile = isExtendVideo ? getExtendCapabilityProfile(modelId) : undefined;

            const validationError = validateVideoRequest({
                mode: activeTab,
                prompt,
                extendProfile,
                imageCount: uploadedImages.length,
                hasVideo: uploadedVideoFile !== null,
            });
            if (validationError) {
                setStatus(validationError, 'error');
                return;
            }

            // Extend mode: reject sources violating the model's constraints
            // (duration bounds, dimensions, file size, container) before
            // paying for a storage upload. The UI disables Generate too, but
            // revalidate here in case its metadata probe lagged or failed.
            if (isExtendVideo && extendProfile && uploadedVideoFile) {
                const sourceMeta = await probeExtendSource(extendProfile, uploadedVideoFile);
                const violation = describeExtendSourceViolation(
                    extendProfile,
                    uploadedVideoFile,
                    sourceMeta,
                    modelName,
                );
                if (violation) {
                    setStatus(violation, 'error');
                    return;
                }
            }

            setIsGenerating(true);
            setVideoUrl(null); // Clear previous video
            setStatus(`Submitting request for video generation using ${modelName}...`);
            console.log(`Generating video with model: ${modelName}, prompt: ${prompt.substring(0, 50)}...`);

            const uploadResult = await uploadVideoAssets({
                mode: activeTab,
                modelId,
                modelName,
                images: uploadedImages,
                videoFile: uploadedVideoFile,
                onStatus: setStatus,
            });
            if ('error' in uploadResult) {
                setStatus(uploadResult.error, 'error');
                console.error(uploadResult.error);
                setIsGenerating(false);
                return;
            }
            const { assets } = uploadResult;

            const input = buildVideoGenerationInput({
                modelId,
                mode: activeTab,
                prompt,
                config,
                assets,
                extendProfile,
            });

            try {
                console.log(`Input sent to API for model ${modelName}:`, input);

                const { data } = await submitAndPollFalQueue({
                    modelId,
                    input,
                    onStatus: setStatus,
                    pollInterval: POLL_INTERVAL_MS,
                    shouldCancel: () => cancelledRef.current,
                    timeoutMs: POLL_TIMEOUT_MS,
                });

                const videoResultUrl = extractVideoUrl(data);
                if (videoResultUrl) {
                    console.log(`Video generated successfully:`, videoResultUrl);
                    setVideoUrl(videoResultUrl);
                    setStatus(`Video generated successfully using ${modelName}!`, 'success');
                } else {
                    setStatus('Video generation failed. No video URL found in result.', 'error');
                    console.error('No video URL in result:', data);
                }
            } catch (error: unknown) {
                // Cancelled means the component unmounted — skip state updates.
                if (error instanceof FalQueueCancelledError) {
                    return;
                }
                if (error instanceof FalQueueTimeoutError) {
                    setStatus('Video generation timed out after 10 minutes.', 'error');
                    console.error('Video generation error:', error);
                    return;
                }
                console.error('Video generation error:', error);

                const rawMessage = error instanceof Error ? error.message : String(error);
                if (rawMessage.includes('401') || rawMessage.includes('Unauthorized')) {
                    console.error(
                        'Authentication error detected. The API key may be invalid or not applied correctly.',
                    );
                    setStatus('Authentication failed. Please check your API key.', 'error');
                } else {
                    setStatus(parseFalError(error), 'error');
                }
            } finally {
                setIsGenerating(false);
            }
        },
        [activeTab, uploadedImages, uploadedVideoFile, config, setStatus],
    );

    const clearVideo = useCallback(() => {
        setVideoUrl(null);
    }, []);

    return {
        videoUrl,
        isGenerating,
        generateVideo,
        clearVideo,
    };
}
