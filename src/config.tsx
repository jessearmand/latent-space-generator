import { createContext, useState, useEffect, useContext, type ReactNode } from 'react';

export interface ConfigState {
  safetyTolerance: string;
  aspectRatio: string;
  imageSize: { width: number; height: number } | string;
  raw: boolean;
  enableSafetyChecker: boolean;
  seed: number | null;
  guidanceScale: number;  // CFG scale for image generation
  imagePromptStrength: number;  // Strength for image prompt in editing models
  gptImageSize: string;
  gptNumImages: number;
  gptQuality: string;
  gptBackground: string;
  // Gemini image model settings
  geminiNumImages: number;  // 1-4, number of images to generate
  geminiOutputFormat: string;  // 'jpeg' | 'png' | 'webp'
  geminiResolution: string;  // '1K' | '2K' | '4K' (Gemini 3 Pro only)
  geminiEnableWebSearch: boolean;  // Enable web search (Gemini 3 Pro only)
  // Grok Imagine model settings
  grokNumImages: number;  // 1-4, number of images to generate
  grokOutputFormat: string;  // 'jpeg' | 'png' | 'webp'
  // Qwen model specific settings
  numLayers: number;  // Number of layers to generate (1-10) - qwen-image-layered only
  acceleration: string;  // Acceleration level: "none" | "regular" | "high" - all Qwen models
  // Video generation settings
  videoDuration: string;  // "5s", "6s", "7s", "8s", "10s"
  videoAspectRatio: string;  // "16:9", "9:16", "1:1"
  videoResolution: string;  // "480p", "720p", "1080p"
  videoGuidanceScale: number;  // CFG scale for video generation
  videoSeed: number | null;  // Seed for reproducibility
  videoNegativePrompt: string;  // Content to avoid
  // Model-specific video settings
  generateAudio: boolean;  // For veo3.1 and ltx-2 models
  videoCfgScale: number;  // CFG scale for kling models (0-1 range)
  videoFps: string;  // FPS for ltx-2 Pro/Fast models (25 or 50)
  // Advanced video settings (used by ltx-2-19b and potentially other models)
  videoNumFrames: number;  // 9-481, default 121
  videoOutputSize: string;  // landscape_4_3, portrait_3_4, square, etc.
  videoUseMultiscale: boolean;  // default true
  videoNumInferenceSteps: number;  // 8-50, default 40
  videoAcceleration: string;  // none, regular, high, full
  videoCameraLora: string;  // dolly_in, dolly_out, dolly_left, dolly_right, jib_up, jib_down, static, none
  videoCameraLoraScale: number;  // 0-1, default 1
  videoEnablePromptExpansion: boolean;  // default false
  // Video-to-video settings
  videoStrength: number;  // 0-1, strength for video-to-video transformation
  // Audio generation settings
  audioOutputFormat: string;  // 'mp3' | 'wav' | 'flac' | 'pcm'
  audioSeed: number | null;  // Seed for reproducibility
  // TTS settings (MiniMax Speech-02-HD)
  ttsVoiceId: string;  // Voice ID
  ttsSpeed: number;  // 0.5-2.0, default 1.0
  ttsVolume: number;  // 0-1, default 1.0
  ttsPitch: number;  // -12 to 12, default 0
  ttsEmotion: string;  // 'neutral', 'happy', 'sad', etc.
  // Chatterbox TTS settings
  chatterboxExaggeration: number;  // 0-1, default 0.25
  chatterboxTemperature: number;  // 0.1-2.0, default 0.7
  chatterboxCfg: number;  // 0-1, default 0.5
  // Music/SFX generation settings
  audioDuration: number;  // seconds, for music and SFX generation
  // Beatoven-specific settings
  beatovenRefinement: number;  // 1-100 for music, 1-40 for SFX (quality iterations)
  beatovenCreativity: number;  // 1-32, default 16 (variation level)
  beatovenNegativePrompt: string;  // Content to avoid
  // MMAudio V2 settings (video-to-audio)
  mmAudioCfgStrength: number;  // 1-10, default 4.5
  mmAudioNumSteps: number;  // 10-50, default 25
  // Bria BG Removal settings
  briaBgColor: string;  // transparent, black, white, green, blue
  briaOutputCodec: string;  // mp4_h265, mp4_h264, webm_vp9, mov_prores
  // Video-to-video preprocessor
  videoPreprocessor: string;  // none, depth, canny, pose
  // Audio understanding settings
  audioDetailedAnalysis: boolean;  // Enable detailed analysis for audio understanding
}

