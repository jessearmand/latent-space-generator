import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

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
}

interface ConfigContextType extends ConfigState {
  setSafetyTolerance: (value: string) => void;
  setAspectRatio: (value: string) => void;
  setImageSize: (value: { width: number; height: number } | string) => void;
  setRaw: (value: boolean) => void;
  setEnableSafetyChecker: (value: boolean) => void;
  setSeed: (value: number | null) => void;
  setGuidanceScale: (value: number) => void;  // New setter
  setImagePromptStrength: (value: number) => void;  // New setter
  setGptImageSize: (value: string) => void;
  setGptNumImages: (value: number) => void;
  setGptQuality: (value: string) => void;
  setGptBackground: (value: string) => void;
}

export const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [safetyTolerance, setSafetyTolerance] = useState<string>(localStorage.getItem('SAFETY_TOLERANCE') || '2');
  const [aspectRatio, setAspectRatio] = useState<string>(localStorage.getItem('ASPECT_RATIO') || '16:9');
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | string>(JSON.parse(localStorage.getItem('IMAGE_SIZE') || '"landscape_4_3"'));
  const [raw, setRaw] = useState<boolean>(localStorage.getItem('RAW') === 'true');
  const [enableSafetyChecker, setEnableSafetyChecker] = useState<boolean>(localStorage.getItem('ENABLE_SAFETY_CHECKER') === 'true');
  const [seed, setSeed] = useState<number | null>(localStorage.getItem('SEED') !== 'null' ? parseInt(localStorage.getItem('SEED') || '0') : null);
  const [guidanceScale, setGuidanceScale] = useState<number>(parseFloat(localStorage.getItem('GUIDANCE_SCALE') || '3.5'));  // Default from API
  const [imagePromptStrength, setImagePromptStrength] = useState<number>(parseFloat(localStorage.getItem('IMAGE_PROMPT_STRENGTH') || '0.1'));  // Default for image-editing
  const [gptImageSize, setGptImageSize] = useState<string>(localStorage.getItem('GPT_IMAGE_SIZE') || 'auto');
  const [gptNumImages, setGptNumImages] = useState<number>(parseInt(localStorage.getItem('GPT_NUM_IMAGES') || '1') || 1);
  const [gptQuality, setGptQuality] = useState<string>(localStorage.getItem('GPT_QUALITY') || 'auto');
  const [gptBackground, setGptBackground] = useState<string>(localStorage.getItem('GPT_BACKGROUND') || 'auto');

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
  }, [safetyTolerance, aspectRatio, imageSize, raw, enableSafetyChecker, seed, guidanceScale, imagePromptStrength, gptImageSize, gptNumImages, gptQuality, gptBackground]);

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
      gptBackground, setGptBackground
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
