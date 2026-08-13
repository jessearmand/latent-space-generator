# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Latent Space Generator — React single-page application for AI media generation. Supports multiple providers and generation modes:
- **fal.ai image models**: Flux, SDXL, Flux 2 [klein], and other image generation models via `@fal-ai/client`
- **fal.ai video models**: Kling, Veo, LTX-2, Seedance, MiniMax Hailuo, Hunyuan, and more
- **fal.ai audio models**: MiniMax TTS, Chatterbox, Beatoven, ElevenLabs SFX, and more
- **OpenAI models**: GPT Image models (gpt-image-1.5, gpt-image-1-mini) via direct API calls, fal.ai, or OpenRouter
- **Gemini image models**: Gemini 2.5 Flash Image, Gemini 3 Pro Image via fal.ai (OpenRouter fallback)

Uses Vite for development, Vitest for testing, and Oxlint/oxfmt for linting and formatting. Biome is temporarily retained during the migration for parity checks.

## Development Commands

```bash
bun install           # Install dependencies
bun start             # Start both client (port 3000) and proxy server (port 3001)
bun run start:client  # Start Vite dev server only
bun run start:server  # Start Bun proxy server only
bun run build         # Production build (output to build/)
bun run test          # Run tests with Vitest (not `bun test` which uses Bun's native runner)
bun run typecheck     # TypeScript type checking
bun run lint          # Run Oxlint and fail on warnings
bun run lint:fix      # Apply Oxlint autofixes, then fail on remaining warnings
bun run lint:biome    # Temporary parity check during the Biome -> Oxlint migration
bun run fmt           # Format with oxfmt
bun run fmt:check     # Check formatting without writing
bun run shutdown      # Stop dev servers (scripts/shutdown.sh)
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

- **ServerKeysProvider**: Fetches `/api/health` on mount to determine which API keys are configured server-side (fal, openai, openrouter)
- **ConfigProvider**: Persists generation parameters (image, video, audio settings) to localStorage
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

### Code Layout

Browse the directory tree for the full inventory; the map below covers entry points and files whose role isn't obvious from their name:

```text
src/
  App.tsx        — main UI, orchestrates generation hooks and components
  config.tsx     — ConfigContext: all generation parameters, persisted to localStorage
  hooks/         — generation logic per mode (useImageGeneration, useVideoGeneration,
                   useAudioGeneration, useGenerationHistory, useGenerationMode, ...)
  contexts/      — providers in the hierarchy above
  services/      — API clients, curated model lists, routing/parameter helpers
  components/    — UI components (one .tsx + .css pair per component)
  types/         — TypeScript types
  utils/         — small shared helpers (download, time formatting, log sanitizing)
server/index.ts  — Bun proxy server (API key injection, domain whitelist)
```

Non-obvious services:
- `services/falQueue.ts` — shared `submitAndPollFalQueue()` used by all fal.ai generation hooks
- `services/modelParams.ts` — `getImageInputConfig()`: single source of truth for how many image inputs a model accepts
- `services/videoModelCapabilities.ts` — `getVideoCapabilityProfile()`: per-endpoint durations, resolutions, aspect ratios, seed support
- `services/imageRouting.ts` / `imageInputBuilders.ts` — backend cascade routing and per-family input construction for image models
- `services/deprecatedModels.ts` — blocklist of models hidden from the catalog

### Dynamic Model Loading

All modes (image, video, audio) start with curated model lists for instant load. A "Show all models" toggle lazy-loads the full catalog from `https://api.fal.ai/v1/models`. Search filtering is available when showing all models.

1. **`services/imageModels.ts`**, **`videoModels.ts`**, **`audioModels.ts`**: Curated model definitions with category helpers
2. **`services/models.ts`**: API client with pagination support, fetches full catalogs for all categories on demand
3. **`types/models.ts`**: TypeScript interfaces matching API response shape, plus `normalizeModel()` converter
4. **`contexts/ModelsContext.tsx`**: React Context with curated defaults, lazy-loading, caching (24h TTL in localStorage), and error fallback to cache

### Queue Pattern (fal.ai)

All fal.ai generation goes through `submitAndPollFalQueue()` in `services/falQueue.ts` (submit → poll status every 2s → fetch result). Do not hand-roll the submit/poll loop in hooks — use the shared helper.

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

### Generation Modes

The app supports multiple generation modes, managed by the `useGenerationMode` hook (mode union lives in `components/GenerationTabs.tsx`):

