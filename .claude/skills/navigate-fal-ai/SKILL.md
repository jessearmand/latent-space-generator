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

## Video Models (extended checklist)

Adding a new video model is a **10-file checklist** — wider than audio because video also runs through the sidebar, the input gating helpers, and the shared `getImageInputConfig` lookup. Most edits are tiny; the point of the list is to not forget a step.

1. **Types — `src/types/models.ts`**
   Extend `VideoModelCategory` ONLY when introducing a brand-new category (e.g. `'reference-to-video'`). Update `getOutputType()` and `getSupportsImageInput()` if applicable.

2. **Curated list — `src/services/videoModels.ts`**
   Append to the appropriate `CURATED_*_MODELS` array (or add a new array for a new category and wire it into `CURATED_VIDEO_MODELS` + `getCuratedVideoModels()`). Add detection helpers like `isProviderModel(endpointId)`.

3. **Image input config — `src/services/modelParams.ts`**
   `getImageInputConfig` is the **single source of truth for `maxImages`** across image-to-image, image-to-video, and reference-to-video. Extend it when the new model takes 2+ image inputs. Keep `paramName='image_url'` for the primary slot even when `maxImages > 1` and the extra slots map to other fields (e.g. `end_image_url`); the hook handles the routing. Add a focused test in `modelParams.test.ts`.

4. **Model filtering — `src/contexts/ModelsContext.tsx`**
   `getFilteredVideoModels` filters by `m.category === category`. If fal.ai's catalog labels your model under a *different* category than the UX category you want to expose (e.g. seedance r2v ships labeled as `image-to-video`), seed the curated list back in for the "Show all models" path so the UX category isn't empty.

5. **Mode union & helpers — `src/components/GenerationTabs.tsx`**
   Update `GenerationMode`, `isVideoMode`, `requiresImageInput` (gates the upload zone in InputSection), `requiresVideoInput`, `requiresAudioInput`, and `isValidGenerationMode`. Do NOT add new modes to the visual `tabs` array — the sidebar handles navigation.

6. **Sidebar entry — `src/components/Sidebar.tsx`**
   Append `{ id: 'your-mode', label: 'Your Label' }` to the `'video'` section's `modes` array.

7. **Input section — `src/components/InputSection.tsx`**
   Read `getImageInputConfig(currentSelectedModel.endpointId).maxImages` directly — do NOT special-case per active tab. Add captions / placeholder strings for new modes so the user understands the slot conventions (e.g. start vs end frame, @Image1 references).

8. **Generation hook — `src/hooks/useVideoGeneration.ts`**
   Add a detection flag and a parameter-routing branch. Critical: enums sometimes need string vs integer (seedance wants `"5"` or `"auto"` as a string, not `5`). Gate legacy per-model branches behind `if (!isYourModel)` if your model has its own input shape so the legacy code doesn't clobber yours.

9. **Config UI — `src/components/VideoConfigOptions.tsx`**
   Update `getDurationOptions()`, `getAspectRatioOptions()`, `getResolutionOptions()` per model. Show/hide controls (cfg_scale, fps, generate_audio, etc.). Note: the validate-and-reset effect lands on the *first* option in each list, so put your preferred default first.

10. **Config state — `src/config.tsx`** *(only if needed)*
    Add new state fields when the model needs settings the existing video state doesn't cover.

### Common pitfalls

- **Duration enum strings vs ints.** `useVideoGeneration` historically did `parseInt(config.videoDuration.replace('s',''),10)`. Some new APIs (seedance) require the *string* `"5"` or the literal `"auto"`. Do not run them through `parseInt`.
- **Aspect-ratio reset on model switch.** Switching to a model whose dropdown doesn't include the user's saved aspect ratio (e.g. `"21:9"` or `"auto"`) silently resets to the first option. Order the dropdown so the desired default lands first.
- **`requiresImageInput` is the upload-zone gate.** A new mode that forgets this helper won't show its upload zone in InputSection.
- **Multi-image upload is shared.** Use `ImageUploadZone` driven by `getImageInputConfig().maxImages`. Do not branch on activeTab in InputSection.
- **fal.ai catalog vs UX category mismatch.** fal.ai may file your model under an existing category. Compensate in `ModelsContext.getFilteredVideoModels` rather than re-tagging the catalog response.

## Verification

Cut a feature branch from `main` BEFORE editing code so review and rollback stay clean:

```bash
git checkout main && git pull --ff-only && git checkout -b feat/your-model
```

Then iterate:

```bash
bun run typecheck   # No type errors
bun run lint        # No lint issues
bun run test        # All tests pass
bun start           # client + proxy together
```

Then use `agent-browser` or `Chrome` extension if available, or ask the user to manually verify:
- [ ] New model appears in the correct category dropdown
- [ ] Model-specific config controls appear when model is selected
- [ ] Correct API parameters are sent (check browser console / DevTools Network tab)
- [ ] Existing models still work (no regressions on other model families)
- [ ] If the new model uses multi-image upload, verify slot count and upload behaviour
