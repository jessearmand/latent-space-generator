/**
 * Type definitions for audio generation models
 * Supports TTS, music generation, sound effects, and voice cloning
 */

/** Voice settings for MiniMax Speech-02-HD */
export interface MiniMaxVoiceSettings {
    voice_id: string;
    speed?: number; // 0.5-2.0, default 1.0
    vol?: number; // 0-1, default 1.0
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

/** MiniMax Speech-02-HD available voices (subset of 300+ voices) */
export const MINIMAX_VOICES = [
    { id: 'male-qn-qingse', name: 'Male - Qingse' },
    { id: 'male-qn-jingying', name: 'Male - Jingying' },
    { id: 'male-qn-daxuesheng', name: 'Male - Student' },
    { id: 'female-shaonv', name: 'Female - Young' },
    { id: 'female-yujie', name: 'Female - Mature' },
    { id: 'female-chengshu', name: 'Female - Adult' },
    { id: 'presenter_male', name: 'Presenter Male' },
    { id: 'presenter_female', name: 'Presenter Female' },
    { id: 'audiobook_male_1', name: 'Audiobook Male 1' },
    { id: 'audiobook_female_1', name: 'Audiobook Female 1' },
] as const;

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

/** MiniMax Speech 2.8 Turbo language boost options */
export const MINIMAX_LANGUAGE_BOOST = [
    'auto', 'English', 'Chinese', 'Japanese', 'Korean',
    'French', 'German', 'Spanish', 'Portuguese', 'Italian', 'Russian',
    'Arabic', 'Turkish', 'Dutch', 'Thai', 'Vietnamese', 'Indonesian',
    'Hindi', 'Polish', 'Swedish', 'Danish', 'Finnish', 'Norwegian',
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
