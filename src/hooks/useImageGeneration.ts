import { useState, useCallback } from 'react';
import { fal } from '@fal-ai/client';
import type { GenerationMode } from '../components/GenerationTabs';
import type { ModelConfig } from '../types/models';
import type { ConfigState } from '../config';
import { generateOpenAIImage, base64ToDataUrl, type OpenAIImageParams } from '../services/openai';
import { parseFalError } from '../services/errors';
import { getImageInputConfig } from '../services/modelParams';
import { sanitizeLogMessage } from '../utils/logSanitizer';
import type { StatusType } from './useStatusMessage';

export interface UseImageGenerationParams {
    activeTab: GenerationMode;
    uploadedImages: File[];
    config: ConfigState;
    setStatus: (message: string, type?: StatusType) => void;
}

export interface UseImageGenerationReturn {
    imageUrls: string[];
    isGenerating: boolean;
    generateImage: (prompt: string, model: ModelConfig) => Promise<void>;
    clearImages: () => void;
}

/**
 * Hook for image generation using fal.ai and OpenAI APIs.
 * Handles queue submission, polling, and result extraction.
 */
export function useImageGeneration({
    activeTab,
    uploadedImages,
    config,
    setStatus,
}: UseImageGenerationParams): UseImageGenerationReturn {
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const generateImage = useCallback(async (prompt: string, model: ModelConfig) => {
        if (!prompt) {
            setStatus('Please enter a text prompt.', 'error');
            console.error('Prompt text is empty. Cannot generate image.');
            return;
        }

        const modelId = model.endpointId;
        const modelName = model.displayName;
        const isGptModel = modelId.includes('gpt-image') || modelId.includes('gpt-5-image');
        const isGrokModel = modelId.includes('grok-imagine-image');
        const supportsImageInput = model.supportsImageInput;

        // For image-to-image mode, require at least one uploaded image
        if (activeTab === 'image-to-image' && supportsImageInput && uploadedImages.length === 0) {
            setStatus('Please upload an image for image-to-image generation.', 'error');
            return;
        }

        setIsGenerating(true);
        console.log(`Generating image with model: ${modelName}`);

        setStatus(`Submitting request for image generation using ${modelName}...`);
        console.log(`Submitting request for model: ${modelName}, prompt: ${prompt.substring(0, 50)}...`);

        // Grok Imagine models use fal.ai queue with specific parameters
        if (isGrokModel) {
            setStatus(`Generating image with ${modelName}...`);

            // Build Grok-specific input
            const grokInput: Record<string, unknown> = {
                prompt,
                num_images: config.grokNumImages,
                output_format: config.grokOutputFormat,
            };

            // Add aspect ratio (Grok has unique options)
            if (config.aspectRatio) {
                grokInput.aspect_ratio = config.aspectRatio;
            }

            // For image editing mode, add image_url
            if (activeTab === 'image-to-image' && supportsImageInput && uploadedImages.length > 0) {
                try {
                    setStatus(`Uploading image for ${modelName}...`);
                    const uploadedUrl = await fal.storage.upload(uploadedImages[0]);
                    grokInput.image_url = uploadedUrl;
                    console.log('Image uploaded for Grok:', uploadedUrl);
                    setStatus(`Image uploaded. Submitting request for ${modelName}...`);
                } catch (uploadError: unknown) {
                    const errorMsg = `Error uploading image: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                    setStatus(errorMsg, 'error');
                    console.error(errorMsg);
                    setIsGenerating(false);
                    return;
                }
            }

            try {
                console.log(`Grok input sent to API:`, grokInput);

                const submitResult = await fal.queue.submit(modelId, {
                    input: grokInput,
                });
                const requestId = submitResult.request_id;
                console.log(`Grok request submitted. Request ID: ${requestId}`);
                setStatus(`Request submitted. Request ID: ${requestId}. Waiting for completion...`);

                // Poll until complete
                while (true) {
                    const statusResult = await fal.queue.status(modelId, {
                        requestId,
                        logs: true,
                    });
                    console.log(`Grok status update for request ID ${requestId}:`, statusResult.status);
                    if (statusResult.status === "IN_QUEUE" || statusResult.status === "IN_PROGRESS") {
                        const logs = (statusResult as { logs?: Array<{ message: string }> }).logs;
                        const latestLog = sanitizeLogMessage(logs?.length ? logs[logs.length - 1].message : '');
                        setStatus(`Request is ${statusResult.status}: ${latestLog}`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else if (statusResult.status === "COMPLETED") {
                        const result = await fal.queue.result(modelId, { requestId });
                        console.log(`Grok request completed. Full result:`, result);
                        if (result.data.images?.length > 0) {
                            const urls = result.data.images.map((img: { url: string }) => img.url);
                            console.log(`${urls.length} Grok image(s) received:`, urls);
                            setImageUrls(urls);
                            setStatus(`Image generated successfully using ${modelName}!`, 'success');
                        } else {
                            setStatus('Image generation failed. No image URL found in result.', 'error');
                            console.error('No image URL in Grok result:', result);
                        }
                        break;
                    } else {
                        const status = (statusResult as { status: string }).status;
                        setStatus(`Request failed with status: ${status}`, 'error');
                        console.error(`Grok request failed with status ${status}:`, statusResult);
                        break;
                    }
                }
            } catch (error: unknown) {
                console.error('Grok image generation error:', error);
                const parsedError = parseFalError(error);
                const rawMessage = error instanceof Error ? error.message : String(error);
                if (rawMessage.includes("401") || rawMessage.includes("Unauthorized")) {
                    setStatus('Authentication failed. Please check your API key.', 'error');
                } else {
                    setStatus(parsedError, 'error');
                }
            } finally {
                setIsGenerating(false);
            }
            return; // Exit early for Grok models
        }

        // GPT models use direct OpenAI API calls (not through fal.ai)
        // API key is injected server-side by the proxy
        if (isGptModel) {
            try {
                setStatus(`Generating image with OpenAI ${modelName}...`);

                // Map model endpoint to OpenAI model name
                let openaiModel: OpenAIImageParams['model'] = 'gpt-5-image';
                if (modelId.includes('gpt-5-image-mini') || modelId.includes('gpt-image-1-mini')) {
                    openaiModel = 'gpt-5-image-mini';
                } else if (modelId.includes('gpt-image-1.5')) {
                    openaiModel = 'gpt-5-image';  // Map old 1.5 to new 5
                } else if (modelId.includes('gpt-image-1') && !modelId.includes('gpt-image-1.5')) {
                    openaiModel = 'gpt-5-image-mini';  // Map old 1 to mini
                }

                const params: OpenAIImageParams = {
                    prompt,
                    model: openaiModel,
                    size: config.gptImageSize as OpenAIImageParams['size'],
                    quality: config.gptQuality as OpenAIImageParams['quality'],
                    background: config.gptBackground as OpenAIImageParams['background'],
                    n: config.gptNumImages,
                    output_format: 'png',
                };

                console.log(`Calling OpenAI directly with params:`, params);

                const response = await generateOpenAIImage(params);

                if (response.data?.[0]?.b64_json) {
                    const dataUrl = base64ToDataUrl(response.data[0].b64_json, 'png');
                    console.log(`OpenAI image generated successfully`);
                    setImageUrls([dataUrl]);
                    setStatus(`Image generated successfully using ${modelName}!`, 'success');

                    if (response.usage) {
                        console.log(`Token usage - Input: ${response.usage.input_tokens}, Output: ${response.usage.output_tokens}, Total: ${response.usage.total_tokens}`);
                    }
                } else {
                    setStatus('OpenAI response missing image data', 'error');
                    console.error('OpenAI response missing image data', response);
                }
            } catch (error: unknown) {
                const errorMsg = `OpenAI error: ${error instanceof Error ? error.message : String(error)}`;
                setStatus(errorMsg, 'error');
                console.error(errorMsg, error);
            } finally {
                setIsGenerating(false);
            }

            return; // Exit early for GPT models - don't use fal.ai queue
        }

        // Get image input configuration for this model
        const imageConfig = getImageInputConfig(modelId);
        const uploadedImageUrls: string[] = [];

        // For other models (Flux, etc.), handle image upload if supported
        if (supportsImageInput && uploadedImages.length > 0) {
            try {
                const imageCount = uploadedImages.length;
                setStatus(`Uploading ${imageCount} image${imageCount > 1 ? 's' : ''} for ${modelName}...`);

                // Upload all images in parallel
                const uploadPromises = uploadedImages.map(file => fal.storage.upload(file));
                const uploadResults = await Promise.all(uploadPromises);
                uploadedImageUrls.push(...uploadResults);

                console.log(`${imageCount} image(s) uploaded successfully:`, uploadedImageUrls);
                setStatus(`Image${imageCount > 1 ? 's' : ''} uploaded. Submitting request for ${modelName}...`);
            } catch (uploadError: unknown) {
                const errorMsg = `Error uploading image: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                setStatus(errorMsg, 'error');
                console.error(errorMsg);
                setIsGenerating(false);
                return;
            }
        }

        // Build image input params based on model type
        const imageInputParams = supportsImageInput && uploadedImageUrls.length > 0
            ? {
                [imageConfig.paramName]: imageConfig.isArray
                    ? uploadedImageUrls  // Pass all URLs as array
                    : uploadedImageUrls[0],  // Pass first URL as string
                ...(imageConfig.strengthParam
                    ? { [imageConfig.strengthParam]: config.imagePromptStrength }
                    : {}),
            }
            : {};

        // Build model-specific params
        const isQwenLayered = modelId.includes('qwen-image-layered');
        const isQwenModel = modelId.includes('qwen-image');

        // Qwen Image Layered specific params
        const layerParams = isQwenLayered ? {
            num_layers: config.numLayers,
        } : {};

        // Acceleration is available for multiple Qwen models
        const accelerationParams = isQwenModel ? {
            acceleration: config.acceleration,
        } : {};

        const input = {
            prompt,
            safety_tolerance: config.safetyTolerance,
            aspect_ratio: config.aspectRatio,
            image_size: config.imageSize,
            raw: config.raw,
            enable_safety_checker: config.enableSafetyChecker,
            seed: config.seed,
            guidance_scale: config.guidanceScale,
            ...imageInputParams,
            ...layerParams,
            ...accelerationParams,
        };

        try {
            // Log the input being sent to the API for debugging
            console.log(`Input sent to API for model ${modelName}:`, input);

            // Step 1: Submit the request and get request ID
            const submitResult = await fal.queue.submit(modelId, {
                input: input,
            });
            const requestId = submitResult.request_id;
            console.log(`Request submitted successfully. Request ID: ${requestId}`);
            setStatus(`Request submitted. Request ID: ${requestId}. Waiting for completion...`);

            // Step 2: Poll status until not "IN_QUEUE" or "IN_PROGRESS"
            while (true) {
                const statusResult = await fal.queue.status(modelId, {
                    requestId,
                    logs: true,
                });
                console.log(`Status update for request ID ${requestId}:`, statusResult.status);
                if (statusResult.status === "IN_QUEUE" || statusResult.status === "IN_PROGRESS") {
                    const logs = (statusResult as { logs?: Array<{ message: string }> }).logs;
                    const latestLog = sanitizeLogMessage(logs?.length ? logs[logs.length - 1].message : '');
                    setStatus(`Request is ${statusResult.status}: ${latestLog}`);
                    console.log(`Status logs:`, logs?.map((log) => log.message));
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else if (statusResult.status === "COMPLETED") {
                    const result = await fal.queue.result(modelId, {
                        requestId,
                    });
                    console.log(`Request completed. Full result:`, result);
                    if (result.data.images?.length > 0) {
                        // Handle multi-image response (e.g., qwen-image-layered returns layers)
                        const urls = result.data.images.map((img: { url: string }) => img.url);
                        console.log(`${urls.length} image(s) received:`, urls);
                        setImageUrls(urls);
                        const layerMsg = urls.length > 1 ? ` (${urls.length} layers)` : '';
                        setStatus(`Image generated successfully using ${modelName}!${layerMsg}`, 'success');
                    } else {
                        setStatus('Image generation failed. No image URL found in result.', 'error');
                        console.error('No image URL in result:', result);
                    }
                    break;
                } else {
                    // Handle unexpected status (e.g., FAILED or unknown)
                    const status = (statusResult as { status: string }).status;
                    setStatus(`Request failed with status: ${status}`, 'error');
                    console.error(`Request failed with status ${status}:`, statusResult);
                    break;
                }
            }
        } catch (error: unknown) {
            console.error('Image generation error:', error);

            // Parse the error to get a user-friendly message
            const parsedError = parseFalError(error);

            // Check for authentication errors
            const rawMessage = error instanceof Error ? error.message : String(error);
            if (rawMessage.includes("401") || rawMessage.includes("Unauthorized")) {
                console.error("Authentication error detected. The API key may be invalid or not applied correctly.");
                setStatus('Authentication failed. Please check your API key.', 'error');
            } else {
                setStatus(parsedError, 'error');
            }
        } finally {
            setIsGenerating(false);
        }
    }, [activeTab, uploadedImages, config, setStatus]);

    const clearImages = useCallback(() => {
        setImageUrls([]);
    }, []);

    return {
        imageUrls,
        isGenerating,
        generateImage,
        clearImages,
    };
}