| Mode | Description |
|------|-------------|
| `text-to-image` | Generate images from text prompts |
| `image-to-image` | Transform images using text prompts |
| `text-to-video` | Generate videos from text prompts |
| `image-to-video` | Transform images into videos |
| `video-to-video` | Style transfer, background removal, relighting |
| `reference-to-video` | Video from reference images (Seedance r2v, up to 9 refs via `@Image1` mentions) |
| `text-to-speech` | Generate speech from text (MiniMax, Chatterbox) |
| `text-to-audio` | Generate music and sound effects |
| `audio-to-audio` | Voice cloning (Dia TTS) |
| `video-to-audio` | Generate audio from video (Mirelo SFX) |
| `audio-understanding` | Analyze uploaded audio with optional detailed analysis |

### Model-Specific Parameters

Per-model parameters are code, not documentation — do not trust hard-coded lists elsewhere:
- **UI options** (which durations/resolutions/aspect ratios a model offers): `services/videoModelCapabilities.ts` profiles and the `get*Options()` functions in `components/VideoConfigOptions.tsx` / `AudioConfigOptions.tsx` / `ModelConfigPanel.tsx`
- **API input construction** (which fields get sent): detection flags and routing branches in `hooks/useVideoGeneration.ts`, `useAudioGeneration.ts`, and `services/imageInputBuilders.ts`

Gotcha: some APIs want duration as a string enum (`"5"`, `"auto"` — Seedance), others as an integer — check the model's schema before running values through `parseInt`.

## API Keys

**Server-side (environment variables)**:
- `FAL_API_KEY`: Required for fal.ai models (Flux, video, audio), also fallback for GPT image models
- `OPENAI_API_KEY`: Preferred for GPT Image models (direct, no queue), injected server-side by proxy
- `OPENROUTER_API_KEY`: Fallback for Gemini image models, fallback for GPT models, fallback for prompt optimization

**Client-side (OAuth)**:
- **OpenRouter**: Users can authenticate via OAuth PKCE in Settings to use their own credits for prompt optimization and OpenRouter image generation. Falls back to the server's shared key.

**Key availability** is reported by `/api/health` and consumed by `ServerKeysContext` to route GPT image models to the best available backend.

The fal client uses proxy configuration: `fal.config({ proxyUrl: '/api/fal/proxy' })` (relative path, resolved by Vite's dev proxy to port 3001).

### Secrets via fnox (dev)

Local development loads server-side keys with [fnox](https://fnox.jdx.dev). `fnox.toml` is the manifest — it names providers and references secrets, but the values live in the **macOS Keychain**, not in the file, so the config is safe to commit.

```toml
# fnox.toml
default_provider = "OpenRouter"

[providers.OpenRouter]
type = "keychain"
service = "openrouter"

[providers.fal]
type = "keychain"
service = "fnox"

[secrets]
OPENROUTER_API_KEY = { provider = "OpenRouter", value = "OPENROUTER_API_KEY" }
FAL_API_KEY        = { provider = "fal", value = "FAL_API_KEY" }
```

`OPENAI_API_KEY` is intentionally not defined here; GPT image models fall back to fal.ai/OpenRouter.

**Store a secret in the Keychain** (one-time, prompts for the value):

```bash
fnox set OPENROUTER_API_KEY --provider OpenRouter
fnox set FAL_API_KEY --provider fal
```

**Run with secrets injected** — `fnox exec` resolves each secret from its provider and exports it as an env var for the child process only (nothing is written to disk):

```bash
fnox exec -- bun start              # client + proxy server
fnox exec -- bun run start:server   # proxy server only
fnox exec -- bun run build
```

This is the current dev setup — there is no production profile yet. For production, add a profile backed by a cloud provider (e.g. AWS Secrets Manager) and run `fnox exec --profile production -- ...`.

**Verify injection** — the proxy server logs key availability on startup (`server/index.ts`), so `fnox exec -- bun run start:server` should print:

```text
FAL_API_KEY configured: Yes
OPENROUTER_API_KEY configured: Yes
OPENAI_API_KEY configured: No
```

## Adding or Integrating Models

Use the **`navigate-fal-ai` skill** (`.claude/skills/navigate-fal-ai/SKILL.md`). It contains the model-discovery procedure (fal.ai `llms.txt`, API schema fetching), the 5-file audio checklist, the 11-file video checklist, the steps for adding a new model category or API provider, and the known pitfalls.
