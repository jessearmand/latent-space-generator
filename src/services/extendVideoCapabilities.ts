/**
 * Endpoint capability profiles for extend-video models.
 *
 * Extend endpoints continue an existing clip, so their capabilities are
 * ranges and constraints (duration min/max, source ceiling, has-mode,
 * has-context) rather than the plain enums of `VideoCapabilityProfile` —
 * hence a separate profile shape. Same conventions otherwise: keyed by
 * exact endpoint ID, empty array = the input doesn't exist, `undefined`
 * lookup = unprofiled endpoint (send only prompt + video_url).
 *
 * Schema source of truth: https://fal.ai/models/<endpoint-id>/llms.txt
 */

export interface ExtendCapabilityProfile {
    /** Extension length bounds in seconds. */
    durationMin: number;
    durationMax: number;
    /** Slider step; also implies the wire format (1 = whole seconds, 0.5 = float). */
    durationStep: number;
    /**
     * Whether the schema accepts `duration: "auto"` and defaults to it
     * (FLUX 3). When true the UI offers Auto/Manual; auto omits the field.
     */
    supportsAutoDuration: boolean;
    /** Whether the schema has `mode: 'start' | 'end'` (LTX 2.3). */
    supportsMode: boolean;
    /**
     * Whether the schema has `context` (seconds of source the model
     * conditions on, 1-20). Omitting the field maximizes available context,
     * so the UI defaults to an "auto" state that sends nothing.
     */
    supportsContext: boolean;
    /** `resolution` enum values; first entry is the default. Empty = no such input. */
    resolutions: string[];
    /** `aspect_ratio` enum values; first entry is the default. Empty = no such input. */
    aspectRatios: string[];
    /** Whether the input schema has `generate_audio`. */
    supportsGenerateAudio: boolean;
    /**
     * `safety_tolerance` levels in ascending order; empty = no such input.
     * FLUX takes integers 0-4, Veo takes the digits as strings "1"-"6" —
     * `safetyToleranceFormat` picks the wire type.
     */
    safetyToleranceValues: number[];
    safetyToleranceFormat: 'integer' | 'string';
    /** Whether the input schema has `negative_prompt`. */
    supportsNegativePrompt: boolean;
    /** Whether the input schema has `seed`. */
    supportsSeed: boolean;
    /** Whether the input schema has `auto_fix` (rewrite prompts that fail content policy). */
    supportsAutoFix: boolean;
    /** Whether `prompt` is required (FLUX) or optional (LTX 2.3 Pro). */
    promptRequired: boolean;
    /** Minimum source clip length in seconds, or null when unconstrained (Grok: 2s). */
    sourceMinSeconds: number | null;
    /** Maximum source clip length in seconds, or null when unconstrained. */
    sourceMaxSeconds: number | null;
    /** Maximum source file size in bytes, or null when the docs state none. */
    sourceMaxBytes: number | null;
    /**
     * Accepted source container MIME types (e.g. ['video/mp4']); empty =
     * unconstrained. Codec requirements inside a container (Grok's
     * H.264/H.265/AV1) can't be checked client-side — `sourceNote` carries
     * them for display only.
     */
    sourceMimeTypes: string[];
    /**
     * Exact pixel dimensions the source must have; empty = unconstrained.
     * Veo only extends its own output sizes (720p/1080p in 16:9 or 9:16),
     * so the probed width×height is checked against this list.
     */
    sourceDimensions: Array<{ width: number; height: number }>;
    /**
     * Client-checkable source constraints shown on the accepted chip
     * (e.g. "MP4 · ≤ 50 MiB"). Everything named here should be enforced
     * by `checkExtendSource` (codec details being the documented exception).
     */
    sourceNote?: string;
    /**
     * A requirement that cannot be verified client-side (Veo's "must be a
     * Veo-created clip"). Always shown as a neutral requirement, never as
     * part of an acceptance claim.
     */
    sourceRequirementNote?: string;
    /** Draft tier: 720p-only preview that also returns a reusable draft_cache. */
    isDraft: boolean;
}

