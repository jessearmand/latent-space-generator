/**
 * Type definitions for fal.ai model data
 * Based on the Models API: GET https://api.fal.ai/v1/models
 */

/** Model categories for image generation */
export type ImageModelCategory = 'text-to-image' | 'image-to-image';

/** Model categories for video generation */
export type VideoModelCategory = 'text-to-video' | 'image-to-video' | 'video-to-video';

/** Model categories for audio generation */
export type AudioModelCategory =
    | 'text-to-speech'
    | 'text-to-audio'
    | 'audio-to-audio'
    | 'video-to-audio';

/** All generation categories (used for navigation and filtering) */
export type GenerationCategory = ImageModelCategory | VideoModelCategory | AudioModelCategory;

/** All supported model categories */
export type ModelCategory = GenerationCategory | string;

/** Output type for generation results */
export type OutputType = 'image' | 'video' | 'audio';

/** Model status from API */
export type ModelStatus = 'active' | 'deprecated';

/** Model metadata from API response */
export interface ModelMetadata {
    display_name?: string;
    category?: ModelCategory;
    description?: string;
    status?: ModelStatus;
    tags?: string[];
    updated_at?: string;
    is_favorited?: boolean | null;
    thumbnail_url?: string;
    model_url?: string;
    date?: string;
    highlighted?: boolean;
    pinned?: boolean;
}

/** Model data from API response */
export interface FalModel {
    endpoint_id: string;
    metadata?: ModelMetadata;
    openapi?: object | { error: string };
}

/** API response for GET /v1/models */
export interface ModelsApiResponse {
    models: FalModel[];
    next_cursor: string | null;
    has_more: boolean;
}

/** Query parameters for GET /v1/models */
export interface ModelsQueryParams {
    limit?: number;
    cursor?: string;
    endpoint_id?: string | string[];
    q?: string;
    category?: ModelCategory;
    status?: ModelStatus;
    expand?: 'openapi-3.0' | string[];
}

/** Normalized model for internal use */
export interface ModelConfig {
    endpointId: string;
    displayName: string;
    category: ModelCategory;
    description: string;
    supportsImageInput: boolean;
    outputType: OutputType;
    thumbnailUrl?: string;
}

/**
 * Generate display name from endpoint ID
 * Removes 'fal-ai/' prefix and preserves the rest of the path
 * e.g., 'fal-ai/flux-2/lora/edit' → 'flux-2/lora/edit'
 *       'bria/text-to-image/3.2' → 'bria/text-to-image/3.2'
 */
function formatDisplayName(endpointId: string): string {
    // Remove 'fal-ai/' prefix if present
    if (endpointId.startsWith('fal-ai/')) {
        return endpointId.slice(7); // 'fal-ai/'.length === 7
    }
    return endpointId;
}

/** Determine output type based on category */
function getOutputType(category: ModelCategory): OutputType {
    if (
        category === 'text-to-video' ||
        category === 'image-to-video' ||
        category === 'video-to-video'
    ) {
        return 'video';
    }
    if (
        category === 'text-to-speech' ||
        category === 'text-to-audio' ||
        category === 'audio-to-audio' ||
        category === 'video-to-audio'
    ) {
        return 'audio';
    }
    return 'image';
}

/** Determine if model supports image input based on category */
function getSupportsImageInput(category: ModelCategory): boolean {
    return category === 'image-to-image' || category === 'image-to-video';
}

/** Determine if model supports video input based on category */
export function getSupportsVideoInput(category: ModelCategory): boolean {
    return category === 'video-to-video' || category === 'video-to-audio';
}

/** Determine if model supports audio input based on category */
export function getSupportsAudioInput(category: ModelCategory): boolean {
    return category === 'audio-to-audio';
}

/** Convert API model to internal ModelConfig */
export function normalizeModel(model: FalModel): ModelConfig {
    const metadata = model.metadata || {};
    const category = metadata.category || 'text-to-image';

    return {
        endpointId: model.endpoint_id,
        displayName: formatDisplayName(model.endpoint_id),
        category,
        description: metadata.description || '',
        supportsImageInput: getSupportsImageInput(category),
        outputType: getOutputType(category),
        thumbnailUrl: metadata.thumbnail_url,
    };
}
