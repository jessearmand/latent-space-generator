import type { ConfigState } from '../config';
import { getImageInputConfig } from './modelParams';

export function buildGrokImageInput(
    prompt: string,
    config: ConfigState,
    imageUrl?: string,
): Record<string, unknown> {
    const input: Record<string, unknown> = {
        prompt,
        num_images: config.grokNumImages,
        output_format: config.grokOutputFormat,
    };

    // Grok edit endpoint does not support aspect_ratio
    if (!imageUrl && config.aspectRatio) {
        input.aspect_ratio = config.aspectRatio;
    }

    if (imageUrl) {
        input.image_url = imageUrl;
    }

    return input;
}

export function buildGeminiImageInput(
    prompt: string,
    config: ConfigState,
    modelId: string,
    imageUrls?: string[],
): Record<string, unknown> {
    const isGemini3Pro = modelId.includes('gemini-3-pro');

    const input: Record<string, unknown> = {
        prompt,
        aspect_ratio: config.aspectRatio,
        output_format: config.geminiOutputFormat,
        num_images: config.geminiNumImages,
    };

    // Gemini 3 Pro supports additional parameters
    if (isGemini3Pro) {
        input.safety_tolerance = config.safetyTolerance;
        input.resolution = config.geminiResolution;
        input.enable_web_search = config.geminiEnableWebSearch;
        if (config.seed !== null) {
            input.seed = config.seed;
        }
    }

    if (imageUrls && imageUrls.length > 0) {
        input.image_urls = imageUrls;
    }

    return input;
}

export function buildGptImageInput(
    prompt: string,
    config: ConfigState,
): Record<string, unknown> {
    return {
        prompt,
        image_size: config.gptImageSize,
        quality: config.gptQuality,
        background: config.gptBackground,
        num_images: config.gptNumImages,
        output_format: 'png',
    };
}

export function buildGenericImageInput(
    prompt: string,
    config: ConfigState,
    modelId: string,
    imageInputParams: Record<string, unknown>,
): Record<string, unknown> {
    const isQwenLayered = modelId.includes('qwen-image-layered');
    const isQwenModel = modelId.includes('qwen-image');

    const layerParams = isQwenLayered ? {
        num_layers: config.numLayers,
    } : {};

    const accelerationParams = isQwenModel ? {
        acceleration: config.acceleration,
    } : {};

    const input: Record<string, unknown> = {
        prompt,
        safety_tolerance: config.safetyTolerance,
        aspect_ratio: config.aspectRatio,
        image_size: config.imageSize,
        raw: config.raw,
        enable_safety_checker: config.enableSafetyChecker,
        guidance_scale: config.guidanceScale,
        ...imageInputParams,
        ...layerParams,
        ...accelerationParams,
    };

    if (config.seed !== null) {
        input.seed = config.seed;
    }

    return input;
}

export function buildImageInputParams(
    modelId: string,
    config: ConfigState,
    uploadedImageUrls: string[],
): Record<string, unknown> {
    if (uploadedImageUrls.length === 0) return {};

    const imageConfig = getImageInputConfig(modelId);
    return {
        [imageConfig.paramName]: imageConfig.isArray
            ? uploadedImageUrls
            : uploadedImageUrls[0],
        ...(imageConfig.strengthParam
            ? { [imageConfig.strengthParam]: config.imagePromptStrength }
            : {}),
    };
}
