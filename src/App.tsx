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
import { Sidebar } from './components/Sidebar';
import { isVideoMode, isAudioMode, requiresImageInput, requiresVideoInput, requiresAudioInput } from './components/GenerationTabs';
import { ImageUploadZone } from './components/ImageUploadZone';
import { AudioUploadZone } from './components/AudioUploadZone';
import { VideoUploadZone } from './components/VideoUploadZone';
import { DownloadButton } from './components/DownloadButton';
import { VideoPlayer } from './components/VideoPlayer';
import { AudioPlayer } from './components/AudioPlayer';
import { getImageInputConfig } from './services/modelParams';
import {
    useStatusMessage,
    useImageUpload,
    useGenerationTabs,
    useImageGeneration,
    useVideoGeneration,
    useAudioGeneration,
} from './hooks';

const AppContent: React.FC = () => {
    // OpenAI API key for GPT models (passed as payload parameter, not for auth)
    const [openaiApiKey, setOpenaiApiKey] = useState<string>(localStorage.getItem('OPENAI_API_KEY') || '');
    const [promptText, setPromptText] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isOpenaiApiKeyVisible, setIsOpenaiApiKeyVisible] = useState<boolean>(false);

    // Audio/video file upload state
    const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
    const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);

    const config = useConfig();
    const { selectedModel, selectedVideoModel, selectedAudioModel, isLoading: modelsLoading } = useModels();

    // Custom hooks for separated concerns
    const { statusMessage, statusType, setStatus } = useStatusMessage();
    const { uploadedImages, imagePreviews, setUploadedImages } = useImageUpload();
    const { activeTab, handleTabChange } = useGenerationTabs(selectedModel);

    // Use the appropriate selected model based on active mode
    const currentSelectedModel = isAudioMode(activeTab)
        ? selectedAudioModel
        : isVideoMode(activeTab)
        ? selectedVideoModel
        : selectedModel;

    // Image generation hook
    const {
        imageUrls,
        isGenerating: isGeneratingImage,
        generateImage,
    } = useImageGeneration({
        openaiApiKey,
        activeTab,
        uploadedImages,
        config,
        setStatus,
    });

    // Video generation hook
    const {
        videoUrl,
        isGenerating: isGeneratingVideo,
        generateVideo,
    } = useVideoGeneration({
        activeTab,
        uploadedImages,
        config,
        setStatus,
    });

    // Audio generation hook
    const {
        audioUrl,
        isGenerating: isGeneratingAudio,
        generateAudio,
    } = useAudioGeneration({
        activeTab,
        uploadedAudioFile,
        uploadedVideoFile,
        config,
        setStatus,
    });

    const isGenerating = isGeneratingImage || isGeneratingVideo || isGeneratingAudio;

    // Configure fal client to use proxy (API key is server-side)
    useEffect(() => {
        fal.config({
            proxyUrl: '/api/fal/proxy',
        });
        console.log('Fal client configured with proxy');
    }, []);

    // Handler for the generate button - routes to image, video, or audio generation
    const handleGenerate = () => {
        if (!currentSelectedModel) return;

        if (isAudioMode(activeTab)) {
            generateAudio(promptText, currentSelectedModel);
        } else if (isVideoMode(activeTab)) {
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

            <div className="app-layout">
                <Sidebar
                    activeMode={activeTab}
                    onModeChange={handleTabChange}
                    disabled={isGenerating}
                />

                <main className="app-main">
                    <p className="app-description">
                        {activeTab === 'text-to-image' && 'Select a model and enter a text prompt to generate an image.'}
                        {activeTab === 'image-to-image' && 'Upload an image and enter a prompt to transform it.'}
                        {activeTab === 'text-to-video' && 'Select a model and enter a text prompt to generate a video.'}
                        {activeTab === 'image-to-video' && 'Upload an image and enter a prompt to animate it.'}
                        {activeTab === 'video-to-video' && 'Upload a video and enter a prompt to transform it.'}
                        {activeTab === 'text-to-speech' && 'Enter text to convert to speech.'}
                        {activeTab === 'text-to-audio' && 'Enter a prompt to generate music or sound effects.'}
                        {activeTab === 'audio-to-audio' && 'Upload an audio file and enter text for voice cloning.'}
                        {activeTab === 'video-to-audio' && 'Upload a video to generate synced audio.'}
                    </p>

                    <div className="input-section">
                        <ModelSelector filterByCategory={activeTab} />

                        {/* Image upload for image-to-image and image-to-video modes */}
                        {requiresImageInput(activeTab) && currentSelectedModel && (
                            <ImageUploadZone
                                uploadedImages={uploadedImages}
                                imagePreviews={imagePreviews}
                                onImagesChange={setUploadedImages}
                                maxImages={activeTab === 'image-to-video' ? 1 : getImageInputConfig(currentSelectedModel.endpointId).maxImages}
                                disabled={isGenerating}
                            />
                        )}

                        {/* Video upload for video-to-video and video-to-audio modes */}
                        {requiresVideoInput(activeTab) && currentSelectedModel && (
                            <VideoUploadZone
                                uploadedFile={uploadedVideoFile}
                                onFileChange={setUploadedVideoFile}
                                disabled={isGenerating}
                            />
                        )}

                        {/* Audio upload for audio-to-audio mode */}
                        {requiresAudioInput(activeTab) && currentSelectedModel && (
                            <AudioUploadZone
                                uploadedFile={uploadedAudioFile}
                                onFileChange={setUploadedAudioFile}
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

                        <label htmlFor="prompt-input">
                            {isAudioMode(activeTab) && (activeTab === 'text-to-speech' || activeTab === 'audio-to-audio')
                                ? 'Enter your text:'
                                : 'Enter your prompt:'}
                        </label>
                        <TextareaAutosize
                            id="prompt-input"
                            value={promptText}
                            onChange={(e) => setPromptText(e.target.value)}
                            placeholder={
                                activeTab === 'text-to-image' ? 'A surreal photo of...' :
                                activeTab === 'image-to-image' ? 'Transform the image into...' :
                                activeTab === 'text-to-video' ? 'A cinematic scene of...' :
                                activeTab === 'image-to-video' ? 'Animate this image with...' :
                                activeTab === 'video-to-video' ? 'Transform this video into...' :
                                activeTab === 'text-to-speech' ? 'Hello, welcome to the presentation...' :
                                activeTab === 'text-to-audio' ? 'Upbeat electronic music with drums...' :
                                activeTab === 'audio-to-audio' ? 'Text for the cloned voice to speak...' :
                                'Describe the sounds for this video...'
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
                                : isAudioMode(activeTab)
                                ? 'Generate Audio'
                                : isVideoMode(activeTab)
                                ? 'Generate Video'
                                : 'Generate Image'}
                        </button>
                    </div>

                    <div className="output-section">
                        {/* Audio output */}
                        {audioUrl && (
                            <AudioPlayer src={audioUrl} title="Generated Audio" />
                        )}

                        {/* Video output */}
                        {videoUrl && !audioUrl && (
                            <div className="video-container">
                                <h3>Generated Video</h3>
                                <VideoPlayer src={videoUrl} />
                            </div>
                        )}

                        {/* Single image output */}
                        {imageUrls.length === 1 && !videoUrl && !audioUrl && (
                            <div className="image-container">
                                <div className="image-header">
                                    <h3>Generated Image</h3>
                                    <DownloadButton url={imageUrls[0]} />
                                </div>
                                <img src={imageUrls[0]} alt="Generated result" className="generated-image" />
                            </div>
                        )}

                        {/* Multiple images (layers) output */}
                        {imageUrls.length > 1 && !videoUrl && !audioUrl && (
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
                </main>
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
