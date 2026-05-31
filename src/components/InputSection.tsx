import type React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import type { GenerationMode } from './GenerationTabs';
import { isAudioMode, isVideoMode, requiresImageInput, requiresVideoInput, requiresAudioInput } from './GenerationTabs';
import type { ModelConfig } from '../types/models';
import { ModelSelector } from './ModelSelector';
import { ModelConfigPanel } from './ModelConfigPanel';
import { PromptOptimizer } from './PromptOptimizer';
import { ImageUploadZone } from './ImageUploadZone';
import { VideoUploadZone } from './VideoUploadZone';
import { AudioUploadZone } from './AudioUploadZone';
import { getImageInputConfig } from '../services/modelParams';
import { isSeedanceImageToVideoModel } from '../services/videoModels';

export interface InputSectionProps {
    activeTab: GenerationMode;
    currentSelectedModel: ModelConfig | null;
    uploadedImages: File[];
    imagePreviews: string[];
    setUploadedImages: (files: File[]) => void;
    uploadedVideoFile: File | null;
    setUploadedVideoFile: (file: File | null) => void;
    uploadedAudioFile: File | null;
    setUploadedAudioFile: (file: File | null) => void;
    promptText: string;
    setPromptText: (text: string) => void;
    isGenerating: boolean;
    modelsLoading: boolean;
    handleGenerate: () => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
    activeTab,
    currentSelectedModel,
    uploadedImages,
    imagePreviews,
    setUploadedImages,
    uploadedVideoFile,
    setUploadedVideoFile,
    uploadedAudioFile,
    setUploadedAudioFile,
    promptText,
    setPromptText,
    isGenerating,
    modelsLoading,
    handleGenerate,
}) => {
    const getPlaceholder = (): string => {
        switch (activeTab) {
            case 'text-to-image':
                return 'A surreal photo of...';
            case 'image-to-image':
                return 'Transform the image into...';
            case 'text-to-video':
                return 'A cinematic scene of...';
            case 'image-to-video':
                return 'Animate this image with...';
            case 'video-to-video':
                return 'Transform this video into...';
            case 'reference-to-video':
                return 'Use @Image1, @Image2... in your prompt to reference uploaded images';
            case 'text-to-speech':
                return 'Hello, welcome to the presentation...';
            case 'text-to-audio':
                return 'Upbeat electronic music with drums...';
            case 'audio-to-audio':
                return 'Text for the cloned voice to speak...';
            case 'video-to-audio':
                return 'Describe the sounds for this video...';
            case 'audio-understanding':
                return 'What topics are discussed in this audio?';
            default:
                return 'Enter your prompt...';
        }
    };

    const getGenerateButtonText = (): string => {
        if (isGenerating) return 'Generating...';
        if (modelsLoading) return 'Loading models...';
        if (activeTab === 'audio-understanding') return 'Analyze Audio';
        if (isAudioMode(activeTab)) return 'Generate Audio';
        if (isVideoMode(activeTab)) return 'Generate Video';
        return 'Generate Image';
    };

    const getInputLabel = (): string => {
        if (activeTab === 'audio-understanding') {
            return 'Enter your question about the audio:';
        }
        if (isAudioMode(activeTab) && (activeTab === 'text-to-speech' || activeTab === 'audio-to-audio')) {
            return 'Enter your text:';
        }
        return 'Enter your prompt:';
    };

    return (
        <div className="input-section">
            <ModelSelector filterByCategory={activeTab} />

            {/* Image upload for image-to-image, image-to-video, and reference-to-video modes.
                `getImageInputConfig` is the single source of truth for slot count across all
                three modes (i2i, i2v, r2v). Seedance i2v exposes 2 slots (start + end frame);
                seedance r2v exposes up to 9 reference image slots. */}
            {requiresImageInput(activeTab) && currentSelectedModel && (
                <>
                    <ImageUploadZone
                        uploadedImages={uploadedImages}
                        imagePreviews={imagePreviews}
                        onImagesChange={setUploadedImages}
                        maxImages={getImageInputConfig(currentSelectedModel.endpointId).maxImages}
                        disabled={isGenerating}
                    />
                    {activeTab === 'image-to-video' && isSeedanceImageToVideoModel(currentSelectedModel.endpointId) && (
                        <p className="upload-caption">
                            First image is the start frame. The optional second image is used as the end frame for a
                            transition.
                        </p>
                    )}
                    {activeTab === 'reference-to-video' && (
                        <p className="upload-caption">
                            Reference images are addressable as @Image1, @Image2, … in the prompt.
                        </p>
                    )}
                </>
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

            <ModelConfigPanel selectedModel={currentSelectedModel} activeTab={activeTab} />

            <PromptOptimizer originalPrompt={promptText} onPromptOptimized={(optimized) => setPromptText(optimized)} />

            <label htmlFor="prompt-input">{getInputLabel()}</label>
            <TextareaAutosize
                id="prompt-input"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder={getPlaceholder()}
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
                {getGenerateButtonText()}
            </button>
        </div>
    );
};