const FLUX_3_EXTEND_ASPECT_RATIOS = ['auto', '21:9', '2:1', '16:9', '4:3', '1:1', '3:4', '9:16'];

/**
 * Shared FLUX 3 extend schema: whole-second duration enum 5-20 defaulting to
 * "auto", required prompt, end-only extension, generate_audio and
 * safety_tolerance. The draft tier drops `resolution` (720p only) and
 * additionally returns a `draft_cache` for the draft-enhance workflow.
 */
function flux3ExtendProfile(overrides: Partial<ExtendCapabilityProfile>): ExtendCapabilityProfile {
    return {
        durationMin: 5,
        durationMax: 20,
        durationStep: 1,
        supportsAutoDuration: true,
        supportsMode: false,
        supportsContext: false,
        resolutions: ['720p', '1080p'],
        aspectRatios: FLUX_3_EXTEND_ASPECT_RATIOS,
        supportsGenerateAudio: true,
        safetyToleranceValues: [0, 1, 2, 3, 4],
        safetyToleranceFormat: 'integer',
        supportsNegativePrompt: false,
        supportsSeed: false,
        supportsAutoFix: false,
        promptRequired: true,
        sourceMinSeconds: null,
        sourceMaxSeconds: 15,
        sourceMaxBytes: 50_000_000,
        sourceMimeTypes: ['video/mp4'],
        sourceDimensions: [],
        isDraft: false,
        ...overrides,
    };
}

/**
 * Shared Veo 3.1 extend schema (fast and standard tiers are identical; only
 * pricing differs). Duration and resolution are unconstrained strings in the
 * schema — the extension is a fixed "7s" per pass (min === max, so the field
 * is omitted and the server default applies). The source must itself be a
 * Veo-created 720p/1080p clip in 16:9 or 9:16, chaining up to 30s total.
 */
function veo31ExtendProfile(): ExtendCapabilityProfile {
    return {
        durationMin: 7,
        durationMax: 7,
        durationStep: 1,
        supportsAutoDuration: false,
        supportsMode: false,
        supportsContext: false,
        resolutions: ['720p', '1080p'],
        aspectRatios: ['auto', '16:9', '9:16'],
        supportsGenerateAudio: true,
        safetyToleranceValues: [1, 2, 3, 4, 5, 6],
        safetyToleranceFormat: 'string',
        supportsNegativePrompt: true,
        supportsSeed: true,
        supportsAutoFix: true,
        promptRequired: true,
        sourceMinSeconds: null,
        sourceMaxSeconds: null,
        sourceMaxBytes: null,
        sourceMimeTypes: [],
        // Veo only extends its own output sizes — the probed dimensions are
        // checked against these. Provenance (a Veo-created clip) can't be
        // verified client-side, so it's surfaced as a requirement instead.
        sourceDimensions: [
            { width: 1280, height: 720 },
            { width: 1920, height: 1080 },
            { width: 720, height: 1280 },
            { width: 1080, height: 1920 },
        ],
        sourceNote: '720p/1080p · 16:9 or 9:16',
        sourceRequirementNote: 'Requires a Veo-created source clip (not verifiable here)',
        isDraft: false,
    };
}

