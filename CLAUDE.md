# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

React single-page application for AI image and video generation. Supports multiple providers:
- **fal.ai image models**: Flux, SDXL, Flux 2 [klein], and other image generation models via `@fal-ai/client`
- **fal.ai video models**: Kling, Veo, LTX-2, MiniMax Hailuo, Hunyuan, and more
- **OpenAI models**: GPT Image models (gpt-image-1, gpt-image-1.5) via direct API calls

Uses Vite for development, Vitest for testing, and Biome for linting.

## Development Commands

```bash
bun install           # Install dependencies
bun start             # Start both client (port 3000) and proxy server (port 3001)
bun run start:client  # Start Vite dev server only
bun run start:server  # Start Bun proxy server only
bun run build         # Production build (output to build/)
bun test              # Run tests with Vitest
bun run typecheck     # TypeScript type checking
bun run lint          # Run Biome linter
bun run lint:fix      # Fix linting issues automatically
```

## Architecture

### Provider Hierarchy

The app uses nested React Context providers in `index.tsx`:

```
ConfigProvider (config.tsx)
  └── ModelsProvider (contexts/ModelsContext.tsx)
        └── App (App.tsx)
```

- **ConfigProvider**: Persists generation parameters (safety tolerance, aspect ratio, guidance scale, GPT-specific options, video settings) to localStorage
- **ModelsProvider**: Fetches and caches available models from fal.ai API, manages model selection for both image and video modes

### Proxy Server

The Bun-based proxy server (`server/index.ts`) handles API communication:

| Endpoint | Purpose |
|----------|---------|
| `/api/fal/proxy` | Proxies fal.ai API calls (image and video), injects `FAL_API_KEY` server-side |
| `/api/openai/images` | Proxies OpenAI image generation, accepts API key in request body |
| `/api/openrouter/chat` | Proxies OpenRouter API for prompt optimization |
| `/health` | Health check endpoint |

Security: Only allows requests to whitelisted fal.ai domains (`api.fal.ai`, `queue.fal.run`, `fal.run`, `storage.fal.ai`, `gateway.fal.ai`).

### Dynamic Model Loading

Models are fetched directly from `https://api.fal.ai/v1/models` rather than using a hardcoded list:

1. **`services/models.ts`**: API client with pagination support, fetches both `text-to-image` and `image-to-image` categories
2. **`types/models.ts`**: TypeScript interfaces matching API response shape, plus `normalizeModel()` converter
3. **`contexts/ModelsContext.tsx`**: React Context with caching (24h TTL in localStorage), loading states, and error fallback to cache

### Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main UI, queue polling logic, image/video generation routing |
| `src/config.tsx` | ConfigContext for generation parameters (image and video) |
| `src/contexts/ModelsContext.tsx` | Model fetching, caching, selection state |
| `src/services/models.ts` | Direct HTTP fetch to fal.ai Models API |
| `src/services/videoModels.ts` | Curated video model definitions and helpers |
| `src/services/openai.ts` | OpenAI Images API client for GPT models |
| `src/services/openrouter.ts` | OpenRouter API client for prompt optimization |
| `src/services/errors.ts` | Error parsing utilities for user-friendly messages |
| `src/types/models.ts` | TypeScript types for model data |
| `src/components/ModelSelector.tsx` | Dropdown with refresh capability |
| `src/components/ModelConfigPanel.tsx` | Dynamic settings panel (Flux vs GPT configs) |
| `src/components/VideoConfigOptions.tsx` | Video-specific settings (duration, resolution, FPS) |
| `src/components/VideoPlayer.tsx` | Video playback component |
| `src/components/GenerationTabs.tsx` | Tab navigation for text-to-image/video modes |
| `src/components/ImageUploadZone.tsx` | Multi-image upload with clipboard paste support |
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
        // Handle result.data.images[0].url
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

### OpenAI Direct Calls

GPT Image models bypass fal.ai and call OpenAI directly via the proxy:

```typescript
const response = await fetch('/api/openai/images', {
    method: 'POST',
    body: JSON.stringify({
        openai_api_key: apiKey,  // Passed in body, not header
        model: 'gpt-image-1.5',
        prompt: '...',
        size: '1024x1024',
        quality: 'high',
    }),
});
```

### Model-Specific Config

The `ModelConfigPanel` component renders different settings based on model type:
- **GPT models** (`endpointId.includes('gpt-image')`): image size, quality, background options
- **Flux/other models**: safety tolerance, aspect ratio, guidance scale, seed, image-to-image settings

### Video Generation Architecture

Video generation uses the same queue-based pattern as image generation, with model-specific parameter handling in `VideoConfigOptions.tsx`.

**Generation Modes:**
- `text-to-video`: Generate video from text prompt
- `image-to-video`: Transform an uploaded image into video

**Curated Models (`services/videoModels.ts`):**
- Provides `CURATED_TEXT_TO_VIDEO_MODELS` and `CURATED_IMAGE_TO_VIDEO_MODELS` arrays
- Includes Kling 2.5/2.0, Veo 3, LTX-2 Pro/Fast, MiniMax Hailuo, Hunyuan, and more
- Users can toggle "Show all models" to see the full fal.ai catalog

**Model-Specific Parameters:**

| Model Family | Unique Parameters |
|--------------|------------------|
| **Kling** | `cfg_scale` (0-1), duration (5s/10s) |
| **Veo** | `generate_audio`, duration (4s/6s/8s), resolution (720p/1080p) |
| **LTX-2 Pro/Fast** | `generate_audio`, `fps` (25/50), resolution (up to 2160p) |
| **LTX-2 19B** | `num_frames`, `video_size`, `camera_lora`, `acceleration`, `num_inference_steps` |

**Parameter Routing in `App.tsx:generateVideo()`:**
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

## API Keys

**Server-side (environment variable)**:
- `FAL_API_KEY`: Required for proxy server, injected into all fal.ai image and video requests

**Client-side (localStorage via Settings modal)**:
- `OPENAI_API_KEY`: Required only for GPT Image models (passed through proxy in request body)
- `OPENROUTER_API_KEY`: Optional, enables the Prompt Optimizer feature

The fal client uses proxy configuration: `fal.config({ proxyUrl: 'http://localhost:3001/api/fal/proxy' })`.

## Adding a New Model Category

1. Update `ImageModelCategory` type in `types/models.ts`
2. Add category to parallel fetch in `services/models.ts:fetchImageGenerationModels()`
3. Update `normalizeModel()` if new category needs special `supportsImageInput` logic
4. Add model-specific config options in `ModelConfigPanel.tsx` if needed

## Adding a New API Provider

1. Create service in `src/services/` (see `openai.ts` as example)
2. Add proxy endpoint in `server/index.ts` with appropriate security checks
3. Detect model type in `App.tsx` and route to appropriate service
4. Add UI config options in `ModelConfigPanel.tsx`

## Adding a New Video Model Family

1. Add model detection logic in `VideoConfigOptions.tsx` (e.g., `const isNewModel = modelId.includes('new-model')`)
2. Define supported durations/resolutions in `getDurationOptions()`, `getResolutionOptions()` functions
3. Add model-specific UI controls with appropriate conditionals
4. Add state to `config.tsx` if new parameters are needed
5. Update parameter routing in `App.tsx:generateVideo()` to include model-specific parameters
6. (Optional) Add to curated models in `services/videoModels.ts`
