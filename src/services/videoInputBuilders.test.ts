import { describe, expect, it } from 'vitest';
import type { ConfigState } from '../config';
import type { ExtendCapabilityProfile } from './extendVideoCapabilities';
import { getExtendCapabilityProfile } from './extendVideoCapabilities';
import type { VideoCapabilityProfile } from './videoModelCapabilities';
import {
    buildExtendVideoInput,
    buildLegacyVideoInput,
    buildProfiledVideoInput,
    buildVideoGenerationInput,
    extractVideoUrl,
    validateVideoRequest,
    type VideoAssetUrls,
} from './videoInputBuilders';

/** Video-relevant config defaults; tests override only what they exercise. */
const cfg = (overrides: Partial<ConfigState> = {}): ConfigState =>
    ({
        videoDuration: '5s',
        videoAspectRatio: '16:9',
        videoResolution: '720p',
        videoGuidanceScale: 0,
        videoSeed: null,
        videoNegativePrompt: '',
        generateAudio: true,
        videoCfgScale: 0.5,
        videoFps: '25',
        videoCameraMotion: 'none',
        videoNumFrames: 121,
        videoOutputSize: 'landscape_4_3',
        videoUseMultiscale: true,
        videoNumInferenceSteps: 40,
        videoAcceleration: 'regular',
        videoCameraLora: 'none',
        videoCameraLoraScale: 1,
        videoEnablePromptExpansion: false,
        enableSafetyChecker: true,
        videoStrength: 0.8,
        videoPreprocessor: 'none',
        extendDuration: 5,
        extendDurationAuto: false,
        extendMode: 'end',
        extendContext: 5,
        extendContextAuto: true,
        extendAspectRatio: 'auto',
        extendSafetyTolerance: 2,
        extendAutoFix: false,
        mmAudioCfgStrength: 4.5,
        mmAudioNumSteps: 25,
        briaBgColor: 'transparent',
        briaOutputCodec: 'mp4_h264',
        ...overrides,
    }) as ConfigState;

const noAssets: VideoAssetUrls = { referenceImageUrls: [] };

const bareProfile = (overrides: Partial<VideoCapabilityProfile> = {}): VideoCapabilityProfile => ({
    durations: ['5', '10'],
    durationFormat: 'string',
    resolutions: ['720p', '480p'],
    aspectRatios: ['16:9', '9:16'],
    fpsValues: [],
    cameraMotions: [],
    supportsSeed: false,
    supportsNegativePrompt: false,
    supportsGenerateAudio: false,
    supportsPromptExpansion: false,
    supportsSafetyChecker: false,
    ...overrides,
});

describe('validateVideoRequest', () => {
    const base = {
        prompt: 'a prompt',
        extendProfile: undefined as ExtendCapabilityProfile | undefined,
        imageCount: 0,
        hasVideo: false,
    };

    it('requires a prompt for standard modes', () => {
        expect(validateVideoRequest({ ...base, mode: 'text-to-video', prompt: '' })).toMatch(/text prompt/);
        expect(validateVideoRequest({ ...base, mode: 'text-to-video' })).toBeNull();
    });

    it('lets a prompt-optional extend profile skip the prompt requirement', () => {
        const ltx = getExtendCapabilityProfile('fal-ai/ltx-2.3/extend-video');
        expect(
            validateVideoRequest({ ...base, mode: 'extend-video', prompt: '', extendProfile: ltx, hasVideo: true }),
        ).toBeNull();
        // Unprofiled extend endpoints still require a prompt
        expect(validateVideoRequest({ ...base, mode: 'extend-video', prompt: '', hasVideo: true })).toMatch(
            /text prompt/,
        );
    });

    it('requires the mode-specific media', () => {
        expect(validateVideoRequest({ ...base, mode: 'image-to-video' })).toMatch(/upload an image/);
        expect(validateVideoRequest({ ...base, mode: 'image-to-video', imageCount: 1 })).toBeNull();
        expect(validateVideoRequest({ ...base, mode: 'video-to-video' })).toMatch(/upload a video/);
        expect(validateVideoRequest({ ...base, mode: 'extend-video' })).toMatch(/upload a video/);
        expect(validateVideoRequest({ ...base, mode: 'reference-to-video' })).toMatch(/reference image/);
    });
});

