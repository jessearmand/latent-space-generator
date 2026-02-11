import type React from 'react';
import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { fal } from '@fal-ai/client';
import './App.css';
import { useConfig } from './config';
import { ModelsProvider, useModels } from './contexts/ModelsContext';
import { useServerKeys } from './contexts/ServerKeysContext';
import { useOpenRouterAuth } from './contexts/OpenRouterAuthContext';
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

/** Settings modal with OpenRouter OAuth and server-side API key info */
const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { isAuthenticated, login, logout, isLoading: authLoading, error: authError } = useOpenRouterAuth();

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            className="modal"
            overlayClassName="overlay"
        >
            <div className="modal-header">
                <h3>Settings</h3>
                <button type="button" className="close-btn" onClick={onClose}>X</button>
            </div>
            <p>API keys for fal.ai and OpenAI are configured server-side.</p>

            <div className="auth-settings">
                <h4>OpenRouter (Prompt Optimizer)</h4>
                <p>Sign in with your OpenRouter account to use your own credits for prompt optimization.</p>
                {isAuthenticated ? (
                    <div className="auth-status">
                        <span className="auth-badge connected">Connected</span>
                        <button type="button" className="logout-btn" onClick={logout}>Disconnect</button>
                    </div>
                ) : (
                    <>
                        <button type="button" className="login-btn" onClick={login} disabled={authLoading}>
                            {authLoading ? 'Connecting...' : 'Login with OpenRouter'}
                        </button>
                        {authError && <p className="auth-error">{authError}</p>}
                    </>
                )}
                <p className="auth-note">Without login, the server&apos;s shared API key is used.</p>
            </div>

            <button type="button" className="save-btn" onClick={onClose}>Close</button>
        </Modal>
    );
};

const AppContent: React.FC = () => {
    const [promptText, setPromptText] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    // Audio/video file upload state
    const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
    const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);

    const config = useConfig();
    const { serverKeys, isLoaded: serverKeysLoaded } = useServerKeys();
    const { userApiKey: openRouterUserKey } = useOpenRouterAuth();
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
        activeTab,
        uploadedImages,
        config,
        setStatus,
        serverKeys,
        serverKeysLoaded,
        openRouterUserKey,
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
                <h1>Latent Space Generator</h1>
                <button type="button" className="settings-btn" onClick={() => setIsModalOpen(true)}>Settings</button>
            </header>

            <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

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
