import { describe, expect, it } from 'vitest';
import { getExtendCapabilityProfile } from './extendVideoCapabilities';

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

    describe('unprofiled extend endpoints', () => {
        it.each([
            // Frame-based LTX variants and later stack layers (grok, veo) are deferred.
            'fal-ai/ltx-2.3-quality/extend-video',
            'fal-ai/ltx-2.3-22b/extend-video',
            'xai/grok-imagine-video/extend-video',
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
});
