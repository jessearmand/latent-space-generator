/**
 * Model-specific parameter configuration for fal.ai models that take image input.
 *
 * Originally written for image-to-image; now also covers image-to-video and
 * reference-to-video models so that `InputSection` has a single source of truth
 * for how many image slots `ImageUploadZone` should expose.
 *
 * Different models use different parameter naming conventions:
 * - Some use `image_urls` (array), others use `image_url` (string)
 * - Some use `strength`, others use `image_prompt_strength`, some have none
 * - Some support multiple input images (up to 9 for seedance reference-to-video)
 *
 * Notes on video coverage:
 * - Seedance i2v exposes 2 slots: slot[0] -> `image_url`, slot[1] -> `end_image_url`.
 *   The `paramName` here stays `'image_url'` (singular) because that's what the
 *   primary slot maps to; the hook handles `end_image_url` separately.
 * - Seedance r2v exposes up to 9 slots: all -> `image_urls` (array of URLs).
 */

export interface ImageInputConfig {
    /** The parameter name to use for image input */
    paramName: 'image_url' | 'image_urls';
    /** Whether the image parameter expects an array */
    isArray: boolean;
    /** The strength parameter name, or null if not supported */
    strengthParam: 'strength' | 'image_prompt_strength' | null;
    /** Maximum number of images supported (1 for single image, higher for multi-image models) */
    maxImages: number;
}

/**
 * Determine the correct image input configuration based on model ID
 *
 * @param modelId - The fal.ai model endpoint ID (e.g., 'fal-ai/flux-2-pro/edit')
 * @returns Configuration for how to pass image parameters to this model
 *
 * API Parameter Reference (from fal.ai docs):
 *
 * Models using image_urls (array) - multi-image support:
 * - flux-2-pro/edit, flux-2/edit, flux-2/flash/edit (up to 8 reference images)
 * - qwen-image-edit-2509, qwen-image-edit-2511 (multi-image support)
 * - qwen-image-edit-plus (multi-image support)
 * - wan/v2.6/image-to-image and other wan image models
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
 * - qwen-image-layered
 */
export function getImageInputConfig(modelId: string): ImageInputConfig {
    // Models requiring image_urls (array format) - support multiple images
    // - /edit endpoints: Multi-reference editors like flux-2-pro/edit (up to 8 images)
    // - qwen-image-edit-25XX: Qwen models with date suffix have multi-image support
    // - qwen-image-edit-plus: Multi-image support
    // - wan image models: Support multiple reference images
    const arrayImageModels = [
        /\/edit$/,
        /qwen-image-edit-25\d{2}/,
        /qwen-image-edit-plus/,
        /wan.*\/image-to-image/,
        /wan.*image(?!-to-video)/i,
    ];

    // Models that don't support strength parameter
    // - /edit endpoints: Use multi-reference editing, no strength control
    // - /kontext: Contextual editing, no strength parameter
    // - qwen-image-edit (base): No strength, use /image-to-image variant for that
    // - qwen-image-edit-25XX: Multi-image models don't have strength
    // - qwen-image-edit-plus: No strength parameter
    // - qwen-image-layered: Layer decomposition model, no transformation strength
    // - wan models: No strength parameter for image-to-image
    const noStrengthModels = [
        /\/edit$/,
        /\/kontext$/,
        /qwen-image-edit-25\d{2}/,
        /qwen-image-edit-plus/,
        /qwen-image-edit(?!\/image-to-image)/,
        /qwen-image-layered/,
        /wan.*\/image-to-image/,
        /wan.*image(?!-to-video)/i,
    ];

    // Models that support many images
    // Note: fal.ai docs say "up to 9 images" but API counts each image as 1 MP minimum,
    // and the 9 MP limit includes output. With 9 images + 1 MP output = 10 MP > 9 MP limit.
    // Limit to 8 images to stay within the 9 MP budget (8 input + 1 output = 9 MP).
    const manyImagesModels = [/flux-2-pro\/edit/, /flux-2\/edit/, /flux-2\/flash\/edit/];

    // Video model overrides (Seedance 2.0)
    // - reference-to-video: array of up to 9 reference images
    // - image-to-video: single primary `image_url`, but a 2nd slot maps to `end_image_url`
    //   in the hook, so we expose 2 upload slots while keeping paramName='image_url'.
    const lower = modelId.toLowerCase();
    const isSeedance = lower.includes('seedance-2');
    if (isSeedance && lower.includes('reference-to-video')) {
        return {
            paramName: 'image_urls',
            isArray: true,
            strengthParam: null,
            maxImages: 9,
        };
    }
    if (isSeedance && lower.includes('image-to-video')) {
        return {
            paramName: 'image_url',
            isArray: false,
            strengthParam: null,
            maxImages: 2,
        };
    }

    const usesArray = arrayImageModels.some((pattern) => pattern.test(modelId));
    const hasStrength = !noStrengthModels.some((pattern) => pattern.test(modelId));
    const supportsManyImages = manyImagesModels.some((pattern) => pattern.test(modelId));

    // Determine max images: 8 for flux edit models, 4 for other array models, 1 for single
    let maxImages = 1;
    if (supportsManyImages) {
        maxImages = 8;
    } else if (usesArray) {
        maxImages = 4; // Reasonable default for multi-image models
    }

    return {
        paramName: usesArray ? 'image_urls' : 'image_url',
        isArray: usesArray,
        strengthParam: hasStrength ? 'strength' : null,
        maxImages,
    };
}
