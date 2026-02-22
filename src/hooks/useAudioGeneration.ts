import { useState, useCallback } from 'react';
import { fal } from '@fal-ai/client';
import type { GenerationMode } from '../components/GenerationTabs';
import type { ModelConfig } from '../types/models';
import type { ConfigState } from '../config';
import { parseFalError } from '../services/errors';
import { sanitizeLogMessage } from '../utils/logSanitizer';
import type { StatusType } from './useStatusMessage';
import { isTTSModel, isMusicModel, isSFXModel, isBeatovenModel, isAudioUnderstandingModel, isMinimaxTurboModel, isQwen3TTSModel, isQwen3VoiceDesignModel, isElevenLabsTTSModel, isElevenLabsSFXModel, isElevenLabsMusicModel, isElevenLabsAudioIsolationModel, isPersonaPlexModel } from '../services/audioModels';

export interface UseAudioGenerationParams {
    activeTab: GenerationMode;
    uploadedAudioFile: File | null;
    uploadedVideoFile: File | null;
    config: ConfigState;
    setStatus: (message: string, type?: StatusType) => void;
}

export interface UseAudioGenerationReturn {
    audioUrl: string | null;
    textOutput: string | null;
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
    const [textOutput, setTextOutput] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const generateAudio = useCallback(
        async (promptOrText: string, model: ModelConfig) => {
            const modelId = model.endpointId;
            const modelName = model.displayName;

            // Audio Isolation doesn't need text input; PersonaPlex prompt is optional
            const noTextRequired = isElevenLabsAudioIsolationModel(modelId);
            if (!promptOrText && !noTextRequired) {
                setStatus('Please enter text or a prompt.', 'error');
                console.error('Text/prompt is empty. Cannot generate audio.');
                return;
            }

            const isAudioToAudio = activeTab === 'audio-to-audio';
            const isVideoToAudio = activeTab === 'video-to-audio';
            const isAudioUnderstanding = activeTab === 'audio-understanding' || isAudioUnderstandingModel(modelId);

            // For audio-to-audio or audio-understanding mode, require an uploaded audio file
            if ((isAudioToAudio || isAudioUnderstanding) && !uploadedAudioFile) {
                setStatus(
                    isAudioUnderstanding
                        ? 'Please upload an audio file to analyze.'
                        : 'Please upload an audio file for audio-to-audio generation.',
                    'error'
                );
                return;
            }

            // For video-to-audio mode, require an uploaded video file
            if (isVideoToAudio && !uploadedVideoFile) {
                setStatus('Please upload a video file for video-to-audio generation.', 'error');
                return;
            }

            setIsGenerating(true);
            setAudioUrl(null); // Clear previous audio
            setTextOutput(null); // Clear previous text output
            console.log(`Generating audio with model: ${modelName}`);

            setStatus(`Submitting request for audio generation using ${modelName}...`);

            let uploadedAudioUrl: string | undefined;
            let uploadedVideoUrl: string | undefined;

            // Upload audio file for audio-to-audio or audio-understanding
            if ((isAudioToAudio || isAudioUnderstanding) && uploadedAudioFile) {
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
            const isMinimaxTurbo = isMinimaxTurboModel(modelId);
            const isMinimax = modelIdLower.includes('minimax') || modelIdLower.includes('speech-02');
            const isQwen3 = isQwen3TTSModel(modelId);
            const isQwen3VoiceDesign = isQwen3VoiceDesignModel(modelId);
            const isChatterbox = modelIdLower.includes('chatterbox');
            const isDiaVoiceClone = modelIdLower.includes('dia-tts') || modelIdLower.includes('voice-clone');
            const isMirelo = modelIdLower.includes('mirelo') || modelIdLower.includes('sfx-v1');
            const isElevenLabsTTS = isElevenLabsTTSModel(modelId);
            const isElevenLabsSFX = isElevenLabsSFXModel(modelId);
            const isElevenLabsMusic = isElevenLabsMusicModel(modelId);
            const isElevenLabsAudioIsolation = isElevenLabsAudioIsolationModel(modelId);
            const isPersonaPlex = isPersonaPlexModel(modelId);

            // Model-specific prompt field routing
            if (isMinimaxTurbo) {
                // Speech 2.8 Turbo uses 'prompt' (supports pause/interjection tags)
                input.prompt = promptOrText;
            } else if (isQwen3) {
                // Qwen3 TTS models always use 'text' for speech content
                input.text = promptOrText;
                // Voice Design requires 'prompt' for style; TTS uses it optionally
                if (isQwen3VoiceDesign || config.qwenTtsStylePrompt) {
                    input.prompt = config.qwenTtsStylePrompt || 'Speak naturally.';
                }
            } else if (isTTS) {
                input.text = promptOrText;
            } else {
                input.prompt = promptOrText;
            }

            // MiniMax shared parameters (Speech-02-HD and Speech-02-Turbo)
            // Both models use identical API: text, voice_setting, language_boost
            if (isMinimax) {
                const voiceSetting: Record<string, unknown> = {
                    voice_id: config.ttsVoiceId,
                    speed: config.ttsSpeed,
                    vol: config.ttsVolume * 10,
                    pitch: config.ttsPitch,
                };
                input.voice_setting = voiceSetting;
                if (config.minimaxLanguageBoost !== 'auto') {
                    input.language_boost = config.minimaxLanguageBoost;
                }
            }

            // Qwen3-TTS specific parameters
            if (isQwen3 && !isQwen3VoiceDesign) {
                if (config.qwenTtsVoice) {
                    input.voice = config.qwenTtsVoice;
                }
            }
            if (isQwen3) {
                if (config.qwenTtsLanguage !== 'Auto') {
                    input.language = config.qwenTtsLanguage;
                }
                if (config.qwenTtsTemperature !== 0.9) {
                    input.temperature = config.qwenTtsTemperature;
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

            // ElevenLabs TTS specific parameters (Turbo v2.5 and Multilingual v2)
            if (isElevenLabsTTS) {
                input.voice = config.elevenLabsVoice;
                if (config.elevenLabsStability !== 0.5) input.stability = config.elevenLabsStability;
                if (config.elevenLabsSimilarityBoost !== 0.75) input.similarity_boost = config.elevenLabsSimilarityBoost;
                if (config.elevenLabsStyle !== 0) input.style = config.elevenLabsStyle;
                if (config.elevenLabsSpeed !== 1) input.speed = config.elevenLabsSpeed;
            }

            // ElevenLabs Sound Effects — currently blocklisted (fal.ai bug: routes to deprecated v0)
            if (isElevenLabsSFX) {
                delete input.prompt;
                input.text = promptOrText;
                if (config.audioDuration > 0) input.duration_seconds = config.audioDuration;
                if (config.elevenLabsPromptInfluence !== 0.3) input.prompt_influence = config.elevenLabsPromptInfluence;
            }

            // ElevenLabs Music — uses 'prompt' (handled by generic non-TTS path above)
            if (isElevenLabsMusic) {
                if (config.audioDuration > 0) input.music_length_ms = config.audioDuration * 1000;
                if (config.elevenLabsForceInstrumental) input.force_instrumental = true;
            }

            // ElevenLabs Audio Isolation — just needs audio_url
            if (isElevenLabsAudioIsolation && uploadedAudioUrl) {
                input.audio_url = uploadedAudioUrl;
            }

            // PersonaPlex — audio-to-audio with audio_url + prompt + voice
            if (isPersonaPlex && uploadedAudioUrl) {
                input.audio_url = uploadedAudioUrl;
                if (promptOrText) input.prompt = promptOrText;
                if (config.personaPlexVoice !== 'NATF2') input.voice = config.personaPlexVoice;
            }

            // Dia TTS Voice Clone specific parameters
            // Documentation: ref_audio_url (reference audio), text (text to synthesize)
            // Note: ref_text (transcript of reference) is optional and not collected from user
            if (isDiaVoiceClone && uploadedAudioUrl) {
                input.ref_audio_url = uploadedAudioUrl;
                input.text = promptOrText;
            }

            // Mirelo SFX video-to-audio parameters
            if (isMirelo && uploadedVideoUrl) {
                input.video_url = uploadedVideoUrl;
                // Pass prompt as text_prompt for audio guidance (optional per API docs)
                if (promptOrText) {
                    input.text_prompt = promptOrText;
                }
            }

            // Music and SFX duration (exclude ElevenLabs which uses its own duration params)
            if ((isMusic || isSFX) && !isElevenLabsSFX && !isElevenLabsMusic && config.audioDuration > 0) {
                input.duration = config.audioDuration;
            }

            // Beatoven-specific parameters
            const isBeatoven = isBeatovenModel(modelId);
            if (isBeatoven) {
                // Refinement: higher = better quality (default 100 for music, 40 for SFX)
                if (config.beatovenRefinement !== 100) {
                    input.refinement = config.beatovenRefinement;
                }
                // Creativity: 1-32, default 16
                if (config.beatovenCreativity !== 16) {
                    input.creativity = config.beatovenCreativity;
                }
                // Negative prompt
                if (config.beatovenNegativePrompt) {
                    input.negative_prompt = config.beatovenNegativePrompt;
                }
            }

            // Audio understanding specific parameters
            if (isAudioUnderstanding && uploadedAudioUrl) {
                // Override: audio-understanding uses audio_url + prompt, no seed/output_format
                input.audio_url = uploadedAudioUrl;
                input.prompt = promptOrText;
                if (config.audioDetailedAnalysis) {
                    input.detailed_analysis = true;
                }
            }

            // Audio output format (not applicable to audio-understanding)
            if (!isAudioUnderstanding && config.audioOutputFormat && config.audioOutputFormat !== 'mp3') {
                input.output_format = config.audioOutputFormat;
            }

            // Seed for reproducibility (not applicable to audio-understanding)
            if (!isAudioUnderstanding && config.audioSeed !== null) {
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
                        const latestLog = sanitizeLogMessage(logs?.length ? logs[logs.length - 1].message : '');
                        setStatus(`Request is ${statusResult.status}: ${latestLog}`);
                        console.log(`Status logs:`, logs?.map((log) => log.message));
                        await new Promise((resolve) => setTimeout(resolve, 2000));
                    } else if (statusResult.status === 'COMPLETED') {
                        const result = await fal.queue.result(modelId, { requestId });
                        console.log(`Request completed. Full result:`, result);

                        // Response can have different structures
                        const data = result.data as Record<string, unknown>;

                        // Audio understanding returns text output
                        if (isAudioUnderstanding && typeof data.output === 'string') {
                            console.log('Audio analysis completed:', data.output);
                            setTextOutput(data.output);
                            setStatus(`Audio analysis completed using ${modelName}!`, 'success');
                            break;
                        }

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
        setTextOutput(null);
    }, []);

    return {
        audioUrl,
        textOutput,
        isGenerating,
        generateAudio,
        clearAudio,
    };
}
