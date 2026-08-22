---
name: navigate-fal-ai
description: Procedure for discovering fal.ai models (llms.txt, API schemas) and integrating them into this codebase — audio 5-file checklist, video checklist (capability profiles + input builders), extend-video profiles, new model categories, new API providers, and known pitfalls. Use for any "add/integrate a model" task.
---

# Navigate fal.ai — Adding New Audio/Video/Image Models

## Purpose

Repeatable procedure for discovering new fal.ai models, fetching their API specs, and integrating them into this codebase. Also covers adding a new model category and a new API provider.

## Step 1: Discover Models

Browse the fal.ai model catalog or use `llms.txt` to find models:

```bash
# Fetch the full llms.txt spec
curl -s https://fal.ai/llms.txt | head -500

# Search for a specific provider
curl -s https://fal.ai/llms.txt | grep -i "elevenlabs"
```

Alternatively, use the Browser tools to browse `https://fal.ai/models` (or `https://fal.ai/explore/search?q=...`) for visual discovery.

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

Or use the Browser tools to navigate to the model page and inspect the API playground for parameter details. Always verify against the **live** schema — provider APIs drift (fields get dropped or added between versions; e.g. Seedance 2.0 silently dropped `seed`).

## Step 3: Five-File Checklist (Audio)

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
- `isBeatovenModel()` — matches `beatoven`

## Parameter Routing Patterns (Audio)

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

Adding a new video model touches many small files — wider than audio because video also runs through the sidebar, the input gating helpers, the shared `getImageInputConfig` lookup, and the capability profiles. Most edits are tiny; the point of the list is to not forget a step.

The core principle: **the capability profile is the single declaration of the endpoint's input contract** — it drives both the UI options and the API payload. A profiled endpoint usually needs *no* hook or builder changes at all.

1. **Types — `src/types/models.ts`**
   Extend `VideoModelCategory` ONLY when introducing a brand-new category (e.g. `'reference-to-video'`). Update `getOutputType()` and `getSupportsImageInput()` if applicable.

2. **Curated list — `src/services/videoModels.ts`**
   Append to the appropriate `CURATED_*_MODELS` array (or add a new array for a new category and wire it into `CURATED_VIDEO_MODELS` + `getCuratedVideoModels()`).

3. **Image input config — `src/services/modelParams.ts`**
   `getImageInputConfig` is the **single source of truth for `maxImages`** across image-to-image, image-to-video, and reference-to-video. Extend it when the new model takes 2+ image inputs. Keep `paramName='image_url'` for the primary slot even when `maxImages > 1` and the extra slots map to other fields (e.g. `end_image_url`); the builder handles the routing. Add a focused test in `modelParams.test.ts`.

4. **Capability profile — `src/services/videoModelCapabilities.ts`**
   `getVideoCapabilityProfile(endpointId)` returns a `VideoCapabilityProfile` (keyed by exact lowercase endpoint ID) declaring the endpoint's full input contract: duration enum + serialization format (`durationFormat: 'string' | 'integer'`), resolution/aspect/fps enums (**empty array = the input doesn't exist**; first entry = the default), camera motion, a forced aspect ratio (pin + hide the selector), duration-dependent constraints (`longDurationConstraint`, checked via `activeLongDurationConstraint()`), and optional-field flags (`supportsSeed`, `supportsNegativePrompt`, `supportsGenerateAudio`, `supportsPromptExpansion`, `supportsSafetyChecker`). Endpoint families with shared schemas use a factory + overrides (see `seedance20Profile()`). Add a test in `videoModelCapabilities.test.ts`.

   **Extend-video endpoints** instead use `src/services/extendVideoCapabilities.ts` — a range-based `ExtendCapabilityProfile` (duration min/max/step, auto-duration, safety-tolerance value list + format, source-clip constraints: min/max seconds, max bytes, container via `CONTAINER_MATCHERS`, exact `sourceDimensions`). Source clips are validated by `checkExtendSource()` at three layers (upload chips, Generate gating, pre-upload in the hook) — keep all three consistent by only ever calling the shared checker.

5. **Model filtering — `src/contexts/ModelsContext.tsx`**
   `getFilteredVideoModels` filters by `m.category === category`. If fal.ai's catalog labels your model under a *different* category than the UX category you want to expose (e.g. seedance r2v ships labeled as `image-to-video`), seed the curated list back in for the "Show all models" path so the UX category isn't empty.

6. **Mode union & helpers — `src/components/GenerationTabs.tsx`**
   Update `GenerationMode`, `isVideoMode`, `requiresImageInput` (gates the upload zone in InputSection), `requiresVideoInput`, `requiresAudioInput`, and `isValidGenerationMode`. Do NOT add new modes to the visual `tabs` array — the sidebar handles navigation.

7. **Sidebar entry — `src/components/Sidebar.tsx`**
   Append `{ id: 'your-mode', label: 'Your Label' }` to the `'video'` section's `modes` array.

