/**
 * OpenAI Images API service
 * Direct calls to OpenAI for GPT image models (gpt-image-1, gpt-image-1.5, etc.)
 */

const OPENAI_PROXY_URL = 'http://localhost:3001/api/openai/images';

export interface OpenAIImageParams {
    prompt: string;
    model?: 'gpt-image-1' | 'gpt-image-1-mini' | 'gpt-image-1.5';
    size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
    quality?: 'low' | 'medium' | 'high' | 'auto';
    background?: 'transparent' | 'opaque' | 'auto';
    n?: number;
    output_format?: 'png' | 'jpeg' | 'webp';
}

export interface OpenAIImageResponse {
    created: number;
    data: Array<{
        b64_json: string;
    }>;
    usage?: {
        total_tokens: number;
        input_tokens: number;
        output_tokens: number;
    };
}

export interface OpenAIErrorResponse {
    error: {
        message: string;
        type: string;
        code?: string;
    };
}

/**
 * Generate image using OpenAI's GPT Image models directly
 */
export async function generateOpenAIImage(
    apiKey: string,
    params: OpenAIImageParams
): Promise<OpenAIImageResponse> {
    const response = await fetch(OPENAI_PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            openai_api_key: apiKey,
            model: params.model || 'gpt-image-1.5',
            prompt: params.prompt,
            size: params.size || 'auto',
            quality: params.quality || 'auto',
            background: params.background || 'auto',
            n: params.n || 1,
            output_format: params.output_format || 'png',
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        const errorData = data as OpenAIErrorResponse;
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    return data as OpenAIImageResponse;
}

/**
 * Convert base64 image data to a data URL for display
 */
export function base64ToDataUrl(base64: string, format: string = 'png'): string {
    return `data:image/${format};base64,${base64}`;
}
