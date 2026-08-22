---
name: image-backend-routing
description: How GPT Image and Gemini image models cascade across OpenAI, fal.ai, and OpenRouter backends by API-key availability. Consult before changing image generation routing, key handling, model ID mapping, or fallback behavior.
---

# Image Backend Routing (GPT + Gemini)

GPT Image and Gemini image models are not tied to one provider — requests cascade to the best available backend based on which API keys the server reports. The implementation lives in `src/services/imageRouting.ts` (`routeGptImage()`, `routeGeminiImage()`); consult it as the source of truth before editing.

## GPT Image Models

| Priority | Backend | Model ID Format | When Used |
|----------|---------|-----------------|-----------|
| 1 | OpenAI direct | `gpt-image-1.5` | `OPENAI_API_KEY` configured |
| 2 | fal.ai queue | `fal-ai/gpt-image-1.5` | `FAL_API_KEY` configured |
| 3 | OpenRouter | `openai/gpt-5-image` | `OPENROUTER_API_KEY` or user OAuth |

## Gemini Image Models

| Priority | Backend | Model ID Format | When Used |
|----------|---------|-----------------|-----------|
| 1 | fal.ai queue | `fal-ai/gemini-25-flash-image` | `FAL_API_KEY` configured |
| 2 | OpenRouter | `google/gemini-2.5-flash-image` | `OPENROUTER_API_KEY` or user OAuth |

## Where Things Live

- **Routing cascade**: `src/services/imageRouting.ts` — `routeGptImage()`, `routeGeminiImage()`, with `ImageRouteContext` carrying key availability.
- **Detection + model ID mapping**: `src/services/imageModels.ts`
  - `isGptImageModel()` / `isGeminiImageModel()` — detect the family from either ID format
  - `mapToOpenAIModelName()` — fal.ai endpoint ID → OpenAI API model name
  - `mapToOpenRouterModelId()` — OpenAI model name → OpenRouter model ID
  - `mapGeminiToOpenRouterModelId()` — fal.ai endpoint ID → OpenRouter model ID
- **Key availability**: `/api/health` on the proxy returns `{ keys: { fal, openai, openrouter } }`, consumed by `src/contexts/ServerKeysContext.tsx`. A user's OpenRouter OAuth key (`OpenRouterAuthContext`) counts as OpenRouter availability and is preferred over the server's shared key.
- **Per-backend input construction**: `src/services/imageInputBuilders.ts`.

## Rules

- Backend choice is a *cascade*, not a hard failure: if the preferred key is missing, fall through to the next backend rather than erroring.
- The same UI model entry must work on every backend it can route to — map model IDs with the helpers above; never send a fal.ai endpoint ID to OpenAI/OpenRouter or vice versa.
- When adding a model to either family, update the detection helper and every mapping function, and add tests beside the existing ones.
