import { useState, useCallback } from 'react';
import { fal } from '@fal-ai/client';
import type { GenerationMode } from '../components/GenerationTabs';
import type { ModelConfig } from '../types/models';
import type { ConfigState } from '../config';
import { parseFalError } from '../services/errors';
import type { StatusType } from './useStatusMessage';
import { isTTSModel, isMusicModel, isSFXModel } from '../services/audioModels';

export interface UseAudioGenerationParams {
    activeTab: GenerationMode;
    uploadedAudioFile: File | null;
    uploadedVideoFile: File | null;
    config: ConfigState;
    setStatus: (message: string, type?: StatusType) => void;
}

export interface UseAudioGenerationReturn {
    audioUrl: string | null;
    isGenerating: boolean;
    generateAudio: (promptOrText: string, model: ModelConfig) => Promise<void>;
    clearAudio: () => void;
}

/**
 * Hook for audio generation using fal.ai API.
 * Handles TTS, music generation, sound effects, and voice cloning.
 */
export function useAudioGeneration({
    activeTab,
    uploadedAudioFile,
    uploadedVideoFile,
    config,
    setStatus,
}: UseAudioGenerationParams): UseAudioGenerationReturn {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const generateAudio = useCallback(
        async (promptOrText: string, model: ModelConfig) => {
            if (!promptOrText) {
                setStatus('Please enter text or a prompt.', 'error');
                console.error('Text/prompt is empty. Cannot generate audio.');
                return;
            }

            const modelId = model.endpointId;
            const modelName = model.displayName;
            const isAudioToAudio = activeTab === 'audio-to-audio';
            const isVideoToAudio = activeTab === 'video-to-audio';

            // For audio-to-audio mode, require an uploaded audio file
            if (isAudioToAudio && !uploadedAudioFile) {
                setStatus('Please upload an audio file for audio-to-audio generation.', 'error');
                return;
            }

            // For video-to-audio mode, require an uploaded video file
            if (isVideoToAudio && !uploadedVideoFile) {
                setStatus('Please upload a video file for video-to-audio generation.', 'error');
                return;
            }

            setIsGenerating(true);
            setAudioUrl(null); // Clear previous audio
            console.log(`Generating audio with model: ${modelName}`);

            setStatus(`Submitting request for audio generation using ${modelName}...`);

            let uploadedAudioUrl: string | undefined;
            let uploadedVideoUrl: string | undefined;

            // Upload audio file for audio-to-audio
            if (isAudioToAudio && uploadedAudioFile) {
                try {
                    setStatus(`Uploading audio file for ${modelName}...`);
                    uploadedAudioUrl = await fal.storage.upload(uploadedAudioFile);
                    console.log('Audio file uploaded:', uploadedAudioUrl);
                    setStatus(`Audio uploaded. Submitting request for ${modelName}...`);
                } catch (uploadError: unknown) {
                    const errorMsg = `Error uploading audio: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                    setStatus(errorMsg, 'error');
                    console.error(errorMsg);
                    setIsGenerating(false);
                    return;
                }
            }

            // Upload video file for video-to-audio
            if (isVideoToAudio && uploadedVideoFile) {
                try {
                    setStatus(`Uploading video file for ${modelName}...`);
                    uploadedVideoUrl = await fal.storage.upload(uploadedVideoFile);
                    console.log('Video file uploaded:', uploadedVideoUrl);
                    setStatus(`Video uploaded. Submitting request for ${modelName}...`);
                } catch (uploadError: unknown) {
                    const errorMsg = `Error uploading video: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                    setStatus(errorMsg, 'error');
                    console.error(errorMsg);
                    setIsGenerating(false);
                    return;
                }
            }

            // Build audio generation input parameters
            const input: Record<string, unknown> = {};

            // Model-specific parameter routing
            const modelIdLower = modelId.toLowerCase();
            const isTTS = isTTSModel(modelId);
            const isMusic = isMusicModel(modelId);
            const isSFX = isSFXModel(modelId);
            const isMinimax = modelIdLower.includes('minimax') || modelIdLower.includes('speech-02');
            const isChatterbox = modelIdLower.includes('chatterbox');
            const isDiaVoiceClone = modelIdLower.includes('dia-tts') || modelIdLower.includes('voice-clone');
            const isMirelo = modelIdLower.includes('mirelo') || modelIdLower.includes('sfx-v1');

            // TTS models use 'text', others use 'prompt'
            if (isTTS) {
                input.text = promptOrText;
            } else {
                input.prompt = promptOrText;
            }

            // MiniMax Speech-02-HD specific parameters
            if (isMinimax) {
                input.voice_id = config.ttsVoiceId;
                if (config.ttsSpeed !== 1.0) {
                    input.speed = config.ttsSpeed;
                }
                if (config.ttsVolume !== 1.0) {
                    input.vol = config.ttsVolume;
                }
                if (config.ttsPitch !== 0) {
                    input.pitch = config.ttsPitch;
                }
                if (config.ttsEmotion && config.ttsEmotion !== 'neutral') {
                    input.emotion = config.ttsEmotion;
                }
            }

            // Chatterbox TTS specific parameters
            if (isChatterbox) {
                if (uploadedAudioUrl) {
                    input.audio_url = uploadedAudioUrl;
                }
                if (config.chatterboxExaggeration !== 0.25) {
                    input.exaggeration = config.chatterboxExaggeration;
                }
                if (config.chatterboxTemperature !== 0.7) {
                    input.temperature = config.chatterboxTemperature;
                }
                if (config.chatterboxCfg !== 0.5) {
                    input.cfg = config.chatterboxCfg;
                }
            }

            // Dia TTS Voice Clone specific parameters
            if (isDiaVoiceClone && uploadedAudioUrl) {
                input.source_audio_url = uploadedAudioUrl;
                input.target_text = promptOrText;
            }

            // Mirelo SFX video-to-audio parameters
            if (isMirelo && uploadedVideoUrl) {
                input.video_url = uploadedVideoUrl;
            }

            // Music and SFX duration
            if ((isMusic || isSFX) && config.audioDuration > 0) {
                input.duration = config.audioDuration;
            }

            // Audio output format
            if (config.audioOutputFormat && config.audioOutputFormat !== 'mp3') {
                input.output_format = config.audioOutputFormat;
            }

            // Seed for reproducibility
            if (config.audioSeed !== null) {
                input.seed = config.audioSeed;
            }

            try {
                console.log(`Input sent to API for model ${modelName}:`, input);

                // Step 1: Submit the request and get request ID
                const submitResult = await fal.queue.submit(modelId, { input });
                const requestId = submitResult.request_id;
                console.log(`Request submitted. Request ID: ${requestId}`);
                setStatus(`Request submitted. Request ID: ${requestId}. Waiting for completion...`);

                // Step 2: Poll status until complete
                while (true) {
                    const statusResult = await fal.queue.status(modelId, {
                        requestId,
                        logs: true,
                    });
                    console.log(`Status update for request ID ${requestId}:`, statusResult.status);

                    if (statusResult.status === 'IN_QUEUE' || statusResult.status === 'IN_PROGRESS') {
                        const logs = (statusResult as { logs?: Array<{ message: string }> }).logs;
                        const latestLog = logs?.length ? logs[logs.length - 1].message : 'Processing...';
                        setStatus(`Request is ${statusResult.status}: ${latestLog}`);
                        console.log(`Status logs:`, logs?.map((log) => log.message));
                        await new Promise((resolve) => setTimeout(resolve, 2000));
                    } else if (statusResult.status === 'COMPLETED') {
                        const result = await fal.queue.result(modelId, { requestId });
                        console.log(`Request completed. Full result:`, result);

                        // Audio response can have different structures
                        const data = result.data as Record<string, unknown>;
                        let audioResultUrl: string | undefined;

                        // Check common audio response fields
                        if (data.audio_url) {
                            audioResultUrl = data.audio_url as string;
                        } else if (data.audio) {
                            if (typeof data.audio === 'string') {
                                audioResultUrl = data.audio;
                            } else if (typeof data.audio === 'object' && data.audio !== null) {
                                const audioObj = data.audio as { url?: string };
                                audioResultUrl = audioObj.url;
                            }
                        } else if (Array.isArray(data.audios) && data.audios.length > 0) {
                            const firstAudio = data.audios[0] as { url?: string } | string;
                            audioResultUrl = typeof firstAudio === 'string' ? firstAudio : firstAudio.url;
                        } else if (data.url) {
                            audioResultUrl = data.url as string;
                        } else if (data.output_url) {
                            audioResultUrl = data.output_url as string;
                        }

                        if (audioResultUrl) {
                            console.log(`Audio generated successfully:`, audioResultUrl);
                            setAudioUrl(audioResultUrl);
                            setStatus(`Audio generated successfully using ${modelName}!`, 'success');
                        } else {
                            setStatus('Audio generation failed. No audio URL found in result.', 'error');
                            console.error('No audio URL in result:', result);
                        }
                        break;
                    } else {
                        const status = (statusResult as { status: string }).status;
                        setStatus(`Request failed with status: ${status}`, 'error');
                        console.error(`Request failed with status ${status}:`, statusResult);
                        break;
                    }
                }
            } catch (error: unknown) {
                console.error('Audio generation error:', error);

                const parsedError = parseFalError(error);

                const rawMessage = error instanceof Error ? error.message : String(error);
                if (rawMessage.includes('401') || rawMessage.includes('Unauthorized')) {
                    console.error(
                        'Authentication error detected. The API key may be invalid or not applied correctly.'
                    );
                    setStatus('Authentication failed. Please check your API key.', 'error');
                } else {
                    setStatus(parsedError, 'error');
                }
            } finally {
                setIsGenerating(false);
            }
        },
        [activeTab, uploadedAudioFile, uploadedVideoFile, config, setStatus]
    );

    const clearAudio = useCallback(() => {
        setAudioUrl(null);
    }, []);

    return {
        audioUrl,
        isGenerating,
        generateAudio,
        clearAudio,
    };
}
