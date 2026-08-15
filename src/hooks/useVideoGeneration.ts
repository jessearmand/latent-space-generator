import { useState, useCallback, useRef, useEffect } from 'react';
import { fal } from '@fal-ai/client';
import type { GenerationMode } from '../components/GenerationTabs';
import type { ModelConfig } from '../types/models';
import type { ConfigState } from '../config';
import { parseFalError } from '../services/errors';
import { getImageInputConfig } from '../services/modelParams';
import { activeLongDurationConstraint, getVideoCapabilityProfile } from '../services/videoModelCapabilities';
import {
    checkExtendSource,
    formatSourceMaxBytes,
    getExtendCapabilityProfile,
    snapExtendDuration,
    type ExtendSourceMetadata,
} from '../services/extendVideoCapabilities';
import { isSeedanceModel } from '../services/videoModels';
import { FalQueueCancelledError, FalQueueTimeoutError, submitAndPollFalQueue } from '../services/falQueue';
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
 * Hook for video generation using fal.ai API.
 * Handles queue submission, polling, and model-specific parameter routing.
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
            const isImageToVideo = activeTab === 'image-to-video';
            const isVideoToVideo = activeTab === 'video-to-video';
            const isReferenceToVideo = activeTab === 'reference-to-video';
            const isExtendVideo = activeTab === 'extend-video';
            const extendProfile = isExtendVideo ? getExtendCapabilityProfile(modelId) : undefined;

            // Prompt is required everywhere except extend endpoints whose
            // profile marks it optional (LTX 2.3 Pro extends without one).
            const promptOptional = isExtendVideo && extendProfile !== undefined && !extendProfile.promptRequired;
            if (!prompt && !promptOptional) {
                setStatus('Please enter a text prompt.', 'error');
                console.error('Prompt text is empty. Cannot generate video.');
                return;
            }

            // For image-to-video mode, require an uploaded image
            if (isImageToVideo && uploadedImages.length === 0) {
                setStatus('Please upload an image for image-to-video generation.', 'error');
                return;
            }

            // For video-to-video and extend-video modes, require an uploaded video
            if ((isVideoToVideo || isExtendVideo) && !uploadedVideoFile) {
                setStatus('Please upload a video to extend or transform.', 'error');
                return;
            }

            // For reference-to-video mode, require at least one reference image
            if (isReferenceToVideo && uploadedImages.length === 0) {
                setStatus('Please upload at least one reference image for reference-to-video generation.', 'error');
                return;
            }

            // Extend mode: reject sources violating the model's constraints
            // (duration bounds, dimensions, file size, container) before
            // paying for a storage upload. The UI disables Generate too, but
            // revalidate here in case its metadata probe lagged or failed.
            if (isExtendVideo && extendProfile && uploadedVideoFile) {
                let sourceMeta: ExtendSourceMetadata | null = null;
                const needsProbe =
                    extendProfile.sourceMinSeconds !== null ||
                    extendProfile.sourceMaxSeconds !== null ||
                    extendProfile.sourceDimensions.length > 0;
                if (needsProbe) {
                    try {
                        sourceMeta = await probeVideoFile(uploadedVideoFile);
                    } catch {
                        // Unreadable metadata locally — let the API validate the upload.
                    }
                }
                const sourceCheck = checkExtendSource(extendProfile, uploadedVideoFile, sourceMeta);
                if (sourceCheck.tooLong && sourceMeta !== null) {
                    setStatus(
                        `Source clip is ${sourceMeta.duration.toFixed(1)}s — over the ${extendProfile.sourceMaxSeconds}s limit for ${modelName}.`,
                        'error',
                    );
                    return;
                }
                if (sourceCheck.tooShort && sourceMeta !== null) {
                    setStatus(
                        `Source clip is ${sourceMeta.duration.toFixed(1)}s — under the ${extendProfile.sourceMinSeconds}s minimum for ${modelName}.`,
                        'error',
                    );
                    return;
                }
                if (sourceCheck.wrongDimensions && sourceMeta !== null) {
                    setStatus(
                        `Source is ${sourceMeta.width}×${sourceMeta.height} — ${modelName} needs ${extendProfile.sourceNote ?? 'a supported resolution'}.`,
                        'error',
                    );
                    return;
                }
                if (sourceCheck.tooLarge && extendProfile.sourceMaxBytes !== null) {
                    setStatus(
                        `Source file is ${(uploadedVideoFile.size / 1_000_000).toFixed(1)} MB — over the ${formatSourceMaxBytes(extendProfile.sourceMaxBytes)} limit for ${modelName}.`,
                        'error',
                    );
                    return;
                }
                if (sourceCheck.wrongContainer) {
                    setStatus(`Source must be an MP4 file for ${modelName}.`, 'error');
                    return;
                }
            }

            setIsGenerating(true);
            setVideoUrl(null); // Clear previous video
            console.log(`Generating video with model: ${modelName}`);

            setStatus(`Submitting request for video generation using ${modelName}...`);
            console.log(`Submitting request for model: ${modelName}, prompt: ${prompt.substring(0, 50)}...`);

            let uploadedImageUrl: string | undefined;
            let uploadedEndImageUrl: string | undefined;
            let uploadedReferenceImageUrls: string[] = [];
            let uploadedVideoUrl: string | undefined;

            // For image-to-video, upload the start frame (and optional end frame for seedance)
            if (isImageToVideo && uploadedImages.length > 0) {
                try {
                    setStatus(`Uploading image for ${modelName}...`);
                    uploadedImageUrl = await fal.storage.upload(uploadedImages[0]);
                    console.log('Image uploaded successfully:', uploadedImageUrl);

                    // I2V endpoints with a second upload slot (Seedance, MiniMax H3):
                    // the optional second image becomes the end_image_url
                    if (getImageInputConfig(modelId).maxImages >= 2 && uploadedImages.length >= 2) {
                        setStatus(`Uploading end-frame image for ${modelName}...`);
                        uploadedEndImageUrl = await fal.storage.upload(uploadedImages[1]);
                        console.log('End-frame image uploaded successfully:', uploadedEndImageUrl);
                    }

                    setStatus(`Image uploaded. Submitting request for ${modelName}...`);
                } catch (uploadError: unknown) {
                    const errorMsg = `Error uploading image: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                    setStatus(errorMsg, 'error');
                    console.error(errorMsg);
                    setIsGenerating(false);
                    return;
                }
            }

            // For reference-to-video, upload all reference images
            if (isReferenceToVideo && uploadedImages.length > 0) {
                try {
                    setStatus(`Uploading ${uploadedImages.length} reference image(s) for ${modelName}...`);
                    uploadedReferenceImageUrls = await Promise.all(
                        uploadedImages.map((file) => fal.storage.upload(file)),
                    );
                    console.log('Reference images uploaded:', uploadedReferenceImageUrls);
                    setStatus(`Reference images uploaded. Submitting request for ${modelName}...`);
                } catch (uploadError: unknown) {
                    const errorMsg = `Error uploading reference images: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                    setStatus(errorMsg, 'error');
                    console.error(errorMsg);
                    setIsGenerating(false);
                    return;
                }
            }

            // For video-to-video and extend-video, upload the video first
            if ((isVideoToVideo || isExtendVideo) && uploadedVideoFile) {
                try {
                    setStatus(`Uploading video for ${modelName}...`);
                    uploadedVideoUrl = await fal.storage.upload(uploadedVideoFile);
                    console.log('Video uploaded successfully:', uploadedVideoUrl);
                    setStatus(`Video uploaded. Submitting request for ${modelName}...`);
                } catch (uploadError: unknown) {
                    const errorMsg = `Error uploading video: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                    setStatus(errorMsg, 'error');
                    console.error(errorMsg);
                    setIsGenerating(false);
                    return;
                }
            }

            // Build video generation input parameters
            const input: Record<string, unknown> = {
                prompt,
            };

            const modelIdLower = modelId.toLowerCase();
            const isSeedance = isSeedanceModel(modelId);
            // Capability profile (Seedance 2.5, MiniMax H3): declares which fields the
            // endpoint's schema accepts, so the payload is built from data instead of
            // per-model conditionals. Unprofiled endpoints use the legacy branches.
            const profile = getVideoCapabilityProfile(modelId);

            if (isExtendVideo) {
                // Extend endpoints take the source clip plus range/constraint
                // parameters from the ExtendCapabilityProfile. Unprofiled extend
                // endpoints get only prompt + video_url (server defaults apply).
                input.video_url = uploadedVideoUrl;

                // LTX 2.3 Pro accepts requests without a prompt; drop the empty field.
                if (!prompt) {
                    delete input.prompt;
                }

                if (extendProfile) {
                    // Duration: FLUX defaults to "auto" and Veo has a single fixed
                    // length (min === max) — omit the field in both cases so the
                    // server default applies. LTX always takes explicit float
                    // seconds; whole-second endpoints get integers.
                    const durationAuto = extendProfile.supportsAutoDuration && config.extendDurationAuto;
                    const durationFixed = extendProfile.durationMin === extendProfile.durationMax;
                    if (!durationAuto && !durationFixed) {
                        // Snap to the profile step so the payload matches what
                        // the panel displays (fractional carry-over from another
                        // model must not round differently here).
                        input.duration = snapExtendDuration(extendProfile, config.extendDuration);
                    }

                    if (extendProfile.supportsMode) {
                        input.mode = config.extendMode === 'start' ? 'start' : 'end';
                    }

                    // Context: omitting the field maximizes available context server-side.
                    if (extendProfile.supportsContext && !config.extendContextAuto) {
                        input.context = Math.min(Math.max(config.extendContext, 1), 20);
                    }

                    if (extendProfile.resolutions.length > 0) {
                        input.resolution = extendProfile.resolutions.includes(config.videoResolution)
                            ? config.videoResolution
                            : extendProfile.resolutions[0];
                    }

                    if (extendProfile.aspectRatios.length > 0) {
                        input.aspect_ratio = extendProfile.aspectRatios.includes(config.extendAspectRatio)
                            ? config.extendAspectRatio
                            : extendProfile.aspectRatios[0];
                    }

                    if (extendProfile.supportsGenerateAudio) {
                        input.generate_audio = config.generateAudio;
                    }

                    // Safety tolerance: clamp the stored level into the endpoint's
                    // range; FLUX takes an integer, Veo the digit as a string.
                    if (extendProfile.safetyToleranceValues.length > 0) {
                        const values = extendProfile.safetyToleranceValues;
                        const clamped = Math.min(
                            Math.max(config.extendSafetyTolerance, values[0]),
                            values[values.length - 1],
                        );
                        input.safety_tolerance =
                            extendProfile.safetyToleranceFormat === 'string' ? String(clamped) : clamped;
                    }

                    if (extendProfile.supportsNegativePrompt && config.videoNegativePrompt) {
                        input.negative_prompt = config.videoNegativePrompt;
                    }

                    if (extendProfile.supportsSeed && config.videoSeed !== null) {
                        input.seed = config.videoSeed;
                    }

                    // auto_fix defaults to false server-side; only send when enabled.
                    if (extendProfile.supportsAutoFix && config.extendAutoFix) {
                        input.auto_fix = true;
                    }
                }
            } else if (profile) {
                if (config.videoResolution) {
                    input.resolution = config.videoResolution;
                }

                // Duration comes from the profile's enum. Storage may hold a legacy
                // "5s" suffix from other models; strip it before serializing.
                if (config.videoDuration) {
                    const raw = config.videoDuration.trim().replace(/s$/, '');
                    if (profile.durationFormat === 'integer') {
                        const seconds = parseInt(raw, 10);
                        if (!Number.isNaN(seconds)) {
                            input.duration = seconds;
                        }
                    } else {
                        input.duration = raw;
                    }
                }

                // Aspect ratio: omitted entirely when the schema has no such input
                // (empty enum); a profile may pin it (Seedance 2.5 i2v only accepts "auto").
                if (profile.forcedAspectRatio) {
                    input.aspect_ratio = profile.forcedAspectRatio;
                } else if (profile.aspectRatios.length > 0 && config.videoAspectRatio) {
                    input.aspect_ratio = config.videoAspectRatio;
                }

                // FPS: integer field, only on endpoints whose schema declares an enum (LTX).
                if (profile.fpsValues.length > 0 && config.videoFps) {
                    const fps = parseInt(config.videoFps, 10);
                    if (!Number.isNaN(fps)) {
                        input.fps = fps;
                    }
                }

                // Long durations can pin fps/resolution (LTX 2.3 Fast: 12s+ only
                // runs at 25 fps, 1080p). The UI collapses the selectors too, but
                // normalize here so a stale stored combination can't reach the API.
                const durationConstraint = activeLongDurationConstraint(profile, config.videoDuration);
                if (durationConstraint) {
                    input.resolution = durationConstraint.resolution;
                    if (profile.fpsValues.length > 0) {
                        input.fps = parseInt(durationConstraint.fps, 10);
                    }
                }

                // camera_motion is optional server-side; 'none' means omit it.
                if (profile.cameraMotions.length > 0 && config.videoCameraMotion !== 'none') {
                    input.camera_motion = config.videoCameraMotion;
                }

                if (profile.supportsGenerateAudio) {
                    input.generate_audio = config.generateAudio;
                }
                if (profile.supportsSeed && config.videoSeed !== null) {
                    input.seed = config.videoSeed;
                }
                if (profile.supportsNegativePrompt && config.videoNegativePrompt) {
                    input.negative_prompt = config.videoNegativePrompt;
                }
                if (profile.supportsPromptExpansion) {
                    input.enable_prompt_expansion = config.videoEnablePromptExpansion;
                }
                if (profile.supportsSafetyChecker) {
                    input.enable_safety_checker = config.enableSafetyChecker;
                }

                // Mode-specific image inputs (start frame + optional end frame).
                if (isImageToVideo && uploadedImageUrl) {
                    input.image_url = uploadedImageUrl;
                    if (uploadedEndImageUrl) {
                        input.end_image_url = uploadedEndImageUrl;
                    }
                } else if (isReferenceToVideo && uploadedReferenceImageUrls.length > 0) {
                    // Only Seedance 2.5 r2v is profiled today; it takes `image_urls`.
                    input.image_urls = uploadedReferenceImageUrls;
                }
            } else if (isSeedance) {
                // Seedance 2.0 has its own input shape (string `duration` enum, no cfg_scale,
                // no guidance_scale, no fps). Build the payload here; the per-model branches
                // below are gated so they don't fight with this.

                // Resolution (Pro: 480p/720p/1080p; Fast: 480p/720p)
                if (config.videoResolution) {
                    input.resolution = config.videoResolution;
                }

                // Duration: seedance expects "auto" or a string "4".."15".
                // Storage may have either a bare number ("5") or a legacy "5s" suffix.
                if (config.videoDuration) {
                    const raw = config.videoDuration.trim();
                    input.duration = raw === 'auto' ? 'auto' : raw.replace(/s$/, '');
                }

                // Aspect ratio: pass through, including "auto" and "21:9".
                if (config.videoAspectRatio) {
                    input.aspect_ratio = config.videoAspectRatio;
                }

                // Synchronized audio (default true on the API; we mirror the user's toggle).
                input.generate_audio = config.generateAudio;

                // Seed (optional integer).
                if (config.videoSeed !== null) {
                    input.seed = config.videoSeed;
                }

                // Mode-specific image inputs.
                if (isImageToVideo && uploadedImageUrl) {
                    input.image_url = uploadedImageUrl;
                    if (uploadedEndImageUrl) {
                        input.end_image_url = uploadedEndImageUrl;
                    }
                } else if (isReferenceToVideo && uploadedReferenceImageUrls.length > 0) {
                    input.image_urls = uploadedReferenceImageUrls;
                }
            } else {
                // --- Non-seedance video models share the legacy parameter routing below ---

                // Add image_url for image-to-video models
                if (isImageToVideo && uploadedImageUrl) {
                    input.image_url = uploadedImageUrl;
                }

                // Add video_url for video-to-video models
                if (isVideoToVideo && uploadedVideoUrl) {
                    input.video_url = uploadedVideoUrl;
                }

                // Add duration (parse to number if model expects seconds)
                if (config.videoDuration) {
                    const durationNum = parseInt(config.videoDuration.replace('s', ''), 10);
                    input.duration = durationNum || config.videoDuration;
                }

                // Add aspect ratio
                if (config.videoAspectRatio) {
                    input.aspect_ratio = config.videoAspectRatio;
                }

                // Add resolution if supported
                if (config.videoResolution) {
                    input.resolution = config.videoResolution;
                }
            }

            // Model detection for specific parameters (legacy routing — skipped for
            // extend mode, profiled endpoints, and seedance, whose input shapes are
            // built above).
            if (!isExtendVideo && !isSeedance && !profile) {
                const isKlingModel = modelIdLower.includes('kling');
                const isVeoModel = modelIdLower.includes('veo');
                const isLtx19bModel = modelIdLower.includes('ltx-2-19b');
                const isLtxProFastModel = modelIdLower.includes('ltx-2') && !modelIdLower.includes('ltx-2-19b');
                const isLtxModel = modelIdLower.includes('ltx-2');
                const isGrokVideoModel = modelIdLower.includes('grok-imagine-video');
                const isGrokVideoEdit =
                    modelIdLower.includes('grok-imagine-video') && modelIdLower.includes('edit-video');
                const supportsAudio = isVeoModel || isLtxModel;
                const supportsGuidanceScale =
                    isLtx19bModel || (!isVeoModel && !isLtxProFastModel && !isKlingModel && !isGrokVideoModel);

                // V2V model detection
                const isVideoToVideoMode = activeTab === 'video-to-video';
                const isMMAudioModel = modelIdLower.includes('mmaudio');
                const isBriaBgRemoval = modelIdLower.includes('bria') && modelIdLower.includes('background-removal');
                const isLtx19bV2V = isLtx19bModel && modelIdLower.includes('video-to-video');
                const isWanV2V = modelIdLower.includes('wan') && modelIdLower.includes('video-to-video');
                const isHunyuanV2V = modelIdLower.includes('hunyuan') && modelIdLower.includes('video-to-video');
                const isAnimateDiffV2V =
                    modelIdLower.includes('animatediff') && modelIdLower.includes('video-to-video');

                // Add CFG scale for Kling models (0-1 range)
                if (isKlingModel) {
                    input.cfg_scale = config.videoCfgScale;
                }

                // Add guidance scale only for models that support it
                if (supportsGuidanceScale && config.videoGuidanceScale > 0) {
                    input.guidance_scale = config.videoGuidanceScale;
                }

                // Add generate_audio for veo and ltx-2 models
                if (supportsAudio) {
                    input.generate_audio = config.generateAudio;
                }

                // Add fps for LTX-2 Pro/Fast models
                if (isLtxProFastModel) {
                    input.fps = parseInt(config.videoFps, 10);
                }

                // Grok Imagine Video specific parameters
                if (isGrokVideoModel) {
                    // Grok uses continuous duration (1-15s), parse from config
                    if (config.videoDuration) {
                        const durationNum = parseInt(config.videoDuration.replace('s', ''), 10);
                        input.duration = Math.min(15, Math.max(1, durationNum));
                    }

                    // Grok video resolution (480p or 720p only, or 'auto' for edit-video)
                    if (config.videoResolution) {
                        const res = config.videoResolution;
                        if (isGrokVideoEdit) {
                            // Edit video supports auto/480p/720p
                            input.resolution = res === '480p' || res === '720p' ? res : 'auto';
                        } else {
                            // Text/image to video only supports 480p/720p
                            input.resolution = res === '480p' || res === '720p' ? res : '720p';
                        }
                    }

                    // Grok doesn't use guidance_scale, remove if accidentally set
                    delete input.guidance_scale;
                }

                // LTX-2 19B specific parameters
                if (isLtx19bModel) {
                    input.num_frames = config.videoNumFrames;
                    input.video_size = config.videoOutputSize;
                    input.use_multiscale = config.videoUseMultiscale;
                    input.num_inference_steps = config.videoNumInferenceSteps;
                    input.acceleration = config.videoAcceleration;
                    input.enable_prompt_expansion = config.videoEnablePromptExpansion;

                    // Camera LoRA only if not 'none'
                    if (config.videoCameraLora !== 'none') {
                        input.camera_lora = config.videoCameraLora;
                        input.camera_lora_scale = config.videoCameraLoraScale;
                    }

                    // LTX-2 19B doesn't use duration/resolution
                    delete input.duration;
                    delete input.resolution;
                }

                // Add seed if set
                if (config.videoSeed !== null) {
                    input.seed = config.videoSeed;
                }

                // Add negative prompt if set
                if (config.videoNegativePrompt) {
                    input.negative_prompt = config.videoNegativePrompt;
                }

                // V2V model-specific parameters

                // Video strength for V2V transformation
                if (isVideoToVideoMode && (isLtx19bV2V || isWanV2V || isHunyuanV2V || isAnimateDiffV2V)) {
                    input.strength = config.videoStrength;
                }

                // Preprocessor for LTX-2 19B V2V
                if (isLtx19bV2V && config.videoPreprocessor !== 'none') {
                    input.preprocessor = config.videoPreprocessor;
                }

                // MMAudio V2 parameters
                if (isMMAudioModel) {
                    input.cfg_strength = config.mmAudioCfgStrength;
                    input.num_steps = config.mmAudioNumSteps;
                    // Duration is handled separately above
                }

                // Bria Background Removal parameters
                if (isBriaBgRemoval) {
                    input.background_color = config.briaBgColor;
                    input.output_container_and_codec = config.briaOutputCodec;
                }
            }

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

                // Video response can have different structures
                let videoResultUrl: string | undefined;

                if (data.video) {
                    if (typeof data.video === 'string') {
                        videoResultUrl = data.video;
                    } else if (typeof data.video === 'object' && data.video !== null) {
                        const videoObj = data.video as { url?: string };
                        videoResultUrl = videoObj.url;
                    }
                } else if (Array.isArray(data.videos) && data.videos.length > 0) {
                    const firstVideo = data.videos[0] as { url?: string } | string;
                    videoResultUrl = typeof firstVideo === 'string' ? firstVideo : firstVideo.url;
                }

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

                const parsedError = parseFalError(error);

                const rawMessage = error instanceof Error ? error.message : String(error);
                if (rawMessage.includes('401') || rawMessage.includes('Unauthorized')) {
                    console.error(
                        'Authentication error detected. The API key may be invalid or not applied correctly.',
                    );
                    setStatus('Authentication failed. Please check your API key.', 'error');
                } else {
                    setStatus(parsedError, 'error');
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
