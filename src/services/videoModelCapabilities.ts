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
    /** `duration` enum values exactly as the API expects them. */
    durations: string[];
    /** Server default when it differs from the first displayed duration. */
    defaultDuration?: string;
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
    /**
     * `fps` enum values; first entry is the default. An empty array means the
     * endpoint has no `fps` input. Sent to the API as an integer.
     */
    fpsValues: string[];
    /**
     * `camera_motion` enum values. An empty array means the endpoint has no
     * `camera_motion` input. The field is optional server-side, so the UI adds
     * a "none" choice that omits it from the payload.
     */
    cameraMotions: string[];
    /** Whether the input schema has `seed`. */
    supportsSeed: boolean;
    /** Whether the input schema has `negative_prompt`. */
    supportsNegativePrompt: boolean;
    /** Whether the input schema has `generate_audio`. */
    supportsGenerateAudio: boolean;
    /** Whether the input schema has `enable_prompt_expansion`. */
    supportsPromptExpansion: boolean;
    /** Boolean safety-checker input, when the endpoint exposes one. */
    safetyChecker?: {
        defaultValue: boolean;
        disableRequiresAuthorization: boolean;
    };
    /** Numeric safety-tolerance input, when the endpoint exposes one. */
    safetyTolerance?: {
        values: number[];
        defaultValue: number;
        format: 'integer' | 'string';
    };
    /**
     * Duration-dependent constraint: when the selected duration is
     * `minDurationSeconds` or longer, only this fps/resolution pair is
     * accepted (LTX 2.3 Fast: 12s+ runs at 25 fps, 1080p only).
     */
    longDurationConstraint?: {
        minDurationSeconds: number;
        fps: string;
        resolution: string;
    };
}

/**
 * The fps/resolution pair the profile requires for the given duration, or
 * null when the duration is unconstrained ("auto", below the threshold, or
 * the profile declares no constraint). UI option lists and the payload
 * builder both consult this so invalid combinations can't be submitted.
 */
export function activeLongDurationConstraint(
    profile: VideoCapabilityProfile,
    duration: string,
): { fps: string; resolution: string } | null {
    const constraint = profile.longDurationConstraint;
    if (!constraint) {
        return null;
    }
    const seconds = parseFloat(duration);
    return Number.isFinite(seconds) && seconds >= constraint.minDurationSeconds ? constraint : null;
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
        fpsValues: [],
        cameraMotions: [],
        supportsSeed: false,
        supportsNegativePrompt: false,
        supportsGenerateAudio: true,
        supportsPromptExpansion: false,
        ...overrides,
    };
}

/**
 * Shared Seedance 2.0 schema: duration is "auto" or a string "4".."15";
 * full aspect enum including 21:9 (unlike 2.5, i2v does NOT pin the ratio);
 * synchronized audio; no seed, negative_prompt, fps, or camera inputs (the
 * schema dropped `seed` since the original integration). Pro and Fast differ
 * only in resolution — Pro goes up to 4k, Fast caps at 720p. The optional
 * `bitrate_mode` and `end_user_id` fields are not surfaced (server defaults).
 */
function seedance20Profile(overrides: Partial<VideoCapabilityProfile>): VideoCapabilityProfile {
    return {
        durations: ['auto', ...Array.from({ length: 12 }, (_, i) => String(i + 4))],
        durationFormat: 'string',
        resolutions: ['720p', '480p', '1080p', '4k'],
        aspectRatios: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
        fpsValues: [],
        cameraMotions: [],
        supportsSeed: false,
        supportsNegativePrompt: false,
        supportsGenerateAudio: true,
        supportsPromptExpansion: false,
        ...overrides,
    };
}

const SEEDANCE_20_FAST_RESOLUTIONS = ['720p', '480p'];

/**
 * Shared MiniMax H3 schema: integer duration 5-15s (default 5), resolution
 * 480P/768P/2K/4K (default 2K), seed, prompt-expansion and safety-checker toggles.
 * Audio is always generated natively — there is no `generate_audio` input.
 */
function minimaxH3Profile(overrides: Partial<VideoCapabilityProfile>): VideoCapabilityProfile {
    return {
        durations: Array.from({ length: 11 }, (_, i) => String(i + 5)),
        durationFormat: 'integer',
        resolutions: ['2K', '480P', '768P', '4K'],
        aspectRatios: ['16:9', '21:9', '4:3', '1:1', '3:4', '9:16'],
        fpsValues: [],
        cameraMotions: [],
        supportsSeed: true,
        supportsNegativePrompt: false,
        supportsGenerateAudio: false,
        supportsPromptExpansion: true,
        safetyChecker: {
            defaultValue: true,
            disableRequiresAuthorization: false,
        },
        ...overrides,
    };
}

const FLUX_3_DURATIONS = ['auto', ...Array.from({ length: 16 }, (_, i) => String(i + 5))];
const FLUX_3_ASPECT_RATIOS = ['auto', '21:9', '2:1', '16:9', '4:3', '1:1', '3:4', '9:16'];

