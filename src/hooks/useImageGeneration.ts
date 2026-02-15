import { useState, useCallback } from 'react';
import { fal } from '@fal-ai/client';
import type { GenerationMode } from '../components/GenerationTabs';
import type { ModelConfig } from '../types/models';
import type { ConfigState } from '../config';
import type { ServerKeys } from '../contexts/ServerKeysContext';
import { isGptImageModel, isGeminiImageModel } from '../services/imageModels';
import { parseFalError } from '../services/errors';
import { submitAndPollFalQueue } from '../services/falQueue';
import {
    buildGrokImageInput,
    buildGenericImageInput,
    buildImageInputParams,
} from '../services/imageInputBuilders';
import { routeGeminiImage, routeGptImage } from '../services/imageRouting';
import type { StatusType } from './useStatusMessage';

export interface UseImageGenerationParams {
    activeTab: GenerationMode;
    uploadedImages: File[];
    config: ConfigState;
    setStatus: (message: string, type?: StatusType) => void;
    serverKeys: ServerKeys;
    serverKeysLoaded: boolean;
    openRouterUserKey: string | null;
}

export interface UseImageGenerationReturn {
    imageUrls: string[];
    isGenerating: boolean;
    generateImage: (prompt: string, model: ModelConfig) => Promise<void>;
    clearImages: () => void;
}

