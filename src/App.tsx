import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import Modal from 'react-modal';
import TextareaAutosize from 'react-textarea-autosize';
import { fal } from '@fal-ai/client';
import './App.css';
import { useConfig } from './config';
import { ModelsProvider, useModels } from './contexts/ModelsContext';
import { ModelSelector } from './components/ModelSelector';
import { ModelConfigPanel } from './components/ModelConfigPanel';
import { PromptOptimizer } from './components/PromptOptimizer';
import { GenerationTabs, type GenerationMode, isVideoMode, requiresImageInput, isValidGenerationMode } from './components/GenerationTabs';
import { ImageUploadZone } from './components/ImageUploadZone';
import { DownloadButton } from './components/DownloadButton';
import { VideoPlayer } from './components/VideoPlayer';
import type { ModelConfig } from './types/models';
import { generateOpenAIImage, base64ToDataUrl, type OpenAIImageParams } from './services/openai';
import { parseFalError } from './services/errors';
import { getImageInputConfig } from './services/modelParams';

/** Storage key for active tab */
const ACTIVE_TAB_KEY = 'fal_active_tab';

/** Get initial active tab from localStorage */
function getInitialActiveTab(): GenerationMode {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY);
    if (saved && isValidGenerationMode(saved)) {
        return saved;
    }
    return 'text-to-image';
}

