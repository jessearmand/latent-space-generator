# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

React single-page application for fal.ai image generation. Uses @fal-ai/client with manual queue-based polling and dynamic model discovery from the fal.ai API.

## Development Commands

```bash
bun install    # Install dependencies
bun start      # Development server (port 3000)
bun run build  # Production build
bun test       # Run tests with Jest
```

## Architecture

### Provider Hierarchy

The app uses nested React Context providers in `index.tsx`:

```
ConfigProvider (config.tsx)
  └── ModelsProvider (contexts/ModelsContext.tsx)
        └── App (App.tsx)
```

- **ConfigProvider**: Persists generation parameters (safety tolerance, aspect ratio, guidance scale, etc.) to localStorage
- **ModelsProvider**: Fetches and caches available models from fal.ai API, manages model selection

### Dynamic Model Loading

Models are fetched directly from `https://api.fal.ai/v1/models` rather than using a hardcoded list:

1. **`services/models.ts`**: API client with pagination support, fetches both `text-to-image` and `image-to-image` categories
2. **`types/models.ts`**: TypeScript interfaces matching API response shape, plus `normalizeModel()` converter
3. **`contexts/ModelsContext.tsx`**: React Context with caching (24h TTL in localStorage), loading states, and error fallback to cache

### Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main UI, queue polling logic, API key management |
| `src/config.tsx` | ConfigContext for generation parameters |
| `src/contexts/ModelsContext.tsx` | Model fetching, caching, selection state |
| `src/services/models.ts` | Direct HTTP fetch to fal.ai Models API |
| `src/types/models.ts` | TypeScript types for model data |
| `src/components/ModelSelector.tsx` | Dropdown with refresh capability |
| `src/components/ModelConfigPanel.tsx` | Dynamic settings panel (Flux vs GPT configs) |

### Queue Polling Pattern

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

### Model-Specific Config

The `ModelConfigPanel` component renders different settings based on model type:
- **GPT models** (`endpointId.includes('gpt-image')`): image size, quality, background options
- **Flux/other models**: safety tolerance, aspect ratio, guidance scale, seed, image-to-image settings

## API Keys

**Server-side (environment variable)**:
- `FAL_API_KEY`: Required for proxy server, injected into all fal.ai requests

**Client-side (localStorage via Settings modal)**:
- `OPENAI_API_KEY`: Required only for GPT Image models

The fal client uses proxy configuration: `fal.config({ proxyUrl: 'http://localhost:3001/api/fal/proxy' })`.

## Adding a New Model Category

1. Update `ImageModelCategory` type in `types/models.ts`
2. Add category to parallel fetch in `services/models.ts:fetchImageGenerationModels()`
3. Update `normalizeModel()` if new category needs special `supportsImageInput` logic
4. Add model-specific config options in `ModelConfigPanel.tsx` if needed
