import type React from 'react';
import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { fal } from '@fal-ai/client';
import './App.css';
import { useConfig } from './config';
import { ModelsProvider, useModels } from './contexts/ModelsContext';
import { Sidebar } from './components/Sidebar';
import { isVideoMode, isAudioMode } from './components/GenerationTabs';
import { InputSection } from './components/InputSection';
import { OutputSection } from './components/OutputSection';
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
        uploadedVideoFile,
        config,
        setStatus,
    });

    // Audio generation hook
    const {
        audioUrl,
        textOutput,
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
                        {activeTab === 'audio-understanding' && 'Upload an audio file and ask questions about its content.'}
                    </p>

                    <InputSection
                        activeTab={activeTab}
                        currentSelectedModel={currentSelectedModel}
                        uploadedImages={uploadedImages}
                        imagePreviews={imagePreviews}
                        setUploadedImages={setUploadedImages}
                        uploadedVideoFile={uploadedVideoFile}
                        setUploadedVideoFile={setUploadedVideoFile}
                        uploadedAudioFile={uploadedAudioFile}
                        setUploadedAudioFile={setUploadedAudioFile}
                        promptText={promptText}
                        setPromptText={setPromptText}
                        isGenerating={isGenerating}
                        modelsLoading={modelsLoading}
                        handleGenerate={handleGenerate}
                    />

                    <OutputSection
                        audioUrl={audioUrl}
                        textOutput={textOutput}
                        videoUrl={videoUrl}
                        imageUrls={imageUrls}
                        statusMessage={statusMessage}
                        statusType={statusType}
                    />
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
