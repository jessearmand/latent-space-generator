import type React from 'react';
import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { fal } from '@fal-ai/client';
import './App.css';
import { useConfig } from './config';
import { ModelsProvider, useModels } from './contexts/ModelsContext';
import { ModelSelector } from './components/ModelSelector';
import { ModelConfigPanel } from './components/ModelConfigPanel';
import type { ModelConfig } from './types/models';
import { generateOpenAIImage, base64ToDataUrl, type OpenAIImageParams } from './services/openai';

const AppContent: React.FC = () => {
    // OpenAI API key for GPT models (passed as payload parameter, not for auth)
    const [openaiApiKey, setOpenaiApiKey] = useState<string>(localStorage.getItem('OPENAI_API_KEY') || '');
    const [promptText, setPromptText] = useState<string>('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isOpenaiApiKeyVisible, setIsOpenaiApiKeyVisible] = useState<boolean>(false);

    const config = useConfig();
    const { selectedModel, isLoading: modelsLoading } = useModels();

    // Configure fal client to use proxy (API key is server-side)
    useEffect(() => {
        fal.config({
            proxyUrl: '/api/fal/proxy',
        });
        console.log('Fal client configured with proxy');
    }, []);

    // Handle image preview
    useEffect(() => {
        if (uploadedImage) {
            const previewUrl = URL.createObjectURL(uploadedImage);
            setImagePreview(previewUrl);
            return () => URL.revokeObjectURL(previewUrl);
        } else {
            setImagePreview(null);
        }
    }, [uploadedImage]);

    // Function to generate image using fal-ai queue methods
    const generateImage = async (prompt: string, model: ModelConfig) => {
        if (!prompt) {
            setStatusMessage('Error: Please enter a text prompt.');
            console.error('Prompt text is empty. Cannot generate image.');
            return;
        }

        const modelId = model.endpointId;
        const modelName = model.displayName;
        const isGptModel = modelId.includes('gpt-image');
        const supportsImageInput = model.supportsImageInput;

        console.log(`Generating image with model: ${modelName}`);

        setStatusMessage(`Submitting request for image generation using ${modelName}...`);
        console.log(`Submitting request for model: ${modelName}, prompt: ${prompt.substring(0, 50)}...`);

        let input: Record<string, unknown> | undefined;
        let uploadedImageUrl: string | null = null;

        // GPT models use direct OpenAI API calls (not through fal.ai)
        if (isGptModel) {
            if (!openaiApiKey) {
                setStatusMessage('Error: OPENAI_API_KEY is required for GPT Image models.');
                console.error('OPENAI_API_KEY is missing for GPT Image model.');
                return;
            }

            try {
                setStatusMessage(`Generating image with OpenAI ${modelName}...`);

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
                    setImageUrl(dataUrl);
                    setStatusMessage(`Image generated successfully using ${modelName}!`);

                    if (response.usage) {
                        console.log(`Token usage - Input: ${response.usage.input_tokens}, Output: ${response.usage.output_tokens}, Total: ${response.usage.total_tokens}`);
                    }
                } else {
                    const errorMsg = `Error: OpenAI response missing image data`;
                    setStatusMessage(errorMsg);
                    console.error(errorMsg, response);
                }
            } catch (error: unknown) {
                const errorMsg = `OpenAI error: ${error instanceof Error ? error.message : String(error)}`;
                setStatusMessage(errorMsg);
                console.error(errorMsg, error);
            }

            return; // Exit early for GPT models - don't use fal.ai queue
        }

        // For other models (Flux, etc.), handle image upload if supported
        if (supportsImageInput && uploadedImage) {
            try {
                setStatusMessage(`Uploading image for ${modelName}...`);
                const uploadResult = await fal.storage.upload(uploadedImage);
                uploadedImageUrl = uploadResult;
                console.log(`Image uploaded successfully. URL: ${uploadedImageUrl}`);
                setStatusMessage(`Image uploaded. Submitting request for ${modelName}...`);
            } catch (uploadError: unknown) {
                const errorMsg = `Error uploading image: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                setStatusMessage(errorMsg);
                console.error(errorMsg);
                return;
            }
            console.log(`Uploaded image URL type and value:`, typeof uploadedImageUrl, uploadedImageUrl);
        }

        input = {
            prompt,
            safety_tolerance: config.safetyTolerance,
            aspect_ratio: config.aspectRatio,
            image_size: config.imageSize,
            raw: config.raw,
            enable_safety_checker: config.enableSafetyChecker,
            seed: config.seed,
            guidance_scale: config.guidanceScale,
            ...(supportsImageInput && uploadedImageUrl ? { image_url: uploadedImageUrl, image_prompt_strength: config.imagePromptStrength } : {})
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
            setStatusMessage(`Request submitted. Request ID: ${requestId}. Waiting for completion...`);

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
                    setStatusMessage(`Request is ${statusResult.status}: ${logMessages}`);
                    console.log(`Status logs: ${logMessages}`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else if (statusResult.status === "COMPLETED") {
                    const result = await fal.queue.result(modelId, {
                        requestId,
                    });
                    console.log(`Request completed. Full result:`, result);
                    if (result.data.images?.[0]?.url) {
                        const imageUrl = result.data.images[0].url;
                        console.log(`Image URL received: ${imageUrl}`);
                        setImageUrl(imageUrl);
                        setStatusMessage(`Image generated successfully using ${modelName}!`);
                    } else {
                        const errorMsg = `Error: Image generation failed. No image URL found in result. Full result: ${JSON.stringify(result)}`;
                        setStatusMessage(errorMsg);
                        console.error(errorMsg);
                    }
                    break;
                } else {
                    // Handle unexpected status (e.g., FAILED or unknown)
                    const status = (statusResult as { status: string }).status;
                    const errorMsg = `Error: Request failed with status ${status}.`;
                    setStatusMessage(errorMsg);
                    console.error(errorMsg, statusResult);
                    break;
                }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            const errorMsg = `An error occurred during image generation: ${message}`;
            setStatusMessage(errorMsg);
            console.error(errorMsg, error);
            if (message.includes("401") || message.includes("Unauthorized")) {
                console.error("Authentication error detected. The API key may be invalid or not applied correctly.");
                setStatusMessage(`${errorMsg} (Likely invalid API key or authentication issue)`);
            } else {
                console.error("Other error occurred. Check network tab for details.");
            }
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
                        setStatusMessage('Settings saved.');
                        setIsModalOpen(false);
                    }}
                >
                    Save and Close
                </button>
            </Modal>

            <p className="app-description">
                Select a model and enter a text prompt to generate an image.
            </p>

            <div className="input-section">
                <ModelSelector />

                <ModelConfigPanel
                    selectedModel={selectedModel}
                    uploadedImage={uploadedImage}
                    imagePreview={imagePreview}
                    onImageChange={setUploadedImage}
                />

                <label htmlFor="prompt-input">Enter your prompt:</label>
                <textarea
                    id="prompt-input"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="A surreal photo of..."
                    rows={3}
                    className="prompt-textarea"
                />

                <button
                    type="button"
                    className="generate-btn"
                    onClick={() => selectedModel && generateImage(promptText, selectedModel)}
                    disabled={!selectedModel || modelsLoading}
                >
                    {modelsLoading ? 'Loading models...' : 'Generate Image'}
                </button>
            </div>

            <div className="output-section">
                {imageUrl && (
                    <div className="image-container">
                        <h3>Generated Image</h3>
                        <img src={imageUrl} alt="Generated result" className="generated-image" />
                    </div>
                )}
                <p className="status-message">{statusMessage}</p>
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