/** Shared standard FLUX.3 T2V/I2V schema. */
function flux3Profile(overrides: Partial<VideoCapabilityProfile>): VideoCapabilityProfile {
    return {
        durations: FLUX_3_DURATIONS,
        durationFormat: 'string',
        resolutions: ['720p', '1080p'],
        aspectRatios: FLUX_3_ASPECT_RATIOS,
        fpsValues: [],
        cameraMotions: [],
        supportsSeed: false,
        supportsNegativePrompt: false,
        supportsGenerateAudio: true,
        supportsPromptExpansion: false,
        safetyTolerance: {
            values: [0, 1, 2, 3, 4],
            defaultValue: 2,
            format: 'integer',
        },
        ...overrides,
    };
}

/** Wan 2.7 I2V schema; the endpoint also supports optional last-frame input. */
function wan27Profile(): VideoCapabilityProfile {
    return {
        durations: Array.from({ length: 14 }, (_, i) => String(i + 2)),
        defaultDuration: '5',
        durationFormat: 'integer',
        resolutions: ['1080p', '720p'],
        aspectRatios: [],
        fpsValues: [],
        cameraMotions: [],
        supportsSeed: true,
        supportsNegativePrompt: true,
        supportsGenerateAudio: false,
        supportsPromptExpansion: true,
        safetyChecker: {
            defaultValue: true,
            disableRequiresAuthorization: true,
        },
    };
}

/** Optional camera motion enum shared by all LTX 2.5 endpoints (absent on 2.3). */
const LTX_25_CAMERA_MOTIONS = [
    'dolly_in',
    'dolly_out',
    'dolly_left',
    'dolly_right',
    'jib_up',
    'jib_down',
    'static',
    'focus_shift',
];

/**
 * Shared LTX 2.5 schema (lightricks/ltx-2.5): string duration enum with "auto"
 * default, synchronized audio, camera motion, no seed/negative_prompt. The
 * Pro/Fast tiers differ in durations, resolutions, and fps — Fast extends to
 * 20s, adds 1440p/2160p, and adds 48 fps.
 */
function ltx25Profile(overrides: Partial<VideoCapabilityProfile>): VideoCapabilityProfile {
    return {
        durations: ['auto', '6', '8', '10'],
        durationFormat: 'string',
        resolutions: ['1080p', '720p'],
        aspectRatios: ['16:9', '9:16'],
        fpsValues: ['25', '24', '50'],
        cameraMotions: LTX_25_CAMERA_MOTIONS,
        supportsSeed: false,
        supportsNegativePrompt: false,
        supportsGenerateAudio: true,
        supportsPromptExpansion: false,
        ...overrides,
    };
}

const LTX_25_FAST_DURATIONS = ['auto', '6', '8', '10', '12', '14', '16', '18', '20'];
const LTX_25_FAST_RESOLUTIONS = ['1080p', '720p', '1440p', '2160p'];

/**
 * Shared LTX 2.3 schema (fal-ai/ltx-2.3): integer duration with no "auto"
 * option (default 6),
 * resolutions start at 1080p (no 720p), no camera_motion, no seed. Fast tier
 * extends durations to 20s, but 12s+ requires 25 fps at 1080p (server-side
 * constraint the schema documents in prose only).
 */
function ltx23Profile(overrides: Partial<VideoCapabilityProfile>): VideoCapabilityProfile {
    return {
        durations: ['6', '8', '10'],
        durationFormat: 'integer',
        resolutions: ['1080p', '1440p', '2160p'],
        aspectRatios: ['16:9', '9:16'],
        fpsValues: ['25', '24', '48', '50'],
        cameraMotions: [],
        supportsSeed: false,
        supportsNegativePrompt: false,
        supportsGenerateAudio: true,
        supportsPromptExpansion: false,
        ...overrides,
    };
}

const LTX_23_FAST_DURATIONS = ['6', '8', '10', '12', '14', '16', '18', '20'];

// Per the LTX 2.3 Fast schema: "Durations longer than 10 seconds (12, 14, 16,
// 18, 20) are only supported with 25 FPS and 1080p resolution." The 2.5 Fast
// schema documents no such restriction.
const LTX_23_FAST_LONG_DURATION_CONSTRAINT = {
    minDurationSeconds: 12,
    fps: '25',
    resolution: '1080p',
};

/** I2V endpoints in both LTX families add "auto" (follow the input image) as the default ratio. */
const LTX_I2V_ASPECT_RATIOS = ['auto', '16:9', '9:16'];

