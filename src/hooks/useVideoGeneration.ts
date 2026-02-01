import { useState, useCallback } from 'react';
import { fal } from '@fal-ai/client';
import type { GenerationMode } from '../components/GenerationTabs';
import type { ModelConfig } from '../types/models';
import type { ConfigState } from '../config';
import { parseFalError } from '../services/errors';
import type { StatusType } from './useStatusMessage';

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

    const generateVideo = useCallback(async (prompt: string, model: ModelConfig) => {
        if (!prompt) {
            setStatus('Please enter a text prompt.', 'error');
            console.error('Prompt text is empty. Cannot generate video.');
            return;
        }

        const modelId = model.endpointId;
        const modelName = model.displayName;
        const isImageToVideo = activeTab === 'image-to-video';
        const isVideoToVideo = activeTab === 'video-to-video';

        // For image-to-video mode, require an uploaded image
        if (isImageToVideo && uploadedImages.length === 0) {
            setStatus('Please upload an image for image-to-video generation.', 'error');
            return;
        }

        // For video-to-video mode, require an uploaded video
        if (isVideoToVideo && !uploadedVideoFile) {
            setStatus('Please upload a video for video-to-video generation.', 'error');
            return;
        }

        setIsGenerating(true);
        setVideoUrl(null); // Clear previous video
        console.log(`Generating video with model: ${modelName}`);

        setStatus(`Submitting request for video generation using ${modelName}...`);
        console.log(`Submitting request for model: ${modelName}, prompt: ${prompt.substring(0, 50)}...`);

        let uploadedImageUrl: string | undefined;
        let uploadedVideoUrl: string | undefined;

        // For image-to-video, upload the image first
        if (isImageToVideo && uploadedImages.length > 0) {
            try {
                setStatus(`Uploading image for ${modelName}...`);
                uploadedImageUrl = await fal.storage.upload(uploadedImages[0]);
                console.log('Image uploaded successfully:', uploadedImageUrl);
                setStatus(`Image uploaded. Submitting request for ${modelName}...`);
            } catch (uploadError: unknown) {
                const errorMsg = `Error uploading image: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                setStatus(errorMsg, 'error');
                console.error(errorMsg);
                setIsGenerating(false);
                return;
            }
        }

        // For video-to-video, upload the video first
        if (isVideoToVideo && uploadedVideoFile) {
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

        // Model detection for specific parameters
        const modelIdLower = modelId.toLowerCase();
        const isKlingModel = modelIdLower.includes('kling');
        const isVeoModel = modelIdLower.includes('veo');
        const isLtx19bModel = modelIdLower.includes('ltx-2-19b');
        const isLtxProFastModel = modelIdLower.includes('ltx-2') && !modelIdLower.includes('ltx-2-19b');
        const isLtxModel = modelIdLower.includes('ltx-2');
        const supportsAudio = isVeoModel || isLtxModel;
        const supportsGuidanceScale = isLtx19bModel || (!isVeoModel && !isLtxProFastModel && !isKlingModel);

        // V2V model detection
        const isVideoToVideoMode = activeTab === 'video-to-video';
        const isMMAudioModel = modelIdLower.includes('mmaudio');
        const isBriaBgRemoval = modelIdLower.includes('bria') && modelIdLower.includes('background-removal');
        const isLtx19bV2V = isLtx19bModel && modelIdLower.includes('video-to-video');
        const isWanV2V = modelIdLower.includes('wan') && modelIdLower.includes('video-to-video');
        const isHunyuanV2V = modelIdLower.includes('hunyuan') && modelIdLower.includes('video-to-video');
        const isAnimateDiffV2V = modelIdLower.includes('animatediff') && modelIdLower.includes('video-to-video');

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

        try {
            console.log(`Input sent to API for model ${modelName}:`, input);

            // Step 1: Submit the request and get request ID
            const submitResult = await fal.queue.submit(modelId, {
                input: input,
            });
            const requestId = submitResult.request_id;
            console.log(`Request submitted successfully. Request ID: ${requestId}`);
            setStatus(`Request submitted. Request ID: ${requestId}. Waiting for completion...`);

            // Step 2: Poll status until not "IN_QUEUE" or "IN_PROGRESS"
            while (true) {
                const statusResult = await fal.queue.status(modelId, {
                    requestId,
                    logs: true,
                });
                console.log(`Status update for request ID ${requestId}:`, statusResult.status);
                if (statusResult.status === "IN_QUEUE" || statusResult.status === "IN_PROGRESS") {
                    const logs = (statusResult as { logs?: Array<{ message: string }> }).logs;
                    const latestLog = logs?.length ? logs[logs.length - 1].message : 'Processing...';
                    setStatus(`Request is ${statusResult.status}: ${latestLog}`);
                    console.log(`Status logs:`, logs?.map((log) => log.message));
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Longer poll interval for video
                } else if (statusResult.status === "COMPLETED") {
                    const result = await fal.queue.result(modelId, {
                        requestId,
                    });
                    console.log(`Request completed. Full result:`, result);

                    // Video response can have different structures
                    const data = result.data as Record<string, unknown>;
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
                        console.error('No video URL in result:', result);
                    }
                    break;
                } else {
                    const status = (statusResult as { status: string }).status;
                    setStatus(`Request failed with status: ${status}`, 'error');
                    console.error(`Request failed with status ${status}:`, statusResult);
                    break;
                }
            }
        } catch (error: unknown) {
            console.error('Video generation error:', error);

            const parsedError = parseFalError(error);

            const rawMessage = error instanceof Error ? error.message : String(error);
            if (rawMessage.includes("401") || rawMessage.includes("Unauthorized")) {
                console.error("Authentication error detected. The API key may be invalid or not applied correctly.");
                setStatus('Authentication failed. Please check your API key.', 'error');
            } else {
                setStatus(parsedError, 'error');
            }
        } finally {
            setIsGenerating(false);
        }
    }, [activeTab, uploadedImages, uploadedVideoFile, config, setStatus]);

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
