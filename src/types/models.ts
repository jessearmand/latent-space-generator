/**
 * Type definitions for fal.ai model data
 * Based on the Models API: GET https://api.fal.ai/v1/models
 */

/** Model categories for image generation */
export type ImageModelCategory = 'text-to-image' | 'image-to-image';

/** All supported model categories */
export type ModelCategory = ImageModelCategory | 'image-to-video' | 'video-to-video' | string;

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
    thumbnailUrl?: string;
}

/** Convert API model to internal ModelConfig */
export function normalizeModel(model: FalModel): ModelConfig {
    const metadata = model.metadata || {};
    const category = metadata.category || 'text-to-image';

    return {
        endpointId: model.endpoint_id,
        displayName: metadata.display_name || model.endpoint_id,
        category,
        description: metadata.description || '',
        supportsImageInput: category === 'image-to-image',
        thumbnailUrl: metadata.thumbnail_url,
    };
}
