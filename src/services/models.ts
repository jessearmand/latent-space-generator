/**
 * API service for fetching models from fal.ai
 * Routes through local proxy server to avoid CORS and keep API keys secure
 */

import {
    FalModel,
    ModelsApiResponse,
    ModelsQueryParams,
    ModelConfig,
    ImageModelCategory,
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
        ids.forEach(id => url.searchParams.append('endpoint_id', id));
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
        expands.forEach(e => url.searchParams.append('expand', e));
    }

    return url.toString();
}

/** Fetch models with given parameters via proxy */
async function fetchModelsPage(
    params: ModelsQueryParams
): Promise<ModelsApiResponse> {
    const targetUrl = buildUrl('/models', params);

    // Route through proxy - API key is added server-side
    const response = await fetch(PROXY_URL, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-fal-target-url': targetUrl,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
}

/** Fetch all models for a given category, handling pagination */
async function fetchAllModelsForCategory(
    category: ImageModelCategory
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

/** Cache key for localStorage */
const CACHE_KEY = 'fal_models_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
    models: ModelConfig[];
    timestamp: number;
}

/** Get cached models if available and not expired */
export function getCachedModels(): ModelConfig[] | null {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const entry: CacheEntry = JSON.parse(cached);
        const age = Date.now() - entry.timestamp;

        if (age > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return entry.models;
    } catch {
        return null;
    }
}

/** Cache models in localStorage */
export function cacheModels(models: ModelConfig[]): void {
    try {
        const entry: CacheEntry = {
            models,
            timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
        // Ignore localStorage errors (quota exceeded, etc.)
    }
}

/** Clear the models cache */
export function clearModelsCache(): void {
    localStorage.removeItem(CACHE_KEY);
}
