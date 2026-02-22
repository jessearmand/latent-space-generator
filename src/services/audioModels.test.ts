import { describe, it, expect } from 'vitest';
import { isPromptOptionalForAudioModel } from './audioModels';

describe('isPromptOptionalForAudioModel', () => {
    it.each([
        'fal-ai/personaplex',
        'fal-ai/elevenlabs/audio-isolation',
        'FAL-AI/ELEVENLABS/AUDIO-ISOLATION',
    ])('returns true for prompt-optional model %s', (modelId) => {
        expect(isPromptOptionalForAudioModel(modelId)).toBe(true);
    });

    it.each([
        'fal-ai/minimax/speech-02-hd',
        'fal-ai/qwen-3-tts/text-to-speech/1.7b',
        'fal-ai/dia-tts/voice-clone',
        'fal-ai/audio-understanding',
        'mirelo-ai/sfx-v1/video-to-audio',
    ])('returns false for prompt-required model %s', (modelId) => {
        expect(isPromptOptionalForAudioModel(modelId)).toBe(false);
    });
});
