# Navigate fal.ai — Adding New Audio/Video/Image Models

## Purpose

Repeatable procedure for discovering new fal.ai models, fetching their API specs, and integrating them into this codebase.

## Step 1: Discover Models

Browse the fal.ai model catalog or use `llms.txt` to find models:

```bash
# Fetch the full llms.txt spec
curl -s https://fal.ai/llms.txt | head -500

# Search for a specific provider
curl -s https://fal.ai/llms.txt | grep -i "elevenlabs"
```

Alternatively, use `agent-browser` or `Chrome` extension if available to browse `https://fal.ai/models` for visual discovery.

Key info to extract per model:
- **Endpoint ID**: e.g., `fal-ai/elevenlabs/tts/turbo-v2.5`
- **Category**: text-to-speech, text-to-audio, audio-to-audio, text-to-video, etc.
- **Input fields**: Which field carries the main text (`text`, `prompt`, or both)
- **Unique parameters**: Model-specific settings (voice, stability, etc.)
- **Pricing**: Cost per unit (chars, seconds, minutes)

## Step 2: Fetch API Schema

For detailed parameter schemas, fetch the model's API docs:

```bash
# Fetch model-specific docs page
curl -s "https://fal.ai/models/fal-ai/elevenlabs/tts/turbo-v2.5/api"
```

Or use `agent-browser` or `Chrome` extension if available to navigate to the model page and inspect the API playground for parameter details.

## Step 3: Five-File Checklist

Every new audio model requires changes to these 5 files:

### 1. Types (`src/types/audio.ts`)
- Add voice/parameter constant arrays (e.g., `ELEVENLABS_VOICES`)
- Use `as const` for type narrowing
- Follow naming: `PROVIDER_VOICES`, `PROVIDER_EMOTIONS`, etc.

### 2. Curated Models + Helpers (`src/services/audioModels.ts`)
- Add to the appropriate `CURATED_*_MODELS` array
- Add detection helper functions following the pattern:
  ```typescript
  export function isProviderModel(endpointId: string): boolean {
      return endpointId.toLowerCase().includes('provider-substring');
  }
  ```
- Update `requiresAudioInputForModel()` if the model needs audio input
- Update `isSFXModel()` / `isMusicModel()` / `isTTSModel()` if needed

### 3. Config State (`src/config.tsx`)
- Add fields to `ConfigState` interface
- Add setter types to `ConfigContextType` interface
- Add `useState` declarations with localStorage defaults
- Add `localStorage.setItem()` calls in the `useEffect`
- Add to `useEffect` dependency array
- Add to Provider `value` prop

### 4. Parameter Routing (`src/hooks/useAudioGeneration.ts`)
- Import new detection helpers
- Add `const isNewModel = isNewModelHelper(modelId)` detection
- Add parameter routing block:
  ```typescript
  if (isNewModel) {
      // Set model-specific params
      input.paramName = config.configField;
  }
  ```
- **Critical**: Check if the model uses `text` or `prompt` for the main content field
- If the model doesn't need text input, update the empty-prompt validation

### 5. UI Controls (`src/components/AudioConfigOptions.tsx`)
- Import new types and detection helpers
- Add detection flags in the component body
- Add JSX section for model-specific controls
- Update duration slider `max` if applicable

## Detection Helper Naming Convention

```
is{Provider}{ModelType}Model(endpointId)
```

Examples:
- `isElevenLabsTTSModel()` — matches `elevenlabs/tts`
- `isElevenLabsSFXModel()` — matches `elevenlabs/sound-effects`
- `isPersonaPlexModel()` — matches `personaplex`
- `isBeatovenModel()` — matches `beatoven`

## Parameter Routing Patterns

### TTS models (text → speech)
- Main field: usually `text` (some use `prompt`)
- Common params: `voice`, `speed`, `language`
- Config prefix: `providerParamName`

### Music models (text → music)
- Main field: `prompt`
- Common params: `duration`, `loop`, `negative_prompt`

### SFX models (text → sound effects)
- Main field: varies (`text` for ElevenLabs, `prompt` for others)
- Common params: `duration`, `prompt_influence`

### Audio-to-audio models
- Requires uploaded audio: `audio_url`
- May also accept `prompt` for guidance
- Update `requiresAudioInputForModel()` to include new model

## Video Models (same pattern)

For video models, the equivalent files are:
1. Types: `src/types/models.ts`
2. Models: `src/services/videoModels.ts`
3. Config: `src/config.tsx`
4. Hook: `src/hooks/useVideoGeneration.ts`
5. UI: `src/components/VideoConfigOptions.tsx`

## Verification

```bash
bun run typecheck   # No type errors
bun run lint        # No lint issues
bun run test        # All tests pass
```

Then use `agent-browser` or `Chrome` extension if available, or ask the user to manually verify:
- [ ] New model appears in the correct category dropdown
- [ ] Model-specific config controls appear when model is selected
- [ ] Correct API parameters are sent (check browser console)
- [ ] Existing models still work (no regressions)
