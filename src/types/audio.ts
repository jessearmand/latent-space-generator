/**
 * Type definitions for audio generation models
 * Supports TTS, music generation, sound effects, and voice cloning
 */

/** Voice settings for MiniMax Speech-02-HD */
export interface MiniMaxVoiceSettings {
    voice_id: string;
    speed?: number; // 0.5-2.0, default 1.0
    vol?: number; // 0.01-10, default 1.0
    pitch?: number; // -12 to 12, default 0
    emotion?: MiniMaxEmotion;
}

/** Emotion options for MiniMax TTS */
export type MiniMaxEmotion =
    | 'neutral'
    | 'happy'
    | 'sad'
    | 'angry'
    | 'fearful'
    | 'disgusted'
    | 'surprised';

/** Audio output format options */
export type AudioOutputFormat = 'mp3' | 'wav' | 'flac' | 'pcm' | 'ogg';

/** Chatterbox TTS settings */
export interface ChatterboxSettings {
    audio_url?: string; // For voice cloning
    exaggeration?: number; // 0-1, default 0.25
    temperature?: number; // 0.1-2.0, default 0.7
    cfg?: number; // 0-1, default 0.5
}

/** ACE Music Generation settings */
export interface MusicGenerationSettings {
    duration?: number; // seconds
    loop?: boolean;
}

/** ElevenLabs Sound Effects settings */
export interface SoundEffectSettings {
    duration?: number; // seconds
}

/** Dia TTS Voice Clone settings */
export interface VoiceCloneSettings {
    source_audio_url: string;
    target_text: string;
}

/** Mirelo SFX Video-to-Audio settings */
export interface VideoToAudioSettings {
    video_url: string;
}

/** Generic audio model parameters */
export interface AudioModelParams {
    prompt?: string;
    text?: string; // For TTS
    output_format?: AudioOutputFormat;
    seed?: number;
    // MiniMax specific
    voice_settings?: MiniMaxVoiceSettings;
    // Chatterbox specific
    chatterbox?: ChatterboxSettings;
    // Music generation specific
    music?: MusicGenerationSettings;
    // Sound effect specific
    sfx?: SoundEffectSettings;
    // Voice clone specific
    voice_clone?: VoiceCloneSettings;
    // Video-to-audio specific
    video_to_audio?: VideoToAudioSettings;
}

/** Audio generation result */
export interface AudioGenerationResult {
    audio_url: string;
    content_type?: string;
    duration?: number;
}

/** MiniMax default voice ID from fal OpenAPI/playground schema */
export const MINIMAX_DEFAULT_VOICE_ID = 'Wise_Woman';

/** MiniMax speech voices (from fal OpenAPI VoiceSetting examples) */
export const MINIMAX_VOICES = [
    { id: 'Wise_Woman', name: 'Wise Woman' },
    { id: 'Friendly_Person', name: 'Friendly Person' },
    { id: 'Inspirational_girl', name: 'Inspirational Girl' },
    { id: 'Deep_Voice_Man', name: 'Deep Voice Man' },
    { id: 'Calm_Woman', name: 'Calm Woman' },
    { id: 'Casual_Guy', name: 'Casual Guy' },
    { id: 'Lively_Girl', name: 'Lively Girl' },
    { id: 'Patient_Man', name: 'Patient Man' },
    { id: 'Young_Knight', name: 'Young Knight' },
    { id: 'Determined_Man', name: 'Determined Man' },
    { id: 'Lovely_Girl', name: 'Lovely Girl' },
    { id: 'Decent_Boy', name: 'Decent Boy' },
    { id: 'Imposing_Manner', name: 'Imposing Manner' },
    { id: 'Elegant_Man', name: 'Elegant Man' },
    { id: 'Abbess', name: 'Abbess' },
    { id: 'Sweet_Girl_2', name: 'Sweet Girl 2' },
    { id: 'Exuberant_Girl', name: 'Exuberant Girl' },
] as const;

const MINIMAX_VOICE_ID_SET = new Set<string>(MINIMAX_VOICES.map((voice) => voice.id));

export function isValidMinimaxVoiceId(voiceId: string): boolean {
    return MINIMAX_VOICE_ID_SET.has(voiceId);
}

/** MiniMax emotion options */
export const MINIMAX_EMOTIONS: MiniMaxEmotion[] = [
    'neutral',
    'happy',
    'sad',
    'angry',
    'fearful',
    'disgusted',
    'surprised',
];

