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
    /** Extra source constraint shown on the accepted chip (e.g. "MP4 · ≤ 50 MiB"). */
    sourceNote?: string;
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
        // The real constraint is provenance (a Veo-created clip), which
        // can't be checked client-side — no size or container gates.
        sourceMaxBytes: null,
        sourceMimeTypes: [],
        sourceNote: 'Veo-created · 720p/1080p · 16:9 or 9:16',
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

export interface ExtendSourceCheck {
    tooShort: boolean;
    tooLong: boolean;
    tooLarge: boolean;
    wrongContainer: boolean;
    /** Any hard violation — generation should be blocked. */
    blocked: boolean;
    /**
     * Duration is known and every client-checkable constraint passes.
     * Not the negation of `blocked`: an unknown duration is neither.
     */
    accepted: boolean;
}

/**
 * Validate a source clip against everything the profile can check
 * client-side: duration bounds (when known), file size, and container.
 * Codecs are not inspected — the API remains the final validator there.
 * Shared by the chips, the Generate gating, and the hook's pre-upload check
 * so the three never disagree.
 */
export function checkExtendSource(
    profile: ExtendCapabilityProfile,
    file: Pick<File, 'size' | 'type' | 'name'>,
    durationSeconds: number | null,
): ExtendSourceCheck {
    const tooShort =
        profile.sourceMinSeconds !== null && durationSeconds !== null && durationSeconds < profile.sourceMinSeconds;
    const tooLong =
        profile.sourceMaxSeconds !== null && durationSeconds !== null && durationSeconds > profile.sourceMaxSeconds;
    const tooLarge = profile.sourceMaxBytes !== null && file.size > profile.sourceMaxBytes;
    const wrongContainer = profile.sourceMimeTypes.length > 0 && !matchesContainer(file, profile.sourceMimeTypes);
    const blocked = tooShort || tooLong || tooLarge || wrongContainer;
    return {
        tooShort,
        tooLong,
        tooLarge,
        wrongContainer,
        blocked,
        accepted: durationSeconds !== null && !blocked,
    };
}

/** Human label for a source size limit, honoring the unit the docs use. */
export function formatSourceMaxBytes(bytes: number): string {
    return bytes % (1024 * 1024) === 0 ? `${bytes / (1024 * 1024)} MiB` : `${bytes / 1_000_000} MB`;
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
