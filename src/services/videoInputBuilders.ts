/**
 * Payload builders for video generation, mirroring `imageInputBuilders.ts`:
 * pure functions of (config, profile, uploaded URLs) that return the input
 * object for one endpoint family. The hook orchestrates (validate → upload →
 * build → submit); everything about which fields an endpoint accepts lives
 * here or in the capability profiles.
 *
 * Families, in dispatch order:
 * - extend:   ExtendCapabilityProfile-driven (unprofiled = prompt + video_url)
 * - profiled: VideoCapabilityProfile-driven (Seedance 2.x, MiniMax H3, LTX 2.x)
 * - legacy:   substring-detected models awaiting profile migration
 */

import type { GenerationMode } from '../components/GenerationTabs';
import type { ConfigState } from '../config';
import type { ExtendCapabilityProfile } from './extendVideoCapabilities';
import { snapExtendDuration } from './extendVideoCapabilities';
import {
    activeLongDurationConstraint,
    getVideoCapabilityProfile,
    type VideoCapabilityProfile,
} from './videoModelCapabilities';

/** URLs of the media uploaded for the active mode; absent = not uploaded. */
export interface VideoAssetUrls {
    imageUrl?: string;
    endImageUrl?: string;
    referenceImageUrls: string[];
    videoUrl?: string;
}

/**
 * Check a generation request against the active mode's requirements.
 * Returns a user-facing error message, or null when the request is valid.
 */
export function validateVideoRequest(args: {
    mode: GenerationMode;
    prompt: string;
    extendProfile: ExtendCapabilityProfile | undefined;
    imageCount: number;
    hasVideo: boolean;
}): string | null {
    const { mode, prompt, extendProfile, imageCount, hasVideo } = args;

    // Prompt is required everywhere except extend endpoints whose profile
    // marks it optional (LTX 2.3 Pro extends without one).
    const promptOptional = mode === 'extend-video' && extendProfile !== undefined && !extendProfile.promptRequired;
    if (!prompt && !promptOptional) {
        return 'Please enter a text prompt.';
    }
    if (mode === 'image-to-video' && imageCount === 0) {
        return 'Please upload an image for image-to-video generation.';
    }
    if ((mode === 'video-to-video' || mode === 'extend-video') && !hasVideo) {
        return 'Please upload a video to extend or transform.';
    }
    if (mode === 'reference-to-video' && imageCount === 0) {
        return 'Please upload at least one reference image for reference-to-video generation.';
    }
    return null;
}

/**
 * Extend endpoints: the source clip plus range/constraint parameters from the
 * ExtendCapabilityProfile. Unprofiled extend endpoints get only prompt +
 * video_url (server defaults apply).
 */
export function buildExtendVideoInput(
    profile: ExtendCapabilityProfile | undefined,
    config: ConfigState,
    prompt: string,
    videoUrl: string | undefined,
): Record<string, unknown> {
    const input: Record<string, unknown> = { video_url: videoUrl };

    // LTX 2.3 Pro accepts requests without a prompt; omit the empty field.
    if (prompt) {
        input.prompt = prompt;
    }

    if (!profile) {
        return input;
    }

    // Duration: FLUX defaults to "auto" and Veo has a single fixed length
    // (min === max) — omit the field in both cases so the server default
    // applies. LTX always takes explicit float seconds; whole-second
    // endpoints get integers.
    const durationAuto = profile.supportsAutoDuration && config.extendDurationAuto;
    const durationFixed = profile.durationMin === profile.durationMax;
    if (!durationAuto && !durationFixed) {
        // Snap to the profile step so the payload matches what the panel
        // displays (fractional carry-over from another model must not round
        // differently here).
        input.duration = snapExtendDuration(profile, config.extendDuration);
    }

    if (profile.supportsMode) {
        input.mode = config.extendMode === 'start' ? 'start' : 'end';
    }

    // Context: omitting the field maximizes available context server-side.
    if (profile.supportsContext && !config.extendContextAuto) {
        input.context = Math.min(Math.max(config.extendContext, 1), 20);
    }

    if (profile.resolutions.length > 0) {
        input.resolution = profile.resolutions.includes(config.videoResolution)
            ? config.videoResolution
            : profile.resolutions[0];
    }

    if (profile.aspectRatios.length > 0) {
        input.aspect_ratio = profile.aspectRatios.includes(config.extendAspectRatio)
            ? config.extendAspectRatio
            : profile.aspectRatios[0];
    }

    if (profile.supportsGenerateAudio) {
        input.generate_audio = config.generateAudio;
    }

    // Safety tolerance: clamp the stored level into the endpoint's range;
    // FLUX takes an integer, Veo the digit as a string.
    if (profile.safetyToleranceValues.length > 0) {
        const values = profile.safetyToleranceValues;
        const clamped = Math.min(Math.max(config.extendSafetyTolerance, values[0]), values[values.length - 1]);
        input.safety_tolerance = profile.safetyToleranceFormat === 'string' ? String(clamped) : clamped;
    }

    if (profile.supportsNegativePrompt && config.videoNegativePrompt) {
        input.negative_prompt = config.videoNegativePrompt;
    }

    if (profile.supportsSeed && config.videoSeed !== null) {
        input.seed = config.videoSeed;
    }

    // auto_fix defaults to false server-side; only send when enabled.
    if (profile.supportsAutoFix && config.extendAutoFix) {
        input.auto_fix = true;
    }

    return input;
}