const PROFILES: Record<string, ExtendCapabilityProfile> = {
    // LTX 2.3 Pro: float duration 2-20 (default 5), start/end mode, optional
    // context 1-20s. No resolution/aspect/audio/seed inputs; prompt optional.
    'fal-ai/ltx-2.3/extend-video': {
        durationMin: 2,
        durationMax: 20,
        durationStep: 0.5,
        supportsAutoDuration: false,
        supportsMode: true,
        supportsContext: true,
        resolutions: [],
        aspectRatios: [],
        supportsGenerateAudio: false,
        safetyToleranceValues: [],
        safetyToleranceFormat: 'integer',
        supportsNegativePrompt: false,
        supportsSeed: false,
        supportsAutoFix: false,
        promptRequired: false,
        sourceMinSeconds: null,
        sourceMaxSeconds: null,
        sourceMaxBytes: null,
        sourceMimeTypes: [],
        sourceDimensions: [],
        isDraft: false,
    },
    // Source clip: MP4, under 50 MB and under 15 seconds.
    'blackforestlabs/flux-3/extend-video': flux3ExtendProfile({ sourceNote: 'MP4 · ≤ 50 MB' }),
    // Draft: no resolution input; source limit is 50 MiB with no stated
    // duration cap; returns draft_cache alongside the video.
    'blackforestlabs/flux-3/extend-video/draft': flux3ExtendProfile({
        resolutions: [],
        sourceMaxSeconds: null,
        sourceMaxBytes: 50 * 1024 * 1024,
        sourceNote: 'MP4 · ≤ 50 MiB',
        isDraft: true,
    }),
    // Grok Imagine: the minimal extend schema — required prompt, source clip,
    // integer duration 2-10 (default 6). Source must be MP4 (H.264/H.265/AV1)
    // and 2-15 seconds; the extension is always appended at the end.
    'xai/grok-imagine-video/extend-video': {
        durationMin: 2,
        durationMax: 10,
        durationStep: 1,
        supportsAutoDuration: false,
        supportsMode: false,
        supportsContext: false,
        resolutions: [],
        aspectRatios: [],
        supportsGenerateAudio: false,
        safetyToleranceValues: [],
        safetyToleranceFormat: 'integer',
        supportsNegativePrompt: false,
        supportsSeed: false,
        supportsAutoFix: false,
        promptRequired: true,
        sourceMinSeconds: 2,
        sourceMaxSeconds: 15,
        sourceMaxBytes: null,
        sourceMimeTypes: ['video/mp4'],
        sourceDimensions: [],
        sourceNote: 'MP4 (H.264/H.265/AV1)',
        isDraft: false,
    },
    // Veo 3.1 extend: fast and standard share one schema (pricing differs).
    'fal-ai/veo3.1/extend-video': veo31ExtendProfile(),
    'fal-ai/veo3.1/fast/extend-video': veo31ExtendProfile(),
    // fal-ai/ltx-2.3-quality and ltx-2.3-22b extend are frame-based APIs
    // (num_frames/num_context_frames, 19B-style knobs) — deferred.
};

/**
 * Look up the extend capability profile for an endpoint.
 * Returns undefined for unprofiled endpoints (minimal prompt + video_url payload).
 */
export function getExtendCapabilityProfile(endpointId: string): ExtendCapabilityProfile | undefined {
    return PROFILES[endpointId.toLowerCase()];
}

/**
 * Canonical MIME type → accepted aliases and file extensions. Browsers and
 * OSes report legitimate files under noncanonical or empty MIME types
 * (application/mp4, application/octet-stream, ""), so a file passes when
 * either its MIME type or its extension matches — the same policy the
 * upload zone applies.
 */
const CONTAINER_MATCHERS: Record<string, { mimeTypes: string[]; extensions: string[] }> = {
    'video/mp4': { mimeTypes: ['video/mp4', 'application/mp4'], extensions: ['.mp4'] },
};

function matchesContainer(file: Pick<File, 'type' | 'name'>, required: string[]): boolean {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    return required.some((mime) => {
        const matcher = CONTAINER_MATCHERS[mime] ?? { mimeTypes: [mime], extensions: [] };
        return matcher.mimeTypes.includes(type) || matcher.extensions.some((ext) => name.endsWith(ext));
    });
}

/** The probed source properties checkExtendSource can validate; null = probe pending/failed. */
export interface ExtendSourceMetadata {
    duration: number;
    width: number;
    height: number;
}

export interface ExtendSourceCheck {
    tooShort: boolean;
    tooLong: boolean;
    tooLarge: boolean;
    wrongContainer: boolean;
    wrongDimensions: boolean;
    /** Any hard violation — generation should be blocked. */
    blocked: boolean;
    /**
     * Metadata is known and every client-checkable constraint passes.
     * Not the negation of `blocked`: unknown metadata is neither.
     */
    accepted: boolean;
}