/** MiniMax language boost options from fal OpenAPI schema */
export const MINIMAX_LANGUAGE_BOOST = [
    'Chinese',
    'Chinese,Yue',
    'English',
    'Arabic',
    'Russian',
    'Spanish',
    'French',
    'Portuguese',
    'German',
    'Turkish',
    'Dutch',
    'Ukrainian',
    'Vietnamese',
    'Indonesian',
    'Japanese',
    'Italian',
    'Korean',
    'Thai',
    'Polish',
    'Romanian',
    'Greek',
    'Czech',
    'Finnish',
    'Hindi',
    'Bulgarian',
    'Danish',
    'Hebrew',
    'Malay',
    'Slovak',
    'Swedish',
    'Croatian',
    'Hungarian',
    'Norwegian',
    'Slovenian',
    'Catalan',
    'Nynorsk',
    'Afrikaans',
    'auto',
] as const;

/** Qwen3-TTS available voices */
export const QWEN3_TTS_VOICES = [
    { id: 'Vivian', name: 'Vivian' },
    { id: 'Serena', name: 'Serena' },
    { id: 'Uncle_Fu', name: 'Uncle Fu' },
    { id: 'Dylan', name: 'Dylan' },
    { id: 'Eric', name: 'Eric' },
    { id: 'Ryan', name: 'Ryan' },
    { id: 'Aiden', name: 'Aiden' },
    { id: 'Ono_Anna', name: 'Ono Anna' },
    { id: 'Sohee', name: 'Sohee' },
] as const;

/** Qwen3-TTS language options */
export const QWEN3_TTS_LANGUAGES = [
    'Auto', 'English', 'Chinese', 'Spanish', 'French',
    'German', 'Italian', 'Japanese', 'Korean', 'Portuguese', 'Russian',
] as const;

/** ElevenLabs TTS available voices (shared by Turbo v2.5 and Multilingual v2) */
export const ELEVENLABS_VOICES = [
    { id: 'Rachel', name: 'Rachel' },
    { id: 'Aria', name: 'Aria' },
    { id: 'Roger', name: 'Roger' },
    { id: 'Sarah', name: 'Sarah' },
    { id: 'Laura', name: 'Laura' },
    { id: 'Charlie', name: 'Charlie' },
    { id: 'George', name: 'George' },
    { id: 'Callum', name: 'Callum' },
    { id: 'River', name: 'River' },
    { id: 'Liam', name: 'Liam' },
    { id: 'Charlotte', name: 'Charlotte' },
    { id: 'Alice', name: 'Alice' },
    { id: 'Matilda', name: 'Matilda' },
    { id: 'Will', name: 'Will' },
    { id: 'Jessica', name: 'Jessica' },
    { id: 'Eric', name: 'Eric' },
    { id: 'Chris', name: 'Chris' },
    { id: 'Brian', name: 'Brian' },
    { id: 'Daniel', name: 'Daniel' },
    { id: 'Lily', name: 'Lily' },
    { id: 'Bill', name: 'Bill' },
] as const;

/** PersonaPlex available voices */
export const PERSONAPLEX_VOICES = [
    { id: 'NATF0', name: 'Natural Female 0' },
    { id: 'NATF1', name: 'Natural Female 1' },
    { id: 'NATF2', name: 'Natural Female 2' },
    { id: 'NATF3', name: 'Natural Female 3' },
    { id: 'NATM0', name: 'Natural Male 0' },
    { id: 'NATM1', name: 'Natural Male 1' },
    { id: 'NATM2', name: 'Natural Male 2' },
    { id: 'NATM3', name: 'Natural Male 3' },
    { id: 'VARF0', name: 'Varied Female 0' },
    { id: 'VARF1', name: 'Varied Female 1' },
    { id: 'VARF2', name: 'Varied Female 2' },
    { id: 'VARF3', name: 'Varied Female 3' },
    { id: 'VARF4', name: 'Varied Female 4' },
    { id: 'VARM0', name: 'Varied Male 0' },
    { id: 'VARM1', name: 'Varied Male 1' },
    { id: 'VARM2', name: 'Varied Male 2' },
    { id: 'VARM3', name: 'Varied Male 3' },
    { id: 'VARM4', name: 'Varied Male 4' },
] as const;
