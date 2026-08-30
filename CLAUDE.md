# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Latent Space Generator — React SPA for AI media generation (image, video, audio) via fal.ai, OpenAI, and OpenRouter, with a Bun proxy server that injects API keys. Vite for dev, Vitest for tests, Oxlint/oxfmt for lint/format (Biome is temporarily retained for parity checks during the migration).

For feature descriptions, model lists, and human-facing setup, see [README.md](README.md). Browse the source tree for layout — it is not duplicated here because it goes stale.

## Commands

Prefer the mise tasks — they wrap the bun scripts and inject secrets via fnox where needed:

```bash
mise run dev          # client (:3000) + proxy (:3001), secrets from fnox
mise run server       # proxy only, with secrets
mise run client       # Vite only, no secrets needed
mise run stop         # kill whatever is on ports 3000/3001
mise run build        # production build to build/
mise run test         # Vitest
mise run check        # typecheck + lint + fmt:check
```

Underlying bun scripts (`package.json`) when you need them individually:

```bash
bun install
bun run test          # NOT `bun test` — that runs Bun's native runner, not Vitest
bun run typecheck     # tsc -b
bun run lint          # Oxlint, fails on warnings
bun run lint:fix
bun run lint:biome    # temporary parity check during the Biome -> Oxlint migration
bun run fmt           # oxfmt
bun run fmt:check
```

Never start dev servers with plain Bash — use the mise tasks, or the Browser pane's launch config for previews.

## Rules That Will Bite You

- **fal.ai generation goes through `submitAndPollFalQueue()`** in `src/services/falQueue.ts` (submit → poll → fetch result, with cancel/timeout support). Do not hand-roll the submit/poll loop in hooks. (`useAudioGeneration.ts` still hand-rolls its loop — that is legacy debt to migrate, not a pattern to copy. `as any` assertions are needed when reading `logs` off status results — @fal-ai/client type limitation.)
- **Per-model parameters are code, not documentation.** Do not trust hard-coded lists in docs or comments:
  - Which options a video endpoint accepts (durations, resolutions, aspect ratios, fps, optional fields): `getVideoCapabilityProfile()` in `src/services/videoModelCapabilities.ts`; extend-video endpoints use `src/services/extendVideoCapabilities.ts` (range-based `ExtendCapabilityProfile` + source validation via `checkExtendSource()`).
  - What actually gets sent to the API: `src/services/videoInputBuilders.ts` (profiled/legacy/extend builders), `src/services/imageInputBuilders.ts`, and the routing branches in `hooks/useAudioGeneration.ts`.
- **Duration serialization varies per API**: some endpoints want a string enum (`"5"`, `"auto"` — Seedance), others an integer. The video profiles carry a `durationFormat` field; check the endpoint's schema before running values through `parseInt`.
- **The generation-mode union lives in `src/types/generationMode.ts`** (`GenerationMode`), with gating helpers (`requiresImageInput`, etc.) beside it. The sidebar (`Sidebar.tsx`) owns navigation.
- **Dynamic model loading**: curated lists (`services/imageModels.ts`, `videoModels.ts`, `audioModels.ts`) load instantly; "Show all models" lazy-loads the full fal.ai catalog via `services/models.ts` with a 24h localStorage cache (`contexts/ModelsContext.tsx`). `services/deprecatedModels.ts` blocklists models hidden from the catalog.

## Proxy Server

`server/index.ts` (Bun) injects API keys server-side. `/api/fal/proxy` takes a dynamic target URL and forwards only to whitelisted fal.ai domains; the OpenAI and OpenRouter endpoints (`/api/openai/images`, `/api/openrouter/{models,completion,images}`) have hardcoded upstream targets. `/api/health` reports key availability as `{ keys: { fal, openai, openrouter } }`, consumed by `ServerKeysContext`. The fal client is configured with `fal.config({ proxyUrl: '/api/fal/proxy' })`; Vite's dev proxy resolves it to port 3001.

## API Keys & Secrets

Server-side env vars: `FAL_API_KEY` (required for all fal.ai generation), `OPENAI_API_KEY` (preferred for GPT Image), `OPENROUTER_API_KEY` (fallbacks + prompt optimization). Users can also OAuth into OpenRouter in Settings (PKCE, `OpenRouterAuthContext`).

Dev secrets come from [fnox](https://fnox.jdx.dev): `fnox.toml` is committed and references values stored in the macOS Keychain; `mise run dev`/`server` wrap the command in `fnox exec` so keys exist only in the child process env. `OPENAI_API_KEY` is intentionally unset locally. Setup instructions are in the README. There is no production profile yet; for production, add a fnox profile backed by a cloud provider and run `fnox exec --profile production -- ...`.

To verify injection, the proxy logs key availability on startup (`FAL_API_KEY configured: Yes/No ...`).

## Skills

- **`navigate-fal-ai`** — the procedure for discovering fal.ai models (llms.txt, API schemas) and integrating them: audio 5-file checklist, video checklist (capability profiles, input builders), new model category, new API provider, known pitfalls. Use it for any "add/integrate a model" task.
- **`image-backend-routing`** — how GPT Image and Gemini models cascade across OpenAI/fal.ai/OpenRouter backends by key availability. Consult before touching image routing, key handling, or fallbacks.