interface ConfigContextType extends ConfigState {
  setSafetyTolerance: (value: string) => void;
  setAspectRatio: (value: string) => void;
  setImageSize: (value: { width: number; height: number } | string) => void;
  setRaw: (value: boolean) => void;
  setEnableSafetyChecker: (value: boolean) => void;
  setSeed: (value: number | null) => void;
  setGuidanceScale: (value: number) => void;
  setImagePromptStrength: (value: number) => void;
  setGptImageSize: (value: string) => void;
  setGptNumImages: (value: number) => void;
  setGptQuality: (value: string) => void;
  setGptBackground: (value: string) => void;
  // Gemini image model setters
  setGeminiNumImages: (value: number) => void;
  setGeminiOutputFormat: (value: string) => void;
  setGeminiResolution: (value: string) => void;
  setGeminiEnableWebSearch: (value: boolean) => void;
  // Grok Imagine model setters
  setGrokNumImages: (value: number) => void;
  setGrokOutputFormat: (value: string) => void;
  // Qwen model setters
  setNumLayers: (value: number) => void;
  setAcceleration: (value: string) => void;
  // Video generation setters
  setVideoDuration: (value: string) => void;
  setVideoAspectRatio: (value: string) => void;
  setVideoResolution: (value: string) => void;
  setVideoGuidanceScale: (value: number) => void;
  setVideoSeed: (value: number | null) => void;
  setVideoNegativePrompt: (value: string) => void;
  // Model-specific video setters
  setGenerateAudio: (value: boolean) => void;
  setVideoCfgScale: (value: number) => void;
  setVideoFps: (value: string) => void;
  // Advanced video setters
  setVideoNumFrames: (value: number) => void;
  setVideoOutputSize: (value: string) => void;
  setVideoUseMultiscale: (value: boolean) => void;
  setVideoNumInferenceSteps: (value: number) => void;
  setVideoAcceleration: (value: string) => void;
  setVideoCameraLora: (value: string) => void;
  setVideoCameraLoraScale: (value: number) => void;
  setVideoEnablePromptExpansion: (value: boolean) => void;
  // Video-to-video setters
  setVideoStrength: (value: number) => void;
  // Audio generation setters
  setAudioOutputFormat: (value: string) => void;
  setAudioSeed: (value: number | null) => void;
  // TTS setters
  setTtsVoiceId: (value: string) => void;
  setTtsSpeed: (value: number) => void;
  setTtsVolume: (value: number) => void;
  setTtsPitch: (value: number) => void;
  setTtsEmotion: (value: string) => void;
  // Chatterbox setters
  setChatterboxExaggeration: (value: number) => void;
  setChatterboxTemperature: (value: number) => void;
  setChatterboxCfg: (value: number) => void;
  // Music/SFX setters
  setAudioDuration: (value: number) => void;
  // Beatoven setters
  setBeatovenRefinement: (value: number) => void;
  setBeatovenCreativity: (value: number) => void;
  setBeatovenNegativePrompt: (value: string) => void;
  // MMAudio V2 setters
  setMmAudioCfgStrength: (value: number) => void;
  setMmAudioNumSteps: (value: number) => void;
  // Bria BG Removal setters
  setBriaBgColor: (value: string) => void;
  setBriaOutputCodec: (value: string) => void;
  // Video preprocessor setter
  setVideoPreprocessor: (value: string) => void;
  // Audio understanding setter
  setAudioDetailedAnalysis: (value: boolean) => void;
}

