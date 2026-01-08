import type React from 'react';
import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import TextareaAutosize from 'react-textarea-autosize';
import { fal } from '@fal-ai/client';
import './App.css';
import { useConfig } from './config';
import { ModelsProvider, useModels } from './contexts/ModelsContext';
import { ModelSelector } from './components/ModelSelector';
import { ModelConfigPanel } from './components/ModelConfigPanel';
import { PromptOptimizer } from './components/PromptOptimizer';
import { GenerationTabs, type GenerationMode } from './components/GenerationTabs';
import { ImageUploadZone } from './components/ImageUploadZone';
import { DownloadButton } from './components/DownloadButton';
import type { ModelConfig } from './types/models';
import { generateOpenAIImage, base64ToDataUrl, type OpenAIImageParams } from './services/openai';
import { parseFalError } from './services/errors';
import { getImageInputConfig } from './services/modelParams';

const AppContent: React.FC = () => {
    // OpenAI API key for GPT models (passed as payload parameter, not for auth)
    const [openaiApiKey, setOpenaiApiKey] = useState<string>(localStorage.getItem('OPENAI_API_KEY') || '');
    const [promptText, setPromptText] = useState<string>('');
    // Support multiple output images (e.g., qwen-image-layered returns layers)
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    // Support multiple input images (e.g., flux-2-pro/edit supports up to 9)
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<GenerationMode>('text-to-image');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [statusType, setStatusType] = useState<'info' | 'error' | 'success'>('info');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isOpenaiApiKeyVisible, setIsOpenaiApiKeyVisible] = useState<boolean>(false);

    // Helper to set status with type
    const setStatus = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
        setStatusMessage(message);
        setStatusType(type);
    };

    const config = useConfig();
    const { selectedModel, isLoading: modelsLoading } = useModels();

    // Configure fal client to use proxy (API key is server-side)
    useEffect(() => {
        fal.config({
            proxyUrl: '/api/fal/proxy',
        });
        console.log('Fal client configured with proxy');
    }, []);

    // Handle image previews for multiple files
    useEffect(() => {
        if (uploadedImages.length > 0) {
            const newPreviews = uploadedImages.map(file => URL.createObjectURL(file));
            setImagePreviews(newPreviews);
            // Cleanup: revoke object URLs when dependencies change
            return () => {
                for (const url of newPreviews) {
                    URL.revokeObjectURL(url);
                }
            };
        } else {
            setImagePreviews([]);
        }
    }, [uploadedImages]);

    // Auto-switch tab when selected model's category changes
    useEffect(() => {
        if (selectedModel) {
            const modelCategory = selectedModel.category;
            if (modelCategory === 'text-to-image' || modelCategory === 'image-to-image') {
                setActiveTab(modelCategory);
            }
        }
    }, [selectedModel]);

    // Handle tab change
    const handleTabChange = (tab: GenerationMode) => {
        setActiveTab(tab);
        // Keep uploaded image (ignored during T2I generation)
    };

    // Function to generate image using fal-ai queue methods
    const generateImage = async (prompt: string, model: ModelConfig) => {
        if (!prompt) {
            setStatus('Please enter a text prompt.', 'error');
            console.error('Prompt text is empty. Cannot generate image.');
            return;
        }

        const modelId = model.endpointId;
        const modelName = model.displayName;
        const isGptModel = modelId.includes('gpt-image');
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

        let input: Record<string, unknown> | undefined;

        // GPT models use direct OpenAI API calls (not through fal.ai)
        if (isGptModel) {
            if (!openaiApiKey) {
                setStatus('OPENAI_API_KEY is required for GPT Image models.', 'error');
                console.error('OPENAI_API_KEY is missing for GPT Image model.');
                setIsGenerating(false);
                return;
            }

            try {
                setStatus(`Generating image with OpenAI ${modelName}...`);

                // Map model endpoint to OpenAI model name
                let openaiModel: OpenAIImageParams['model'] = 'gpt-image-1.5';
                if (modelId.includes('gpt-image-1-mini')) {
                    openaiModel = 'gpt-image-1-mini';
                } else if (modelId.includes('gpt-image-1') && !modelId.includes('gpt-image-1.5')) {
                    openaiModel = 'gpt-image-1';
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

                const response = await generateOpenAIImage(openaiApiKey, params);

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
        // Uses pattern matching to determine correct parameter format per model
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

        input = {
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
                    const logMessages = logs?.map((log) => log.message).join(', ') || 'Processing...';
                    setStatus(`Request is ${statusResult.status}: ${logMessages}`);
                    console.log(`Status logs: ${logMessages}`);
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
    };

    // Set up Modal for accessibility
    Modal.setAppElement('#root');

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>fal.ai Image Generator</h1>
                <button type="button" className="settings-btn" onClick={() => setIsModalOpen(true)}>Settings</button>
            </header>

            <Modal
                isOpen={isModalOpen}
                onRequestClose={() => setIsModalOpen(false)}
                className="modal"
                overlayClassName="overlay"
            >
                <div className="modal-header">
                    <h3>Settings</h3>
                    <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>X</button>
                </div>
                <p>
                    The FAL API key is configured server-side. Only OpenAI key is needed for GPT models.
                </p>
                <div className="api-key-settings">
                    <div className="form-group api-key-group">
                        <label htmlFor="openai-api-key">OpenAI API Key (required for GPT models):</label>
                        <div className="api-key-container">
                            <input
                                id="openai-api-key"
                                type={isOpenaiApiKeyVisible ? 'text' : 'password'}
                                value={openaiApiKey}
                                onChange={(e) => setOpenaiApiKey(e.target.value)}
                                placeholder="Enter your OPENAI_API_KEY"
                                className="api-key-input"
                            />
                            <button
                                type="button"
                                className="visibility-toggle"
                                onClick={() => setIsOpenaiApiKeyVisible(!isOpenaiApiKeyVisible)}
                            >
                                {isOpenaiApiKeyVisible ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    className="save-btn"
                    onClick={() => {
                        localStorage.setItem('OPENAI_API_KEY', openaiApiKey);
                        setStatus('Settings saved.', 'success');
                        setIsModalOpen(false);
                    }}
                >
                    Save and Close
                </button>
            </Modal>

            <p className="app-description">
                {activeTab === 'text-to-image'
                    ? 'Select a model and enter a text prompt to generate an image.'
                    : 'Upload an image and enter a prompt to transform it.'}
            </p>

            <div className="input-section">
                <GenerationTabs
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    disabled={isGenerating}
                />

                <ModelSelector filterByCategory={activeTab} />

                {activeTab === 'image-to-image' && selectedModel && (
                    <ImageUploadZone
                        uploadedImages={uploadedImages}
                        imagePreviews={imagePreviews}
                        onImagesChange={setUploadedImages}
                        maxImages={getImageInputConfig(selectedModel.endpointId).maxImages}
                        disabled={isGenerating}
                    />
                )}

                <ModelConfigPanel
                    selectedModel={selectedModel}
                    activeTab={activeTab}
                />

                <PromptOptimizer
                    originalPrompt={promptText}
                    onPromptOptimized={(optimized) => setPromptText(optimized)}
                />

                <label htmlFor="prompt-input">Enter your prompt:</label>
                <TextareaAutosize
                    id="prompt-input"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder={activeTab === 'text-to-image'
                        ? 'A surreal photo of...'
                        : 'Transform the image into...'}
                    minRows={3}
                    maxRows={10}
                    className="prompt-textarea"
                    disabled={isGenerating}
                />

                <button
                    type="button"
                    className="generate-btn"
                    onClick={() => selectedModel && generateImage(promptText, selectedModel)}
                    disabled={!selectedModel || modelsLoading || isGenerating}
                >
                    {isGenerating ? 'Generating...' : modelsLoading ? 'Loading models...' : 'Generate Image'}
                </button>
            </div>

            <div className="output-section">
                {imageUrls.length === 1 && (
                    <div className="image-container">
                        <div className="image-header">
                            <h3>Generated Image</h3>
                            <DownloadButton url={imageUrls[0]} />
                        </div>
                        <img src={imageUrls[0]} alt="Generated result" className="generated-image" />
                    </div>
                )}
                {imageUrls.length > 1 && (
                    <div className="image-container">
                        <h3>Generated Layers ({imageUrls.length})</h3>
                        <div className="layer-gallery">
                            {imageUrls.map((url, idx) => (
                                <div key={url} className="layer-item">
                                    <div className="layer-header">
                                        <span className="layer-label">Layer {idx + 1}</span>
                                        <DownloadButton url={url} />
                                    </div>
                                    <img src={url} alt={`Layer ${idx + 1}`} className="layer-image" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <p className={`status-message ${statusType}`}>{statusMessage}</p>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ModelsProvider>
            <AppContent />
        </ModelsProvider>
    );
};

export default App;
