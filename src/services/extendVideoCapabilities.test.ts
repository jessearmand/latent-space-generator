import { describe, expect, it } from 'vitest';
import { checkExtendSource, getExtendCapabilityProfile, snapExtendDuration } from './extendVideoCapabilities';

const sourceFile = (overrides: Partial<Pick<File, 'size' | 'type' | 'name'>> = {}) => ({
    size: 1_000_000,
    type: 'video/mp4',
    name: 'clip.mp4',
    ...overrides,
});

describe('getExtendCapabilityProfile', () => {
    describe('LTX 2.3 Pro extend', () => {
        it('declares float duration 2-20 with mode and context, nothing else', () => {
            const profile = getExtendCapabilityProfile('fal-ai/ltx-2.3/extend-video');
            expect(profile).toBeDefined();

            expect(profile?.durationMin).toBe(2);
            expect(profile?.durationMax).toBe(20);
            expect(profile?.durationStep).toBe(0.5);
            expect(profile?.supportsAutoDuration).toBe(false);

            // Start/end extension and a 1-20s context window
            expect(profile?.supportsMode).toBe(true);
            expect(profile?.supportsContext).toBe(true);

            // No resolution/aspect/audio/safety inputs; prompt is optional
            expect(profile?.resolutions).toEqual([]);
            expect(profile?.aspectRatios).toEqual([]);
            expect(profile?.supportsGenerateAudio).toBe(false);
            expect(profile?.safetyToleranceValues).toEqual([]);
            expect(profile?.promptRequired).toBe(false);

            expect(profile?.sourceMaxSeconds).toBeNull();
            expect(profile?.isDraft).toBe(false);
        });
    });

    describe('FLUX 3 extend', () => {
        it.each(['blackforestlabs/flux-3/extend-video', 'blackforestlabs/flux-3/extend-video/draft'])(
            '%s declares whole-second auto-default duration and required prompt',
            (endpointId) => {
                const profile = getExtendCapabilityProfile(endpointId);
                expect(profile).toBeDefined();

                // Whole seconds 5-20, defaulting to "auto" (field omitted)
                expect(profile?.durationMin).toBe(5);
                expect(profile?.durationMax).toBe(20);
                expect(profile?.durationStep).toBe(1);
                expect(profile?.supportsAutoDuration).toBe(true);

                // End-only extension, no context concept
                expect(profile?.supportsMode).toBe(false);
                expect(profile?.supportsContext).toBe(false);

                // Aspect enum includes 2:1 (and not 9:21); audio and integer
                // safety tolerance 0-4 exist; no negative_prompt/seed/auto_fix
                expect(profile?.aspectRatios).toEqual(['auto', '21:9', '2:1', '16:9', '4:3', '1:1', '3:4', '9:16']);
                expect(profile?.supportsGenerateAudio).toBe(true);
                expect(profile?.safetyToleranceValues).toEqual([0, 1, 2, 3, 4]);
                expect(profile?.safetyToleranceFormat).toBe('integer');
                expect(profile?.supportsNegativePrompt).toBe(false);
                expect(profile?.supportsSeed).toBe(false);
                expect(profile?.promptRequired).toBe(true);
            },
        );

        it('standard tier has 720p/1080p and a 15s source ceiling; draft has neither', () => {
            const standard = getExtendCapabilityProfile('blackforestlabs/flux-3/extend-video');
            expect(standard?.resolutions).toEqual(['720p', '1080p']);
            expect(standard?.sourceMaxSeconds).toBe(15);
            expect(standard?.isDraft).toBe(false);

            // Draft is 720p-only (no resolution input) with no stated source
            // duration cap, and returns a draft_cache for draft-enhance.
            const draft = getExtendCapabilityProfile('blackforestlabs/flux-3/extend-video/draft');
            expect(draft?.resolutions).toEqual([]);
            expect(draft?.sourceMaxSeconds).toBeNull();
            expect(draft?.isDraft).toBe(true);
        });
    });

    describe('Grok Imagine extend', () => {
        it('declares the minimal schema: integer duration 2-10 and a 2-15s MP4 source', () => {
            const profile = getExtendCapabilityProfile('xai/grok-imagine-video/extend-video');
            expect(profile).toBeDefined();

            // Integer seconds 2-10 (default 6), no auto
            expect(profile?.durationMin).toBe(2);
            expect(profile?.durationMax).toBe(10);
            expect(profile?.durationStep).toBe(1);
            expect(profile?.supportsAutoDuration).toBe(false);

            // Nothing else in the input schema: end-only, no context, no
            // resolution/aspect/audio/safety; prompt is required
            expect(profile?.supportsMode).toBe(false);
            expect(profile?.supportsContext).toBe(false);
            expect(profile?.resolutions).toEqual([]);
            expect(profile?.aspectRatios).toEqual([]);
            expect(profile?.supportsGenerateAudio).toBe(false);
            expect(profile?.safetyToleranceValues).toEqual([]);
            expect(profile?.promptRequired).toBe(true);

            // Source must be an MP4 between 2 and 15 seconds
            expect(profile?.sourceMinSeconds).toBe(2);
            expect(profile?.sourceMaxSeconds).toBe(15);
        });
    });

    describe('Veo 3.1 extend', () => {
        it.each(['fal-ai/veo3.1/extend-video', 'fal-ai/veo3.1/fast/extend-video'])(
            '%s declares the shared Veo schema (fast and standard differ only in price)',
            (endpointId) => {
                const profile = getExtendCapabilityProfile(endpointId);
                expect(profile).toBeDefined();

                // Fixed 7s per pass: min === max means the duration field is
                // omitted and the server default ("7s") applies.
                expect(profile?.durationMin).toBe(7);
                expect(profile?.durationMax).toBe(7);
                expect(profile?.supportsAutoDuration).toBe(false);

                // End-only, no context; resolution and 3-value aspect enum exist
                expect(profile?.supportsMode).toBe(false);
                expect(profile?.supportsContext).toBe(false);
                expect(profile?.resolutions).toEqual(['720p', '1080p']);
                expect(profile?.aspectRatios).toEqual(['auto', '16:9', '9:16']);

                // Audio, string safety tolerance "1"-"6", negative prompt,
                // seed, and auto_fix; prompt required
                expect(profile?.supportsGenerateAudio).toBe(true);
                expect(profile?.safetyToleranceValues).toEqual([1, 2, 3, 4, 5, 6]);
                expect(profile?.safetyToleranceFormat).toBe('string');
                expect(profile?.supportsNegativePrompt).toBe(true);
                expect(profile?.supportsSeed).toBe(true);
                expect(profile?.supportsAutoFix).toBe(true);
                expect(profile?.promptRequired).toBe(true);

                // Source constraint is provenance/format, not a duration cap
                expect(profile?.sourceMaxSeconds).toBeNull();
                expect(profile?.sourceNote).toContain('Veo-created');
            },
        );
    });

    describe('unprofiled extend endpoints', () => {
        it.each([
            // Frame-based LTX variants are deferred.
            'fal-ai/ltx-2.3-quality/extend-video',
            'fal-ai/ltx-2.3-22b/extend-video',
            'fal-ai/ltx-2.3/retake-video',
        ])('%s has no profile yet', (endpointId) => {
            expect(getExtendCapabilityProfile(endpointId)).toBeUndefined();
        });
    });

    it('matches endpoint IDs case-insensitively', () => {
        expect(getExtendCapabilityProfile('Blackforestlabs/FLUX-3/Extend-Video')).toBeDefined();
    });

    it('declares the client-checkable source file constraints', () => {
        // FLUX standard: MP4 under 50 MB; draft: MP4 up to 50 MiB.
        const standard = getExtendCapabilityProfile('blackforestlabs/flux-3/extend-video');
        expect(standard?.sourceMaxBytes).toBe(50_000_000);
        expect(standard?.sourceMimeTypes).toEqual(['video/mp4']);
        const draft = getExtendCapabilityProfile('blackforestlabs/flux-3/extend-video/draft');
        expect(draft?.sourceMaxBytes).toBe(50 * 1024 * 1024);
        expect(draft?.sourceMimeTypes).toEqual(['video/mp4']);

        // Grok: MP4 container required, no documented size cap.
        const grok = getExtendCapabilityProfile('xai/grok-imagine-video/extend-video');
        expect(grok?.sourceMaxBytes).toBeNull();
        expect(grok?.sourceMimeTypes).toEqual(['video/mp4']);

        // LTX 2.3 Pro: no file-level constraints documented.
        const ltx = getExtendCapabilityProfile('fal-ai/ltx-2.3/extend-video');
        expect(ltx?.sourceMaxBytes).toBeNull();
        expect(ltx?.sourceMimeTypes).toEqual([]);
    });
});

