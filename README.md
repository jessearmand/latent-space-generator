# Latent Space Generator

A React single-page application for AI media generation using multiple providers including fal.ai and OpenAI.

## Features

### Image Generation
- **Multiple AI Providers**: Generate images using fal.ai models (Flux, SDXL, etc.) or OpenAI GPT Image models
- **Dynamic Model Discovery**: Automatically fetches available models from the fal.ai API
- **Image-to-Image**: Upload reference images for supported models (up to 8 images for Flux edit models)
- **Clipboard Paste**: Paste images directly from clipboard for image-to-image mode
- **Configurable Parameters**: Adjust safety tolerance, aspect ratio, guidance scale, quality, and more

### Video Generation
- **Text-to-Video**: Generate videos from text prompts
- **Image-to-Video**: Transform images into animated videos
- **Video-to-Video**: Style transfer, background removal, relighting, and more
- **Supported Video Models**: Kling 2.5/2.0, Veo 3, LTX-2 Pro/Fast/19B, MiniMax Hailuo, Hunyuan, and more
- **Model-Specific Controls**: Duration, aspect ratio, resolution, FPS, audio generation, camera movement

### Audio Generation
- **Text-to-Speech**: Generate natural speech with voice selection and emotion control (MiniMax, Chatterbox)
- **Text-to-Audio**: Generate music and sound effects (Beatoven, ElevenLabs, Stable Audio)
- **Voice Cloning**: Clone voices from audio samples (Dia TTS)
- **Video-to-Audio**: Generate synchronized audio for videos (Mirelo SFX)
- **Model-Specific Controls**: Voice selection, speed, pitch, emotion, refinement, creativity

### Additional Features
- **Sidebar Navigation**: Easy switching between generation modes
- **Prompt Optimizer**: AI-powered prompt enhancement using OpenRouter integration
- **Download Button**: Easy download for generated images, videos, and audio
- **Queue-Based Processing**: Real-time status updates during generation

## Prerequisites

