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

            // No negative_prompt; generate_audio is supported
            expect(profile?.supportsNegativePrompt).toBe(false);
            expect(profile?.supportsGenerateAudio).toBe(true);
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
