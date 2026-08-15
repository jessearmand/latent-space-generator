import { describe, expect, it } from 'vitest';
import { checkExtendSource, getExtendCapabilityProfile } from './extendVideoCapabilities';

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
            expect(profile?.supportsSafetyTolerance).toBe(false);
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

                // Aspect enum includes 2:1 (and not 9:21); audio and safety tolerance exist
                expect(profile?.aspectRatios).toEqual(['auto', '21:9', '2:1', '16:9', '4:3', '1:1', '3:4', '9:16']);
                expect(profile?.supportsGenerateAudio).toBe(true);
                expect(profile?.supportsSafetyTolerance).toBe(true);
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
            expect(profile?.supportsSafetyTolerance).toBe(false);
            expect(profile?.promptRequired).toBe(true);

            // Source must be an MP4 between 2 and 15 seconds
            expect(profile?.sourceMinSeconds).toBe(2);
            expect(profile?.sourceMaxSeconds).toBe(15);
        });
    });

    describe('unprofiled extend endpoints', () => {
        it.each([
            // Frame-based LTX variants and the veo3.1 stack layer are deferred.
            'fal-ai/ltx-2.3-quality/extend-video',
            'fal-ai/ltx-2.3-22b/extend-video',
            'fal-ai/veo3.1/extend-video',
            'fal-ai/veo3.1/fast/extend-video',
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

        // LTX 2.3 Pro: no file-level constraints documented.
        const ltx = getExtendCapabilityProfile('fal-ai/ltx-2.3/extend-video');
        expect(ltx?.sourceMaxBytes).toBeNull();
        expect(ltx?.sourceMimeTypes).toEqual([]);
    });
});

describe('checkExtendSource', () => {
    const flux = getExtendCapabilityProfile('blackforestlabs/flux-3/extend-video')!;
    const draft = getExtendCapabilityProfile('blackforestlabs/flux-3/extend-video/draft')!;
    const ltx = getExtendCapabilityProfile('fal-ai/ltx-2.3/extend-video')!;

    it('accepts an MP4 within all bounds', () => {
        const check = checkExtendSource(flux, sourceFile(), 8);
        expect(check).toEqual({
            tooLong: false,
            tooLarge: false,
            wrongContainer: false,
            blocked: false,
            accepted: true,
        });
    });

    it('flags sources over the duration ceiling', () => {
        expect(checkExtendSource(flux, sourceFile(), 16)).toMatchObject({ tooLong: true, blocked: true });
        // Draft has no duration ceiling.
        expect(checkExtendSource(draft, sourceFile(), 16).tooLong).toBe(false);
    });

    it('rejects non-MP4 containers when the profile requires MP4', () => {
        const webm = checkExtendSource(flux, sourceFile({ type: 'video/webm', name: 'clip.webm' }), 8);
        expect(webm).toMatchObject({ wrongContainer: true, blocked: true, accepted: false });
        // Unconstrained profiles accept any container.
        expect(checkExtendSource(ltx, sourceFile({ type: 'video/webm', name: 'clip.webm' }), 8).blocked).toBe(false);
    });

    it('accepts MP4s reported under noncanonical or empty MIME types', () => {
        // Browsers/OSes report legitimate .mp4 files as application/mp4,
        // application/octet-stream, or "" — the extension must rescue them.
        expect(checkExtendSource(flux, sourceFile({ type: 'application/mp4' }), 8).wrongContainer).toBe(false);
        expect(checkExtendSource(flux, sourceFile({ type: 'application/octet-stream' }), 8).wrongContainer).toBe(false);
        expect(checkExtendSource(flux, sourceFile({ type: '' }), 8).wrongContainer).toBe(false);
        // Neither MIME nor extension matching still fails.
        expect(checkExtendSource(flux, sourceFile({ type: '', name: 'clip.avi' }), 8).wrongContainer).toBe(true);
        expect(
            checkExtendSource(flux, sourceFile({ type: 'application/octet-stream', name: 'clip' }), 8).wrongContainer,
        ).toBe(true);
    });

    it('flags files over the size limit', () => {
        expect(checkExtendSource(flux, sourceFile({ size: 50_000_001 }), 8)).toMatchObject({
            tooLarge: true,
            blocked: true,
        });
        expect(checkExtendSource(flux, sourceFile({ size: 50_000_000 }), 8).tooLarge).toBe(false);
        // Draft's ceiling is 50 MiB, not 50 MB.
        expect(checkExtendSource(draft, sourceFile({ size: 50 * 1024 * 1024 + 1 }), 8).tooLarge).toBe(true);
        expect(checkExtendSource(draft, sourceFile({ size: 50_000_001 }), 8).tooLarge).toBe(false);
    });

    it('treats an unknown duration as neither accepted nor blocked on duration', () => {
        const check = checkExtendSource(flux, sourceFile(), null);
        expect(check.tooLong).toBe(false);
        expect(check.accepted).toBe(false);
        expect(check.blocked).toBe(false);
        // File-level violations still block even with unknown duration.
        expect(checkExtendSource(flux, sourceFile({ type: 'video/webm', name: 'c.webm' }), null).blocked).toBe(true);
    });
});