/**
 * Profiled endpoints (Seedance 2.5, MiniMax H3, LTX 2.x): the profile
 * declares which fields the endpoint's schema accepts, so the payload is
 * built from data instead of per-model conditionals.
 */
export function buildProfiledVideoInput(
    profile: VideoCapabilityProfile,
    config: ConfigState,
    mode: GenerationMode,
    prompt: string,
    assets: VideoAssetUrls,
): Record<string, unknown> {
    const input: Record<string, unknown> = { prompt };

    if (profile.resolutions.length > 0) {
        input.resolution = profile.resolutions.includes(config.videoResolution)
            ? config.videoResolution
            : profile.resolutions[0];
    }

    // Duration comes from the profile's enum. Storage may hold a legacy
    // "5s" suffix from other models; strip it before serializing.
    if (config.videoDuration) {
        const raw = config.videoDuration.trim().replace(/s$/, '');
        const duration = profile.durations.includes(raw) ? raw : (profile.defaultDuration ?? profile.durations[0]);
        if (profile.durationFormat === 'integer') {
            const seconds = parseInt(duration, 10);
            if (!Number.isNaN(seconds)) {
                input.duration = seconds;
            }
        } else {
            input.duration = duration;
        }
    }

    // Aspect ratio: omitted entirely when the schema has no such input
    // (empty enum); a profile may pin it (Seedance 2.5 i2v only accepts "auto").
    if (profile.forcedAspectRatio) {
        input.aspect_ratio = profile.forcedAspectRatio;
    } else if (profile.aspectRatios.length > 0 && config.videoAspectRatio) {
        input.aspect_ratio = profile.aspectRatios.includes(config.videoAspectRatio)
            ? config.videoAspectRatio
            : profile.aspectRatios[0];
    }

    // FPS: integer field, only on endpoints whose schema declares an enum (LTX).
    if (profile.fpsValues.length > 0 && config.videoFps) {
        const value = profile.fpsValues.includes(config.videoFps) ? config.videoFps : profile.fpsValues[0];
        const fps = parseInt(value, 10);
        if (!Number.isNaN(fps)) {
            input.fps = fps;
        }
    }

    // Long durations can pin fps/resolution (LTX 2.3 Fast: 12s+ only runs at
    // 25 fps, 1080p). The UI collapses the selectors too, but normalize here
    // so a stale stored combination can't reach the API.
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
    if (profile.safetyChecker) {
        input.enable_safety_checker = config.videoEnableSafetyChecker;
    }
    if (profile.safetyTolerance) {
        const capability = profile.safetyTolerance;
        const tolerance = capability.values.includes(config.videoSafetyTolerance)
            ? config.videoSafetyTolerance
            : capability.defaultValue;
        input.safety_tolerance = capability.format === 'string' ? String(tolerance) : tolerance;
    }

    applyImageInputs(input, mode, assets);

    return input;
}

/** Mode-specific image inputs (start frame + optional end frame, or references). */
function applyImageInputs(input: Record<string, unknown>, mode: GenerationMode, assets: VideoAssetUrls): void {
    if (mode === 'image-to-video' && assets.imageUrl) {
        input.image_url = assets.imageUrl;
        if (assets.endImageUrl) {
            input.end_image_url = assets.endImageUrl;
        }
    } else if (mode === 'reference-to-video' && assets.referenceImageUrls.length > 0) {
        input.image_urls = assets.referenceImageUrls;
    }
}

/**
 * Legacy parameter routing for unprofiled models (Kling, Veo t2v, legacy
 * LTX-2 tiers, Grok, MMAudio, Bria, Wan/Hunyuan/AnimateDiff v2v). This is the
 * migration quarantine: new model families should get a capability profile
 * instead of another substring branch here. Fields are only ever added —
 * duration/resolution are decided per family up front, never set generically
 * and patched after.
 */
