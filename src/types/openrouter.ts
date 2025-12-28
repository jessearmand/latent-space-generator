/**
 * TypeScript interfaces for OpenRouter API model data
 * Based on GET /api/v1/models/user response
 */

export interface OpenRouterModelPricing {
    prompt: string;
    completion: string;
    request?: string;
    image?: string;
    image_token?: string;
    image_output?: string;
    audio?: string;
    input_audio_cache?: string;
    web_search?: string;
    internal_reasoning?: string;
    input_cache_read?: string;
    input_cache_write?: string;
    discount?: number;
}

export interface OpenRouterModelArchitecture {
    modality: string | null;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string;
}

export interface OpenRouterModelTopProvider {
    context_length: number | null;
    max_completion_tokens: number | null;
    is_moderated: boolean;
}

export interface OpenRouterModel {
    id: string;
    canonical_slug?: string;
    hugging_face_id?: string;
    name: string;
    /** Derived from model ID prefix (e.g., "google" from "google/gemini-3") */
    group?: string;
    created?: number;
    description?: string;
    pricing: OpenRouterModelPricing;
    context_length?: number;
    architecture: OpenRouterModelArchitecture;
    top_provider: OpenRouterModelTopProvider;
    per_request_limits?: object | null;
    supported_parameters?: string[];
    default_parameters?: object | null;
}

/**
 * Extract provider name from model ID
 * e.g., "google/gemini-3-flash" -> "google"
 * Returns the raw provider name without formatting
 */
export function getProviderFromId(modelId: string): string {
    return modelId.split("/")[0] || "unknown";
}

export interface OpenRouterModelsResponse {
    data: OpenRouterModel[];
}

/**
 * Model group options for filtering
 * Based on OpenRouter's model categorization
 */
export type OpenRouterModelGroup =
    | "Router"
    | "Media"
    | "Other"
    | "GPT"
    | "Claude"
    | "Gemini"
    | "Grok"
    | "Cohere"
    | "Nova"
    | "Qwen"
    | "Yi"
    | "DeepSeek"
    | "Mistral"
    | "Llama2"
    | "Llama3"
    | "Llama4"
    | "PaLM"
    | "RWKV"
    | "Qwen3";

/**
 * Filter state for model selection
 */
export interface OpenRouterModelFilters {
    /** Filter by provider (derived from model ID) */
    provider?: string | null;
    search?: string;
    textOnly?: boolean;
    /** Minimum context length filter */
    minContextLength?: number | null;
    /** Minimum max_completion_tokens filter (output capacity) */
    minMaxCompletionTokens?: number | null;
    /** Filter by moderation status */
    isModerated?: boolean | null;
}

/**
 * Check if a model supports text output
 */
export function isTextOutputModel(model: OpenRouterModel): boolean {
    return model.architecture.output_modalities.includes("text");
}

/**
 * Filter models by criteria
 */
export function filterModels(
    models: OpenRouterModel[],
    filters: OpenRouterModelFilters
): OpenRouterModel[] {
    return models.filter((model) => {
        // Filter by provider (derived from model ID)
        if (filters.provider) {
            const modelProvider = getProviderFromId(model.id);
            if (modelProvider !== filters.provider) {
                return false;
            }
        }

        // Filter by search term
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matchesName = model.name.toLowerCase().includes(searchLower);
            const matchesId = model.id.toLowerCase().includes(searchLower);
            if (!matchesName && !matchesId) {
                return false;
            }
        }

        // Filter by text output capability
        if (filters.textOnly && !isTextOutputModel(model)) {
            return false;
        }

        // Filter by minimum context length
        if (filters.minContextLength != null) {
            const contextLength = model.top_provider?.context_length ?? 0;
            if (contextLength < filters.minContextLength) {
                return false;
            }
        }

        // Filter by minimum max_completion_tokens (output capacity)
        if (filters.minMaxCompletionTokens != null) {
            const maxTokens = model.top_provider?.max_completion_tokens ?? 0;
            if (maxTokens < filters.minMaxCompletionTokens) {
                return false;
            }
        }

        // Filter by moderation status
        if (filters.isModerated != null) {
            const isModerated = model.top_provider?.is_moderated ?? false;
            if (isModerated !== filters.isModerated) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Get unique providers from a list of models (derived from model ID)
 */
export function getUniqueProviders(models: OpenRouterModel[]): string[] {
    const providers = new Set<string>();
    for (const model of models) {
        providers.add(getProviderFromId(model.id));
    }
    return Array.from(providers).sort();
}
