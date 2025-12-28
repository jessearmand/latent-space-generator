/**
 * API service for fetching models from OpenRouter
 * Routes through local proxy server to keep API keys secure
 */

import type { OpenRouterModel, OpenRouterModelsResponse } from "../types/openrouter";

const PROXY_URL = "http://localhost:3001/api/openrouter/models";

/** Fetch models from OpenRouter API via proxy */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
    const response = await fetch(PROXY_URL, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.error || error.message || `API error: ${response.status}`);
    }

    const data: OpenRouterModelsResponse = await response.json();
    return data.data;
}

/** Cache key for localStorage */
const CACHE_KEY = "openrouter_models_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
    models: OpenRouterModel[];
    timestamp: number;
}

/** Get cached models if available and not expired */
export function getCachedOpenRouterModels(): OpenRouterModel[] | null {
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
export function cacheOpenRouterModels(models: OpenRouterModel[]): void {
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
export function clearOpenRouterModelsCache(): void {
    localStorage.removeItem(CACHE_KEY);
}

/**
 * Get models with caching
 * Tries cache first, then fetches from API
 */
export async function getOpenRouterModels(forceRefresh = false): Promise<OpenRouterModel[]> {
    // Try cache first unless forcing refresh
    if (!forceRefresh) {
        const cached = getCachedOpenRouterModels();
        if (cached) {
            return cached;
        }
    }

    // Fetch from API
    const models = await fetchOpenRouterModels();

    // Cache the results
    cacheOpenRouterModels(models);

    return models;
}
