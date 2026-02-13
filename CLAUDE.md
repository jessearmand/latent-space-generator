# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Latent Space Generator — React single-page application for AI media generation. Supports multiple providers and generation modes:
- **fal.ai image models**: Flux, SDXL, Flux 2 [klein], and other image generation models via `@fal-ai/client`
- **fal.ai video models**: Kling, Veo, LTX-2, MiniMax Hailuo, Hunyuan, and more
- **fal.ai audio models**: MiniMax TTS, Chatterbox, Beatoven, ElevenLabs SFX, and more
- **OpenAI models**: GPT Image models (gpt-image-1.5, gpt-image-1-mini) via direct API calls, fal.ai, or OpenRouter
- **Gemini image models**: Gemini 2.5 Flash Image, Gemini 3 Pro Image via fal.ai (OpenRouter fallback)

Uses Vite for development, Vitest for testing, and Biome for linting.

## Development Commands

```bash
bun install           # Install dependencies
bun start             # Start both client (port 3000) and proxy server (port 3001)
bun run start:client  # Start Vite dev server only
bun run start:server  # Start Bun proxy server only
bun run build         # Production build (output to build/)
bun run test          # Run tests with Vitest (not `bun test` which uses Bun's native runner)
bun run typecheck     # TypeScript type checking
bun run lint          # Run Biome linter
bun run lint:fix      # Fix linting issues automatically
```

## Architecture

### Provider Hierarchy

The app uses nested React Context providers across `index.tsx` and `App.tsx`:

```text
ServerKeysProvider (contexts/ServerKeysContext.tsx)
  └── ConfigProvider (config.tsx)
        └── OpenRouterAuthProvider (contexts/OpenRouterAuthContext.tsx)
              └── OpenRouterProvider (contexts/OpenRouterContext.tsx)
                    └── App (App.tsx)
                          └── ModelsProvider (contexts/ModelsContext.tsx)
```

- **ServerKeysProvider**: Fetches `/health` on mount to determine which API keys are configured server-side (fal, openai, openrouter)
- **ConfigProvider**: Persists generation parameters (safety tolerance, aspect ratio, guidance scale, GPT-specific options, video settings, audio settings) to localStorage
- **OpenRouterAuthProvider**: Manages OpenRouter OAuth PKCE authentication state (user API key, login/logout)
- **OpenRouterProvider**: Manages OpenRouter model list, filtering, and caching for prompt optimization
- **ModelsProvider**: Fetches and caches available models from fal.ai API, manages model selection for image, video, and audio modes

### Proxy Server

The Bun-based proxy server (`server/index.ts`) handles API communication:

| Endpoint | Purpose |
|----------|---------|
| `/api/fal/proxy` | Proxies fal.ai API calls (image, video, audio), injects `FAL_API_KEY` server-side |
| `/api/openai/images` | Proxies OpenAI image generation, injects `OPENAI_API_KEY` server-side |
| `/api/openrouter/models` | Fetches OpenRouter model list for prompt optimizer |
| `/api/openrouter/completion` | Proxies OpenRouter completion (uses user OAuth key if available, else server key) |
| `/api/openrouter/images` | Proxies OpenRouter image generation (Gemini, GPT via OpenRouter fallback) |
| `/api/health` | Health check with key availability: `{ keys: { fal, openai, openrouter } }` |

Security: Only allows requests to whitelisted fal.ai domains (`api.fal.ai`, `queue.fal.run`, `fal.run`, `storage.fal.ai`, `gateway.fal.ai`).

### Custom Hooks Architecture

Generation logic is extracted into reusable hooks in `src/hooks/`:

| Hook | Purpose |
|------|---------|
| `useImageGeneration` | Image generation with multi-backend routing (OpenAI → fal.ai → OpenRouter) |
| `useVideoGeneration` | Video generation with model-specific parameter routing |
| `useAudioGeneration` | Audio generation (TTS, music, SFX, voice cloning, video-to-audio) |
| `useGenerationMode` | Manages active generation tab and mode switching |
| `useImageUpload` | Multi-image upload with clipboard paste support |
| `useStatusMessage` | Status message state management |

### Dynamic Model Loading