describe('checkExtendSource', () => {
    const grok = getExtendCapabilityProfile('xai/grok-imagine-video/extend-video')!;
    const flux = getExtendCapabilityProfile('blackforestlabs/flux-3/extend-video')!;
    const ltx = getExtendCapabilityProfile('fal-ai/ltx-2.3/extend-video')!;

    it('accepts an MP4 within all bounds', () => {
        const check = checkExtendSource(grok, sourceFile(), 8);
        expect(check).toEqual({
            tooShort: false,
            tooLong: false,
            tooLarge: false,
            wrongContainer: false,
            blocked: false,
            accepted: true,
        });
    });

    it('flags duration bound violations', () => {
        expect(checkExtendSource(grok, sourceFile(), 1.5)).toMatchObject({ tooShort: true, blocked: true });
        expect(checkExtendSource(grok, sourceFile(), 16)).toMatchObject({ tooLong: true, blocked: true });
    });

    it('rejects non-MP4 containers when the profile requires MP4', () => {
        const webm = checkExtendSource(grok, sourceFile({ type: 'video/webm', name: 'clip.webm' }), 8);
        expect(webm).toMatchObject({ wrongContainer: true, blocked: true, accepted: false });
        // Unconstrained profiles accept any container.
        expect(checkExtendSource(ltx, sourceFile({ type: 'video/webm', name: 'clip.webm' }), 8).blocked).toBe(false);
    });

    it('accepts MP4s reported under noncanonical or empty MIME types', () => {
        // Browsers/OSes report legitimate .mp4 files as application/mp4,
        // application/octet-stream, or "" — aliases or the extension rescue them.
        expect(checkExtendSource(grok, sourceFile({ type: 'application/mp4' }), 8).wrongContainer).toBe(false);
        expect(checkExtendSource(grok, sourceFile({ type: 'application/octet-stream' }), 8).wrongContainer).toBe(false);
        expect(checkExtendSource(grok, sourceFile({ type: '' }), 8).wrongContainer).toBe(false);
        // Neither MIME nor extension matching still fails.
        expect(checkExtendSource(grok, sourceFile({ type: '', name: 'clip.avi' }), 8).wrongContainer).toBe(true);
        expect(
            checkExtendSource(grok, sourceFile({ type: 'application/octet-stream', name: 'clip' }), 8).wrongContainer,
        ).toBe(true);
    });

    it('flags files over the size limit', () => {
        expect(checkExtendSource(flux, sourceFile({ size: 50_000_001 }), 8)).toMatchObject({
            tooLarge: true,
            blocked: true,
        });
        expect(checkExtendSource(flux, sourceFile({ size: 50_000_000 }), 8).tooLarge).toBe(false);
        // Grok documents no size cap.
        expect(checkExtendSource(grok, sourceFile({ size: 500_000_000 }), 8).tooLarge).toBe(false);
    });

    it('treats an unknown duration as neither accepted nor blocked on duration', () => {
        const check = checkExtendSource(grok, sourceFile(), null);
        expect(check.tooShort).toBe(false);
        expect(check.tooLong).toBe(false);
        expect(check.accepted).toBe(false);
        expect(check.blocked).toBe(false);
        // File-level violations still block even with unknown duration.
        expect(checkExtendSource(grok, sourceFile({ type: 'video/webm', name: 'c.webm' }), null).blocked).toBe(true);
    });
});

describe('snapExtendDuration', () => {
    const grok = getExtendCapabilityProfile('xai/grok-imagine-video/extend-video')!;
    const ltx = getExtendCapabilityProfile('fal-ai/ltx-2.3/extend-video')!;

    it('snaps fractional carry-over to whole seconds on integer-step profiles', () => {
        // An LTX half-second value must not display 2.5 while Grok is sent 3.
        expect(snapExtendDuration(grok, 2.5)).toBe(3);
        expect(snapExtendDuration(grok, 9.4)).toBe(9);
    });

    it('preserves half-second values on 0.5-step profiles', () => {
        expect(snapExtendDuration(ltx, 2.5)).toBe(2.5);
        expect(snapExtendDuration(ltx, 2.3)).toBe(2.5);
    });

    it('clamps into the profile bounds', () => {
        expect(snapExtendDuration(grok, 25)).toBe(10);
        expect(snapExtendDuration(grok, 0.4)).toBe(2);
        expect(snapExtendDuration(ltx, 25)).toBe(20);
    });
});
