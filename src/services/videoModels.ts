/**
 * Video models service
 * Provides curated list of popular video models and API fetching for all models
 */

import type { ModelConfig, VideoModelCategory } from '../types/models';

/**
 * Curated list of popular text-to-video models (Updated Jan 2026)
 * Ordered by trending/popularity from fal.ai
 */
export const CURATED_TEXT_TO_VIDEO_MODELS: ModelConfig[] = [
    {
        endpointId: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
        displayName: 'Kling 2.5 Turbo Pro',
        category: 'text-to-video',
        description: 'Top-tier text-to-video with unparalleled motion fluidity and cinematic visuals',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/veo3',
        displayName: 'Veo 3',
        category: 'text-to-video',
        description: "Google's flagship video model with audio generation",
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/veo3/fast',
        displayName: 'Veo 3 Fast',
        category: 'text-to-video',
        description: 'Cost-effective version of Veo 3',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/minimax/hailuo-02/standard/text-to-video',
        displayName: 'MiniMax Hailuo 02',
        category: 'text-to-video',
        description: 'Advanced video generation with 768p resolution',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/kling-video/v2/master/text-to-video',
        displayName: 'Kling 2.0 Master',
        category: 'text-to-video',
        description: 'High-quality video generation with smooth motion',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/hunyuan-video',
        displayName: 'Hunyuan Video',
        category: 'text-to-video',
        description: 'Open source model with high visual quality',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/luma-dream-machine',
        displayName: 'Luma Dream Machine',
        category: 'text-to-video',
        description: 'Generate video clips from text prompts',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/mochi-v1',
        displayName: 'Mochi 1',
        category: 'text-to-video',
        description: 'Open source model with high-fidelity motion',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/ltx-2/text-to-video',
        displayName: 'LTX-2 Pro',
        category: 'text-to-video',
        description: 'High-fidelity video with audio from text, up to 2160p',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/ltx-2/text-to-video/fast',
        displayName: 'LTX-2 Fast',
        category: 'text-to-video',
        description: 'Fast video generation with audio, up to 20s duration',
        supportsImageInput: false,
        outputType: 'video',
    },
];

/**
 * Curated list of popular image-to-video models (Updated Jan 2026)
 * Ordered by trending/popularity from fal.ai
 */
export const CURATED_IMAGE_TO_VIDEO_MODELS: ModelConfig[] = [
    {
        endpointId: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
        displayName: 'Kling 2.5 Turbo Pro I2V',
        category: 'image-to-video',
        description: 'Top-tier image-to-video with cinematic visuals and exceptional precision',
        supportsImageInput: true,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/wan-effects',
        displayName: 'Wan Effects',
        category: 'image-to-video',
        description: 'Generate videos with popular effects from images',
        supportsImageInput: true,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/wan-pro/image-to-video',
        displayName: 'Wan 2.1 Pro',
        category: 'image-to-video',
        description: '1080p videos at 30fps with up to 6 seconds duration',
        supportsImageInput: true,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/wan-25-preview/image-to-video',
        displayName: 'Wan 2.5 Preview',
        category: 'image-to-video',
        description: 'Latest Wan version for image-to-video generation',
        supportsImageInput: true,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/veo2/image-to-video',
        displayName: 'Veo 2 I2V',
        category: 'image-to-video',
        description: 'Creates videos from images with realistic motion',
        supportsImageInput: true,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/minimax/hailuo-2.3/pro/image-to-video',
        displayName: 'MiniMax Hailuo 2.3 Pro',
        category: 'image-to-video',
        description: 'Advanced image-to-video with 1080p resolution',
        supportsImageInput: true,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/minimax/video-01/image-to-video',
        displayName: 'MiniMax Video 01',
        category: 'image-to-video',
        description: 'Generate video clips from images using MiniMax',
        supportsImageInput: true,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/kling-video/v1.6/pro/image-to-video',
        displayName: 'Kling 1.6 Pro',
        category: 'image-to-video',
        description: 'Professional image-to-video generation',
        supportsImageInput: true,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/ltx-2/image-to-video',
        displayName: 'LTX-2 Pro I2V',
        category: 'image-to-video',
        description: 'Transform images into videos with audio, up to 2160p',
        supportsImageInput: true,
        outputType: 'video',
    },
];

