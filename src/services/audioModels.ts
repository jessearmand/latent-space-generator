/**
 * Audio models service
 * Provides curated list of audio models for TTS, music, SFX, and voice cloning
 */

import type { ModelConfig, AudioModelCategory } from '../types/models';

/**
 * Curated list of text-to-speech models (Updated Jan 2026)
 */
export const CURATED_TEXT_TO_SPEECH_MODELS: ModelConfig[] = [
    {
        endpointId: 'fal-ai/minimax/speech-02-hd',
        displayName: 'MiniMax Speech-02-HD',
        category: 'text-to-speech',
        description: '30+ languages, 300+ voices, emotion control, $0.1/1000 chars',
        supportsImageInput: false,
        outputType: 'audio',
    },
    {
        endpointId: 'fal-ai/minimax/speech-2.8-turbo',
        displayName: 'MiniMax Speech 2.8 Turbo',
        category: 'text-to-speech',
        description: 'Fast TTS with 30+ languages, pause/interjection tags, $0.06/1000 chars',
        supportsImageInput: false,
        outputType: 'audio',
    },
    {
        endpointId: 'fal-ai/chatterbox/text-to-speech',
        displayName: 'Chatterbox TTS',
        category: 'text-to-speech',
        description: 'Emotive speech with voice cloning support, $0.025/1000 chars',
        supportsImageInput: false,
        outputType: 'audio',
    },
    {
        endpointId: 'fal-ai/qwen-3-tts/text-to-speech/0.6b',
        displayName: 'Qwen3 TTS 0.6B',
        category: 'text-to-speech',
        description: 'Multilingual TTS with 9 voices, style prompts, $0.07/1000 chars',
        supportsImageInput: false,
        outputType: 'audio',
    },
    {
        endpointId: 'fal-ai/qwen-3-tts/text-to-speech/1.7b',
        displayName: 'Qwen3 TTS 1.7B',
        category: 'text-to-speech',
        description: 'High-quality TTS with 9 voices, voice cloning support, $0.09/1000 chars',
        supportsImageInput: false,
        outputType: 'audio',
    },
    {
        endpointId: 'fal-ai/qwen-3-tts/voice-design/1.7b',
        displayName: 'Qwen3 TTS Voice Design',
        category: 'text-to-speech',
        description: 'Design custom voices with style prompts, $0.09/1000 chars',
        supportsImageInput: false,
        outputType: 'audio',
    },
];

/**
 * Curated list of text-to-audio models (music and SFX)
 */
export const CURATED_TEXT_TO_AUDIO_MODELS: ModelConfig[] = [
    {
        endpointId: 'fal-ai/ace/music-generation',
        displayName: 'ACE Music Generation',
        category: 'text-to-audio',
        description: 'Generate royalty-free instrumental music from text prompts',
        supportsImageInput: false,
        outputType: 'audio',
    },
    {
        endpointId: 'beatoven/music-generation',
        displayName: 'Beatoven Music',
        category: 'text-to-audio',
        description: 'Royalty-free instrumental music, jazz/ambient/cinematic, 5-150s',
        supportsImageInput: false,
        outputType: 'audio',
    },
    {
        endpointId: 'fal-ai/eleven/sound-effect-generation',
        displayName: 'ElevenLabs Sound Effects',
        category: 'text-to-audio',
        description: 'Professional-grade sound effects from text descriptions',
        supportsImageInput: false,
        outputType: 'audio',
    },
    {
        endpointId: 'beatoven/sound-effect-generation',
        displayName: 'Beatoven Sound Effects',
        category: 'text-to-audio',
        description: 'Professional sound effects from text, 1-35s duration',
        supportsImageInput: false,
        outputType: 'audio',
    },
    {
        endpointId: 'fal-ai/stable-audio',
        displayName: 'Stable Audio',
        category: 'text-to-audio',
        description: 'High-quality audio generation from text prompts',
        supportsImageInput: false,
        outputType: 'audio',
    },
];

/**
 * Curated list of audio-to-audio models (voice cloning)
 */
export const CURATED_AUDIO_TO_AUDIO_MODELS: ModelConfig[] = [
    {
        endpointId: 'fal-ai/dia-tts/voice-clone',
        displayName: 'Dia TTS Voice Clone',
        category: 'audio-to-audio',
        description: 'Clone any voice from a sample audio file',
        supportsImageInput: false,
        outputType: 'audio',
    },
];

/**
 * Curated list of video-to-audio models
 */
export const CURATED_VIDEO_TO_AUDIO_MODELS: ModelConfig[] = [
    {
        endpointId: 'mirelo-ai/sfx-v1/video-to-audio',
        displayName: 'Mirelo SFX V2A',
        category: 'video-to-audio',
        description: 'Generate perfectly synced sounds for any video',
        supportsImageInput: false,
        outputType: 'audio',
    },
];