describe('buildExtendVideoInput', () => {
    it('sends only prompt + video_url for unprofiled endpoints', () => {
        expect(buildExtendVideoInput(undefined, cfg(), 'go', 'https://v/clip.mp4')).toEqual({
            prompt: 'go',
            video_url: 'https://v/clip.mp4',
        });
    });

    it('omits an empty prompt (LTX 2.3 Pro)', () => {
        const ltx = getExtendCapabilityProfile('fal-ai/ltx-2.3/extend-video');
        const input = buildExtendVideoInput(ltx, cfg(), '', 'url');
        expect(input).not.toHaveProperty('prompt');
        expect(input.video_url).toBe('url');
    });

    it('snaps duration to the profile step and sends mode/context for LTX', () => {
        const ltx = getExtendCapabilityProfile('fal-ai/ltx-2.3/extend-video');
        const input = buildExtendVideoInput(
            ltx,
            cfg({ extendDuration: 7.3, extendMode: 'start', extendContextAuto: false, extendContext: 30 }),
            'go',
            'url',
        );
        expect(input.duration).toBe(7.5);
        expect(input.mode).toBe('start');
        expect(input.context).toBe(20); // clamped into 1-20
    });

    it('omits duration on auto (FLUX) and on fixed-length profiles (Veo)', () => {
        const flux = getExtendCapabilityProfile('blackforestlabs/flux-3/extend-video');
        expect(buildExtendVideoInput(flux, cfg({ extendDurationAuto: true }), 'go', 'url')).not.toHaveProperty(
            'duration',
        );
        const veo = getExtendCapabilityProfile('fal-ai/veo3.1/extend-video');
        expect(buildExtendVideoInput(veo, cfg(), 'go', 'url')).not.toHaveProperty('duration');
    });

    it('snaps stale resolution/aspect into the profile enum', () => {
        const flux = getExtendCapabilityProfile('blackforestlabs/flux-3/extend-video');
        const input = buildExtendVideoInput(
            flux,
            cfg({ videoResolution: '480p', extendAspectRatio: '9:21' }),
            'go',
            'url',
        );
        expect(input.resolution).toBe('720p'); // 480p not in FLUX enum → default
        expect(input.aspect_ratio).toBe('auto'); // 9:21 not in enum → default
    });

    it('serializes safety tolerance per the profile format', () => {
        const flux = getExtendCapabilityProfile('blackforestlabs/flux-3/extend-video');
        expect(buildExtendVideoInput(flux, cfg({ extendSafetyTolerance: 9 }), 'go', 'url').safety_tolerance).toBe(4);
        const veo = getExtendCapabilityProfile('fal-ai/veo3.1/extend-video');
        expect(buildExtendVideoInput(veo, cfg({ extendSafetyTolerance: 0 }), 'go', 'url').safety_tolerance).toBe('1');
    });

    it('sends Veo-only optional fields only when set', () => {
        const veo = getExtendCapabilityProfile('fal-ai/veo3.1/extend-video');
        const bare = buildExtendVideoInput(veo, cfg(), 'go', 'url');
        expect(bare).not.toHaveProperty('negative_prompt');
        expect(bare).not.toHaveProperty('seed');
        expect(bare).not.toHaveProperty('auto_fix');

        const full = buildExtendVideoInput(
            veo,
            cfg({ videoNegativePrompt: 'blur', videoSeed: 42, extendAutoFix: true }),
            'go',
            'url',
        );
        expect(full.negative_prompt).toBe('blur');
        expect(full.seed).toBe(42);
        expect(full.auto_fix).toBe(true);
    });
});