export const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [safetyTolerance, setSafetyTolerance] = useState<string>(localStorage.getItem('SAFETY_TOLERANCE') || '2');
  const [aspectRatio, setAspectRatio] = useState<string>(localStorage.getItem('ASPECT_RATIO') || '16:9');
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | string>(JSON.parse(localStorage.getItem('IMAGE_SIZE') || '"landscape_4_3"'));
  const [raw, setRaw] = useState<boolean>(localStorage.getItem('RAW') === 'true');
  const [enableSafetyChecker, setEnableSafetyChecker] = useState<boolean>(localStorage.getItem('ENABLE_SAFETY_CHECKER') === 'true');
  const [seed, setSeed] = useState<number | null>(localStorage.getItem('SEED') !== 'null' ? parseInt(localStorage.getItem('SEED') || '0', 10) : null);
  const [guidanceScale, setGuidanceScale] = useState<number>(parseFloat(localStorage.getItem('GUIDANCE_SCALE') || '3.5'));  // Default from API
  const [imagePromptStrength, setImagePromptStrength] = useState<number>(parseFloat(localStorage.getItem('IMAGE_PROMPT_STRENGTH') || '0.1'));  // Default for image-editing
  const [gptImageSize, setGptImageSize] = useState<string>(localStorage.getItem('GPT_IMAGE_SIZE') || 'auto');
  const [gptNumImages, setGptNumImages] = useState<number>(parseInt(localStorage.getItem('GPT_NUM_IMAGES') || '1', 10) || 1);
  const [gptQuality, setGptQuality] = useState<string>(localStorage.getItem('GPT_QUALITY') || 'auto');
  const [gptBackground, setGptBackground] = useState<string>(localStorage.getItem('GPT_BACKGROUND') || 'auto');
  // Gemini image model settings
  const [geminiNumImages, setGeminiNumImages] = useState<number>(parseInt(localStorage.getItem('GEMINI_NUM_IMAGES') || '1', 10));
  const [geminiOutputFormat, setGeminiOutputFormat] = useState<string>(localStorage.getItem('GEMINI_OUTPUT_FORMAT') || 'png');
  const [geminiResolution, setGeminiResolution] = useState<string>(localStorage.getItem('GEMINI_RESOLUTION') || '1K');
  const [geminiEnableWebSearch, setGeminiEnableWebSearch] = useState<boolean>(localStorage.getItem('GEMINI_ENABLE_WEB_SEARCH') === 'true');
  // Grok Imagine model settings
  const [grokNumImages, setGrokNumImages] = useState<number>(parseInt(localStorage.getItem('GROK_NUM_IMAGES') || '1', 10));
  const [grokOutputFormat, setGrokOutputFormat] = useState<string>(localStorage.getItem('GROK_OUTPUT_FORMAT') || 'jpeg');
  // Qwen model settings
  const [numLayers, setNumLayers] = useState<number>(parseInt(localStorage.getItem('NUM_LAYERS') || '4', 10));
  const [acceleration, setAcceleration] = useState<string>(localStorage.getItem('ACCELERATION') || 'regular');
  // Video generation settings
  const [videoDuration, setVideoDuration] = useState<string>(localStorage.getItem('VIDEO_DURATION') || '5s');
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>(localStorage.getItem('VIDEO_ASPECT_RATIO') || '16:9');
  const [videoResolution, setVideoResolution] = useState<string>(localStorage.getItem('VIDEO_RESOLUTION') || '720p');
  const [videoGuidanceScale, setVideoGuidanceScale] = useState<number>(parseFloat(localStorage.getItem('VIDEO_GUIDANCE_SCALE') || '3'));
  const [videoSeed, setVideoSeed] = useState<number | null>(localStorage.getItem('VIDEO_SEED') !== 'null' ? parseInt(localStorage.getItem('VIDEO_SEED') || '0', 10) : null);
  const [videoNegativePrompt, setVideoNegativePrompt] = useState<string>(localStorage.getItem('VIDEO_NEGATIVE_PROMPT') || '');
  // Model-specific video settings
  const [generateAudio, setGenerateAudio] = useState<boolean>(localStorage.getItem('GENERATE_AUDIO') !== 'false');  // Default true
  const [videoCfgScale, setVideoCfgScale] = useState<number>(parseFloat(localStorage.getItem('VIDEO_CFG_SCALE') || '0.5'));  // Kling default
  const [videoFps, setVideoFps] = useState<string>(localStorage.getItem('VIDEO_FPS') || '25');  // LTX-2 Pro/Fast default
  // Advanced video settings (used by ltx-2-19b and potentially other models)
  const [videoNumFrames, setVideoNumFrames] = useState<number>(parseInt(localStorage.getItem('VIDEO_NUM_FRAMES') || '121', 10));
  const [videoOutputSize, setVideoOutputSize] = useState<string>(localStorage.getItem('VIDEO_OUTPUT_SIZE') || 'landscape_4_3');
  const [videoUseMultiscale, setVideoUseMultiscale] = useState<boolean>(localStorage.getItem('VIDEO_USE_MULTISCALE') !== 'false');  // Default true
  const [videoNumInferenceSteps, setVideoNumInferenceSteps] = useState<number>(parseInt(localStorage.getItem('VIDEO_NUM_INFERENCE_STEPS') || '40', 10));
  const [videoAcceleration, setVideoAcceleration] = useState<string>(localStorage.getItem('VIDEO_ACCELERATION') || 'regular');
  const [videoCameraLora, setVideoCameraLora] = useState<string>(localStorage.getItem('VIDEO_CAMERA_LORA') || 'none');
  const [videoCameraLoraScale, setVideoCameraLoraScale] = useState<number>(parseFloat(localStorage.getItem('VIDEO_CAMERA_LORA_SCALE') || '1'));
  const [videoEnablePromptExpansion, setVideoEnablePromptExpansion] = useState<boolean>(localStorage.getItem('VIDEO_ENABLE_PROMPT_EXPANSION') === 'true');
  // Video-to-video settings
  const [videoStrength, setVideoStrength] = useState<number>(parseFloat(localStorage.getItem('VIDEO_STRENGTH') || '0.5'));
  // Audio generation settings
  const [audioOutputFormat, setAudioOutputFormat] = useState<string>(localStorage.getItem('AUDIO_OUTPUT_FORMAT') || 'mp3');
  const [audioSeed, setAudioSeed] = useState<number | null>(localStorage.getItem('AUDIO_SEED') !== 'null' ? parseInt(localStorage.getItem('AUDIO_SEED') || '0', 10) : null);
  // TTS settings (MiniMax Speech-02-HD)
  const [ttsVoiceId, setTtsVoiceId] = useState<string>(localStorage.getItem('TTS_VOICE_ID') || 'male-qn-qingse');
  const [ttsSpeed, setTtsSpeed] = useState<number>(parseFloat(localStorage.getItem('TTS_SPEED') || '1.0'));
  const [ttsVolume, setTtsVolume] = useState<number>(parseFloat(localStorage.getItem('TTS_VOLUME') || '1.0'));
  const [ttsPitch, setTtsPitch] = useState<number>(parseInt(localStorage.getItem('TTS_PITCH') || '0', 10));
  const [ttsEmotion, setTtsEmotion] = useState<string>(localStorage.getItem('TTS_EMOTION') || 'neutral');
  // Chatterbox TTS settings
  const [chatterboxExaggeration, setChatterboxExaggeration] = useState<number>(parseFloat(localStorage.getItem('CHATTERBOX_EXAGGERATION') || '0.25'));
  const [chatterboxTemperature, setChatterboxTemperature] = useState<number>(parseFloat(localStorage.getItem('CHATTERBOX_TEMPERATURE') || '0.7'));
  const [chatterboxCfg, setChatterboxCfg] = useState<number>(parseFloat(localStorage.getItem('CHATTERBOX_CFG') || '0.5'));
  // Music/SFX generation settings
  const [audioDuration, setAudioDuration] = useState<number>(parseFloat(localStorage.getItem('AUDIO_DURATION') || '10'));
  // Beatoven-specific settings
  const [beatovenRefinement, setBeatovenRefinement] = useState<number>(parseInt(localStorage.getItem('BEATOVEN_REFINEMENT') || '100', 10));
  const [beatovenCreativity, setBeatovenCreativity] = useState<number>(parseFloat(localStorage.getItem('BEATOVEN_CREATIVITY') || '16'));
  const [beatovenNegativePrompt, setBeatovenNegativePrompt] = useState<string>(localStorage.getItem('BEATOVEN_NEGATIVE_PROMPT') || '');
  // MMAudio V2 settings
  const [mmAudioCfgStrength, setMmAudioCfgStrength] = useState<number>(parseFloat(localStorage.getItem('MMAUDIO_CFG_STRENGTH') || '4.5'));
  const [mmAudioNumSteps, setMmAudioNumSteps] = useState<number>(parseInt(localStorage.getItem('MMAUDIO_NUM_STEPS') || '25', 10));
  // Bria BG Removal settings
  const [briaBgColor, setBriaBgColor] = useState<string>(localStorage.getItem('BRIA_BG_COLOR') || 'transparent');
  const [briaOutputCodec, setBriaOutputCodec] = useState<string>(localStorage.getItem('BRIA_OUTPUT_CODEC') || 'mp4_h265');
  // Video-to-video preprocessor
  const [videoPreprocessor, setVideoPreprocessor] = useState<string>(localStorage.getItem('VIDEO_PREPROCESSOR') || 'none');
  // Audio understanding settings
  const [audioDetailedAnalysis, setAudioDetailedAnalysis] = useState<boolean>(localStorage.getItem('AUDIO_DETAILED_ANALYSIS') === 'true');

  useEffect(() => {
    localStorage.setItem('SAFETY_TOLERANCE', safetyTolerance);
    localStorage.setItem('ASPECT_RATIO', aspectRatio);
    localStorage.setItem('IMAGE_SIZE', JSON.stringify(imageSize));
    localStorage.setItem('RAW', raw.toString());
    localStorage.setItem('ENABLE_SAFETY_CHECKER', enableSafetyChecker.toString());
    localStorage.setItem('SEED', seed !== null ? seed.toString() : 'null');
    localStorage.setItem('GUIDANCE_SCALE', guidanceScale.toString());
    localStorage.setItem('IMAGE_PROMPT_STRENGTH', imagePromptStrength.toString());
    localStorage.setItem('GPT_IMAGE_SIZE', gptImageSize);
    localStorage.setItem('GPT_NUM_IMAGES', gptNumImages.toString());
    localStorage.setItem('GPT_QUALITY', gptQuality);
    localStorage.setItem('GPT_BACKGROUND', gptBackground);
    // Gemini image model persistence
    localStorage.setItem('GEMINI_NUM_IMAGES', geminiNumImages.toString());
    localStorage.setItem('GEMINI_OUTPUT_FORMAT', geminiOutputFormat);
    localStorage.setItem('GEMINI_RESOLUTION', geminiResolution);
    localStorage.setItem('GEMINI_ENABLE_WEB_SEARCH', geminiEnableWebSearch.toString());
    // Grok Imagine model persistence
    localStorage.setItem('GROK_NUM_IMAGES', grokNumImages.toString());
    localStorage.setItem('GROK_OUTPUT_FORMAT', grokOutputFormat);
    // Qwen model persistence
    localStorage.setItem('NUM_LAYERS', numLayers.toString());
    localStorage.setItem('ACCELERATION', acceleration);
    // Video generation persistence
    localStorage.setItem('VIDEO_DURATION', videoDuration);
    localStorage.setItem('VIDEO_ASPECT_RATIO', videoAspectRatio);
    localStorage.setItem('VIDEO_RESOLUTION', videoResolution);
    localStorage.setItem('VIDEO_GUIDANCE_SCALE', videoGuidanceScale.toString());
    localStorage.setItem('VIDEO_SEED', videoSeed !== null ? videoSeed.toString() : 'null');
    localStorage.setItem('VIDEO_NEGATIVE_PROMPT', videoNegativePrompt);
    // Model-specific video persistence
    localStorage.setItem('GENERATE_AUDIO', generateAudio.toString());
    localStorage.setItem('VIDEO_CFG_SCALE', videoCfgScale.toString());
    localStorage.setItem('VIDEO_FPS', videoFps);
    // Advanced video settings persistence
    localStorage.setItem('VIDEO_NUM_FRAMES', videoNumFrames.toString());
    localStorage.setItem('VIDEO_OUTPUT_SIZE', videoOutputSize);
    localStorage.setItem('VIDEO_USE_MULTISCALE', videoUseMultiscale.toString());
    localStorage.setItem('VIDEO_NUM_INFERENCE_STEPS', videoNumInferenceSteps.toString());
    localStorage.setItem('VIDEO_ACCELERATION', videoAcceleration);
    localStorage.setItem('VIDEO_CAMERA_LORA', videoCameraLora);
    localStorage.setItem('VIDEO_CAMERA_LORA_SCALE', videoCameraLoraScale.toString());
    localStorage.setItem('VIDEO_ENABLE_PROMPT_EXPANSION', videoEnablePromptExpansion.toString());
    // Video-to-video persistence
    localStorage.setItem('VIDEO_STRENGTH', videoStrength.toString());
    // Audio generation persistence
    localStorage.setItem('AUDIO_OUTPUT_FORMAT', audioOutputFormat);
    localStorage.setItem('AUDIO_SEED', audioSeed !== null ? audioSeed.toString() : 'null');
    // TTS persistence
    localStorage.setItem('TTS_VOICE_ID', ttsVoiceId);
    localStorage.setItem('TTS_SPEED', ttsSpeed.toString());
    localStorage.setItem('TTS_VOLUME', ttsVolume.toString());
    localStorage.setItem('TTS_PITCH', ttsPitch.toString());
    localStorage.setItem('TTS_EMOTION', ttsEmotion);
    // Chatterbox persistence
    localStorage.setItem('CHATTERBOX_EXAGGERATION', chatterboxExaggeration.toString());
    localStorage.setItem('CHATTERBOX_TEMPERATURE', chatterboxTemperature.toString());
    localStorage.setItem('CHATTERBOX_CFG', chatterboxCfg.toString());
    // Music/SFX persistence
    localStorage.setItem('AUDIO_DURATION', audioDuration.toString());
    // Beatoven persistence
    localStorage.setItem('BEATOVEN_REFINEMENT', beatovenRefinement.toString());
    localStorage.setItem('BEATOVEN_CREATIVITY', beatovenCreativity.toString());
    localStorage.setItem('BEATOVEN_NEGATIVE_PROMPT', beatovenNegativePrompt);
    // MMAudio V2 persistence
    localStorage.setItem('MMAUDIO_CFG_STRENGTH', mmAudioCfgStrength.toString());
    localStorage.setItem('MMAUDIO_NUM_STEPS', mmAudioNumSteps.toString());
    // Bria BG Removal persistence
    localStorage.setItem('BRIA_BG_COLOR', briaBgColor);
    localStorage.setItem('BRIA_OUTPUT_CODEC', briaOutputCodec);
    // Video preprocessor persistence
    localStorage.setItem('VIDEO_PREPROCESSOR', videoPreprocessor);
    // Audio understanding persistence
    localStorage.setItem('AUDIO_DETAILED_ANALYSIS', audioDetailedAnalysis.toString());
  }, [safetyTolerance, aspectRatio, imageSize, raw, enableSafetyChecker, seed, guidanceScale, imagePromptStrength, gptImageSize, gptNumImages, gptQuality, gptBackground, geminiNumImages, geminiOutputFormat, geminiResolution, geminiEnableWebSearch, grokNumImages, grokOutputFormat, numLayers, acceleration, videoDuration, videoAspectRatio, videoResolution, videoGuidanceScale, videoSeed, videoNegativePrompt, generateAudio, videoCfgScale, videoFps, videoNumFrames, videoOutputSize, videoUseMultiscale, videoNumInferenceSteps, videoAcceleration, videoCameraLora, videoCameraLoraScale, videoEnablePromptExpansion, videoStrength, audioOutputFormat, audioSeed, ttsVoiceId, ttsSpeed, ttsVolume, ttsPitch, ttsEmotion, chatterboxExaggeration, chatterboxTemperature, chatterboxCfg, audioDuration, beatovenRefinement, beatovenCreativity, beatovenNegativePrompt, mmAudioCfgStrength, mmAudioNumSteps, briaBgColor, briaOutputCodec, videoPreprocessor, audioDetailedAnalysis]);

  return (
    <ConfigContext.Provider value={{
      safetyTolerance, setSafetyTolerance,
      aspectRatio, setAspectRatio,
      imageSize, setImageSize,
      raw, setRaw,
      enableSafetyChecker, setEnableSafetyChecker,
      seed, setSeed,
      guidanceScale, setGuidanceScale,
      imagePromptStrength, setImagePromptStrength,
      gptImageSize, setGptImageSize,
      gptNumImages, setGptNumImages,
      gptQuality, setGptQuality,
      gptBackground, setGptBackground,
      geminiNumImages, setGeminiNumImages,
      geminiOutputFormat, setGeminiOutputFormat,
      geminiResolution, setGeminiResolution,
      geminiEnableWebSearch, setGeminiEnableWebSearch,
      grokNumImages, setGrokNumImages,
      grokOutputFormat, setGrokOutputFormat,
      numLayers, setNumLayers,
      acceleration, setAcceleration,
      // Video generation
      videoDuration, setVideoDuration,
      videoAspectRatio, setVideoAspectRatio,
      videoResolution, setVideoResolution,
      videoGuidanceScale, setVideoGuidanceScale,
      videoSeed, setVideoSeed,
      videoNegativePrompt, setVideoNegativePrompt,
      // Model-specific video settings
      generateAudio, setGenerateAudio,
      videoCfgScale, setVideoCfgScale,
      videoFps, setVideoFps,
      // Advanced video settings
      videoNumFrames, setVideoNumFrames,
      videoOutputSize, setVideoOutputSize,
      videoUseMultiscale, setVideoUseMultiscale,
      videoNumInferenceSteps, setVideoNumInferenceSteps,
      videoAcceleration, setVideoAcceleration,
      videoCameraLora, setVideoCameraLora,
      videoCameraLoraScale, setVideoCameraLoraScale,
      videoEnablePromptExpansion, setVideoEnablePromptExpansion,
      // Video-to-video settings
      videoStrength, setVideoStrength,
      // Audio generation
      audioOutputFormat, setAudioOutputFormat,
      audioSeed, setAudioSeed,
      // TTS settings
      ttsVoiceId, setTtsVoiceId,
      ttsSpeed, setTtsSpeed,
      ttsVolume, setTtsVolume,
      ttsPitch, setTtsPitch,
      ttsEmotion, setTtsEmotion,
      // Chatterbox settings
      chatterboxExaggeration, setChatterboxExaggeration,
      chatterboxTemperature, setChatterboxTemperature,
      chatterboxCfg, setChatterboxCfg,
      // Music/SFX settings
      audioDuration, setAudioDuration,
      // Beatoven settings
      beatovenRefinement, setBeatovenRefinement,
      beatovenCreativity, setBeatovenCreativity,
      beatovenNegativePrompt, setBeatovenNegativePrompt,
      // MMAudio V2 settings
      mmAudioCfgStrength, setMmAudioCfgStrength,
      mmAudioNumSteps, setMmAudioNumSteps,
      // Bria BG Removal settings
      briaBgColor, setBriaBgColor,
      briaOutputCodec, setBriaOutputCodec,
      // Video preprocessor
      videoPreprocessor, setVideoPreprocessor,
      // Audio understanding
      audioDetailedAnalysis, setAudioDetailedAnalysis
    }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