All modes (image, video, audio) start with curated model lists for instant load. A "Show all models" toggle lazy-loads the full catalog from `https://api.fal.ai/v1/models`. Search filtering is available when showing all models.

1. **`services/imageModels.ts`**, **`videoModels.ts`**, **`audioModels.ts`**: Curated model definitions with category helpers
2. **`services/models.ts`**: API client with pagination support, fetches full catalogs for all categories on demand
3. **`types/models.ts`**: TypeScript interfaces matching API response shape, plus `normalizeModel()` converter
4. **`contexts/ModelsContext.tsx`**: React Context with curated defaults, lazy-loading, caching (24h TTL in localStorage), and error fallback to cache

### Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main UI, orchestrates generation hooks and components |
| `src/config.tsx` | ConfigContext for generation parameters (image, video, audio) |
| `src/contexts/ModelsContext.tsx` | Model fetching, caching, selection state |
| `src/contexts/ServerKeysContext.tsx` | Server API key availability (fal, openai, openrouter) |
| `src/contexts/OpenRouterAuthContext.tsx` | OpenRouter auth state (user API key, login/logout) |
| `src/contexts/OpenRouterContext.tsx` | OpenRouter model selection, filtering, caching |
| **Hooks** | |
| `src/hooks/useImageGeneration.ts` | Image generation logic with queue polling |
| `src/hooks/useVideoGeneration.ts` | Video generation with model-specific parameters |
| `src/hooks/useAudioGeneration.ts` | Audio generation (TTS, music, SFX, voice cloning) |
| `src/hooks/useGenerationMode.ts` | Generation mode/tab state management |
| **Services** | |
| `src/services/models.ts` | Direct HTTP fetch to fal.ai Models API |
| `src/services/imageModels.ts` | Curated image model definitions and helpers |
| `src/services/videoModels.ts` | Curated video model definitions and helpers |
| `src/services/audioModels.ts` | Curated audio model definitions and helpers |
| `src/services/openai.ts` | OpenAI Images API client for GPT models |
| `src/services/openrouterImage.ts` | OpenRouter image generation client (Gemini, GPT fallback) |
| `src/services/openrouter.ts` | OpenRouter API client for prompt optimization |
| `src/services/openrouterAuth.ts` | OpenRouter OAuth PKCE authentication |
| `src/services/errors.ts` | Error parsing utilities for user-friendly messages |
| **Types** | |
| `src/types/models.ts` | TypeScript types for model data |
| `src/types/audio.ts` | Audio-specific types (voices, emotions) |
| `src/types/openrouter.ts` | OpenRouter model types and filter utilities |
| **Components** | |
| `src/components/Sidebar.tsx` | Navigation sidebar for generation modes |
| `src/components/ModelSelector.tsx` | Dropdown with refresh capability |
| `src/components/ModelConfigPanel.tsx` | Dynamic settings panel (Flux vs GPT configs) |
| `src/components/VideoConfigOptions.tsx` | Video-specific settings (duration, resolution, FPS, V2V) |
| `src/components/AudioConfigOptions.tsx` | Audio-specific settings (TTS, music, SFX) |
| `src/components/VideoPlayer.tsx` | Video playback component |
| `src/components/AudioPlayer.tsx` | Audio playback component |
| `src/components/GenerationTabs.tsx` | Tab navigation for generation modes |
| `src/components/ImageUploadZone.tsx` | Multi-image upload with clipboard paste |
| `src/components/VideoUploadZone.tsx` | Video upload for V2V and video-to-audio |
| `src/components/AudioUploadZone.tsx` | Audio upload for voice cloning |
| `src/components/PromptOptimizer.tsx` | AI-powered prompt enhancement |
| `src/components/DownloadButton.tsx` | Download button for generated media |
| `server/index.ts` | Bun proxy server for API key injection |

### Queue Polling Pattern (fal.ai)

```typescript
// Submit request
const { request_id } = await fal.queue.submit(modelId, { input });

// Poll until complete
while (true) {
    const status = await fal.queue.status(modelId, { requestId, logs: true });
    if (status.status === "COMPLETED") {
        const result = await fal.queue.result(modelId, { requestId });
        // Handle result.data.images[0].url or result.data.video.url
        break;
    }
    if (status.status !== "IN_QUEUE" && status.status !== "IN_PROGRESS") {
        // Handle error
        break;
    }
    await sleep(2000);
}
```