async function uploadImages(
    files: File[],
    modelName: string,
    setStatus: (message: string, type?: StatusType) => void,
): Promise<string[]> {
    const imageCount = files.length;
    setStatus(`Uploading ${imageCount} image${imageCount > 1 ? 's' : ''} for ${modelName}...`);
    const uploadPromises = files.map(file => fal.storage.upload(file));
    const uploadResults = await Promise.all(uploadPromises);
    console.log(`${imageCount} image(s) uploaded successfully:`, uploadResults);
    setStatus(`Image${imageCount > 1 ? 's' : ''} uploaded. Submitting request for ${modelName}...`);
    return uploadResults;
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
    serverKeys,
    serverKeysLoaded,
    openRouterUserKey,
}: UseImageGenerationParams): UseImageGenerationReturn {
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const generateImage = useCallback(async (prompt: string, model: ModelConfig) => {
        if (!prompt) {
            setStatus('Please enter a text prompt.', 'error');
            console.error('Prompt text is empty. Cannot generate image.');
            return;
        }

        if (!serverKeysLoaded) {
            setStatus('Waiting for server configuration...', 'error');
            console.warn('generateImage called before server keys loaded');
            return;
        }

        const modelId = model.endpointId;
        const modelName = model.displayName;
        const isGptModel = isGptImageModel(modelId);
        const isGrokModel = modelId.includes('grok-imagine-image');
        const isGeminiModel = isGeminiImageModel(modelId);
        const supportsImageInput = model.supportsImageInput;

        if (activeTab === 'image-to-image' && supportsImageInput && uploadedImages.length === 0) {
            setStatus('Please upload an image for image-to-image generation.', 'error');
            return;
        }

        setIsGenerating(true);
        setImageUrls([]); // Clear previous images
        console.log(`Generating image with model: ${modelName}`);
        setStatus(`Submitting request for image generation using ${modelName}...`);
        console.log(`Submitting request for model: ${modelName}, prompt: ${prompt.substring(0, 50)}...`);

        // Grok Imagine models — fal.ai queue only
        if (isGrokModel) {
            setStatus(`Generating image with ${modelName}...`);

            // Upload image for edit mode
            let imageUrl: string | undefined;
            if (activeTab === 'image-to-image' && supportsImageInput && uploadedImages.length > 0) {
                try {
                    setStatus(`Uploading image for ${modelName}...`);
                    imageUrl = await fal.storage.upload(uploadedImages[0]);
                    console.log('Image uploaded for Grok:', imageUrl);
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
                const grokInput = buildGrokImageInput(prompt, config, imageUrl);
                console.log(`Grok input sent to API:`, grokInput);

                const result = await submitAndPollFalQueue({
                    modelId,
                    input: grokInput,
                    onStatus: (msg) => setStatus(msg),
                });

                const images = result.data.images as Array<{ url: string }> | undefined;
                if (images && images.length > 0) {
                    const urls = images.map((img) => img.url);
                    console.log(`${urls.length} Grok image(s) received:`, urls);
                    setImageUrls(urls);
                    setStatus(`Image generated successfully using ${modelName}!`, 'success');
                } else {
                    setStatus('Image generation failed. No image URL found in result.', 'error');
                    console.error('No image URL in Grok result:', result);
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
            return;
        }

        // Gemini image models — cascading routing: fal.ai -> OpenRouter
        if (isGeminiModel) {
            // Upload images for edit mode (only needed for fal.ai route)
            let geminiImageUrls: string[] | undefined;
            if (activeTab === 'image-to-image' && supportsImageInput && uploadedImages.length > 0 && serverKeys.fal) {
                try {
                    setStatus(`Uploading image for ${modelName}...`);
                    const uploadPromises = uploadedImages.map(file => fal.storage.upload(file));
                    geminiImageUrls = await Promise.all(uploadPromises);
                    console.log('Images uploaded for Gemini edit:', geminiImageUrls);
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
                const result = await routeGeminiImage(modelId, modelName, {
                    prompt,
                    config,
                    serverKeys,
                    openRouterUserKey,
                    onStatus: (msg) => setStatus(msg),
                }, geminiImageUrls);

                setImageUrls(result.urls);
                setStatus(`Image generated successfully using ${modelName}!`, 'success');
            } catch (error: unknown) {
                console.error('Gemini image generation error:', error);
                const errorMsg = error instanceof Error ? error.message : String(error);
                // Check if this is a fal.ai error for better formatting
                if (errorMsg.includes('fal.ai') || errorMsg.includes('Request failed with status')) {
                    setStatus(parseFalError(error), 'error');
                } else {
                    setStatus(errorMsg, 'error');
                }
            } finally {
                setIsGenerating(false);
            }
            return;
        }

        // GPT models — cascading routing: OpenAI direct -> fal.ai -> OpenRouter
        if (isGptModel) {
            try {
                const result = await routeGptImage(modelId, modelName, {
                    prompt,
                    config,
                    serverKeys,
                    openRouterUserKey,
                    onStatus: (msg) => setStatus(msg),
                });

                setImageUrls(result.urls);
                setStatus(`Image generated successfully using ${modelName}!`, 'success');
            } catch (error: unknown) {
                console.error('GPT image generation error:', error);
                const errorMsg = error instanceof Error ? error.message : String(error);
                if (errorMsg.includes('fal.ai') || errorMsg.includes('Request failed with status')) {
                    setStatus(parseFalError(error), 'error');
                } else {
                    setStatus(errorMsg, 'error');
                }
            } finally {
                setIsGenerating(false);
            }
            return;
        }

        // Generic models (Flux, Qwen, etc.) — fal.ai queue
        const uploadedImageUrls: string[] = [];

        if (supportsImageInput && uploadedImages.length > 0) {
            try {
                const urls = await uploadImages(uploadedImages, modelName, setStatus);
                uploadedImageUrls.push(...urls);
            } catch (uploadError: unknown) {
                const errorMsg = `Error uploading image: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                setStatus(errorMsg, 'error');
                console.error(errorMsg);
                setIsGenerating(false);
                return;
            }
        }

        const imageInputParams = supportsImageInput && uploadedImageUrls.length > 0
            ? buildImageInputParams(modelId, config, uploadedImageUrls)
            : {};

        const input = buildGenericImageInput(prompt, config, modelId, imageInputParams);

        try {
            console.log(`Input sent to API for model ${modelName}:`, input);

            const result = await submitAndPollFalQueue({
                modelId,
                input,
                onStatus: (msg) => setStatus(msg),
            });

            const images = result.data.images as Array<{ url: string }> | undefined;
            if (images && images.length > 0) {
                const urls = images.map((img) => img.url);
                console.log(`${urls.length} image(s) received:`, urls);
                setImageUrls(urls);
                const layerMsg = urls.length > 1 ? ` (${urls.length} layers)` : '';
                setStatus(`Image generated successfully using ${modelName}!${layerMsg}`, 'success');
            } else {
                setStatus('Image generation failed. No image URL found in result.', 'error');
                console.error('No image URL in result:', result);
            }
        } catch (error: unknown) {
            console.error('Image generation error:', error);
            const parsedError = parseFalError(error);
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
    }, [activeTab, uploadedImages, config, setStatus, serverKeys, serverKeysLoaded, openRouterUserKey]);

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
