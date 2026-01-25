/**
 * API service for fetching models from fal.ai
 * Routes through local proxy server to avoid CORS and keep API keys secure
 */

import {
    type FalModel,
    type ModelsApiResponse,
    type ModelsQueryParams,
    type ModelConfig,
    type ModelCategory,
    normalizeModel,
} from '../types/models';

const API_BASE_URL = 'https://api.fal.ai/v1';
const PROXY_URL = 'http://localhost:3001/api/fal/proxy';

/** Build URL with query parameters */
function buildUrl(path: string, params: ModelsQueryParams): string {
    // Use string concatenation to preserve /v1 base path
    // (new URL('/models', 'https://api.fal.ai/v1') would produce /models, not /v1/models)
    const url = new URL(`${API_BASE_URL}${path}`);

    if (params.limit !== undefined) {
        url.searchParams.set('limit', params.limit.toString());
    }
    if (params.cursor) {
        url.searchParams.set('cursor', params.cursor);
    }
    if (params.endpoint_id) {
        const ids = Array.isArray(params.endpoint_id) ? params.endpoint_id : [params.endpoint_id];
        for (const id of ids) {
            url.searchParams.append('endpoint_id', id);
        }
    }
    if (params.q) {
        url.searchParams.set('q', params.q);
    }
    if (params.category) {
        url.searchParams.set('category', params.category);
    }
    if (params.status) {
        url.searchParams.set('status', params.status);
    }
    if (params.expand) {
        const expands = Array.isArray(params.expand) ? params.expand : [params.expand];
        for (const e of expands) {
            url.searchParams.append('expand', e);
        }
    }

    return url.toString();
}

/** Fetch models with given parameters via proxy */
async function fetchModelsPage(
    params: ModelsQueryParams
): Promise<ModelsApiResponse> {
    const targetUrl = buildUrl('/models', params);
    console.log('[ModelsAPI] Fetching:', targetUrl);

    // Route through proxy - API key is added server-side
    const response = await fetch(PROXY_URL, {
        method: 'GET',
        headers: {
            'x-fal-target-url': targetUrl,
        },
    });

    console.log('[ModelsAPI] Response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[ModelsAPI] Error response:', errorText);
        let error: { message?: string } = { message: response.statusText };
        try {
            error = JSON.parse(errorText);
        } catch {
            // Keep default error
        }
        throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ModelsAPI] Got', data.models?.length || 0, 'models, has_more:', data.has_more);
    return data;
}

/** Fetch all models for a given category, handling pagination */
async function fetchAllModelsForCategory(
    category: ModelCategory
): Promise<FalModel[]> {
    const allModels: FalModel[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
        const response = await fetchModelsPage({
            category,
            status: 'active',
            limit: 50,
            cursor,
        });

        allModels.push(...response.models);
        cursor = response.next_cursor || undefined;
        hasMore = response.has_more;
    }

    return allModels;
}

/** Fetch all image generation models (text-to-image and image-to-image) */
export async function fetchImageGenerationModels(): Promise<ModelConfig[]> {
    // Fetch both categories in parallel
    const [textToImage, imageToImage] = await Promise.all([
        fetchAllModelsForCategory('text-to-image'),
        fetchAllModelsForCategory('image-to-image'),
    ]);

    // Combine and normalize
    const allModels = [...textToImage, ...imageToImage];

    // Sort by display name
    const normalized = allModels.map(normalizeModel);
    normalized.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return normalized;
}

/** Fetch all video generation models (text-to-video, image-to-video, video-to-video) */
export async function fetchVideoGenerationModels(): Promise<ModelConfig[]> {
    // Fetch all video categories in parallel
    const [textToVideo, imageToVideo, videoToVideo] = await Promise.all([
        fetchAllModelsForCategory('text-to-video'),
        fetchAllModelsForCategory('image-to-video'),
        fetchAllModelsForCategory('video-to-video'),
    ]);

    // Combine and normalize
    const allModels = [...textToVideo, ...imageToVideo, ...videoToVideo];

    // Sort by display name
    const normalized = allModels.map(normalizeModel);
    normalized.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return normalized;
}

/** Fetch all audio generation models (TTS, music, SFX, voice cloning) */
export async function fetchAudioGenerationModels(): Promise<ModelConfig[]> {
    // Fetch all audio categories in parallel
    const [textToSpeech, textToAudio, audioToAudio, videoToAudio] = await Promise.all([
        fetchAllModelsForCategory('text-to-speech'),
        fetchAllModelsForCategory('text-to-audio'),
        fetchAllModelsForCategory('audio-to-audio'),
        fetchAllModelsForCategory('video-to-audio'),
    ]);

    // Combine and normalize
    const allModels = [...textToSpeech, ...textToAudio, ...audioToAudio, ...videoToAudio];

    // Sort by display name
    const normalized = allModels.map(normalizeModel);
    normalized.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return normalized;
}

/** Cache keys for localStorage */
const IMAGE_CACHE_KEY = 'fal_models_cache';
const VIDEO_CACHE_KEY = 'fal_video_models_cache';
const AUDIO_CACHE_KEY = 'fal_audio_models_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
    models: ModelConfig[];
    timestamp: number;
}

/** Generic cache getter */
function getCachedModelsFromKey(cacheKey: string): ModelConfig[] | null {
    try {
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;

        const entry: CacheEntry = JSON.parse(cached);
        const age = Date.now() - entry.timestamp;

        if (age > CACHE_TTL) {
            localStorage.removeItem(cacheKey);
            return null;
        }

        return entry.models;
    } catch {
        return null;
    }
}

/** Generic cache setter */
function cacheModelsToKey(cacheKey: string, models: ModelConfig[]): void {
    try {
        const entry: CacheEntry = {
            models,
            timestamp: Date.now(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch {
        // Ignore localStorage errors (quota exceeded, etc.)
    }
}

/** Get cached image models if available and not expired */
export function getCachedModels(): ModelConfig[] | null {
    return getCachedModelsFromKey(IMAGE_CACHE_KEY);
}

/** Cache image models in localStorage */
export function cacheModels(models: ModelConfig[]): void {
    cacheModelsToKey(IMAGE_CACHE_KEY, models);
}

/** Clear the image models cache */
export function clearModelsCache(): void {
    localStorage.removeItem(IMAGE_CACHE_KEY);
}

/** Get cached video models if available and not expired */
export function getCachedVideoModels(): ModelConfig[] | null {
    return getCachedModelsFromKey(VIDEO_CACHE_KEY);
}

/** Cache video models in localStorage */
export function cacheVideoModels(models: ModelConfig[]): void {
    cacheModelsToKey(VIDEO_CACHE_KEY, models);
}

/** Clear the video models cache */
export function clearVideoModelsCache(): void {
    localStorage.removeItem(VIDEO_CACHE_KEY);
}

/** Get cached audio models if available and not expired */
export function getCachedAudioModels(): ModelConfig[] | null {
    return getCachedModelsFromKey(AUDIO_CACHE_KEY);
}

/** Cache audio models in localStorage */
export function cacheAudioModels(models: ModelConfig[]): void {
    cacheModelsToKey(AUDIO_CACHE_KEY, models);
}

/** Clear the audio models cache */
export function clearAudioModelsCache(): void {
    localStorage.removeItem(AUDIO_CACHE_KEY);
}
