/**
 * Image models service
 * Provides curated list of popular image models and helpers for filtering
 */

import type { ModelConfig, ImageModelCategory } from '../types/models';

/**
 * Curated list of popular text-to-image models (Updated Feb 2026)
 * Grok Imagine featured at the top, followed by Flux 2 family
 */
export const CURATED_TEXT_TO_IMAGE_MODELS: ModelConfig[] = [
    // Grok Imagine - Featured
    {
        endpointId: 'xai/grok-imagine-image',
        displayName: 'Grok Imagine Image',
        category: 'text-to-image',
        description: 'xAI Grok highly aesthetic image generation',
        supportsImageInput: false,
        outputType: 'image',
    },
    // Flux 2 Family
    {
        endpointId: 'fal-ai/flux-2',
        displayName: 'Flux 2 [dev]',
        category: 'text-to-image',
        description: 'Enhanced realism, crisper text generation, and native editing capabilities',
        supportsImageInput: false,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/flux-2-pro',
        displayName: 'Flux 2 [pro]',
        category: 'text-to-image',
        description: 'Maximum quality, exceptional photorealism and artistic images',
        supportsImageInput: false,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/flux-2/klein/9b/base',
        displayName: 'Flux 2 [klein] 9B',
        category: 'text-to-image',
        description: 'Flux 2 klein 9B base model for fast generation',
        supportsImageInput: false,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/flux-2/klein/4b/base',
        displayName: 'Flux 2 [klein] 4B',
        category: 'text-to-image',
        description: 'Flux 2 klein 4B lightweight model',
        supportsImageInput: false,
        outputType: 'image',
    },
    // Original Flux models
    {
        endpointId: 'fal-ai/flux-pro/v1.1-ultra',
        displayName: 'Flux Pro 1.1 Ultra',
        category: 'text-to-image',
        description: 'Ultra-high quality image generation with up to 4MP output',
        supportsImageInput: false,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/flux/dev',
        displayName: 'Flux [dev]',
        category: 'text-to-image',
        description: 'Open-source model for non-commercial use',
        supportsImageInput: false,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/flux/schnell',
        displayName: 'Flux [schnell]',
        category: 'text-to-image',
        description: 'Fast generation with good quality',
        supportsImageInput: false,
        outputType: 'image',
    },
];

/**
 * Curated list of popular image-to-image models (Updated Feb 2026)
 * Grok Imagine Edit featured at the top, followed by Flux 2 Edit family
 */
export const CURATED_IMAGE_TO_IMAGE_MODELS: ModelConfig[] = [
    // Grok Imagine Edit - Featured
    {
        endpointId: 'xai/grok-imagine-image/edit',
        displayName: 'Grok Imagine Edit',
        category: 'image-to-image',
        description: 'xAI Grok precise image editing',
        supportsImageInput: true,
        outputType: 'image',
    },
    // Flux 2 Edit Family
    {
        endpointId: 'fal-ai/flux-2/edit',
        displayName: 'Flux 2 Edit [dev]',
        category: 'image-to-image',
        description: 'Precise modifications using natural language descriptions and hex color control',
        supportsImageInput: true,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/flux-2-pro/edit',
        displayName: 'Flux 2 Edit [pro]',
        category: 'image-to-image',
        description: 'High-quality image manipulation, style transfer, and sequential editing',
        supportsImageInput: true,
        outputType: 'image',
    },
    // Qwen models
    {
        endpointId: 'fal-ai/qwen-image-edit',
        displayName: 'Qwen Image Edit',
        category: 'image-to-image',
        description: 'Qwen-based image editing with natural language instructions',
        supportsImageInput: true,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/qwen-image-to-image',
        displayName: 'Qwen Image-to-Image',
        category: 'image-to-image',
        description: 'Transform images using Qwen multimodal model',
        supportsImageInput: true,
        outputType: 'image',
    },
    // Original Flux edit models
    {
        endpointId: 'fal-ai/flux-pro/v1/fill',
        displayName: 'Flux Pro Fill',
        category: 'image-to-image',
        description: 'Inpainting and outpainting with Flux Pro',
        supportsImageInput: true,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/flux-pro/v1/canny',
        displayName: 'Flux Pro Canny',
        category: 'image-to-image',
        description: 'Edge-guided image generation',
        supportsImageInput: true,
        outputType: 'image',
    },
];

/** All curated image models */
export const CURATED_IMAGE_MODELS: ModelConfig[] = [
    ...CURATED_TEXT_TO_IMAGE_MODELS,
    ...CURATED_IMAGE_TO_IMAGE_MODELS,
];

/**
 * Get curated image models, optionally filtered by category
 */
export function getCuratedImageModels(category?: ImageModelCategory): ModelConfig[] {
    if (!category) {
        return CURATED_IMAGE_MODELS;
    }

    if (category === 'text-to-image') {
        return CURATED_TEXT_TO_IMAGE_MODELS;
    }

    if (category === 'image-to-image') {
        return CURATED_IMAGE_TO_IMAGE_MODELS;
    }

    return [];
}

/**
 * Filter models by search query (case-insensitive)
 * Matches against displayName and endpointId
 */
export function filterImageModelsByQuery(models: ModelConfig[], query: string): ModelConfig[] {
    if (!query.trim()) {
        return models;
    }

    const lowerQuery = query.toLowerCase().trim();

    return models.filter(model =>
        model.displayName.toLowerCase().includes(lowerQuery) ||
        model.endpointId.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Check if a model is a Grok Imagine image model
 */
export function isGrokImageModel(modelId: string): boolean {
    return modelId.includes('grok-imagine-image');
}