8. **Input section — `src/components/InputSection.tsx`**
   Read `getImageInputConfig(currentSelectedModel.endpointId).maxImages` directly — do NOT special-case per active tab. Add captions / placeholder strings for new modes so the user understands the slot conventions (e.g. start vs end frame, @Image1 references).

9. **Input builders — `src/services/videoInputBuilders.ts`** *(usually no changes needed)*
   Payload assembly is pure and lives here, not in the hook: `buildVideoGenerationInput()` dispatches to `buildExtendVideoInput` / `buildProfiledVideoInput` / `buildLegacyVideoInput`. A profiled endpoint gets its payload derived from the capability profile automatically (duration serialization, aspect/fps/resolution, optional-field gating, image inputs). Only touch this file when the model needs a field the profiled builder doesn't cover — and prefer extending the profile schema over adding endpoint special cases. Do not add per-model branches to `hooks/useVideoGeneration.ts`; it is a thin orchestrator (validate → probe → upload → build → submit via `submitAndPollFalQueue`). Add payload tests in `videoInputBuilders.test.ts`.

10. **Config UI — `src/components/VideoConfigOptions.tsx`** *(usually no changes needed)*
    The `get*Options()` functions derive options from the capability profile; legacy hard-coded fallbacks exist only for unprofiled models (kling, ltx-2). Do not add new hard-coded lists — add a profile instead. Note: the validate-and-reset effect lands on the *first* option in each list, so the profile's first entry is the default.

11. **Config state — `src/config.tsx`** *(only if needed)*
    Add new state fields when the model needs settings the existing video state doesn't cover.

### Common pitfalls

- **Duration enum strings vs ints.** Some APIs require the *string* `"5"` or the literal `"auto"` (Seedance); others want integers. Declare `durationFormat` on the profile and let `buildProfiledVideoInput` serialize — never run profile values through `parseInt` yourself.
- **Aspect-ratio reset on model switch.** Switching to a model whose dropdown doesn't include the user's saved aspect ratio (e.g. `"21:9"` or `"auto"`) silently resets to the first option. Order the profile's enum so the desired default lands first.
- **`requiresImageInput` is the upload-zone gate.** A new mode that forgets this helper won't show its upload zone in InputSection.
- **Multi-image upload is shared.** Use `ImageUploadZone` driven by `getImageInputConfig().maxImages`. Do not branch on activeTab in InputSection.
- **fal.ai catalog vs UX category mismatch.** fal.ai may file your model under an existing category. Compensate in `ModelsContext.getFilteredVideoModels` rather than re-tagging the catalog response.
- **Uncurated ≠ unreachable.** Endpoints not in the curated lists are still selectable via "Show all models" — if a whole tier shares a schema with a profiled tier, profile it too (see the Seedance 2.0 Mini regression), or it falls back to the legacy builder with wrong fields.

## Adding a New Model Category

1. Update the relevant category type in `src/types/models.ts` (`ImageModelCategory`, `VideoModelCategory`, or `AudioModelCategory`) and the derived helpers (`getOutputType`, `getSupports*Input`)
2. Add the category to its catalog-fetch path in `src/services/models.ts` (e.g. `fetchImageGenerationModels()` for image categories) and to the matching curated list + `getCurated*Models()` helper
3. Update `normalizeModel()` if the new category needs special input-support logic or recategorization by endpoint suffix (as reference-to-video does)
4. Add model-specific config options in the category's config component (`ModelConfigPanel.tsx` for images, `VideoConfigOptions.tsx` for video, `AudioConfigOptions.tsx` for audio)

## Adding a New API Provider

1. Create service in `src/services/` (see `openai.ts` as example)
2. Add proxy endpoint in `server/index.ts` with appropriate security checks (whitelist target domains)
3. Detect model type in the appropriate generation hook and route to the service. fal.ai-hosted generation must go through `submitAndPollFalQueue()` (`src/services/falQueue.ts`) — never hand-roll the submit/poll loop
4. Add UI config options in the appropriate config component
5. For image models with multiple backends, follow the cascade pattern in the `image-backend-routing` skill

## Verification

Cut a feature branch from `main` BEFORE editing code so review and rollback stay clean:

```bash
git checkout main && git pull --ff-only && git checkout -b feat/your-model
```

Then iterate:

```bash
bun run typecheck   # No type errors
bun run lint        # No lint issues
bun run test        # All tests pass (NOT `bun test`)
mise run dev        # client + proxy together, secrets injected via fnox
```

Then use the Browser tools if available, or ask the user to manually verify:
- [ ] New model appears in the correct category dropdown
- [ ] Model-specific config controls appear when model is selected
- [ ] Correct API parameters are sent (check browser console / DevTools Network tab)
- [ ] Existing models still work (no regressions on other model families)
- [ ] If the new model uses multi-image upload, verify slot count and upload behaviour