Note: Type assertions (`as any`) are needed when accessing `logs` from status results due to @fal-ai/client type limitations.

### GPT Image Model Routing

GPT Image models use cascading fallback routing based on available server keys:

| Priority | Backend | Model ID Format | When Used |
|----------|---------|-----------------|-----------|
| 1 | OpenAI direct | `gpt-image-1.5` | `OPENAI_API_KEY` configured |
| 2 | fal.ai queue | `fal-ai/gpt-image-1.5` | `FAL_API_KEY` configured |
| 3 | OpenRouter | `openai/gpt-5-image` | `OPENROUTER_API_KEY` or user OAuth |

Helper functions in `services/imageModels.ts`:
- `mapToOpenAIModelName()`: Maps fal.ai endpoint ID → OpenAI API model name
- `mapToOpenRouterModelId()`: Maps OpenAI model name → OpenRouter model ID

### Gemini Image Model Routing

Gemini image models use cascading fallback routing, similar to GPT models:

| Priority | Backend | Model ID Format | When Used |
|----------|---------|-----------------|-----------|
| 1 | fal.ai queue | `fal-ai/gemini-25-flash-image` | `FAL_API_KEY` configured |
| 2 | OpenRouter | `google/gemini-2.5-flash-image` | `OPENROUTER_API_KEY` or user OAuth |

Helper functions in `services/imageModels.ts`:
- `isGeminiImageModel()`: Detects Gemini image models (fal.ai or OpenRouter format)
- `mapGeminiToOpenRouterModelId()`: Maps fal.ai endpoint ID → OpenRouter model ID for fallback

### Model-Specific Config

The `ModelConfigPanel` component renders different settings based on model type:
- **GPT models** (`endpointId.includes('gpt-image')`): image size, quality, background options
- **Gemini image models** (`gemini...image`): aspect ratio only
- **Flux/other models**: safety tolerance, aspect ratio, guidance scale, seed, image-to-image settings

### Generation Modes

The app supports multiple generation modes, managed by `useGenerationMode` hook:

| Mode | Description |
|------|-------------|
| `text-to-image` | Generate images from text prompts |
| `image-to-image` | Transform images using text prompts |
| `text-to-video` | Generate videos from text prompts |
| `image-to-video` | Transform images into videos |
| `video-to-video` | Style transfer, background removal, relighting |
| `text-to-speech` | Generate speech from text (MiniMax, Chatterbox) |
| `text-to-audio` | Generate music and sound effects |
| `audio-to-audio` | Voice cloning (Dia TTS) |
| `video-to-audio` | Generate audio from video (Mirelo SFX) |

### Video Generation Architecture

Video generation uses the same queue-based pattern as image generation, with model-specific parameter handling in `VideoConfigOptions.tsx`.

**Curated Models (`services/videoModels.ts`):**
- Provides `CURATED_TEXT_TO_VIDEO_MODELS`, `CURATED_IMAGE_TO_VIDEO_MODELS`, and `CURATED_VIDEO_TO_VIDEO_MODELS` arrays
- Includes Kling 2.5/2.0, Veo 3, LTX-2 Pro/Fast/19B, MiniMax Hailuo, Hunyuan, and more
- Users can toggle "Show all models" to see the full fal.ai catalog

**Model-Specific Parameters:**

| Model Family | Unique Parameters |
|--------------|------------------|
| **Kling** | `cfg_scale` (0-1), duration (5s/10s) |
| **Veo** | `generate_audio`, duration (4s/6s/8s), resolution (720p/1080p) |
| **LTX-2 Pro/Fast** | `generate_audio`, `fps` (25/50), resolution (up to 2160p) |
| **LTX-2 19B** | `num_frames`, `video_size`, `camera_lora`, `acceleration`, `num_inference_steps` |
| **LTX-2 19B V2V** | `strength`, `preprocessor` (depth/canny/pose) |
| **MMAudio V2** | `cfg_strength`, `num_steps` |
| **Bria BG Removal** | `background_color`, `output_container_and_codec` |

