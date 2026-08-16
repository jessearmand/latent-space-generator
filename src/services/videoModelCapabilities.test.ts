import { describe, expect, it } from 'vitest';
import { activeLongDurationConstraint, getVideoCapabilityProfile } from './videoModelCapabilities';

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
            expect(
                getVideoCapabilityProfile('bytedance/seedance-2.5/text-to-video')?.forcedAspectRatio,
            ).toBeUndefined();
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

    describe('LTX 2.5 endpoints', () => {
        it.each([
            'lightricks/ltx-2.5/text-to-video/pro',
            'lightricks/ltx-2.5/text-to-video/fast',
            'lightricks/ltx-2.5/image-to-video/pro',
            'lightricks/ltx-2.5/image-to-video/fast',
        ])('%s declares the shared 2.5 schema flags', (endpointId) => {
            const profile = getVideoCapabilityProfile(endpointId);
            expect(profile).toBeDefined();

            // String duration enum defaulting to "auto"
            expect(profile?.durationFormat).toBe('string');
            expect(profile?.durations[0]).toBe('auto');

            // Synchronized audio; no seed/negative_prompt/H3-style toggles
            expect(profile?.supportsGenerateAudio).toBe(true);
            expect(profile?.supportsSeed).toBe(false);
            expect(profile?.supportsNegativePrompt).toBe(false);
            expect(profile?.supportsPromptExpansion).toBe(false);
            expect(profile?.supportsSafetyChecker).toBe(false);

            // Optional camera_motion with 8 enum values including focus_shift
            expect(profile?.cameraMotions).toHaveLength(8);
            expect(profile?.cameraMotions).toContain('focus_shift');
        });

        it('Pro and Fast tiers differ in durations, resolutions, and fps', () => {
            const pro = getVideoCapabilityProfile('lightricks/ltx-2.5/text-to-video/pro');
            expect(pro?.durations).toEqual(['auto', '6', '8', '10']);
            expect(pro?.resolutions).toEqual(['1080p', '720p']);
            expect(pro?.fpsValues).toEqual(['25', '24', '50']);

            const fast = getVideoCapabilityProfile('lightricks/ltx-2.5/text-to-video/fast');
            expect(fast?.durations).toEqual(['auto', '6', '8', '10', '12', '14', '16', '18', '20']);
            expect(fast?.resolutions).toEqual(['1080p', '720p', '1440p', '2160p']);
            expect(fast?.fpsValues).toEqual(['25', '24', '48', '50']);
        });

        it('I2V adds "auto" (follow the input image) as the default aspect ratio', () => {
            expect(getVideoCapabilityProfile('lightricks/ltx-2.5/text-to-video/pro')?.aspectRatios).toEqual([
                '16:9',
                '9:16',
            ]);
            expect(getVideoCapabilityProfile('lightricks/ltx-2.5/image-to-video/pro')?.aspectRatios).toEqual([
                'auto',
                '16:9',
                '9:16',
            ]);
        });

        it('has no profile for the audio-to-video endpoints yet', () => {
            expect(getVideoCapabilityProfile('lightricks/ltx-2.5/audio-to-video/pro')).toBeUndefined();
            expect(getVideoCapabilityProfile('lightricks/ltx-2.5/audio-to-video/fast')).toBeUndefined();
        });
    });

    describe('LTX 2.3 endpoints', () => {
        it.each([
            'fal-ai/ltx-2.3/text-to-video',
            'fal-ai/ltx-2.3/text-to-video/fast',
            'fal-ai/ltx-2.3/image-to-video',
            'fal-ai/ltx-2.3/image-to-video/fast',
        ])('%s declares the shared 2.3 schema flags', (endpointId) => {
            const profile = getVideoCapabilityProfile(endpointId);
            expect(profile).toBeDefined();

            // No "auto" duration — string enum defaulting to "6"
            expect(profile?.durationFormat).toBe('string');
            expect(profile?.durations[0]).toBe('6');
            expect(profile?.durations).not.toContain('auto');

            // 720p is not an LTX 2.3 resolution; 48 fps is supported on both tiers
            expect(profile?.resolutions).toEqual(['1080p', '1440p', '2160p']);
            expect(profile?.fpsValues).toEqual(['25', '24', '48', '50']);

            // Native audio; no camera_motion (2.5-only), no seed/negative_prompt
            expect(profile?.supportsGenerateAudio).toBe(true);
            expect(profile?.cameraMotions).toEqual([]);
            expect(profile?.supportsSeed).toBe(false);
            expect(profile?.supportsNegativePrompt).toBe(false);
        });

        it('Fast tier extends durations to 20 seconds', () => {
            expect(getVideoCapabilityProfile('fal-ai/ltx-2.3/text-to-video')?.durations).toEqual(['6', '8', '10']);
            expect(getVideoCapabilityProfile('fal-ai/ltx-2.3/text-to-video/fast')?.durations).toEqual([
                '6',
                '8',
                '10',
                '12',
                '14',
                '16',
                '18',
                '20',
            ]);
        });

        it('has no profile for extend-video, retake-video, or audio-to-video yet', () => {
            expect(getVideoCapabilityProfile('fal-ai/ltx-2.3/extend-video')).toBeUndefined();
            expect(getVideoCapabilityProfile('fal-ai/ltx-2.3/retake-video')).toBeUndefined();
            expect(getVideoCapabilityProfile('fal-ai/ltx-2.3/audio-to-video')).toBeUndefined();
        });

        describe('Fast long-duration constraint (12s+ requires 25 fps at 1080p)', () => {
            it.each(['fal-ai/ltx-2.3/text-to-video/fast', 'fal-ai/ltx-2.3/image-to-video/fast'])(
                '%s declares the constraint',
                (endpointId) => {
                    const profile = getVideoCapabilityProfile(endpointId);
                    expect(profile?.longDurationConstraint).toEqual({
                        minDurationSeconds: 12,
                        fps: '25',
                        resolution: '1080p',
                    });
                },
            );

            it.each([
                // The base tier caps at 10s; the 2.5 Fast schema documents no restriction.
                'fal-ai/ltx-2.3/text-to-video',
                'fal-ai/ltx-2.3/image-to-video',
                'lightricks/ltx-2.5/text-to-video/fast',
                'lightricks/ltx-2.5/image-to-video/fast',
            ])('%s has no long-duration constraint', (endpointId) => {
                expect(getVideoCapabilityProfile(endpointId)?.longDurationConstraint).toBeUndefined();
            });

            it('activates only for durations at or past the threshold', () => {
                const fast = getVideoCapabilityProfile('fal-ai/ltx-2.3/text-to-video/fast');
                expect(fast).toBeDefined();
                if (!fast) return;

                expect(activeLongDurationConstraint(fast, '12')).toEqual({
                    minDurationSeconds: 12,
                    fps: '25',
                    resolution: '1080p',
                });
                expect(activeLongDurationConstraint(fast, '20')).not.toBeNull();
                expect(activeLongDurationConstraint(fast, '10')).toBeNull();
                expect(activeLongDurationConstraint(fast, '6')).toBeNull();
                // Non-numeric durations (e.g. "auto" on other models) never constrain.
                expect(activeLongDurationConstraint(fast, 'auto')).toBeNull();

                const unconstrained = getVideoCapabilityProfile('lightricks/ltx-2.5/text-to-video/fast');
                expect(unconstrained).toBeDefined();
                if (!unconstrained) return;
                expect(activeLongDurationConstraint(unconstrained, '20')).toBeNull();
            });
        });
    });

    describe('endpoints without an fps or camera_motion input declare empty enums', () => {
        it.each(['bytedance/seedance-2.5/text-to-video', 'minimax/h3/text-to-video'])(
            '%s has no fps or camera_motion',
            (endpointId) => {
                const profile = getVideoCapabilityProfile(endpointId);
                expect(profile?.fpsValues).toEqual([]);
                expect(profile?.cameraMotions).toEqual([]);
            },
        );
    });

    describe('Seedance 2.0 endpoints', () => {
        const ALL_20_ENDPOINTS = [
            'bytedance/seedance-2.0/text-to-video',
            'bytedance/seedance-2.0/image-to-video',
            'bytedance/seedance-2.0/reference-to-video',
            'bytedance/seedance-2.0/fast/text-to-video',
            'bytedance/seedance-2.0/fast/image-to-video',
            'bytedance/seedance-2.0/fast/reference-to-video',
        ];

        it.each(ALL_20_ENDPOINTS)('%s declares the shared 2.0 schema enums', (endpointId) => {
            const profile = getVideoCapabilityProfile(endpointId);
            expect(profile).toBeDefined();

            // Duration: "auto" plus "4".."15" as strings (13 values total)
            expect(profile?.durations[0]).toBe('auto');
            expect(profile?.durations).toContain('4');
            expect(profile?.durations).toContain('15');
            expect(profile?.durations).toHaveLength(13);
            expect(profile?.durationFormat).toBe('string');

            // Full aspect enum including 21:9; unlike 2.5, i2v does NOT pin
            // the ratio — the schema exposes the whole enum on every mode.
            expect(profile?.aspectRatios).toEqual(['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']);
            expect(profile?.forcedAspectRatio).toBeUndefined();

            // Synchronized audio, but no seed (the schema dropped it), no
            // negative_prompt, and no fps/camera/H3-style toggles.
            expect(profile?.supportsGenerateAudio).toBe(true);
            expect(profile?.supportsSeed).toBe(false);
            expect(profile?.supportsNegativePrompt).toBe(false);
            expect(profile?.supportsPromptExpansion).toBe(false);
            expect(profile?.supportsSafetyChecker).toBe(false);
            expect(profile?.fpsValues).toEqual([]);
            expect(profile?.cameraMotions).toEqual([]);
        });

        it('Pro resolutions go up to 4k; Fast caps at 720p', () => {
            for (const mode of ['text-to-video', 'image-to-video', 'reference-to-video']) {
                expect(getVideoCapabilityProfile(`bytedance/seedance-2.0/${mode}`)?.resolutions).toEqual([
                    '720p',
                    '480p',
                    '1080p',
                    '4k',
                ]);
                expect(getVideoCapabilityProfile(`bytedance/seedance-2.0/fast/${mode}`)?.resolutions).toEqual([
                    '720p',
                    '480p',
                ]);
            }
        });

        it('leaves the uncurated Mini tier unprofiled', () => {
            expect(getVideoCapabilityProfile('bytedance/seedance-2.0/mini/text-to-video')).toBeUndefined();
        });
    });

    describe('legacy endpoints fall back to undefined', () => {
        it.each(['fal-ai/kling-video/v2.5-turbo/pro/text-to-video', 'fal-ai/ltx-2/text-to-video'])(
            '%s has no profile and keeps legacy routing',
            (endpointId) => {
                expect(getVideoCapabilityProfile(endpointId)).toBeUndefined();
            },
        );
    });
});
