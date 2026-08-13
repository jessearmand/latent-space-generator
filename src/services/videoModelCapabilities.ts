/**
 * Endpoint capability profiles for video models.
 *
 * A profile declares what an endpoint's input schema actually accepts —
 * duration/resolution/aspect-ratio enums, and whether optional fields like
 * `seed` or `negative_prompt` exist — so UI options and payload construction
 * are driven by data instead of per-model substring conditionals.
 *
 * Profiles are keyed by exact endpoint ID because endpoints within one family
 * can differ (e.g. Seedance 2.5 exposes `seed` on text-to-video only, and its
 * image-to-video pins `aspect_ratio` to "auto"). Endpoints without a profile
 * fall back to the legacy detection branches in `VideoConfigOptions` and
 * `useVideoGeneration`; new model families should get a profile here rather
 * than another conditional.
 *
 * Schema source of truth: https://fal.ai/models/<endpoint-id>/api
 * (reviewed in docs/video-gen-update.md).
 */

export interface VideoCapabilityProfile {
    /** `duration` enum values exactly as the API expects them; first entry is the default. */
    durations: string[];
    /** How `duration` is serialized: the enum string as-is, or parsed to integer seconds. */
    durationFormat: 'string' | 'integer';
    /** `resolution` enum values; first entry is the default. */
    resolutions: string[];
    /**
     * `aspect_ratio` enum values; first entry is the default. An empty array
     * means the endpoint has no `aspect_ratio` input at all (e.g. i2v endpoints
     * that follow the input image) — hide the selector and send nothing.
     */
    aspectRatios: string[];
    /**
     * When set, always send `aspect_ratio` as this value and hide the selector
     * (e.g. i2v endpoints whose schema pins the ratio).
     */
    forcedAspectRatio?: string;
    /** Whether the input schema has `seed`. */
    supportsSeed: boolean;
    /** Whether the input schema has `negative_prompt`. */
    supportsNegativePrompt: boolean;
    /** Whether the input schema has `generate_audio`. */
    supportsGenerateAudio: boolean;
    /** Whether the input schema has `enable_prompt_expansion`. */
    supportsPromptExpansion: boolean;
    /** Whether the input schema has `enable_safety_checker`. */
    supportsSafetyChecker: boolean;
}

/**
 * Shared Seedance 2.5 schema: duration is "auto" or a string "4".."30";
 * resolution is 480p/720p only (no 1080p, unlike Seedance 2.0 Pro); no
 * fast/pro tier split. Per-endpoint differences are layered on top.
 */
function seedance25Profile(overrides: Partial<VideoCapabilityProfile>): VideoCapabilityProfile {
    return {
        durations: ['auto', ...Array.from({ length: 27 }, (_, i) => String(i + 4))],
        durationFormat: 'string',
        resolutions: ['720p', '480p'],
        aspectRatios: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
        supportsSeed: false,
        supportsNegativePrompt: false,
        supportsGenerateAudio: true,
        supportsPromptExpansion: false,
        supportsSafetyChecker: false,
        ...overrides,
    };
}

/**
 * Shared MiniMax H3 schema: integer duration 5-15s (default 5), resolution
 * 768P/2K/4K (default 2K), seed, prompt-expansion and safety-checker toggles.
 * Audio is always generated natively — there is no `generate_audio` input.
 */
function minimaxH3Profile(overrides: Partial<VideoCapabilityProfile>): VideoCapabilityProfile {
    return {
        durations: Array.from({ length: 11 }, (_, i) => String(i + 5)),
        durationFormat: 'integer',
        resolutions: ['2K', '768P', '4K'],
        aspectRatios: ['16:9', '21:9', '4:3', '1:1', '3:4', '9:16'],
        supportsSeed: true,
        supportsNegativePrompt: false,
        supportsGenerateAudio: false,
        supportsPromptExpansion: true,
        supportsSafetyChecker: true,
        ...overrides,
    };
}

const PROFILES: Record<string, VideoCapabilityProfile> = {
    // T2V is the only Seedance 2.5 endpoint whose input schema exposes `seed`.
    'bytedance/seedance-2.5/text-to-video': seedance25Profile({ supportsSeed: true }),
    // I2V derives the ratio from the start frame: the schema documents
    // `aspect_ratio` as always "auto".
    'bytedance/seedance-2.5/image-to-video': seedance25Profile({ forcedAspectRatio: 'auto' }),
    // R2V (image references only for now; video/audio references are future work).
    'bytedance/seedance-2.5/reference-to-video': seedance25Profile({}),

    'minimax/h3/text-to-video': minimaxH3Profile({}),
    // H3 i2v has no aspect_ratio input — the output follows the start frame.
    // It accepts optional `image_url` and `end_image_url` keyframes.
    'minimax/h3/image-to-video': minimaxH3Profile({ aspectRatios: [] }),
    // H3 reference-to-video is multimodal (reference_image_urls/video_urls/audio_urls)
    // and needs role-aware upload state — deferred, so no profile yet.
};

/**
 * Look up the capability profile for an endpoint.
 * Returns undefined for endpoints that still use legacy parameter routing.
 */
export function getVideoCapabilityProfile(endpointId: string): VideoCapabilityProfile | undefined {
    return PROFILES[endpointId.toLowerCase()];
}