describe('buildProfiledVideoInput', () => {
    it('strips a legacy "5s" suffix and honors the duration format', () => {
        const asString = buildProfiledVideoInput(bareProfile(), cfg(), 'text-to-video', 'go', noAssets);
        expect(asString.duration).toBe('5');
        const asInt = buildProfiledVideoInput(
            bareProfile({ durationFormat: 'integer' }),
            cfg(),
            'text-to-video',
            'go',
            noAssets,
        );
        expect(asInt.duration).toBe(5);
    });

    it('pins a forced aspect ratio and omits the field when the enum is empty', () => {
        const forced = buildProfiledVideoInput(
            bareProfile({ forcedAspectRatio: 'auto' }),
            cfg(),
            'text-to-video',
            'go',
            noAssets,
        );
        expect(forced.aspect_ratio).toBe('auto');
        const none = buildProfiledVideoInput(bareProfile({ aspectRatios: [] }), cfg(), 'text-to-video', 'go', noAssets);
        expect(none).not.toHaveProperty('aspect_ratio');
    });

    it('applies the long-duration fps/resolution constraint over stored values', () => {
        const profile = bareProfile({
            fpsValues: ['25', '50'],
            longDurationConstraint: { minDurationSeconds: 12, fps: '25', resolution: '1080p' },
        });
        const input = buildProfiledVideoInput(
            profile,
            cfg({ videoDuration: '12', videoFps: '50' }),
            'text-to-video',
            'go',
            noAssets,
        );
        expect(input.resolution).toBe('1080p');
        expect(input.fps).toBe(25);
    });

    it('sends optional fields only when the profile declares them', () => {
        const config = cfg({ videoSeed: 7, videoNegativePrompt: 'blur' });
        const bare = buildProfiledVideoInput(bareProfile(), config, 'text-to-video', 'go', noAssets);
        expect(bare).not.toHaveProperty('seed');
        expect(bare).not.toHaveProperty('negative_prompt');
        expect(bare).not.toHaveProperty('generate_audio');

        const full = buildProfiledVideoInput(
            bareProfile({ supportsSeed: true, supportsNegativePrompt: true, supportsGenerateAudio: true }),
            config,
            'text-to-video',
            'go',
            noAssets,
        );
        expect(full.seed).toBe(7);
        expect(full.negative_prompt).toBe('blur');
        expect(full.generate_audio).toBe(true);
    });

    it('routes image assets per mode', () => {
        const i2v = buildProfiledVideoInput(bareProfile(), cfg(), 'image-to-video', 'go', {
            imageUrl: 'start',
            endImageUrl: 'end',
            referenceImageUrls: [],
        });
        expect(i2v.image_url).toBe('start');
        expect(i2v.end_image_url).toBe('end');

        const r2v = buildProfiledVideoInput(bareProfile(), cfg(), 'reference-to-video', 'go', {
            referenceImageUrls: ['a', 'b'],
        });
        expect(r2v.image_urls).toEqual(['a', 'b']);
    });
});

describe('Seedance 2.0 via the profile builder', () => {
    it('produces the legacy payload shape: string duration, aspect passthrough, audio toggle', () => {
        const input = buildVideoGenerationInput({
            modelId: 'bytedance/seedance-2.0/text-to-video',
            mode: 'text-to-video',
            prompt: 'go',
            config: cfg({ videoDuration: '8s', videoAspectRatio: '21:9', generateAudio: false }),
            assets: noAssets,
        });
        expect(input.duration).toBe('8');
        expect(input.aspect_ratio).toBe('21:9');
        expect(input.generate_audio).toBe(false);
    });

    it('passes "auto" duration through', () => {
        const input = buildVideoGenerationInput({
            modelId: 'bytedance/seedance-2.0/fast/text-to-video',
            mode: 'text-to-video',
            prompt: 'go',
            config: cfg({ videoDuration: 'auto' }),
            assets: noAssets,
        });
        expect(input.duration).toBe('auto');
    });

    it('never sends seed — the schema dropped it', () => {
        const input = buildVideoGenerationInput({
            modelId: 'bytedance/seedance-2.0/text-to-video',
            mode: 'text-to-video',
            prompt: 'go',
            config: cfg({ videoSeed: 42 }),
            assets: noAssets,
        });
        expect(input).not.toHaveProperty('seed');
    });

    it('routes start/end frames for i2v and image_urls for r2v', () => {
        const i2v = buildVideoGenerationInput({
            modelId: 'bytedance/seedance-2.0/image-to-video',
            mode: 'image-to-video',
            prompt: 'go',
            config: cfg(),
            assets: { imageUrl: 'start', endImageUrl: 'end', referenceImageUrls: [] },
        });
        expect(i2v.image_url).toBe('start');
        expect(i2v.end_image_url).toBe('end');

        const r2v = buildVideoGenerationInput({
            modelId: 'bytedance/seedance-2.0/reference-to-video',
            mode: 'reference-to-video',
            prompt: 'go',
            config: cfg(),
            assets: { referenceImageUrls: ['a', 'b'] },
        });
        expect(r2v.image_urls).toEqual(['a', 'b']);
    });
});

