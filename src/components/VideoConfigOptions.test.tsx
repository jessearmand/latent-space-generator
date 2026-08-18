// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelConfig, VideoModelCategory } from '../types/models';

const config = vi.hoisted(() => ({
    videoDuration: '5',
    setVideoDuration: vi.fn(),
    videoAspectRatio: '16:9',
    setVideoAspectRatio: vi.fn(),
    videoResolution: '720p',
    setVideoResolution: vi.fn(),
    videoFps: '25',
    setVideoFps: vi.fn(),
    videoEnablePromptExpansion: true,
    setVideoEnablePromptExpansion: vi.fn(),
    videoEnableSafetyChecker: true,
    setVideoEnableSafetyChecker: vi.fn(),
    videoSafetyTolerance: 2,
    setVideoSafetyTolerance: vi.fn(),
    generateAudio: true,
    setGenerateAudio: vi.fn(),
    videoCameraMotion: 'none',
    setVideoCameraMotion: vi.fn(),
    videoCfgScale: 0.5,
    setVideoCfgScale: vi.fn(),
    videoGuidanceScale: 3,
    setVideoGuidanceScale: vi.fn(),
    videoNumFrames: 121,
    setVideoNumFrames: vi.fn(),
    videoOutputSize: 'landscape_4_3',
    setVideoOutputSize: vi.fn(),
    videoAcceleration: 'regular',
    setVideoAcceleration: vi.fn(),
    videoNumInferenceSteps: 40,
    setVideoNumInferenceSteps: vi.fn(),
    videoUseMultiscale: true,
    setVideoUseMultiscale: vi.fn(),
    videoCameraLora: 'none',
    setVideoCameraLora: vi.fn(),
    videoCameraLoraScale: 1,
    setVideoCameraLoraScale: vi.fn(),
    videoSeed: null,
    setVideoSeed: vi.fn(),
    videoNegativePrompt: '',
    setVideoNegativePrompt: vi.fn(),
    videoStrength: 0.5,
    setVideoStrength: vi.fn(),
    videoPreprocessor: 'none',
    setVideoPreprocessor: vi.fn(),
    mmAudioCfgStrength: 4.5,
    setMmAudioCfgStrength: vi.fn(),
    mmAudioNumSteps: 25,
    setMmAudioNumSteps: vi.fn(),
    briaBgColor: 'transparent',
    setBriaBgColor: vi.fn(),
    briaOutputCodec: 'mp4_h264',
    setBriaOutputCodec: vi.fn(),
}));

vi.mock('../config', () => ({
    useConfig: () => config,
}));

import { VideoConfigOptions } from './VideoConfigOptions';

function model(endpointId: string, category: VideoModelCategory): ModelConfig {
    return {
        endpointId,
        displayName: endpointId,
        category,
        description: '',
        supportsImageInput: category === 'image-to-video',
        outputType: 'video',
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    cleanup();
});

describe('VideoConfigOptions safety controls', () => {
    it.each([
        ['blackforestlabs/flux-3/text-to-video', 'text-to-video'],
        ['blackforestlabs/flux-3/image-to-video', 'image-to-video'],
    ] as const)('shows configurable safety tolerance for %s', (endpointId, category) => {
        render(<VideoConfigOptions selectedModel={model(endpointId, category)} />);

        const select = screen.getByLabelText('Safety Tolerance:');
        expect(select).toBeTruthy();
        expect(screen.queryByLabelText('Safety Checker:')).toBeNull();

        fireEvent.change(select, { target: { value: '4' } });
        expect(config.setVideoSafetyTolerance).toHaveBeenCalledWith(4);
    });

    it.each([
        ['fal-ai/wan/v2.7/image-to-video', 'image-to-video'],
        ['minimax/h3/text-to-video', 'text-to-video'],
        ['minimax/h3/image-to-video', 'image-to-video'],
    ] as const)('shows a configurable safety checker for %s', (endpointId, category) => {
        render(<VideoConfigOptions selectedModel={model(endpointId, category)} />);

        const checkbox = screen.getByLabelText('Safety Checker:');
        expect(checkbox).toBeTruthy();
        expect(screen.queryByLabelText('Safety Tolerance:')).toBeNull();

        fireEvent.click(checkbox);
        expect(config.setVideoEnableSafetyChecker).toHaveBeenCalledWith(false);
    });

    it('explains Wan authorization when disabling the checker', () => {
        render(<VideoConfigOptions selectedModel={model('fal-ai/wan/v2.7/image-to-video', 'image-to-video')} />);
        expect(screen.getByText(/disabling requires account authorization/i)).toBeTruthy();
    });
});
