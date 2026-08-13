import { describe, expect, it } from 'vitest';
import { getVideoCapabilityProfile } from './videoModelCapabilities';

describe('getVideoCapabilityProfile', () => {
    describe('Seedance 2.5 endpoints', () => {
        it.each([
            'bytedance/seedance-2.5/text-to-video',
            'bytedance/seedance-2.5/image-to-video',
            'bytedance/seedance-2.5/reference-to-video',
        ])('%s declares the shared 2.5 schema enums', (endpointId) => {
            const profile = getVideoCapabilityProfile(endpointId);
            expect(profile).toBeDefined();

            // Duration: "auto" plus "4".."30" as strings (28 values total)
            expect(profile?.durations[0]).toBe('auto');
            expect(profile?.durations).toContain('4');
            expect(profile?.durations).toContain('30');
            expect(profile?.durations).toHaveLength(28);

            // Resolution: 480p/720p only — 1080p is not in the 2.5 schema
            expect(profile?.resolutions).toEqual(['720p', '480p']);

            // Duration is a string enum, not integer seconds
            expect(profile?.durationFormat).toBe('string');

            // No negative_prompt; generate_audio is supported; no H3-style toggles
            expect(profile?.supportsNegativePrompt).toBe(false);
            expect(profile?.supportsGenerateAudio).toBe(true);
            expect(profile?.supportsPromptExpansion).toBe(false);
            expect(profile?.supportsSafetyChecker).toBe(false);
        });

        it('exposes seed on text-to-video only', () => {
            expect(getVideoCapabilityProfile('bytedance/seedance-2.5/text-to-video')?.supportsSeed).toBe(true);
            expect(getVideoCapabilityProfile('bytedance/seedance-2.5/image-to-video')?.supportsSeed).toBe(false);
            expect(getVideoCapabilityProfile('bytedance/seedance-2.5/reference-to-video')?.supportsSeed).toBe(false);
        });

        it('pins aspect_ratio to "auto" for image-to-video only', () => {
            expect(getVideoCapabilityProfile('bytedance/seedance-2.5/image-to-video')?.forcedAspectRatio).toBe('auto');
            expect(getVideoCapabilityProfile('bytedance/seedance-2.5/text-to-video')?.forcedAspectRatio).toBeUndefined();
            expect(
                getVideoCapabilityProfile('bytedance/seedance-2.5/reference-to-video')?.forcedAspectRatio,
            ).toBeUndefined();
        });

        it('matches endpoint IDs case-insensitively', () => {
            expect(getVideoCapabilityProfile('ByteDance/Seedance-2.5/Text-To-Video')).toBeDefined();
        });
    });

    describe('MiniMax H3 endpoints', () => {
        it.each(['minimax/h3/text-to-video', 'minimax/h3/image-to-video'])(
            '%s declares the shared H3 schema enums',
            (endpointId) => {
                const profile = getVideoCapabilityProfile(endpointId);
                expect(profile).toBeDefined();

                // Duration: integer seconds 5..15, no "auto"
                expect(profile?.durationFormat).toBe('integer');
                expect(profile?.durations).toEqual(['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']);

                // Resolution: 2K default first; 720p is NOT an H3 resolution
                expect(profile?.resolutions).toEqual(['2K', '768P', '4K']);

                // seed and both toggles exist; no negative_prompt
                expect(profile?.supportsSeed).toBe(true);
                expect(profile?.supportsPromptExpansion).toBe(true);
                expect(profile?.supportsSafetyChecker).toBe(true);
                expect(profile?.supportsNegativePrompt).toBe(false);

                // Audio is always generated natively — no generate_audio input
                expect(profile?.supportsGenerateAudio).toBe(false);
            },
        );

        it('exposes aspect_ratio on text-to-video but not image-to-video', () => {
            const t2v = getVideoCapabilityProfile('minimax/h3/text-to-video');
            expect(t2v?.aspectRatios).toEqual(['16:9', '21:9', '4:3', '1:1', '3:4', '9:16']);

            // I2V follows the input image: no aspect_ratio input at all
            const i2v = getVideoCapabilityProfile('minimax/h3/image-to-video');
            expect(i2v?.aspectRatios).toEqual([]);
            expect(i2v?.forcedAspectRatio).toBeUndefined();
        });

        it('has no profile for the multimodal reference-to-video endpoint yet', () => {
            expect(getVideoCapabilityProfile('minimax/h3/reference-to-video')).toBeUndefined();
        });
    });

    describe('legacy endpoints fall back to undefined', () => {
        it.each([
            'bytedance/seedance-2.0/text-to-video',
            'bytedance/seedance-2.0/fast/image-to-video',
            'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
            'fal-ai/ltx-2/text-to-video',
        ])('%s has no profile and keeps legacy routing', (endpointId) => {
            expect(getVideoCapabilityProfile(endpointId)).toBeUndefined();
        });
    });
});
