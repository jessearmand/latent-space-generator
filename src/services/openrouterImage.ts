/**
 * OpenRouter Image Generation service
 * Routes image generation through OpenRouter's chat completions API
 * with modalities: ["image", "text"]
 */

import type { OpenAIImageResponse } from './openai';

const OPENROUTER_IMAGE_PROXY_URL = '/api/openrouter/images';

export interface OpenRouterImageParams {
    /** OpenRouter model ID (e.g., 'openai/gpt-5-image', 'google/gemini-2.5-flash-image') */
    model: string;
    prompt: string;
    /** Optional config for models that support it (e.g., Gemini aspect_ratio) */
    image_config?: {
        aspect_ratio?: string;
        image_size?: string;
    };
}

/**
 * Generate image using OpenRouter's chat completions API
 * Returns normalized response matching OpenAI image generation shape
 */
export async function generateOpenRouterImage(
    params: OpenRouterImageParams,
    userApiKey?: string | null,
): Promise<OpenAIImageResponse> {
    const response = await fetch(OPENROUTER_IMAGE_PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: params.model,
            prompt: params.prompt,
            openrouter_user_key: userApiKey || undefined,
            image_config: params.image_config,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `OpenRouter image API error: ${response.status}`);
    }

    return data as OpenAIImageResponse;
}
