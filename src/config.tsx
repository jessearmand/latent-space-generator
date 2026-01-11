import { createContext, useState, useEffect, useContext, type ReactNode } from 'react';

interface ConfigState {
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
  }, [safetyTolerance, aspectRatio, imageSize, raw, enableSafetyChecker, seed, guidanceScale, imagePromptStrength, gptImageSize, gptNumImages, gptQuality, gptBackground, numLayers, acceleration, videoDuration, videoAspectRatio, videoResolution, videoGuidanceScale, videoSeed, videoNegativePrompt]);

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
      numLayers, setNumLayers,
      acceleration, setAcceleration,
      // Video generation
      videoDuration, setVideoDuration,
      videoAspectRatio, setVideoAspectRatio,
      videoResolution, setVideoResolution,
      videoGuidanceScale, setVideoGuidanceScale,
      videoSeed, setVideoSeed,
      videoNegativePrompt, setVideoNegativePrompt
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