const PROFILES: Record<string, VideoCapabilityProfile> = {
    // T2V is the only Seedance 2.5 endpoint whose input schema exposes `seed`.
    'bytedance/seedance-2.5/text-to-video': seedance25Profile({ supportsSeed: true }),
    // I2V derives the ratio from the start frame: the schema documents
    // `aspect_ratio` as always "auto".
    'bytedance/seedance-2.5/image-to-video': seedance25Profile({ forcedAspectRatio: 'auto' }),
    // R2V (image references only for now; video/audio references are future work).
    'bytedance/seedance-2.5/reference-to-video': seedance25Profile({}),

    // Seedance 2.0 Pro: t2v/i2v/r2v share one schema (i2v adds
    // image_url/end_image_url, r2v takes image_urls — routed by mode). R2V's
    // video_urls/audio_urls references are deferred, like Seedance 2.5's.
    'bytedance/seedance-2.0/text-to-video': seedance20Profile({}),
    'bytedance/seedance-2.0/image-to-video': seedance20Profile({}),
    'bytedance/seedance-2.0/reference-to-video': seedance20Profile({}),
    // Fast tier: same schema with resolution capped at 720p.
    'bytedance/seedance-2.0/fast/text-to-video': seedance20Profile({ resolutions: SEEDANCE_20_FAST_RESOLUTIONS }),
    'bytedance/seedance-2.0/fast/image-to-video': seedance20Profile({ resolutions: SEEDANCE_20_FAST_RESOLUTIONS }),
    'bytedance/seedance-2.0/fast/reference-to-video': seedance20Profile({
        resolutions: SEEDANCE_20_FAST_RESOLUTIONS,
    }),
    // Mini tier: uncurated (reachable via "Show all models") but schema-
    // identical to Fast in every surfaced field, so it shares the profile.
    'bytedance/seedance-2.0/mini/text-to-video': seedance20Profile({ resolutions: SEEDANCE_20_FAST_RESOLUTIONS }),
    'bytedance/seedance-2.0/mini/image-to-video': seedance20Profile({ resolutions: SEEDANCE_20_FAST_RESOLUTIONS }),
    'bytedance/seedance-2.0/mini/reference-to-video': seedance20Profile({
        resolutions: SEEDANCE_20_FAST_RESOLUTIONS,
    }),

    'minimax/h3/text-to-video': minimaxH3Profile({}),
    // H3 i2v has no aspect_ratio input — the output follows the start frame.
    // It accepts optional `image_url` and `end_image_url` keyframes.
    'minimax/h3/image-to-video': minimaxH3Profile({ aspectRatios: [] }),
    // H3 reference-to-video is multimodal (reference_image_urls/video_urls/audio_urls)
    // and needs role-aware upload state — deferred, so no profile yet.

    'blackforestlabs/flux-3/text-to-video': flux3Profile({}),
    'blackforestlabs/flux-3/image-to-video': flux3Profile({}),

    'fal-ai/wan/v2.7/image-to-video': wan27Profile(),

    'lightricks/ltx-2.5/text-to-video/pro': ltx25Profile({}),
    'lightricks/ltx-2.5/text-to-video/fast': ltx25Profile({
        durations: LTX_25_FAST_DURATIONS,
        resolutions: LTX_25_FAST_RESOLUTIONS,
        fpsValues: ['25', '24', '48', '50'],
    }),
    // I2V supports an optional end frame (`end_image_url`) for transitions.
    'lightricks/ltx-2.5/image-to-video/pro': ltx25Profile({ aspectRatios: LTX_I2V_ASPECT_RATIOS }),
    'lightricks/ltx-2.5/image-to-video/fast': ltx25Profile({
        durations: LTX_25_FAST_DURATIONS,
        resolutions: LTX_25_FAST_RESOLUTIONS,
        fpsValues: ['25', '24', '48', '50'],
        aspectRatios: LTX_I2V_ASPECT_RATIOS,
    }),
    // LTX 2.5 audio-to-video (pro/fast) needs an audio-input-to-video-output
    // mode the app doesn't have — deferred, so no profile yet.

    'fal-ai/ltx-2.3/text-to-video': ltx23Profile({}),
    'fal-ai/ltx-2.3/text-to-video/fast': ltx23Profile({
        durations: LTX_23_FAST_DURATIONS,
        longDurationConstraint: LTX_23_FAST_LONG_DURATION_CONSTRAINT,
    }),
    'fal-ai/ltx-2.3/image-to-video': ltx23Profile({ aspectRatios: LTX_I2V_ASPECT_RATIOS }),
    'fal-ai/ltx-2.3/image-to-video/fast': ltx23Profile({
        durations: LTX_23_FAST_DURATIONS,
        aspectRatios: LTX_I2V_ASPECT_RATIOS,
        longDurationConstraint: LTX_23_FAST_LONG_DURATION_CONSTRAINT,
    }),
    // LTX 2.3 audio-to-video, extend-video, and retake-video need dedicated
    // input shapes (audio upload / video_url + mode/context) — deferred.
};

/**
 * Look up the capability profile for an endpoint.
 * Returns undefined for endpoints that still use legacy parameter routing.
 */
export function getVideoCapabilityProfile(endpointId: string): VideoCapabilityProfile | undefined {
    return PROFILES[endpointId.toLowerCase()];
}