describe('buildLegacyVideoInput', () => {
    it('clamps Grok duration to 1-15 and resolution to its enum', () => {
        const input = buildLegacyVideoInput(
            'xai/grok-imagine-video/text-to-video',
            cfg({ videoDuration: '20s', videoResolution: '1080p' }),
            'text-to-video',
            'go',
            noAssets,
        );
        expect(input.duration).toBe(15);
        expect(input.resolution).toBe('720p');
        expect(input).not.toHaveProperty('guidance_scale');
    });

    it('lets Grok edit-video fall back to auto resolution', () => {
        const input = buildLegacyVideoInput(
            'xai/grok-imagine-video/edit-video',
            cfg({ videoResolution: '1080p' }),
            'video-to-video',
            'go',
            { referenceImageUrls: [], videoUrl: 'v' },
        );
        expect(input.resolution).toBe('auto');
        expect(input.video_url).toBe('v');
    });

    it('sends frame-based params instead of duration/resolution for LTX-2 19B', () => {
        const input = buildLegacyVideoInput('fal-ai/ltx-2-19b', cfg(), 'text-to-video', 'go', noAssets);
        expect(input).not.toHaveProperty('duration');
        expect(input).not.toHaveProperty('resolution');
        expect(input.num_frames).toBe(121);
        expect(input.video_size).toBe('landscape_4_3');
        expect(input.guidance_scale).toBeUndefined(); // videoGuidanceScale default 0
    });

    it('adds cfg_scale for Kling and generate_audio for Veo', () => {
        expect(buildLegacyVideoInput('fal-ai/kling-video', cfg(), 'text-to-video', 'go', noAssets).cfg_scale).toBe(0.5);
        expect(
            buildLegacyVideoInput('fal-ai/veo3', cfg({ generateAudio: false }), 'text-to-video', 'go', noAssets)
                .generate_audio,
        ).toBe(false);
    });

    it('sends strength only for known v2v families in video-to-video mode', () => {
        const wan = buildLegacyVideoInput('fal-ai/wan/video-to-video', cfg(), 'video-to-video', 'go', noAssets);
        expect(wan.strength).toBe(0.8);
        const other = buildLegacyVideoInput('fal-ai/pixverse/video-to-video', cfg(), 'video-to-video', 'go', noAssets);
        expect(other).not.toHaveProperty('strength');
    });
});

describe('buildVideoGenerationInput', () => {
    it('dispatches extend mode to the extend builder even without a profile', () => {
        const input = buildVideoGenerationInput({
            modelId: 'some/unprofiled/extend-video',
            mode: 'extend-video',
            prompt: 'go',
            config: cfg(),
            assets: { referenceImageUrls: [], videoUrl: 'v' },
        });
        expect(input).toEqual({ prompt: 'go', video_url: 'v' });
    });

    it('dispatches profiled endpoints to the profile builder', () => {
        const input = buildVideoGenerationInput({
            modelId: 'bytedance/seedance-2.5/text-to-video',
            mode: 'text-to-video',
            prompt: 'go',
            config: cfg({ videoDuration: '5' }),
            assets: noAssets,
        });
        // Seedance 2.5 profile serializes duration as a string enum
        expect(input.duration).toBe('5');
    });
});

describe('extractVideoUrl', () => {
    it('handles video as string, video as object, and videos array', () => {
        expect(extractVideoUrl({ video: 'https://v' })).toBe('https://v');
        expect(extractVideoUrl({ video: { url: 'https://v' } })).toBe('https://v');
        expect(extractVideoUrl({ videos: ['https://v'] })).toBe('https://v');
        expect(extractVideoUrl({ videos: [{ url: 'https://v' }] })).toBe('https://v');
    });

    it('returns undefined for empty or unrecognized shapes', () => {
        expect(extractVideoUrl({})).toBeUndefined();
        expect(extractVideoUrl({ videos: [] })).toBeUndefined();
        expect(extractVideoUrl({ video: 42 })).toBeUndefined();
    });
});