- [Bun](https://bun.sh/) runtime
- A [fal.ai](https://fal.ai/) API key
- (Optional) An [OpenAI](https://platform.openai.com/) API key for GPT Image models

## Installation

```bash
bun install
```

## Configuration

Create a `.env` file or set the environment variable:

```bash
export FAL_API_KEY=your_fal_api_key_here
```

Additional API keys can be configured in the Settings modal within the app:
- **OpenAI API Key**: Required for GPT Image models
- **OpenRouter API Key**: Optional, enables the Prompt Optimizer feature

## Usage

Start the development server:

```bash
bun start
```

This starts both:
- **Client**: Vite dev server on http://localhost:3000
- **Proxy Server**: Bun API proxy on http://localhost:3001

Then open http://localhost:3000 in your browser.

### Generating Images

1. Select **Image** from the sidebar, then **Text-to-Image** or **Image-to-Image** tab
2. Select a model from the dropdown
3. Configure generation parameters (varies by model)
4. Enter your prompt (use the Prompt Optimizer for AI enhancement)
5. (Optional) Upload or paste reference images for image-to-image models
6. Click **Generate**

### Generating Videos

1. Select **Video** from the sidebar, then **Text-to-Video**, **Image-to-Video**, or **Video-to-Video** tab
2. Select a video model (Kling, Veo, LTX-2, etc.)
3. Configure video parameters (duration, aspect ratio, resolution, FPS)
4. Enter your prompt describing the desired video
5. (For Image/Video-to-Video) Upload a starting image or video
6. Click **Generate**

### Generating Audio

1. Select **Audio** from the sidebar, then choose a mode:
   - **Text-to-Speech**: Generate natural speech from text
   - **Text-to-Audio**: Generate music or sound effects
   - **Audio-to-Audio**: Clone a voice from an audio sample
   - **Video-to-Audio**: Generate audio for a video
2. Select an audio model
3. Configure audio parameters (voice, speed, duration, etc.)
4. Enter your text or prompt
5. (For cloning/video) Upload a reference audio or video file
6. Click **Generate**

## Development

```bash
bun run start:client  # Start Vite dev server only
bun run start:server  # Start Bun proxy server only
bun test              # Run tests with Vitest
bun run typecheck     # TypeScript type checking
bun run lint          # Run Biome linter
bun run lint:fix      # Auto-fix linting issues
bun run build         # Production build
```

## Architecture

```
┌──────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   React Client   │────▶│  Bun Proxy Server │────▶│    fal.ai API   │
│  (localhost:3000)│     │  (localhost:3001) │     │ (image/video/   │
└──────────────────┘     └───────────────────┘     │     audio)      │
                                  │                └─────────────────┘
                                  ▼
                          ┌─────────────────┐
                          │   OpenAI API    │
                          │  (GPT Image)    │
                          └─────────────────┘
```

- **React Client**: User interface with sidebar navigation, model selection, and media display
- **Bun Proxy Server**: Handles API key injection and CORS for browser requests
- **fal.ai API**: Queue-based generation for images, videos, and audio
- **OpenAI API**: Direct image generation for GPT Image models

## Supported Models

### Image Models (fal.ai)
- Flux (Schnell, Pro, Dev, Ultra, Edit variants)
- Flux 2 [klein] (4B and 9B)
- SDXL, SD3.5 variants
- Qwen Image Layered
- And many more (dynamically loaded from API)

### Image Models (OpenAI)
- GPT Image 1
- GPT Image 1 Mini
- GPT Image 1.5

### Video Models (fal.ai)
- **Kling**: 2.5 Turbo Pro, 2.0 Master, 1.6 Pro (text-to-video and image-to-video)
- **Veo**: Veo 3, Veo 3 Fast, Veo 2 I2V
- **LTX-2**: Pro, Fast, 19B, Pro I2V (with audio generation, up to 2160p)
- **MiniMax Hailuo**: 02, 2.3 Pro
- **Wan**: 2.5 Preview, 2.1 Pro, Wan Effects
- **Hunyuan Video**, **Luma Dream Machine**, **Mochi 1**
- **Video-to-Video**: LTX-2 19B V2V, MMAudio V2, Bria BG Removal, LightX Relight/Recamera

### Audio Models (fal.ai)
- **Text-to-Speech**: MiniMax Speech-02-HD (30+ languages, emotion control), Chatterbox TTS
- **Text-to-Audio**: ACE Music, Beatoven Music/SFX, ElevenLabs Sound Effects, Stable Audio
- **Voice Cloning**: Dia TTS Voice Clone
- **Video-to-Audio**: Mirelo SFX

## Project Structure

```
src/
├── App.tsx                        # Main application component
├── config.tsx                     # Configuration context provider
├── components/
│   ├── Sidebar.tsx                # Navigation sidebar for generation modes
│   ├── ModelSelector.tsx          # Model selection dropdown
│   ├── ModelConfigPanel.tsx       # Dynamic image model configuration UI
│   ├── VideoConfigOptions.tsx     # Video model configuration options
│   ├── AudioConfigOptions.tsx     # Audio model configuration options
│   ├── VideoPlayer.tsx            # Video playback component
│   ├── AudioPlayer.tsx            # Audio playback component
│   ├── GenerationTabs.tsx         # Tab navigation for generation modes
│   ├── ImageUploadZone.tsx        # Multi-image upload with paste support
│   ├── VideoUploadZone.tsx        # Video upload for V2V and video-to-audio
│   ├── AudioUploadZone.tsx        # Audio upload for voice cloning
│   ├── PromptOptimizer.tsx        # OpenRouter-powered prompt enhancement
│   └── DownloadButton.tsx         # Download button for results
├── contexts/
│   └── ModelsContext.tsx          # Model state management
├── hooks/
│   ├── useImageGeneration.ts      # Image generation logic
│   ├── useVideoGeneration.ts      # Video generation logic
│   ├── useAudioGeneration.ts      # Audio generation logic
│   ├── useGenerationMode.ts       # Generation mode state
│   ├── useImageUpload.ts          # Image upload handling
│   └── useStatusMessage.ts        # Status message state
├── services/
│   ├── models.ts                  # fal.ai Models API client
│   ├── videoModels.ts             # Video model definitions
│   ├── audioModels.ts             # Audio model definitions
│   ├── openai.ts                  # OpenAI Images API client
│   ├── openrouter.ts              # OpenRouter API for prompt optimization
│   └── errors.ts                  # Error parsing utilities
└── types/
    ├── models.ts                  # TypeScript type definitions
    └── audio.ts                   # Audio-specific types

server/
└── index.ts                       # Bun proxy server

docs/
├── fal-ai-ltx-2-video.md          # LTX-2 video model documentation
├── fal-ai-flux-2-klein.md         # Flux 2 [klein] image model documentation
├── fal-ai-audio-models.md         # Audio models documentation
└── fal-ai-video-to-video-models.md # Video-to-video models documentation
```

## License

MIT
