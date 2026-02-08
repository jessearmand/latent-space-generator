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
    // GPT Image models (via OpenAI, fal.ai, or OpenRouter)
    {
        endpointId: 'fal-ai/gpt-image-1.5',
        displayName: 'GPT Image 1.5',
        category: 'text-to-image',
        description: 'OpenAI GPT Image 1.5 — high quality image generation',
        supportsImageInput: false,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/gpt-image-1-mini',
        displayName: 'GPT Image 1 Mini',
        category: 'text-to-image',
        description: 'OpenAI GPT Image 1 Mini — fast, cost-effective image generation',
        supportsImageInput: false,
        outputType: 'image',
    },
    // Gemini image models (via fal.ai, OpenRouter fallback)
    {
        endpointId: 'fal-ai/gemini-25-flash-image',
        displayName: 'Gemini 2.5 Flash Image',
        category: 'text-to-image',
        description: 'Google Gemini 2.5 Flash with native image generation',
        supportsImageInput: false,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/gemini-3-pro-image-preview',
        displayName: 'Gemini 3 Pro Image',
        category: 'text-to-image',
        description: 'Google Gemini 3 Pro with high-quality image generation',
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
    // GPT Image Edit models
    {
        endpointId: 'fal-ai/gpt-image-1.5/edit',
        displayName: 'GPT Image 1.5 Edit',
        category: 'image-to-image',
        description: 'OpenAI GPT Image 1.5 with image editing capabilities',
        supportsImageInput: true,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/gpt-image-1-mini/edit',
        displayName: 'GPT Image 1 Mini Edit',
        category: 'image-to-image',
        description: 'OpenAI GPT Image 1 Mini with image editing',
        supportsImageInput: true,
        outputType: 'image',
    },
    // Gemini image edit models (via fal.ai, OpenRouter fallback)
    {
        endpointId: 'fal-ai/gemini-25-flash-image/edit',
        displayName: 'Gemini 2.5 Flash Image Edit',
        category: 'image-to-image',
        description: 'Google Gemini 2.5 Flash with image editing',
        supportsImageInput: true,
        outputType: 'image',
    },
    {
        endpointId: 'fal-ai/gemini-3-pro-image-preview/edit',
        displayName: 'Gemini 3 Pro Image Edit',
        category: 'image-to-image',
        description: 'Google Gemini 3 Pro with image editing',
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

/**
 * Check if model is a GPT image model (fal.ai format or legacy)
 */
export function isGptImageModel(modelId: string): boolean {
    return modelId.includes('gpt-image') || modelId.includes('gpt-5-image');
}

/**
 * Check if model is a Gemini image model (fal.ai format or OpenRouter format)
 */
export function isGeminiImageModel(modelId: string): boolean {
    return modelId.includes('gemini') && modelId.includes('image');
}

/**
 * Map fal.ai Gemini endpoint ID → OpenRouter model ID for fallback routing
 * e.g., 'fal-ai/gemini-25-flash-image' → 'google/gemini-2.5-flash-image'
 *        'fal-ai/gemini-3-pro-image-preview/edit' → 'google/gemini-3-pro-image-preview'
 */
export function mapGeminiToOpenRouterModelId(falEndpointId: string): string {
    if (falEndpointId.includes('gemini-25-flash-image')) return 'google/gemini-2.5-flash-image';
    if (falEndpointId.includes('gemini-3-pro-image-preview')) return 'google/gemini-3-pro-image-preview';
    return falEndpointId;
}

/**
 * Map fal.ai GPT endpoint ID → OpenAI API model name
 * e.g., 'fal-ai/gpt-image-1.5' → 'gpt-image-1.5'
 *        'fal-ai/gpt-image-1-mini/edit' → 'gpt-image-1-mini'
 */
export function mapToOpenAIModelName(falEndpointId: string): string {
    if (falEndpointId.includes('gpt-image-1-mini')) return 'gpt-image-1-mini';
    if (falEndpointId.includes('gpt-image-1.5')) return 'gpt-image-1.5';
    if (falEndpointId.includes('gpt-image-1')) return 'gpt-image-1';
    return 'gpt-image-1.5';
}

/**
 * Map OpenAI model name → OpenRouter model ID
 * OpenRouter uses different naming: gpt-image-1.5 → openai/gpt-5-image
 */
export function mapToOpenRouterModelId(openaiModel: string): string {
    if (openaiModel === 'gpt-image-1-mini') return 'openai/gpt-5-image-mini';
    return 'openai/gpt-5-image';
}