/**
 * Curated list of audio understanding models
 */
export const CURATED_AUDIO_UNDERSTANDING_MODELS: ModelConfig[] = [
    {
        endpointId: 'fal-ai/audio-understanding',
        displayName: 'Audio Understanding',
        category: 'audio-understanding',
        description: 'Analyze audio content with natural language questions',
        supportsImageInput: false,
        outputType: 'text',
    },
];

/** All curated audio models */
export const CURATED_AUDIO_MODELS: ModelConfig[] = [
    ...CURATED_TEXT_TO_SPEECH_MODELS,
    ...CURATED_TEXT_TO_AUDIO_MODELS,
    ...CURATED_AUDIO_TO_AUDIO_MODELS,
    ...CURATED_VIDEO_TO_AUDIO_MODELS,
    ...CURATED_AUDIO_UNDERSTANDING_MODELS,
];

/**
 * Get curated audio models, optionally filtered by category
 */
export function getCuratedAudioModels(category?: AudioModelCategory): ModelConfig[] {
    if (!category) {
        return CURATED_AUDIO_MODELS;
    }

    switch (category) {
        case 'text-to-speech':
            return CURATED_TEXT_TO_SPEECH_MODELS;
        case 'text-to-audio':
            return CURATED_TEXT_TO_AUDIO_MODELS;
        case 'audio-to-audio':
            return CURATED_AUDIO_TO_AUDIO_MODELS;
        case 'video-to-audio':
            return CURATED_VIDEO_TO_AUDIO_MODELS;
        case 'audio-understanding':
            return CURATED_AUDIO_UNDERSTANDING_MODELS;
        default:
            return [];
    }
}

/**
 * Filter audio models by search query (case-insensitive)
 * Matches against displayName and endpointId
 */
export function filterAudioModelsByQuery(models: ModelConfig[], query: string): ModelConfig[] {
    if (!query.trim()) {
        return models;
    }

    const lowerQuery = query.toLowerCase().trim();

    return models.filter(
        (model) =>
            model.displayName.toLowerCase().includes(lowerQuery) ||
            model.endpointId.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Check if a model is a TTS model (supports text input)
 */
export function isTTSModel(endpointId: string): boolean {
    const lowerEndpoint = endpointId.toLowerCase();
    return (
        lowerEndpoint.includes('speech') ||
        lowerEndpoint.includes('tts') ||
        lowerEndpoint.includes('chatterbox')
    );
}

/**
 * Check if a model is a music generation model
 */
export function isMusicModel(endpointId: string): boolean {
    const lowerEndpoint = endpointId.toLowerCase();
    return lowerEndpoint.includes('music') || lowerEndpoint.includes('ace');
}

/**
 * Check if a model is a sound effects model
 */
export function isSFXModel(endpointId: string): boolean {
    const lowerEndpoint = endpointId.toLowerCase();
    return (
        lowerEndpoint.includes('sound-effect') ||
        lowerEndpoint.includes('eleven') ||
        lowerEndpoint.includes('sfx')
    );
}

/**
 * Check if a model is an audio understanding model
 */
export function isAudioUnderstandingModel(endpointId: string): boolean {
    const lowerEndpoint = endpointId.toLowerCase();
    return lowerEndpoint.includes('audio-understanding');
}

/**
 * Check if a model requires audio input
 */
export function requiresAudioInputForModel(endpointId: string): boolean {
    const lowerEndpoint = endpointId.toLowerCase();
    return lowerEndpoint.includes('voice-clone') || lowerEndpoint.includes('audio-to-audio') || lowerEndpoint.includes('audio-understanding');
}

/**
 * Check if a model requires video input
 */
export function requiresVideoInputForAudio(endpointId: string): boolean {
    const lowerEndpoint = endpointId.toLowerCase();
    return lowerEndpoint.includes('video-to-audio');
}

/**
 * Check if a model is a Beatoven model
 */
export function isBeatovenModel(endpointId: string): boolean {
    const lowerEndpoint = endpointId.toLowerCase();
    return lowerEndpoint.includes('beatoven');
}

/**
 * Check if a model is MiniMax Speech 2.8 Turbo
 * Uses 'prompt' instead of 'text', otherwise shares voice_setting/language_boost with HD
 */
export function isMinimaxTurboModel(endpointId: string): boolean {
    return endpointId.toLowerCase().includes('speech-2.8');
}

/**
 * Check if a model is a Qwen3-TTS model
 */
export function isQwen3TTSModel(endpointId: string): boolean {
    return endpointId.toLowerCase().includes('qwen-3-tts');
}

/**
 * Check if a model is Qwen3 Voice Design (requires style prompt)
 */
export function isQwen3VoiceDesignModel(endpointId: string): boolean {
    return endpointId.toLowerCase().includes('qwen-3-tts/voice-design');
}
