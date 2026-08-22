/**
 * Configuration options for video generation models
 * Provides controls for duration, aspect ratio, resolution, and other video-specific parameters
 */

import type React from 'react';
import { useEffect } from 'react';
import { useConfig } from '../config';
import { activeLongDurationConstraint, getVideoCapabilityProfile } from '../services/videoModelCapabilities';
import type { ModelConfig } from '../types/models';

interface VideoConfigOptionsProps {
    selectedModel: ModelConfig;
    isVideoToVideo?: boolean; // Indicates V2V mode for additional controls
}

export const VideoConfigOptions: React.FC<VideoConfigOptionsProps> = ({ selectedModel, isVideoToVideo = false }) => {
    const config = useConfig();
    const { setVideoEnableSafetyChecker } = config;
    const modelId = selectedModel.endpointId.toLowerCase();

    // Endpoints with a capability profile get their options/field visibility from
    // declared schema data; everything else uses the legacy detection below.
    const profile = getVideoCapabilityProfile(selectedModel.endpointId);

    // Model detection helpers
    const isKlingModel = modelId.includes('kling');
    const isVeoModel = modelId.includes('veo');
    const isLtx19bModel = modelId.includes('ltx-2-19b'); // 19B version has more params
    const isLtxProFastModel = modelId.includes('ltx-2') && !modelId.includes('ltx-2-19b'); // Pro/Fast versions
    const isLtxModel = modelId.includes('ltx-2'); // Any LTX-2 model
    const isLtxFastModel = modelId.includes('ltx-2') && modelId.includes('fast') && !modelId.includes('ltx-2-19b');
    const isGrokVideoModel = modelId.includes('grok-imagine-video');
    const isGrokVideoEdit = isGrokVideoModel && modelId.includes('edit-video');
    const supportsAudio = profile ? profile.supportsGenerateAudio : isVeoModel || isLtxModel;
    // Guidance scale: ltx-2-19b has it; veo, ltx-2 Pro/Fast, kling, and grok don't.
    // No profiled endpoint exposes guidance_scale so far.
    const supportsGuidanceScale = profile
        ? false
        : isLtx19bModel || (!isVeoModel && !isLtxProFastModel && !isKlingModel && !isGrokVideoModel);
    // Seed and negative prompt: profiles declare these; legacy models keep the
    // old rule of always showing both.
    const supportsSeed = profile ? profile.supportsSeed : true;
    const supportsNegativePrompt = profile ? profile.supportsNegativePrompt : true;

    // V2V model detection
    const isMMAudioModel = modelId.includes('mmaudio');
    const isBriaBgRemoval = modelId.includes('bria') && modelId.includes('background-removal');
    const isLightXRelight = modelId.includes('lightx') && modelId.includes('relight');
    const isLightXRecamera = modelId.includes('lightx') && modelId.includes('recamera');
    const isWanV2V = modelId.includes('wan') && modelId.includes('video-to-video');
    const isHunyuanV2V = modelId.includes('hunyuan') && modelId.includes('video-to-video');
    const isAnimateDiffV2V = modelId.includes('animatediff') && modelId.includes('video-to-video');
    const isLtx19bV2V = isLtx19bModel && modelId.includes('video-to-video');

    // V2V models that support strength/preprocessor
    const supportsV2VStrength = isVideoToVideo && (isLtx19bV2V || isWanV2V || isHunyuanV2V || isAnimateDiffV2V);
    const supportsPreprocessor = isLtx19bV2V;

    // Different models support different durations
    const getDurationOptions = (): string[] => {
        // Capability-profile endpoints declare their duration enum directly.
        if (profile) {
            return profile.durations;
        }

        // Grok Imagine Video supports 1-15s continuous
        if (isGrokVideoModel) {
            return ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '10s', '11s', '12s', '13s', '14s', '15s'];
        }

        // Kling models support 5s and 10s
        if (isKlingModel) {
            return ['5s', '10s'];
        }

        // Veo models support 4s, 6s, 8s (per API docs)
        if (isVeoModel) {
            return ['4s', '6s', '8s'];
        }

        // LTX-2 Fast supports extended durations (6-20s, longer ones need 25fps + 1080p)
        if (isLtxFastModel) {
            return ['6s', '8s', '10s', '12s', '14s', '16s', '18s', '20s'];
        }

        // LTX-2 Pro supports 6s, 8s, 10s
        if (isLtxModel) {
            return ['6s', '8s', '10s'];
        }

        // Default duration options
        return ['5s', '6s', '7s', '8s', '10s'];
    };

    // Different models support different aspect ratios
    const getAspectRatioOptions = (): string[] => {
        // Capability-profile endpoints declare their aspect ratio enum; a forced
        // ratio (e.g. Seedance 2.5 i2v pins "auto") collapses to a single option
        // and hides the selector.
        if (profile) {
            return profile.forcedAspectRatio ? [profile.forcedAspectRatio] : profile.aspectRatios;
        }

        // Grok Imagine Video supports these aspect ratios
        if (isGrokVideoModel) {
            return ['16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16'];
        }

        // Kling models support 16:9, 9:16, 1:1
        if (isKlingModel) {
            return ['16:9', '9:16', '1:1'];
        }

        // Veo models support 16:9 and 9:16
        if (isVeoModel) {
            return ['16:9', '9:16'];
        }

        // LTX-2 only supports 16:9
        if (isLtxModel) {
            return ['16:9'];
        }

        // Luma supports more aspect ratios
        if (modelId.includes('luma')) {
            return ['16:9', '9:16', '4:3', '3:4', '21:9', '9:21'];
        }

        // Default aspect ratio options
        return ['16:9', '9:16', '1:1'];
    };

    // Long durations can pin fps/resolution (LTX 2.3 Fast: 12s+ requires
    // 25 fps at 1080p) — collapsing the option lists below makes the
    // validate-and-reset effect snap stored values to the required pair.
    const durationConstraint = profile ? activeLongDurationConstraint(profile, config.videoDuration) : null;

    // Different models support different resolutions
    const getResolutionOptions = (): string[] => {
        // Capability-profile endpoints declare their resolution enum directly.
        if (profile) {
            return durationConstraint ? [durationConstraint.resolution] : profile.resolutions;
        }

        // Grok Imagine Video supports 480p and 720p
        if (isGrokVideoModel) {
            return ['480p', '720p'];
        }

        // Veo models support 720p and 1080p
        if (isVeoModel) {
            return ['720p', '1080p'];
        }

        // LTX-2 supports higher resolutions
        if (isLtxModel) {
            return ['1080p', '1440p', '2160p'];
        }

        // Wan Pro and MiniMax Hailuo 2.3 support 1080p
        if (modelId.includes('wan-pro') || modelId.includes('hailuo-2.3')) {
            return ['720p', '1080p'];
        }

        // Hunyuan supports multiple resolutions
        if (modelId.includes('hunyuan')) {
            return ['480p', '580p', '720p'];
        }

        // Luma Ray 2 supports up to 1080p
        if (modelId.includes('luma') && modelId.includes('ray')) {
            return ['540p', '720p', '1080p'];
        }

        // Default is 720p only
        return ['720p'];
    };

    // FPS: profile endpoints declare their enum (empty = no fps input); legacy
    // LTX-2 Pro/Fast keeps its historical 25/50 choice. Note the legacy substring
    // check also matches 'ltx-2.5'/'ltx-2.3', so the profile must win here.
    const getFpsOptions = (): string[] => {
        if (profile) {
            if (durationConstraint && profile.fpsValues.length > 0) {
                return [durationConstraint.fps];
            }
            return profile.fpsValues;
        }
        return isLtxProFastModel ? ['25', '50'] : [];
    };

    const durationOptions = getDurationOptions();
    const aspectRatioOptions = getAspectRatioOptions();
    const resolutionOptions = getResolutionOptions();
    const fpsOptions = getFpsOptions();
    const safetyCheckerDefault = profile?.safetyChecker?.defaultValue;
    const safetyTolerance = profile?.safetyTolerance;

    // Safety-checker choices are not portable between endpoint contracts. In
    // particular, Wan requires authorization to disable its checker, while H3
    // does not. Start each selected endpoint from its declared safe default.
    useEffect(() => {
        if (safetyCheckerDefault !== undefined) {
            setVideoEnableSafetyChecker(safetyCheckerDefault);
        }
    }, [modelId, safetyCheckerDefault, setVideoEnableSafetyChecker]);

    // Validate and reset config values when model changes if current values are not
    // supported. An empty option list means the endpoint has no such input at all
    // (e.g. H3 i2v has no aspect_ratio) — leave the stored value alone.
    useEffect(() => {
        // Check if current duration is valid for this model, reset to its declared default if not
        if (durationOptions.length > 0 && !durationOptions.includes(config.videoDuration)) {
            config.setVideoDuration(profile?.defaultDuration ?? durationOptions[0]);
        }

        // Check if current aspect ratio is valid for this model, reset to first option if not
        if (aspectRatioOptions.length > 0 && !aspectRatioOptions.includes(config.videoAspectRatio)) {
            config.setVideoAspectRatio(aspectRatioOptions[0]);
        }

        // Check if current resolution is valid for this model, reset to first option if not
        if (resolutionOptions.length > 0 && !resolutionOptions.includes(config.videoResolution)) {
            config.setVideoResolution(resolutionOptions[0]);
        }

        // Check if current fps is valid for this model, reset to first option if not
        if (fpsOptions.length > 0 && !fpsOptions.includes(config.videoFps)) {
            config.setVideoFps(fpsOptions[0]);
        }

        if (safetyTolerance && !safetyTolerance.values.includes(config.videoSafetyTolerance)) {
            config.setVideoSafetyTolerance(safetyTolerance.defaultValue);
        }
    }, [
        durationOptions,
        aspectRatioOptions,
        resolutionOptions,
        fpsOptions,
        profile?.defaultDuration,
        safetyTolerance,
        config,
    ]);

    return (
        <>
            <div className="form-group">
                <label htmlFor="video-duration">Duration:</label>
                <select
                    id="video-duration"
                    value={config.videoDuration}
                    onChange={(e) => config.setVideoDuration(e.target.value)}
                >
                    {durationOptions.map((duration) => (
                        <option key={duration} value={duration}>
                            {duration}
                        </option>
                    ))}
                </select>
                {durationConstraint && (
                    <span className="hint">
                        {' '}
                        ({profile?.longDurationConstraint?.minDurationSeconds}s and longer run at{' '}
                        {durationConstraint.fps} fps, {durationConstraint.resolution})
                    </span>
                )}
            </div>

            {/* Hidden when the endpoint pins a single ratio (e.g. i2v follows the input image) */}
            {aspectRatioOptions.length > 1 && (
                <div className="form-group">
                    <label htmlFor="video-aspect-ratio">Aspect Ratio:</label>
                    <select
                        id="video-aspect-ratio"
                        value={config.videoAspectRatio}
                        onChange={(e) => config.setVideoAspectRatio(e.target.value)}
                    >
                        {aspectRatioOptions.map((ratio) => (
                            <option key={ratio} value={ratio}>
                                {ratio}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {resolutionOptions.length > 1 && (
                <div className="form-group">
                    <label htmlFor="video-resolution">Resolution:</label>
                    <select
                        id="video-resolution"
                        value={config.videoResolution}
                        onChange={(e) => config.setVideoResolution(e.target.value)}
                    >
                        {resolutionOptions.map((res) => (
                            <option key={res} value={res}>
                                {res}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Prompt expansion and safety controls for profiled endpoints. */}
            {profile?.supportsPromptExpansion && (
                <div className="form-group">
                    <label htmlFor="video-enable-prompt-expansion">Prompt Expansion:</label>
                    <input
                        id="video-enable-prompt-expansion"
                        type="checkbox"
                        checked={config.videoEnablePromptExpansion}
                        onChange={(e) => config.setVideoEnablePromptExpansion(e.target.checked)}
                    />
                    <span className="hint"> (auto-enhance prompt with a vision language model)</span>
                </div>
            )}

            {profile?.safetyChecker && (
                <div className="form-group">
                    <label htmlFor="video-enable-safety-checker">Safety Checker:</label>
                    <input
                        id="video-enable-safety-checker"
                        type="checkbox"
                        checked={config.videoEnableSafetyChecker}
                        onChange={(e) => config.setVideoEnableSafetyChecker(e.target.checked)}
                    />
                    <span className="hint">
                        {profile.safetyChecker.disableRequiresAuthorization
                            ? ' (disabling requires account authorization)'
                            : ' (moderates generated content)'}
                    </span>
                </div>
            )}

            {safetyTolerance && (
                <div className="form-group">
                    <label htmlFor="video-safety-tolerance">Safety Tolerance:</label>
                    <select
                        id="video-safety-tolerance"
                        value={config.videoSafetyTolerance}
                        onChange={(e) => config.setVideoSafetyTolerance(parseInt(e.target.value, 10))}
                    >
                        {safetyTolerance.values.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                    <span className="hint"> (0 = strictest, 4 = most permissive)</span>
                </div>
            )}

            {/* Audio generation option for veo and ltx-2 models */}
            {supportsAudio && (
                <div className="form-group">
                    <label htmlFor="generate-audio">Generate Audio:</label>
                    <input
                        id="generate-audio"
                        type="checkbox"
                        checked={config.generateAudio}
                        onChange={(e) => config.setGenerateAudio(e.target.checked)}
                    />
                    <span className="hint"> (includes sound in the video)</span>
                </div>
            )}

            {/* FPS option for LTX Pro/Fast models (not 19B which uses float fps via num_frames) */}
            {fpsOptions.length > 0 && (
                <div className="form-group">
                    <label htmlFor="video-fps">Frame Rate:</label>
                    <select id="video-fps" value={config.videoFps} onChange={(e) => config.setVideoFps(e.target.value)}>
                        {fpsOptions.map((fps) => (
                            <option key={fps} value={fps}>
                                {fps} fps
                            </option>
                        ))}
                    </select>
                    <span className="hint"> (higher fps = smoother motion)</span>
                </div>
            )}

            {/* Optional camera motion for profiled endpoints that declare it (LTX 2.5) */}
            {profile && profile.cameraMotions.length > 0 && (
                <div className="form-group">
                    <label htmlFor="video-camera-motion">Camera Motion:</label>
                    <select
                        id="video-camera-motion"
                        value={config.videoCameraMotion}
                        onChange={(e) => config.setVideoCameraMotion(e.target.value)}
                    >
                        <option value="none">None</option>
                        {profile.cameraMotions.map((motion) => (
                            <option key={motion} value={motion}>
                                {motion
                                    .split('_')
                                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ')}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* CFG Scale for Kling models (0-1 range) */}
            {isKlingModel && (
                <div className="form-group">
                    <label htmlFor="video-cfg-scale">CFG Scale:</label>
                    <input
                        id="video-cfg-scale"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.videoCfgScale}
                        onChange={(e) => config.setVideoCfgScale(parseFloat(e.target.value))}
                    />
                    <span className="range-value">{config.videoCfgScale.toFixed(1)}</span>
                    <span className="hint"> (0 = creative, 1 = follow prompt closely)</span>
                </div>
            )}

            {/* Standard Guidance Scale - only for models that support it */}
            {supportsGuidanceScale && (
                <div className="form-group">
                    <label htmlFor="video-guidance-scale">Guidance Scale:</label>
                    <input
                        id="video-guidance-scale"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={config.videoGuidanceScale}
                        onChange={(e) => config.setVideoGuidanceScale(parseFloat(e.target.value) || 3)}
                        placeholder="e.g., 3"
                    />
                </div>
            )}

            {/* LTX-2 19B specific controls */}
            {isLtx19bModel && (
                <>
                    <div className="form-group-divider">
                        <span>LTX-2 19B Settings</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-num-frames">Number of Frames:</label>
                        <input
                            id="ltx-num-frames"
                            type="number"
                            min="9"
                            max="481"
                            value={config.videoNumFrames}
                            onChange={(e) =>
                                config.setVideoNumFrames(
                                    Math.max(9, Math.min(481, parseInt(e.target.value, 10) || 121)),
                                )
                            }
                        />
                        <span className="hint"> (9-481, ~{Math.round(config.videoNumFrames / 25)}s at 25fps)</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-video-size">Video Size:</label>
                        <select
                            id="ltx-video-size"
                            value={config.videoOutputSize}
                            onChange={(e) => config.setVideoOutputSize(e.target.value)}
                        >
                            <option value="landscape_16_9">Landscape 16:9</option>
                            <option value="landscape_4_3">Landscape 4:3</option>
                            <option value="portrait_9_16">Portrait 9:16</option>
                            <option value="portrait_3_4">Portrait 3:4</option>
                            <option value="square">Square</option>
                            <option value="square_hd">Square HD</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-acceleration">Acceleration:</label>
                        <select
                            id="ltx-acceleration"
                            value={config.videoAcceleration}
                            onChange={(e) => config.setVideoAcceleration(e.target.value)}
                        >
                            <option value="none">None (highest quality)</option>
                            <option value="regular">Regular (balanced)</option>
                            <option value="high">High (faster)</option>
                            <option value="full">Full (fastest)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-num-inference-steps">Inference Steps:</label>
                        <input
                            id="ltx-num-inference-steps"
                            type="number"
                            min="8"
                            max="50"
                            value={config.videoNumInferenceSteps}
                            onChange={(e) =>
                                config.setVideoNumInferenceSteps(
                                    Math.max(8, Math.min(50, parseInt(e.target.value, 10) || 40)),
                                )
                            }
                        />
                        <span className="hint"> (8-50, more = better quality)</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-camera-lora">Camera Movement:</label>
                        <select
                            id="ltx-camera-lora"
                            value={config.videoCameraLora}
                            onChange={(e) => config.setVideoCameraLora(e.target.value)}
                        >
                            <option value="none">None</option>
                            <option value="dolly_in">Dolly In</option>
                            <option value="dolly_out">Dolly Out</option>
                            <option value="dolly_left">Dolly Left</option>
                            <option value="dolly_right">Dolly Right</option>
                            <option value="jib_up">Jib Up</option>
                            <option value="jib_down">Jib Down</option>
                            <option value="static">Static</option>
                        </select>
                    </div>

                    {config.videoCameraLora !== 'none' && (
                        <div className="form-group">
                            <label htmlFor="ltx-camera-lora-scale">Camera Movement Strength:</label>
                            <input
                                id="ltx-camera-lora-scale"
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={config.videoCameraLoraScale}
                                onChange={(e) => config.setVideoCameraLoraScale(parseFloat(e.target.value))}
                            />
                            <span className="range-value">{config.videoCameraLoraScale.toFixed(1)}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="ltx-use-multiscale">Use Multiscale:</label>
                        <input
                            id="ltx-use-multiscale"
                            type="checkbox"
                            checked={config.videoUseMultiscale}
                            onChange={(e) => config.setVideoUseMultiscale(e.target.checked)}
                        />
                        <span className="hint"> (better coherence and details)</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ltx-enable-prompt-expansion">Prompt Expansion:</label>
                        <input
                            id="ltx-enable-prompt-expansion"
                            type="checkbox"
                            checked={config.videoEnablePromptExpansion}
                            onChange={(e) => config.setVideoEnablePromptExpansion(e.target.checked)}
                        />
                        <span className="hint"> (auto-enhance prompt)</span>
                    </div>
                </>
            )}

            {/* Hidden for endpoints whose input schema has no seed (e.g. Seedance 2.5 i2v/r2v) */}
            {supportsSeed && (
                <div className="form-group">
                    <label htmlFor="video-seed">Seed (leave blank for random):</label>
                    <input
                        id="video-seed"
                        type="number"
                        value={config.videoSeed !== null ? config.videoSeed : ''}
                        onChange={(e) => config.setVideoSeed(e.target.value ? parseInt(e.target.value, 10) : null)}
                    />
                </div>
            )}

            {/* Seedance doesn't expose negative_prompt in its schema, hide the field. */}
            {supportsNegativePrompt && (
                <div className="form-group">
                    <label htmlFor="video-negative-prompt">Negative Prompt:</label>
                    <textarea
                        id="video-negative-prompt"
                        value={config.videoNegativePrompt}
                        onChange={(e) => config.setVideoNegativePrompt(e.target.value)}
                        placeholder="Content to avoid (e.g., blur, distort, low quality)"
                        rows={2}
                        className="negative-prompt-textarea"
                    />
                </div>
            )}

            {/* V2V Strength - for transformation intensity */}
            {supportsV2VStrength && (
                <div className="form-group">
                    <label htmlFor="video-strength">
                        Transformation Strength: <span className="range-value">{config.videoStrength.toFixed(2)}</span>
                    </label>
                    <input
                        id="video-strength"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={config.videoStrength}
                        onChange={(e) => config.setVideoStrength(parseFloat(e.target.value))}
                    />
                    <span className="hint"> (0 = preserve original, 1 = full transformation)</span>
                </div>
            )}

            {/* Preprocessor for LTX-2 19B V2V */}
            {supportsPreprocessor && (
                <div className="form-group">
                    <label htmlFor="video-preprocessor">Preprocessor:</label>
                    <select
                        id="video-preprocessor"
                        value={config.videoPreprocessor}
                        onChange={(e) => config.setVideoPreprocessor(e.target.value)}
                    >
                        <option value="none">None</option>
                        <option value="depth">Depth</option>
                        <option value="canny">Canny Edge</option>
                        <option value="pose">Pose</option>
                    </select>
                    <span className="hint"> (extract structure from input video)</span>
                </div>
            )}

            {/* MMAudio V2 Settings */}
            {isMMAudioModel && (
                <>
                    <div className="form-group-divider">
                        <span>MMAudio V2 Settings</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="mmaudio-cfg-strength">
                            CFG Strength: <span className="range-value">{config.mmAudioCfgStrength.toFixed(1)}</span>
                        </label>
                        <input
                            id="mmaudio-cfg-strength"
                            type="range"
                            min="1"
                            max="10"
                            step="0.5"
                            value={config.mmAudioCfgStrength}
                            onChange={(e) => config.setMmAudioCfgStrength(parseFloat(e.target.value))}
                        />
                        <span className="hint"> (how closely to follow the prompt)</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="mmaudio-num-steps">Inference Steps:</label>
                        <input
                            id="mmaudio-num-steps"
                            type="number"
                            min="10"
                            max="50"
                            value={config.mmAudioNumSteps}
                            onChange={(e) =>
                                config.setMmAudioNumSteps(
                                    Math.max(10, Math.min(50, parseInt(e.target.value, 10) || 25)),
                                )
                            }
                        />
                        <span className="hint"> (10-50, more = better quality)</span>
                    </div>
                </>
            )}

            {/* Bria Background Removal Settings */}
            {isBriaBgRemoval && (
                <>
                    <div className="form-group-divider">
                        <span>Background Removal Settings</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="bria-bg-color">Background Color:</label>
                        <select
                            id="bria-bg-color"
                            value={config.briaBgColor}
                            onChange={(e) => config.setBriaBgColor(e.target.value)}
                        >
                            <option value="transparent">Transparent</option>
                            <option value="black">Black</option>
                            <option value="white">White</option>
                            <option value="green">Green Screen</option>
                            <option value="blue">Blue Screen</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="bria-output-codec">Output Format:</label>
                        <select
                            id="bria-output-codec"
                            value={config.briaOutputCodec}
                            onChange={(e) => config.setBriaOutputCodec(e.target.value)}
                        >
                            <option value="mp4_h265">MP4 (H.265)</option>
                            <option value="mp4_h264">MP4 (H.264)</option>
                            <option value="webm_vp9">WebM (VP9)</option>
                            <option value="mov_prores">MOV (ProRes)</option>
                        </select>
                    </div>
                </>
            )}

            {/* LightX Relight info */}
            {isLightXRelight && (
                <div className="form-group">
                    <p className="config-hint">
                        Upload a video to relight it with different lighting conditions. Use the prompt to describe the
                        desired lighting (e.g., "sunset", "studio lighting").
                    </p>
                </div>
            )}

            {/* LightX Recamera info */}
            {isLightXRecamera && (
                <div className="form-group">
                    <p className="config-hint">
                        Upload a video to change camera angles and movements. Use the prompt to describe the desired
                        camera motion.
                    </p>
                </div>
            )}

            {/* Grok Imagine Video Edit info */}
            {isGrokVideoEdit && (
                <div className="form-group">
                    <p className="config-hint">
                        Upload a video to edit with Grok Imagine. Input video will be resized to max 854x480 and
                        truncated to 8 seconds.
                    </p>
                </div>
            )}
        </>
    );
};