**Parameter Routing in `useVideoGeneration.ts`:**
```typescript
const isKlingModel = modelIdLower.includes('kling');
const isVeoModel = modelIdLower.includes('veo');
const isLtx19bModel = modelIdLower.includes('ltx-2-19b');
const isLtxProFastModel = modelIdLower.includes('ltx-2') && !modelIdLower.includes('ltx-2-19b');

// Conditionally add parameters based on model type
if (isLtxProFastModel) {
    input.fps = parseInt(config.videoFps, 10);
}
```

### Audio Generation Architecture

Audio generation is handled by `useAudioGeneration` hook with model-specific parameter routing.

**Curated Models (`services/audioModels.ts`):**
- `CURATED_TEXT_TO_SPEECH_MODELS`: MiniMax Speech-02-HD, Chatterbox TTS
- `CURATED_TEXT_TO_AUDIO_MODELS`: ACE Music, Beatoven, ElevenLabs SFX, Stable Audio
- `CURATED_AUDIO_TO_AUDIO_MODELS`: Dia TTS Voice Clone
- `CURATED_VIDEO_TO_AUDIO_MODELS`: Mirelo SFX

**Model-Specific Parameters:**

| Model | Unique Parameters |
|-------|------------------|
| **MiniMax Speech-02-HD** | `voice_id`, `speed`, `vol` (0-10), `pitch`, `emotion` |
| **Chatterbox TTS** | `exaggeration`, `temperature`, `cfg` |
| **Dia TTS Voice Clone** | `ref_audio_url`, `text` |
| **Beatoven** | `refinement`, `creativity`, `negative_prompt` |
| **Mirelo SFX V2A** | `video_url`, `text_prompt` |

## API Keys

**Server-side (environment variables)**:
- `FAL_API_KEY`: Required for fal.ai models (Flux, video, audio), also fallback for GPT image models
- `OPENAI_API_KEY`: Preferred for GPT Image models (direct, no queue), injected server-side by proxy
- `OPENROUTER_API_KEY`: Fallback for Gemini image models, fallback for GPT models, fallback for prompt optimization

**Client-side (OAuth)**:
- **OpenRouter**: Users can authenticate via OAuth PKCE in Settings to use their own credits for prompt optimization and OpenRouter image generation. Falls back to the server's shared key.

**Key availability** is reported by `/health` and consumed by `ServerKeysContext` to route GPT image models to the best available backend.

The fal client uses proxy configuration: `fal.config({ proxyUrl: '/api/fal/proxy' })` (relative path, resolved by Vite's dev proxy to port 3001).

## Adding a New Model Category

1. Update `ImageModelCategory` type in `types/models.ts`
2. Add category to parallel fetch in `services/models.ts:fetchImageGenerationModels()`
3. Update `normalizeModel()` if new category needs special `supportsImageInput` logic
4. Add model-specific config options in `ModelConfigPanel.tsx` if needed

## Adding a New API Provider

1. Create service in `src/services/` (see `openai.ts` as example)
2. Add proxy endpoint in `server/index.ts` with appropriate security checks
3. Detect model type in the appropriate generation hook and route to service
4. Add UI config options in the appropriate config component

## Adding a New Video Model Family

1. Add model detection logic in `VideoConfigOptions.tsx` (e.g., `const isNewModel = modelId.includes('new-model')`)
2. Define supported durations/resolutions in `getDurationOptions()`, `getResolutionOptions()` functions
3. Add model-specific UI controls with appropriate conditionals
4. Add state to `config.tsx` if new parameters are needed
5. Update parameter routing in `useVideoGeneration.ts` to include model-specific parameters
6. (Optional) Add to curated models in `services/videoModels.ts`

## Adding a New Audio Model

1. Add model to appropriate array in `services/audioModels.ts`
2. Add model detection helper if needed (e.g., `isBeatovenModel()`)
3. Add model-specific UI controls in `AudioConfigOptions.tsx`
4. Add state to `config.tsx` if new parameters are needed
5. Update parameter routing in `useAudioGeneration.ts`
