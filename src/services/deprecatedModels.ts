/**
 * Blocklist of deprecated or broken fal.ai model endpoints.
 *
 * Models listed here are filtered from API catalog results (the "Show all models" list).
 * Add endpoints that are deprecated, broken upstream, or superseded by newer versions.
 *
 * Format: endpoint ID → reason for blocklisting
 */
const BLOCKLISTED_MODELS: Record<string, string> = {
    // ElevenLabs Sound Effects: fal.ai passes eleven_text_to_sound_v0 to ElevenLabs API,
    // which is deprecated. Both the old and /v2 endpoint fail with:
    // "The eleven_text_to_sound_v0 model is not supported."
    'fal-ai/elevenlabs/sound-effects': 'Uses deprecated eleven_text_to_sound_v0',
    'fal-ai/elevenlabs/sound-effects/v2': 'fal.ai bug: still routes to eleven_text_to_sound_v0',
};

const BLOCKLISTED_SET = new Set(Object.keys(BLOCKLISTED_MODELS));

/** Returns true if the endpoint is blocklisted */
export function isBlocklisted(endpointId: string): boolean {
    return BLOCKLISTED_SET.has(endpointId);
}
