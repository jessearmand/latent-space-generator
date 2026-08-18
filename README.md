# Latent Space Generator

A React single-page application for AI media generation across image, video, and audio, using multiple providers: fal.ai, OpenAI, and OpenRouter.

## Features

### Image Generation
- **Text-to-Image** and **Image-to-Image** with reference images (multi-image upload and clipboard paste)
- **Multiple providers with automatic fallback**: fal.ai models (Flux, Flux 2 [klein], SDXL, Qwen, and more), OpenAI GPT Image models, and Gemini image models — GPT and Gemini requests cascade across OpenAI/fal.ai/OpenRouter depending on which API keys are available
- **Configurable parameters** per model: aspect ratio, safety tolerance, guidance scale, quality, and more

### Video Generation
- **Text-to-Video** — generate videos from text prompts
- **Image-to-Video** — animate images, including start + end frame control on supported models
- **Video-to-Video** — style transfer, background removal, relighting
- **Reference-to-Video** — compose videos from up to 9 reference images with `@Image1` mentions (Seedance)
- **Extend Video** — continue an existing clip with LTX 2.3 Pro, FLUX 3 (including draft mode), Grok Imagine, or Veo 3.1, with per-model source validation (duration, container, dimensions) before upload
- **Model-specific controls**: duration, aspect ratio, resolution, FPS, audio generation, camera movement — the app only offers the options each endpoint actually accepts

### Audio Generation
- **Text-to-Speech** — natural speech with voice selection and emotion control (MiniMax, Chatterbox)
- **Text-to-Audio** — music and sound effects (Beatoven, ElevenLabs, Stable Audio)
- **Voice Cloning** — clone voices from audio samples (Dia TTS)
- **Video-to-Audio** — synchronized audio for videos (Mirelo SFX)
- **Audio Understanding** — analyze uploaded audio with optional detailed analysis

### Everything Else
- **Generation history** — browse, replay, and download previous results
- **Prompt Optimizer** — AI-powered prompt enhancement via OpenRouter (streaming)
- **Dynamic model catalog** — curated lists load instantly; a "Show all models" toggle fetches the full fal.ai catalog with search
- **Queue-based processing** — real-time status updates during generation

## Notable Models

The catalog is loaded dynamically, so the in-app model selector is the authoritative list. Curated highlights:

- **Video**: Kling 2.5 Turbo Pro / 2.0 Master, Veo 3 / 3.1 (including Extend), Seedance 2.5 and 2.0 (Pro / Fast, up to 4K), LTX-2 / 2.3 / 2.5, MiniMax Hailuo 02 / H3, Grok Imagine, Wan 2.5, Hunyuan, Luma Dream Machine
- **Image**: Flux family (Schnell → Ultra, Edit), Flux 2 [klein], GPT Image 1.5 / 1 Mini, Gemini 2.5 Flash Image / 3 Pro Image, SDXL, Qwen Image
- **Audio**: MiniMax Speech-02-HD (30+ languages), Chatterbox TTS, ACE / Beatoven music, ElevenLabs SFX, Dia voice cloning, Mirelo SFX

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime — or let [mise](https://mise.jdx.dev/) install it for you (`mise install` reads the pins in `mise.toml`)
- A [fal.ai](https://fal.ai/) API key
- (Optional) An [OpenAI](https://platform.openai.com/) API key for direct GPT Image generation
- (Optional) An [OpenRouter](https://openrouter.ai/) API key for prompt optimization and Gemini/GPT fallback

### Install

```bash
bun install
```

### Configure secrets

Development uses [fnox](https://fnox.jdx.dev) to supply API keys. The committed `fnox.toml` only *references* secrets — the values live in the macOS Keychain, never on disk. Store them once (each command prompts for the value):

```bash
fnox set FAL_API_KEY --provider fal
```

```bash
fnox set OPENROUTER_API_KEY --provider OpenRouter
```

`OPENAI_API_KEY` is intentionally not configured; GPT Image models fall back to fal.ai/OpenRouter. OpenRouter can also be authenticated per-user in the app's Settings via OAuth.

If you prefer not to use fnox, exporting the same variables as plain environment variables works too — just don't commit a `.env` file.

### Run

```bash
mise run dev
```

This injects secrets via fnox and starts both servers:
- **Client**: Vite dev server on http://localhost:3000
- **Proxy**: Bun API proxy on http://localhost:3001 (injects API keys server-side)

Stop everything (kills whatever is listening on ports 3000/3001):

```bash
mise run stop
```

Other tasks: `mise run server` / `mise run client` (individual processes), `mise run build`, `mise run test`, `mise run check` (typecheck + lint + format check). `mise tasks` lists them all.

## Using the App

1. Pick a category (**Image**, **Video**, **Audio**) and mode from the sidebar
2. Select a model — each mode shows a curated list, or toggle **Show all models** to search the full catalog
3. Configure the model's parameters (the options shown are the ones that endpoint accepts)
4. Enter a prompt — the **Prompt Optimizer** can enhance it
5. Upload inputs where the mode needs them (reference images, a source video to extend, an audio sample to clone)
6. Click **Generate** and watch the queue status; results land in the output panel and **History**

## Development

```bash
bun run test          # Vitest (use `bun run test`, not `bun test`)
bun run typecheck     # TypeScript type checking
bun run lint          # Oxlint (fails on warnings)
bun run fmt           # Format with oxfmt
bun run build         # Production build to build/
```

## Architecture

```text
┌──────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   React Client   │────▶│  Bun Proxy Server │────▶│    fal.ai API   │
│  (localhost:3000)│     │  (localhost:3001) │     │ (image/video/   │
└──────────────────┘     └───────────────────┘     │     audio)      │
                                  │                └─────────────────┘
                                  ├───────────────▶┌─────────────────┐
                                  │                │   OpenAI API    │
                                  │                │  (GPT Image)    │
                                  │                └─────────────────┘
                                  └───────────────▶┌─────────────────┐
                                                   │ OpenRouter API  │
                                                   │(Prompt Optimize)│
                                                   └─────────────────┘
```

- **React Client** (`src/`): sidebar navigation, model selection, per-model config UI, media display, history
- **Bun Proxy Server** (`server/index.ts`): injects API keys server-side, whitelists target domains, handles CORS
- **fal.ai**: queue-based generation for images, videos, and audio
- **OpenAI**: direct image generation for GPT Image models
- **OpenRouter**: prompt optimization plus Gemini/GPT image fallback

## License

MIT
