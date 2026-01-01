/**
 * Model-specific parameter configuration for fal.ai image-to-image models
 *
 * Different models use different parameter naming conventions:
 * - Some use `image_urls` (array), others use `image_url` (string)
 * - Some use `strength`, others use `image_prompt_strength`, some have none
 */

export interface ImageInputConfig {
    /** The parameter name to use for image input */
    paramName: 'image_url' | 'image_urls';
    /** Whether the image parameter expects an array */
    isArray: boolean;
    /** The strength parameter name, or null if not supported */
    strengthParam: 'strength' | 'image_prompt_strength' | null;
}

/**
 * Determine the correct image input configuration based on model ID
 *
 * @param modelId - The fal.ai model endpoint ID (e.g., 'fal-ai/flux-2-pro/edit')
 * @returns Configuration for how to pass image parameters to this model
 *
 * API Parameter Reference (from fal.ai docs):
 *
 * Models using image_urls (array):
 * - flux-2-pro/edit, flux-2/edit, flux-2/flash/edit (multi-reference editors)
 * - qwen-image-edit-2509, qwen-image-edit-2511 (multi-image support)
 *
 * Models using image_url (string) + strength:
 * - flux-lora/image-to-image
 * - flux/dev/image-to-image
 * - qwen-image/image-to-image
 * - qwen-image-edit/image-to-image
 *
 * Models using image_url (string) without strength:
 * - flux-pro/kontext
 * - qwen-image-edit (base, no /image-to-image)
 */
export function getImageInputConfig(modelId: string): ImageInputConfig {
    // Models requiring image_urls (array format)
    // - /edit endpoints: Multi-reference editors like flux-2-pro/edit
    // - qwen-image-edit-25XX: Qwen models with date suffix have multi-image support
    const arrayImageModels = [
        /\/edit$/,
        /qwen-image-edit-25\d{2}/,
    ];

    // Models that don't support strength parameter
    // - /edit endpoints: Use multi-reference editing, no strength control
    // - /kontext: Contextual editing, no strength parameter
    // - qwen-image-edit (base): No strength, use /image-to-image variant for that
    // - qwen-image-edit-25XX: Multi-image models don't have strength
    const noStrengthModels = [
        /\/edit$/,
        /\/kontext$/,
        /qwen-image-edit-25\d{2}/,
        /qwen-image-edit(?!\/image-to-image)/,
    ];

    const usesArray = arrayImageModels.some(pattern => pattern.test(modelId));
    const hasStrength = !noStrengthModels.some(pattern => pattern.test(modelId));

    return {
        paramName: usesArray ? 'image_urls' : 'image_url',
        isArray: usesArray,
        strengthParam: hasStrength ? 'strength' : null,
    };
}