/**
 * Validate a source clip against everything the profile can check
 * client-side: duration bounds and pixel dimensions (when the probe
 * succeeded), file size, and container. Codecs and provenance are not
 * inspected — the API remains the final validator there. Shared by the
 * chips, the Generate gating, and the hook's pre-upload check so the
 * three never disagree.
 */
export function checkExtendSource(
    profile: ExtendCapabilityProfile,
    file: Pick<File, 'size' | 'type' | 'name'>,
    meta: ExtendSourceMetadata | null,
): ExtendSourceCheck {
    const tooShort = profile.sourceMinSeconds !== null && meta !== null && meta.duration < profile.sourceMinSeconds;
    const tooLong = profile.sourceMaxSeconds !== null && meta !== null && meta.duration > profile.sourceMaxSeconds;
    const tooLarge = profile.sourceMaxBytes !== null && file.size > profile.sourceMaxBytes;
    const wrongContainer = profile.sourceMimeTypes.length > 0 && !matchesContainer(file, profile.sourceMimeTypes);
    // Dimensions can be 0 when the codec hides them from the probe — treat
    // that as unknown rather than a violation.
    const wrongDimensions =
        profile.sourceDimensions.length > 0 &&
        meta !== null &&
        meta.width > 0 &&
        meta.height > 0 &&
        !profile.sourceDimensions.some((d) => d.width === meta.width && d.height === meta.height);
    const blocked = tooShort || tooLong || tooLarge || wrongContainer || wrongDimensions;
    return {
        tooShort,
        tooLong,
        tooLarge,
        wrongContainer,
        wrongDimensions,
        blocked,
        accepted: meta !== null && !blocked,
    };
}

/** Human label for a source size limit, honoring the unit the docs use. */
export function formatSourceMaxBytes(bytes: number): string {
    return bytes % (1024 * 1024) === 0 ? `${bytes / (1024 * 1024)} MiB` : `${bytes / 1_000_000} MB`;
}

/**
 * Human-readable reason a source clip is rejected, or null when every
 * client-checkable constraint passes. Lives beside `checkExtendSource` so
 * the wording stays with the predicates it describes and every consumer
 * (hook, chips) reports the same violation the same way.
 */
export function describeExtendSourceViolation(
    profile: ExtendCapabilityProfile,
    file: Pick<File, 'size' | 'type' | 'name'>,
    meta: ExtendSourceMetadata | null,
    modelName: string,
): string | null {
    const check = checkExtendSource(profile, file, meta);
    if (check.tooLong && meta !== null) {
        return `Source clip is ${meta.duration.toFixed(1)}s — over the ${profile.sourceMaxSeconds}s limit for ${modelName}.`;
    }
    if (check.tooShort && meta !== null) {
        return `Source clip is ${meta.duration.toFixed(1)}s — under the ${profile.sourceMinSeconds}s minimum for ${modelName}.`;
    }
    if (check.wrongDimensions && meta !== null) {
        return `Source is ${meta.width}×${meta.height} — ${modelName} needs ${profile.sourceNote ?? 'a supported resolution'}.`;
    }
    if (check.tooLarge && profile.sourceMaxBytes !== null) {
        return `Source file is ${(file.size / 1_000_000).toFixed(1)} MB — over the ${formatSourceMaxBytes(profile.sourceMaxBytes)} limit for ${modelName}.`;
    }
    if (check.wrongContainer) {
        return `Source must be an MP4 file for ${modelName}.`;
    }
    return null;
}

/**
 * Clamp a persisted extension length into the profile's bounds and snap it
 * to the slider step, so a fractional value carried over from another model
 * (LTX allows 2.5s) can't display one number while a whole-second endpoint
 * is sent another.
 */
export function snapExtendDuration(profile: ExtendCapabilityProfile, seconds: number): number {
    const clamped = Math.min(Math.max(seconds, profile.durationMin), profile.durationMax);
    const snapped = Math.round(clamped / profile.durationStep) * profile.durationStep;
    return Math.min(Math.max(snapped, profile.durationMin), profile.durationMax);
}