export function buildLegacyVideoInput(
    modelId: string,
    config: ConfigState,
    mode: GenerationMode,
    prompt: string,
    assets: VideoAssetUrls,
): Record<string, unknown> {
    const input: Record<string, unknown> = { prompt };

    const modelIdLower = modelId.toLowerCase();
    const isKlingModel = modelIdLower.includes('kling');
    const isVeoModel = modelIdLower.includes('veo');
    const isLtx19bModel = modelIdLower.includes('ltx-2-19b');
    const isLtxProFastModel = modelIdLower.includes('ltx-2') && !isLtx19bModel;
    const isGrokVideoModel = modelIdLower.includes('grok-imagine-video');
    const isGrokVideoEdit = isGrokVideoModel && modelIdLower.includes('edit-video');
    const supportsAudio = isVeoModel || isLtx19bModel || isLtxProFastModel;
    const supportsGuidanceScale =
        isLtx19bModel || (!isVeoModel && !isLtxProFastModel && !isKlingModel && !isGrokVideoModel);

    // V2V model detection
    const isVideoToVideo = mode === 'video-to-video';
    const isMMAudioModel = modelIdLower.includes('mmaudio');
    const isBriaBgRemoval = modelIdLower.includes('bria') && modelIdLower.includes('background-removal');
    const isLtx19bV2V = isLtx19bModel && modelIdLower.includes('video-to-video');
    const isWanV2V = modelIdLower.includes('wan') && modelIdLower.includes('video-to-video');
    const isHunyuanV2V = modelIdLower.includes('hunyuan') && modelIdLower.includes('video-to-video');
    const isAnimateDiffV2V = modelIdLower.includes('animatediff') && modelIdLower.includes('video-to-video');

    if (mode === 'image-to-video' && assets.imageUrl) {
        input.image_url = assets.imageUrl;
    }
    if (isVideoToVideo && assets.videoUrl) {
        input.video_url = assets.videoUrl;
    }

    // Duration/resolution per family: LTX-2 19B takes neither (frame-based),
    // Grok clamps duration to 1-15s and resolution to its enum, everything
    // else passes the stored values through.
    if (!isLtx19bModel) {
        if (config.videoDuration) {
            const durationNum = parseInt(config.videoDuration.replace('s', ''), 10);
            input.duration = isGrokVideoModel
                ? Math.min(15, Math.max(1, durationNum))
                : durationNum || config.videoDuration;
        }
        if (config.videoResolution) {
            if (isGrokVideoModel) {
                // Text/image to video only supports 480p/720p; edit-video also takes 'auto'.
                const res = config.videoResolution;
                input.resolution = res === '480p' || res === '720p' ? res : isGrokVideoEdit ? 'auto' : '720p';
            } else {
                input.resolution = config.videoResolution;
            }
        }
    }

    if (config.videoAspectRatio) {
        input.aspect_ratio = config.videoAspectRatio;
    }

    // CFG scale for Kling models (0-1 range)
    if (isKlingModel) {
        input.cfg_scale = config.videoCfgScale;
    }

    // Guidance scale only for models that support it
    if (supportsGuidanceScale && config.videoGuidanceScale > 0) {
        input.guidance_scale = config.videoGuidanceScale;
    }

    // generate_audio for veo and ltx-2 models
    if (supportsAudio) {
        input.generate_audio = config.generateAudio;
    }

    // fps for LTX-2 Pro/Fast models
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
    }

    if (config.videoSeed !== null) {
        input.seed = config.videoSeed;
    }

    if (config.videoNegativePrompt) {
        input.negative_prompt = config.videoNegativePrompt;
    }

    // Video strength for V2V transformation
    if (isVideoToVideo && (isLtx19bV2V || isWanV2V || isHunyuanV2V || isAnimateDiffV2V)) {
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
    }

    // Bria Background Removal parameters
    if (isBriaBgRemoval) {
        input.background_color = config.briaBgColor;
        input.output_container_and_codec = config.briaOutputCodec;
    }

    return input;
}

/** Build the generation payload for any video endpoint, dispatching by family. */
export function buildVideoGenerationInput(args: {
    modelId: string;
    mode: GenerationMode;
    prompt: string;
    config: ConfigState;
    assets: VideoAssetUrls;
    extendProfile?: ExtendCapabilityProfile;
}): Record<string, unknown> {
    const { modelId, mode, prompt, config, assets, extendProfile } = args;

    if (mode === 'extend-video') {
        return buildExtendVideoInput(extendProfile, config, prompt, assets.videoUrl);
    }

    const profile = getVideoCapabilityProfile(modelId);
    if (profile) {
        return buildProfiledVideoInput(profile, config, mode, prompt, assets);
    }
    return buildLegacyVideoInput(modelId, config, mode, prompt, assets);
}

/**
 * Pull the video URL out of a fal queue result. The response is either
 * `video` (a URL string or `{ url }` object) or a non-empty `videos` array
 * of the same shapes.
 */
export function extractVideoUrl(data: Record<string, unknown>): string | undefined {
    const candidate = data.video || (Array.isArray(data.videos) && data.videos.length > 0 ? data.videos[0] : undefined);
    if (typeof candidate === 'string') {
        return candidate;
    }
    if (candidate && typeof candidate === 'object') {
        return (candidate as { url?: string }).url;
    }
    return undefined;
}
