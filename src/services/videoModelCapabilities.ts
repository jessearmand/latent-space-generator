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
    /** `resolution` enum values; first entry is the default. */
    resolutions: string[];
    /** `aspect_ratio` enum values; first entry is the default. */
    aspectRatios: string[];
    /**
     * When set, always send `aspect_ratio` as this value and hide the selector
     * (e.g. i2v endpoints that derive the ratio from the input image).
     */
    forcedAspectRatio?: string;
    /** Whether the input schema has `seed`. */
    supportsSeed: boolean;
    /** Whether the input schema has `negative_prompt`. */
    supportsNegativePrompt: boolean;
    /** Whether the input schema has `generate_audio`. */
    supportsGenerateAudio: boolean;
}

/**
 * Shared Seedance 2.5 schema: duration is "auto" or a string "4".."30";
 * resolution is 480p/720p only (no 1080p, unlike Seedance 2.0 Pro); no
 * fast/pro tier split. Per-endpoint differences are layered on top.
 */
function seedance25Profile(overrides: Partial<VideoCapabilityProfile>): VideoCapabilityProfile {
    return {
        durations: ['auto', ...Array.from({ length: 27 }, (_, i) => String(i + 4))],
        resolutions: ['720p', '480p'],
        aspectRatios: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
        supportsSeed: false,
        supportsNegativePrompt: false,
        supportsGenerateAudio: true,
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
};

/**
 * Look up the capability profile for an endpoint.
 * Returns undefined for endpoints that still use legacy parameter routing.
 */
export function getVideoCapabilityProfile(endpointId: string): VideoCapabilityProfile | undefined {
    return PROFILES[endpointId.toLowerCase()];
}
