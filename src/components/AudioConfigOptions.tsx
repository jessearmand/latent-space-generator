/**
 * Audio configuration options component
 * Model-specific settings for TTS, music, SFX, and voice cloning
 */

import type React from 'react';
import { useConfig } from '../config';
import type { ModelConfig } from '../types/models';
import { MINIMAX_VOICES, MINIMAX_EMOTIONS } from '../types/audio';
import { isMusicModel, isSFXModel } from '../services/audioModels';

interface AudioConfigOptionsProps {
    selectedModel: ModelConfig;
}

export const AudioConfigOptions: React.FC<AudioConfigOptionsProps> = ({ selectedModel }) => {
    const config = useConfig();

    const modelId = selectedModel.endpointId.toLowerCase();
    const isMinimax = modelId.includes('minimax') || modelId.includes('speech-02');
    const isChatterbox = modelId.includes('chatterbox');
    const isDiaVoiceClone = modelId.includes('dia-tts') || modelId.includes('voice-clone');
    const isMirelo = modelId.includes('mirelo') || modelId.includes('sfx-v1');
    const isMusic = isMusicModel(selectedModel.endpointId);
    const isSFX = isSFXModel(selectedModel.endpointId);

    return (
        <div className="audio-config-options">
            {/* MiniMax Speech-02-HD Settings */}
            {isMinimax && (
                <>
                    <div className="form-group">
                        <label htmlFor="tts-voice">Voice:</label>
                        <select
                            id="tts-voice"
                            value={config.ttsVoiceId}
                            onChange={(e) => config.setTtsVoiceId(e.target.value)}
                        >
                            {MINIMAX_VOICES.map((voice) => (
                                <option key={voice.id} value={voice.id}>
                                    {voice.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="tts-speed">
                            Speed: <span className="range-value">{config.ttsSpeed.toFixed(1)}x</span>
                        </label>
                        <input
                            type="range"
                            id="tts-speed"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={config.ttsSpeed}
                            onChange={(e) => config.setTtsSpeed(parseFloat(e.target.value))}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="tts-volume">
                            Volume: <span className="range-value">{Math.round(config.ttsVolume * 100)}%</span>
                        </label>
                        <input
                            type="range"
                            id="tts-volume"
                            min="0"
                            max="1"
                            step="0.1"
                            value={config.ttsVolume}
                            onChange={(e) => config.setTtsVolume(parseFloat(e.target.value))}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="tts-pitch">
                            Pitch: <span className="range-value">{config.ttsPitch}</span>
                        </label>
                        <input
                            type="range"
                            id="tts-pitch"
                            min="-12"
                            max="12"
                            step="1"
                            value={config.ttsPitch}
                            onChange={(e) => config.setTtsPitch(parseInt(e.target.value, 10))}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="tts-emotion">Emotion:</label>
                        <select
                            id="tts-emotion"
                            value={config.ttsEmotion}
                            onChange={(e) => config.setTtsEmotion(e.target.value)}
                        >
                            {MINIMAX_EMOTIONS.map((emotion) => (
                                <option key={emotion} value={emotion}>
                                    {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </>
            )}

            {/* Chatterbox TTS Settings */}
            {isChatterbox && (
                <>
                    <div className="form-group">
                        <label htmlFor="chatterbox-exaggeration">
                            Exaggeration:{' '}
                            <span className="range-value">{config.chatterboxExaggeration.toFixed(2)}</span>
                        </label>
                        <input
                            type="range"
                            id="chatterbox-exaggeration"
                            min="0"
                            max="1"
                            step="0.05"
                            value={config.chatterboxExaggeration}
                            onChange={(e) => config.setChatterboxExaggeration(parseFloat(e.target.value))}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="chatterbox-temperature">
                            Temperature:{' '}
                            <span className="range-value">{config.chatterboxTemperature.toFixed(1)}</span>
                        </label>
                        <input
                            type="range"
                            id="chatterbox-temperature"
                            min="0.1"
                            max="2.0"
                            step="0.1"
                            value={config.chatterboxTemperature}
                            onChange={(e) => config.setChatterboxTemperature(parseFloat(e.target.value))}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="chatterbox-cfg">
                            CFG: <span className="range-value">{config.chatterboxCfg.toFixed(2)}</span>
                        </label>
                        <input
                            type="range"
                            id="chatterbox-cfg"
                            min="0"
                            max="1"
                            step="0.05"
                            value={config.chatterboxCfg}
                            onChange={(e) => config.setChatterboxCfg(parseFloat(e.target.value))}
                        />
                    </div>
                </>
            )}

            {/* Dia Voice Clone info */}
            {isDiaVoiceClone && (
                <div className="form-group">
                    <p className="config-hint">
                        Upload a source audio file to clone the voice. Enter the text you want spoken.
                    </p>
                </div>
            )}

            {/* Mirelo SFX info */}
            {isMirelo && (
                <div className="form-group">
                    <p className="config-hint">
                        Upload a video file to generate synced sound effects.
                    </p>
                </div>
            )}

            {/* Music/SFX Duration */}
            {(isMusic || isSFX) && (
                <div className="form-group">
                    <label htmlFor="audio-duration">
                        Duration (seconds): <span className="range-value">{config.audioDuration}s</span>
                    </label>
                    <input
                        type="range"
                        id="audio-duration"
                        min="1"
                        max="60"
                        step="1"
                        value={config.audioDuration}
                        onChange={(e) => config.setAudioDuration(parseInt(e.target.value, 10))}
                    />
                </div>
            )}

            {/* Output Format (for all models) */}
            <div className="form-group">
                <label htmlFor="audio-format">Output Format:</label>
                <select
                    id="audio-format"
                    value={config.audioOutputFormat}
                    onChange={(e) => config.setAudioOutputFormat(e.target.value)}
                >
                    <option value="mp3">MP3</option>
                    <option value="wav">WAV</option>
                    <option value="flac">FLAC</option>
                    <option value="ogg">OGG</option>
                </select>
            </div>

            {/* Seed (for reproducibility) */}
            <div className="form-group">
                <label htmlFor="audio-seed">
                    Seed <span className="hint">(optional, for reproducibility)</span>:
                </label>
                <input
                    type="number"
                    id="audio-seed"
                    value={config.audioSeed ?? ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        config.setAudioSeed(val === '' ? null : parseInt(val, 10));
                    }}
                    placeholder="Random"
                />
            </div>
        </div>
    );
};
