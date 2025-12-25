# fal.ai Image Generator

A React single-page application for AI image generation using multiple providers including fal.ai and OpenAI.

## Features

- **Multiple AI Providers**: Generate images using fal.ai models (Flux, SDXL, etc.) or OpenAI GPT Image models
- **Dynamic Model Discovery**: Automatically fetches available models from the fal.ai API
- **Image-to-Image**: Upload reference images for supported models
- **Configurable Parameters**: Adjust safety tolerance, aspect ratio, guidance scale, quality, and more
- **Queue-Based Processing**: Real-time status updates during image generation

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

For OpenAI GPT Image models, enter your OpenAI API key in the Settings modal within the app.

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

1. Select a model from the dropdown
2. Configure generation parameters (varies by model)
3. Enter your prompt
4. (Optional) Upload a reference image for image-to-image models
5. Click "Generate Image"

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
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React Client  │────▶│  Bun Proxy Server│────▶│    fal.ai API   │
│  (localhost:3000)│     │  (localhost:3001) │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   OpenAI API    │
                        │  (GPT Image)    │
                        └─────────────────┘
```

- **React Client**: User interface for prompt input, model selection, and image display
- **Bun Proxy Server**: Handles API key injection and CORS for browser requests
- **fal.ai API**: Queue-based image generation with status polling
- **OpenAI API**: Direct image generation for GPT Image models

## Supported Models

### fal.ai Models
- Flux (text-to-image, image-to-image)
- SDXL variants
- And many more (dynamically loaded from API)

### OpenAI Models
- GPT Image 1
- GPT Image 1 Mini
- GPT Image 1.5

## Project Structure

```
src/
├── App.tsx                    # Main application component
├── config.tsx                 # Configuration context provider
├── components/
│   ├── ModelSelector.tsx      # Model selection dropdown
│   └── ModelConfigPanel.tsx   # Dynamic configuration UI
├── contexts/
│   └── ModelsContext.tsx      # Model state management
├── services/
│   ├── models.ts              # fal.ai Models API client
│   └── openai.ts              # OpenAI Images API client
└── types/
    └── models.ts              # TypeScript type definitions

server/
└── index.ts                   # Bun proxy server
```

## License

MIT
