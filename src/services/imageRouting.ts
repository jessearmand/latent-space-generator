import type { ConfigState } from '../config';
import type { ServerKeys } from '../contexts/ServerKeysContext';
import { generateOpenAIImage, base64ToDataUrl, type OpenAIImageParams } from './openai';
import { generateOpenRouterImage } from './openrouterImage';
import {
    mapToOpenAIModelName,
    mapToOpenRouterModelId,
    mapGeminiToOpenRouterModelId,
} from './imageModels';
import { submitAndPollFalQueue } from './falQueue';
import { buildGeminiImageInput, buildGptImageInput } from './imageInputBuilders';

export interface ImageRouteContext {
    prompt: string;
    config: ConfigState;
    serverKeys: ServerKeys;
    openRouterUserKey: string | null;
    onStatus: (message: string) => void;
}

export interface ImageRouteResult {
    urls: string[];
}

export async function routeGeminiImage(
    modelId: string,
    modelName: string,
    context: ImageRouteContext,
    imageUrls?: string[],
): Promise<ImageRouteResult> {
    const { prompt, config, serverKeys, openRouterUserKey, onStatus } = context;

    // Route 1: fal.ai queue (preferred)
    if (serverKeys.fal) {
        onStatus(`Generating image with ${modelName} via fal.ai...`);
        console.log(`[Gemini→fal.ai] Using fal.ai queue with model: ${modelId}`);

        const input = buildGeminiImageInput(prompt, config, modelId, imageUrls);
        console.log(`Gemini fal.ai input:`, input);

        const result = await submitAndPollFalQueue({
            modelId,
            input,
            onStatus,
        });

        const images = result.data.images as Array<{ url: string }> | undefined;
        if (images && images.length > 0) {
            const urls = images.map((img) => img.url);
            console.log(`${urls.length} Gemini image(s) received:`, urls);
            return { urls };
        }
        throw new Error('fal.ai Gemini response missing image data');
    }

    // Route 2: OpenRouter fallback
    const hasOpenRouter = serverKeys.openrouter || !!openRouterUserKey;
    if (hasOpenRouter) {
        const openRouterModelId = mapGeminiToOpenRouterModelId(modelId);
        onStatus(`Generating image with ${modelName} via OpenRouter...`);
        console.log(`[Gemini→OpenRouter] Using OpenRouter with model: ${openRouterModelId}`);

        const response = await generateOpenRouterImage(
            {
                model: openRouterModelId,
                prompt,
                image_config: { aspect_ratio: config.aspectRatio },
            },
            openRouterUserKey,
        );

        if (response.data?.[0]?.b64_json) {
            const dataUrl = base64ToDataUrl(response.data[0].b64_json, 'png');
            console.log(`OpenRouter Gemini image generated successfully`);
            return { urls: [dataUrl] };
        }
        throw new Error('OpenRouter response missing image data');
    }

    throw new Error('No API key available for Gemini image generation. Configure FAL_API_KEY or log in with OpenRouter.');
}

export async function routeGptImage(
    modelId: string,
    modelName: string,
    context: ImageRouteContext,
): Promise<ImageRouteResult> {
    const { prompt, config, serverKeys, openRouterUserKey, onStatus } = context;
    const openaiModelName = mapToOpenAIModelName(modelId);

    // Route 1: OpenAI direct (fastest, no queue)
    if (serverKeys.openai) {
        onStatus(`Generating image with OpenAI ${modelName}...`);
        console.log(`[GPT→OpenAI] Calling OpenAI directly with model: ${openaiModelName}`);

        const params: OpenAIImageParams = {
            prompt,
            model: openaiModelName as OpenAIImageParams['model'],
            size: config.gptImageSize as OpenAIImageParams['size'],
            quality: config.gptQuality as OpenAIImageParams['quality'],
            background: config.gptBackground as OpenAIImageParams['background'],
            n: config.gptNumImages,
            output_format: 'png',
        };

        const response = await generateOpenAIImage(params);

        if (response.data && response.data.length > 0) {
            const urls = response.data
                .filter((item) => item.b64_json)
                .map((item) => base64ToDataUrl(item.b64_json, 'png'));
            console.log(`${urls.length} OpenAI image(s) generated successfully`);

            if (response.usage) {
                console.log(`Token usage - Input: ${response.usage.input_tokens}, Output: ${response.usage.output_tokens}, Total: ${response.usage.total_tokens}`);
            }
            return { urls };
        }
        throw new Error('OpenAI response missing image data');
    }

    // Route 2: fal.ai queue with GPT-specific params
    if (serverKeys.fal) {
        onStatus(`Generating image with ${modelName} via fal.ai...`);
        console.log(`[GPT→fal.ai] Using fal.ai queue with model: ${modelId}`);

        const input = buildGptImageInput(prompt, config);
        console.log(`GPT fal.ai input:`, input);

        const result = await submitAndPollFalQueue({
            modelId,
            input,
            onStatus,
        });

        // fal.ai GPT returns images in result.data.images[] or result.data.data[]
        const images = (result.data.images || result.data.data) as Array<{ url?: string; b64_json?: string }> | undefined;
        if (images && images.length > 0) {
            const urls = images
                .map((img) => img.url ?? (img.b64_json ? base64ToDataUrl(img.b64_json, 'png') : null))
                .filter((url): url is string => url !== null);
            if (urls.length > 0) {
                console.log(`${urls.length} fal.ai GPT image(s) received`);
                return { urls };
            }
        }
        throw new Error('fal.ai GPT response missing image data');
    }

    // Route 3: OpenRouter
    if (serverKeys.openrouter || openRouterUserKey) {
        const openRouterModelId = mapToOpenRouterModelId(openaiModelName);
        onStatus(`Generating image with ${modelName} via OpenRouter...`);
        console.log(`[GPT→OpenRouter] Using OpenRouter with model: ${openRouterModelId}`);

        const response = await generateOpenRouterImage(
            { model: openRouterModelId, prompt },
            openRouterUserKey,
        );

        if (response.data && response.data.length > 0) {
            const urls = response.data
                .filter((item: { b64_json?: string }) => item.b64_json)
                .map((item: { b64_json?: string }) => base64ToDataUrl(item.b64_json as string, 'png'));
            if (urls.length > 0) {
                console.log(`${urls.length} OpenRouter GPT image(s) generated successfully`);
                return { urls };
            }
        }
        throw new Error('OpenRouter response missing image data');
    }

    throw new Error('No API key available for GPT image generation. Configure OPENAI_API_KEY, FAL_API_KEY, or log in with OpenRouter.');
}
