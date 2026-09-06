/**
 * Generation mode union and gating helpers shared across hooks, services, and components.
 * The Sidebar owns mode navigation; these helpers decide what inputs each mode needs.
 */

export type GenerationMode =
    | 'text-to-image'
    | 'image-to-image'
    | 'text-to-video'
    | 'image-to-video'
    | 'video-to-video'
    | 'reference-to-video'
    | 'extend-video'
    | 'text-to-speech'
    | 'text-to-audio'
    | 'audio-to-audio'
    | 'video-to-audio'
    | 'audio-understanding';

/** Helper to check if a mode is a video generation mode */
export function isVideoMode(mode: GenerationMode): boolean {
    return (
        mode === 'text-to-video' ||
        mode === 'image-to-video' ||
        mode === 'video-to-video' ||
        mode === 'reference-to-video' ||
        mode === 'extend-video'
    );
}

/** Helper to check if a mode is an audio generation mode */
export function isAudioMode(mode: GenerationMode): boolean {
    return (
        mode === 'text-to-speech' ||
        mode === 'text-to-audio' ||
        mode === 'audio-to-audio' ||
        mode === 'video-to-audio' ||
        mode === 'audio-understanding'
    );
}

/** Helper to check if a mode requires image input */
export function requiresImageInput(mode: GenerationMode): boolean {
    return mode === 'image-to-image' || mode === 'image-to-video' || mode === 'reference-to-video';
}

/** Helper to check if a mode requires video input */
export function requiresVideoInput(mode: GenerationMode): boolean {
    return mode === 'video-to-video' || mode === 'video-to-audio' || mode === 'extend-video';
}

/** Helper to check if a mode requires audio input */
export function requiresAudioInput(mode: GenerationMode): boolean {
    return mode === 'audio-to-audio' || mode === 'audio-understanding';
}

/** Helper to validate if a string is a valid generation mode */
export function isValidGenerationMode(value: string): value is GenerationMode {
    return (
        value === 'text-to-image' ||
        value === 'image-to-image' ||
        value === 'text-to-video' ||
        value === 'image-to-video' ||
        value === 'video-to-video' ||
        value === 'reference-to-video' ||
        value === 'extend-video' ||
        value === 'text-to-speech' ||
        value === 'text-to-audio' ||
        value === 'audio-to-audio' ||
        value === 'video-to-audio' ||
        value === 'audio-understanding'
    );
}