/**
 * Curated list of video-to-video models (Updated Jan 2026)
 * For style transfer, frame interpolation, and video enhancement
 */
export const CURATED_VIDEO_TO_VIDEO_MODELS: ModelConfig[] = [
    {
        endpointId: 'fal-ai/ltx-2-19b/video-to-video',
        displayName: 'LTX-2 19B V2V',
        category: 'video-to-video',
        description: 'Transform videos with camera controls and preprocessing',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/wan/v2.2-a14b/video-to-video',
        displayName: 'Wan 2.2 V2V',
        category: 'video-to-video',
        description: 'Transform videos with strength control, supports up to 480 frames',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/hunyuan-video/video-to-video',
        displayName: 'Hunyuan V2V',
        category: 'video-to-video',
        description: 'Style transfer on video with high visual quality',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/fast-animatediff/video-to-video',
        displayName: 'AnimateDiff V2V',
        category: 'video-to-video',
        description: 'Fast style transfer on video clips',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/mmaudio-v2',
        displayName: 'MMAudio V2',
        category: 'video-to-video',
        description: 'Generate synchronized audio from text prompts for videos',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'bria/video/background-removal',
        displayName: 'Bria BG Removal',
        category: 'video-to-video',
        description: 'Remove video backgrounds without green screen',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/lightx/relight',
        displayName: 'LightX Relight',
        category: 'video-to-video',
        description: 'Relight videos with different lighting conditions',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/lightx/recamera',
        displayName: 'LightX Recamera',
        category: 'video-to-video',
        description: 'Change camera angles and movements',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'mirelo-ai/sfx-v1/video-to-video',
        displayName: 'Mirelo SFX V2V',
        category: 'video-to-video',
        description: 'Add synced sounds to video and return video with new audio',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/rife/video',
        displayName: 'RIFE Frame Interpolation',
        category: 'video-to-video',
        description: 'Increase video frame rate with AI interpolation',
        supportsImageInput: false,
        outputType: 'video',
    },
    {
        endpointId: 'fal-ai/luma-dream-machine/ray-2/reframe',
        displayName: 'Luma Ray 2 Reframe',
        category: 'video-to-video',
        description: 'Reframe video to different aspect ratios',
        supportsImageInput: false,
        outputType: 'video',
    },
];

/** All curated video models */
export const CURATED_VIDEO_MODELS: ModelConfig[] = [
    ...CURATED_TEXT_TO_VIDEO_MODELS,
    ...CURATED_IMAGE_TO_VIDEO_MODELS,
    ...CURATED_VIDEO_TO_VIDEO_MODELS,
];

/**
 * Get curated video models, optionally filtered by category
 */
export function getCuratedVideoModels(category?: VideoModelCategory): ModelConfig[] {
    if (!category) {
        return CURATED_VIDEO_MODELS;
    }

    if (category === 'text-to-video') {
        return CURATED_TEXT_TO_VIDEO_MODELS;
    }

    if (category === 'image-to-video') {
        return CURATED_IMAGE_TO_VIDEO_MODELS;
    }

    if (category === 'video-to-video') {
        return CURATED_VIDEO_TO_VIDEO_MODELS;
    }

    return [];
}

/**
 * Filter models by search query (case-insensitive)
 * Matches against displayName and endpointId
 */
export function filterModelsByQuery(models: ModelConfig[], query: string): ModelConfig[] {
    if (!query.trim()) {
        return models;
    }

    const lowerQuery = query.toLowerCase().trim();

    return models.filter(model =>
        model.displayName.toLowerCase().includes(lowerQuery) ||
        model.endpointId.toLowerCase().includes(lowerQuery)
    );
}