const AppContent: React.FC = () => {
    // OpenAI API key for GPT models (passed as payload parameter, not for auth)
    const [openaiApiKey, setOpenaiApiKey] = useState<string>(localStorage.getItem('OPENAI_API_KEY') || '');
    const [promptText, setPromptText] = useState<string>('');
    // Support multiple output images (e.g., qwen-image-layered returns layers)
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    // Video output URL
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    // Support multiple input images (e.g., flux-2-pro/edit supports up to 9)
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<GenerationMode>(getInitialActiveTab);
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
    const { selectedModel, selectedVideoModel, isLoading: modelsLoading } = useModels();

    // Use the appropriate selected model based on active tab
    const currentSelectedModel = isVideoMode(activeTab) ? selectedVideoModel : selectedModel;

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

    // Track previous selected model to detect user-initiated changes vs initial load
    const prevSelectedModelRef = useRef<ModelConfig | null>(null);

    // Auto-switch tab when selected model's category changes
    // Only triggers when user manually changes model selection (not on initial load)
    useEffect(() => {
        // Skip if this is the initial load (selectedModel going from null to a value)
        // Only auto-switch when changing from one model to another
        if (prevSelectedModelRef.current === null && selectedModel !== null) {
            // Initial load - don't auto-switch, just record the model
            prevSelectedModelRef.current = selectedModel;
            return;
        }

        // Skip if model hasn't actually changed
        if (prevSelectedModelRef.current?.endpointId === selectedModel?.endpointId) {
            return;
        }

        prevSelectedModelRef.current = selectedModel;

        if (selectedModel) {
            const modelCategory = selectedModel.category;
            // Handle both image and video model categories
            if (modelCategory === 'text-to-image' || modelCategory === 'image-to-image' ||
                modelCategory === 'text-to-video' || modelCategory === 'image-to-video') {
                setActiveTab(modelCategory as GenerationMode);
            }
        }
    }, [selectedModel]);

    // Persist active tab to localStorage
    useEffect(() => {
        localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
    }, [activeTab]);

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
                    const latestLog = logs?.length ? logs[logs.length - 1].message : 'Processing...';
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
    };

    // Function to generate video using fal-ai queue methods
    const generateVideo = async (prompt: string, model: ModelConfig) => {
        if (!prompt) {
            setStatus('Please enter a text prompt.', 'error');
            console.error('Prompt text is empty. Cannot generate video.');
            return;
        }

        const modelId = model.endpointId;
        const modelName = model.displayName;
        const isImageToVideo = activeTab === 'image-to-video';

        // For image-to-video mode, require an uploaded image
        if (isImageToVideo && uploadedImages.length === 0) {
            setStatus('Please upload an image for image-to-video generation.', 'error');
            return;
        }

        setIsGenerating(true);
        setVideoUrl(null); // Clear previous video
        console.log(`Generating video with model: ${modelName}`);

        setStatus(`Submitting request for video generation using ${modelName}...`);
        console.log(`Submitting request for model: ${modelName}, prompt: ${prompt.substring(0, 50)}...`);

        let uploadedImageUrl: string | undefined;

        // For image-to-video, upload the image first
        if (isImageToVideo && uploadedImages.length > 0) {
            try {
                setStatus(`Uploading image for ${modelName}...`);
                uploadedImageUrl = await fal.storage.upload(uploadedImages[0]);
                console.log('Image uploaded successfully:', uploadedImageUrl);
                setStatus(`Image uploaded. Submitting request for ${modelName}...`);
            } catch (uploadError: unknown) {
                const errorMsg = `Error uploading image: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                setStatus(errorMsg, 'error');
                console.error(errorMsg);
                setIsGenerating(false);
                return;
            }
        }

        // Build video generation input parameters
        // Different models support different parameter names, so we build a flexible input
        const input: Record<string, unknown> = {
            prompt,
        };

        // Add image_url for image-to-video models
        if (isImageToVideo && uploadedImageUrl) {
            input.image_url = uploadedImageUrl;
        }

        // Add duration (parse to number if model expects seconds)
        if (config.videoDuration) {
            // Some models expect "5s", others expect 5
            // Try to handle both by sending both formats
            const durationNum = parseInt(config.videoDuration.replace('s', ''), 10);
            input.duration = durationNum || config.videoDuration;
        }

        // Add aspect ratio
        if (config.videoAspectRatio) {
            input.aspect_ratio = config.videoAspectRatio;
        }

        // Add resolution if supported
        if (config.videoResolution) {
            input.resolution = config.videoResolution;
        }

        // Model detection for specific parameters
        const modelIdLower = modelId.toLowerCase();
        const isKlingModel = modelIdLower.includes('kling');
        const isVeoModel = modelIdLower.includes('veo');
        const isLtx19bModel = modelIdLower.includes('ltx-2-19b');  // 19B version has more params
        const isLtxProFastModel = modelIdLower.includes('ltx-2') && !modelIdLower.includes('ltx-2-19b');
        const isLtxModel = modelIdLower.includes('ltx-2');  // Any LTX-2 model
        const supportsAudio = isVeoModel || isLtxModel;
        // Guidance scale: ltx-2-19b has it, but veo, ltx-2 Pro/Fast, and kling don't
        const supportsGuidanceScale = isLtx19bModel || (!isVeoModel && !isLtxProFastModel && !isKlingModel);

        // Add CFG scale for Kling models (0-1 range)
        if (isKlingModel) {
            input.cfg_scale = config.videoCfgScale;
        }

        // Add guidance scale only for models that support it
        if (supportsGuidanceScale && config.videoGuidanceScale > 0) {
            input.guidance_scale = config.videoGuidanceScale;
        }

        // Add generate_audio for veo and ltx-2 models
        if (supportsAudio) {
            input.generate_audio = config.generateAudio;
        }

        // LTX-2 19B specific parameters
        if (isLtx19bModel) {
            input.num_frames = config.videoNumFrames;
            input.video_size = config.videoOutputSize;
            input.use_multiscale = config.videoUseMultiscale;
            input.num_inference_steps = config.videoNumInferenceSteps;
            input.acceleration = config.videoAcceleration;
            input.enable_prompt_expansion = config.videoEnablePromptExpansion;

            // Camera LoRA only if not 'none'
            if (config.videoCameraLora !== 'none') {
                input.camera_lora = config.videoCameraLora;
                input.camera_lora_scale = config.videoCameraLoraScale;
            }

            // LTX-2 19B doesn't use duration/resolution - uses num_frames and video_size instead
            delete input.duration;
            delete input.resolution;
        }

        // Add seed if set
        if (config.videoSeed !== null) {
            input.seed = config.videoSeed;
        }

        // Add negative prompt if set
        if (config.videoNegativePrompt) {
            input.negative_prompt = config.videoNegativePrompt;
        }

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
                    const latestLog = logs?.length ? logs[logs.length - 1].message : 'Processing...';
                    setStatus(`Request is ${statusResult.status}: ${latestLog}`);
                    console.log(`Status logs:`, logs?.map((log) => log.message));
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Longer poll interval for video
                } else if (statusResult.status === "COMPLETED") {
                    const result = await fal.queue.result(modelId, {
                        requestId,
                    });
                    console.log(`Request completed. Full result:`, result);

                    // Video response can have different structures:
                    // - result.data.video.url (most common)
                    // - result.data.video (direct URL string)
                    // - result.data.videos[0].url (array format)
                    const data = result.data as Record<string, unknown>;
                    let videoResultUrl: string | undefined;

                    if (data.video) {
                        if (typeof data.video === 'string') {
                            videoResultUrl = data.video;
                        } else if (typeof data.video === 'object' && data.video !== null) {
                            const videoObj = data.video as { url?: string };
                            videoResultUrl = videoObj.url;
                        }
                    } else if (Array.isArray(data.videos) && data.videos.length > 0) {
                        const firstVideo = data.videos[0] as { url?: string } | string;
                        videoResultUrl = typeof firstVideo === 'string' ? firstVideo : firstVideo.url;
                    }

                    if (videoResultUrl) {
                        console.log(`Video generated successfully:`, videoResultUrl);
                        setVideoUrl(videoResultUrl);
                        setImageUrls([]); // Clear any previous images
                        setStatus(`Video generated successfully using ${modelName}!`, 'success');
                    } else {
                        setStatus('Video generation failed. No video URL found in result.', 'error');
                        console.error('No video URL in result:', result);
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
            console.error('Video generation error:', error);

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

    // Handler for the generate button - routes to image or video generation
    const handleGenerate = () => {
        if (!currentSelectedModel) return;

        if (isVideoMode(activeTab)) {
            generateVideo(promptText, currentSelectedModel);
        } else {
            generateImage(promptText, currentSelectedModel);
        }
    };

    // Set up Modal for accessibility
    Modal.setAppElement('#root');

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>fal.ai Generator</h1>
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
                {activeTab === 'text-to-image' && 'Select a model and enter a text prompt to generate an image.'}
                {activeTab === 'image-to-image' && 'Upload an image and enter a prompt to transform it.'}
                {activeTab === 'text-to-video' && 'Select a model and enter a text prompt to generate a video.'}
                {activeTab === 'image-to-video' && 'Upload an image and enter a prompt to animate it.'}
            </p>

            <div className="input-section">
                <GenerationTabs
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    disabled={isGenerating}
                />

                <ModelSelector filterByCategory={activeTab} />

                {requiresImageInput(activeTab) && currentSelectedModel && (
                    <ImageUploadZone
                        uploadedImages={uploadedImages}
                        imagePreviews={imagePreviews}
                        onImagesChange={setUploadedImages}
                        maxImages={activeTab === 'image-to-video' ? 1 : getImageInputConfig(currentSelectedModel.endpointId).maxImages}
                        disabled={isGenerating}
                    />
                )}

                <ModelConfigPanel
                    selectedModel={currentSelectedModel}
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
                    placeholder={
                        activeTab === 'text-to-image' ? 'A surreal photo of...' :
                        activeTab === 'image-to-image' ? 'Transform the image into...' :
                        activeTab === 'text-to-video' ? 'A cinematic scene of...' :
                        'Animate this image with...'
                    }
                    minRows={3}
                    maxRows={10}
                    className="prompt-textarea"
                    disabled={isGenerating}
                />

                <button
                    type="button"
                    className="generate-btn"
                    onClick={handleGenerate}
                    disabled={!currentSelectedModel || modelsLoading || isGenerating}
                >
                    {isGenerating
                        ? 'Generating...'
                        : modelsLoading
                        ? 'Loading models...'
                        : isVideoMode(activeTab)
                        ? 'Generate Video'
                        : 'Generate Image'}
                </button>
            </div>

            <div className="output-section">
                {/* Video output */}
                {videoUrl && (
                    <div className="video-container">
                        <h3>Generated Video</h3>
                        <VideoPlayer src={videoUrl} />
                    </div>
                )}

                {/* Single image output */}
                {imageUrls.length === 1 && !videoUrl && (
                    <div className="image-container">
                        <div className="image-header">
                            <h3>Generated Image</h3>
                            <DownloadButton url={imageUrls[0]} />
                        </div>
                        <img src={imageUrls[0]} alt="Generated result" className="generated-image" />
                    </div>
                )}

                {/* Multiple images (layers) output */}
                {imageUrls.length > 1 && !videoUrl && (
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
