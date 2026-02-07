# fal.ai Video-to-Video Models API

This document covers the video-to-video transformation models available on fal.ai, including background removal, audio generation, video styling, relighting, and more.

## Model Overview

| Provider | Model | Endpoint | Functionality |
|----------|-------|----------|---------------|
| Bria | Background Removal | `bria/video/background-removal` | Remove video backgrounds |
| Bria | Erase by Mask | `bria/video/erase/mask` | Erase objects using mask |
| Bria | Erase by Prompt | `bria/video/erase/prompt` | Erase objects using text prompt |
| MMAudio | V2 | `fal-ai/mmaudio-v2` | Generate synchronized audio for videos |
| LTX-2 | 19B Video-to-Video | `fal-ai/ltx-2-19b/video-to-video` | Transform videos with text prompts |
| LTX-2 | Distilled | `fal-ai/ltx-2-19b/distilled/video-to-video` | Faster video transformation |
| LightX | Relight | `fal-ai/lightx/relight` | Relight videos |
| LightX | Recamera | `fal-ai/lightx/recamera` | Change camera angles |
| Half-Moon-AI | Face Swap | `half-moon-ai/ai-face-swap-video` | Face swap in videos |
| Kling Video | v2.6 Standard | `kling-video/v2.6/standard/video-to-video` | Motion transfer |
| Decart | Lucy-Restyle | `decart/lucy-restyle` | Video restyling |
| Wan | v2.6 Reference | `wan/v2.6/reference-to-video` | Reference-to-video generation |
| Veo 3.1 | Extend Video | `veo3.1/extend-video` | Extend video duration |

**Source**: https://fal.ai/explore/search?categories=video-to-video

---

## Bria Video Background Removal

Automatically remove backgrounds from videos without a green screen.

**Endpoint**: `bria/video/background-removal`

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("bria/video/background-removal", {
  input: {
    video_url: "https://example.com/video.mp4",
    background_color: "Transparent",
    output_container_and_codec: "webm_vp9"
  }
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `video_url` | string | **Yes** | - | Input video (max 14142x14142, duration <30s) |
| `background_color` | enum | No | "Black" | Background color for removed areas |
| `output_container_and_codec` | enum | No | "webm_vp9" | Output format and codec |

### Background Color Options

`Transparent`, `Black`, `White`, `Gray`, `Red`, `Green`, `Blue`, `Yellow`, `Cyan`, `Magenta`, `Orange`

### Output Format Options

| Value | Description |
|-------|-------------|
| `mp4_h265` | MP4 with H.265 codec |
| `mp4_h264` | MP4 with H.264 codec |
| `webm_vp9` | WebM with VP9 codec (default) |
| `mov_h265` | MOV with H.265 codec |
| `mov_proresks` | MOV with ProRes KS codec |
| `mkv_h265` | MKV with H.265 codec |
| `mkv_h264` | MKV with H.264 codec |
| `mkv_vp9` | MKV with VP9 codec |
| `gif` | Animated GIF |

### Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `video` | object | Video file with removed background and preserved audio |

---

## Bria Video Erase

High-fidelity object erasing from videos. Available in three modes: by mask, by prompt, or by keypoints.

### Erase by Mask

**Endpoint**: `bria/video/erase/mask`

```javascript
const result = await fal.subscribe("bria/video/erase/mask", {
  input: {
    video_url: "https://example.com/video.mp4",
    mask_video_url: "https://example.com/mask.mp4",
    preserve_audio: true
  }
});
```

### Erase by Prompt

**Endpoint**: `bria/video/erase/prompt`

```javascript
const result = await fal.subscribe("bria/video/erase/prompt", {
  input: {
    video_url: "https://example.com/video.mp4",
    prompt: "remove the car",
    preserve_audio: true
  }
});
```

### Input Schema (Erase)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `video_url` | string | **Yes** | - | Input video (duration <5s) |
| `mask_video_url` | string | Mask only | - | Mask video URL |
| `prompt` | string | Prompt only | - | Object description to erase |
| `keypoints` | array | Keypoints only | - | Array of `{x, y, type}` coordinates |
| `output_container_and_codec` | enum | No | "mp4_h264" | Output format |
| `auto_trim` | boolean | No | true | Auto trim to working duration (5s) |
| `preserve_audio` | boolean | No | true | Preserve original audio |

---

## MMAudio V2

Generate synchronized audio for videos from text prompts.

**Endpoint**: `fal-ai/mmaudio-v2`

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/mmaudio-v2", {
  input: {
    video_url: "https://storage.googleapis.com/falserverless/model_tests/video_models/mmaudio_input.mp4",
    prompt: "Indian holy music",
    num_steps: 25,
    duration: 8,
    cfg_strength: 4.5
  }
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `video_url` | string | **Yes** | - | Video URL to generate audio for |
| `prompt` | string | **Yes** | - | Audio description prompt |
| `negative_prompt` | string | No | "" | What to avoid |
| `seed` | integer | No | random | Random seed |
| `num_steps` | integer | No | 25 | Generation steps |
| `duration` | float | No | 8 | Audio duration in seconds |
| `cfg_strength` | float | No | 4.5 | Classifier-free guidance strength |
| `mask_away_clip` | boolean | No | false | Mask away the clip |

### Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `video` | object | Video file with generated synchronized audio |

---

## LTX-2 19B Video-to-Video

Transform videos using text prompts with advanced camera controls and preprocessing options.

**Endpoint**: `fal-ai/ltx-2-19b/video-to-video`

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/ltx-2-19b/video-to-video", {
  input: {
    prompt: "black-and-white video, a cowboy walks through a dusty town, film grain",
    video_url: "https://example.com/input.mp4",
    video_size: "auto",
    generate_audio: true,
    use_multiscale: true,
    camera_lora: "dolly_in",
    num_inference_steps: 40
  }
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | **Yes** | - | Transformation prompt |
| `video_url` | string | **Yes** | - | Source video URL |
| `image_url` | string | No | - | Optional first frame image |
| `match_video_length` | boolean | No | true | Match output to input video length |
| `num_frames` | integer | No | 121 | Number of frames to generate |
| `video_size` | enum/object | No | "auto" | Output dimensions |
| `generate_audio` | boolean | No | true | Generate audio track |
| `use_multiscale` | boolean | No | true | Better coherence and details |
| `match_input_fps` | boolean | No | true | Match input FPS |
| `fps` | float | No | 25 | Frames per second |
| `guidance_scale` | float | No | 3 | CFG scale |
| `num_inference_steps` | integer | No | 40 | Inference steps |
| `acceleration` | enum | No | "regular" | Speed/quality trade-off |
| `camera_lora` | enum | No | "none" | Camera movement preset |
| `camera_lora_scale` | float | No | 1 | Camera movement strength |
| `negative_prompt` | string | No | (default) | Content to avoid |
| `seed` | integer | No | random | Seed for reproducibility |
| `preprocessor` | enum | No | "none" | Input preprocessor |
| `ic_lora` | enum | No | "match_preprocessor" | IC-LoRA type |
| `ic_lora_scale` | float | No | 1 | IC-LoRA strength |
| `video_strength` | float | No | 1 | Video conditioning strength |

### Video Size Options

| Value | Description |
|-------|-------------|
| `auto` | Match input dimensions |
| `square_hd` | Square high definition |
| `square` | Square |
| `portrait_4_3` | 4:3 portrait |
| `portrait_16_9` | 16:9 portrait |
| `landscape_4_3` | 4:3 landscape |
| `landscape_16_9` | 16:9 landscape |

### Camera LoRA Presets

| Value | Description |
|-------|-------------|
| `dolly_in` | Camera moves forward |
| `dolly_out` | Camera moves backward |
| `dolly_left` | Camera moves left |
| `dolly_right` | Camera moves right |
| `jib_up` | Camera moves upward |
| `jib_down` | Camera moves downward |
| `static` | No camera movement |
| `none` | No camera control |

### Preprocessor Options

| Value | Description |
|-------|-------------|
| `depth` | Depth-based conditioning |
| `canny` | Edge detection |
| `pose` | Pose estimation |
| `none` | No preprocessing |

### Acceleration Options

| Value | Description |
|-------|-------------|
| `none` | Highest quality, slowest |
| `regular` | Balanced (default) |
| `high` | Faster generation |
| `full` | Fastest, lower quality |

### Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `video` | object | VideoFile with `url`, `width`, `height`, `fps`, `duration`, `num_frames` |
| `seed` | integer | Seed used for generation |
| `prompt` | string | Processed prompt |

---

## LightX Relight

Relight videos with different lighting conditions.

**Endpoint**: `fal-ai/lightx/relight`

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/lightx/relight", {
  input: {
    video_url: "https://storage.googleapis.com/falserverless/example_inputs/lightx_video.mp4",
    relit_cond_type: "ic",
    relight_parameters: {
      relight_prompt: "Sunlight",
      bg_source: "Right",
      use_sky_mask: false,
      cfg: 2
    }
  }
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `video_url` | string | **Yes** | - | Input video URL |
| `prompt` | string | No | auto | Text prompt (auto-captioned if omitted) |
| `seed` | integer | No | random | Random seed |
| `relit_cond_type` | enum | No | "ic" | Relight condition type |
| `relight_parameters` | object | No | - | Relighting parameters (for `ic` mode) |
| `relit_cond_img_url` | string | No | - | Conditioning image URL (for `ref`/`hdr`/`bg` modes) |
| `ref_id` | integer | No | - | Reference frame index |

### Relight Condition Types

| Value | Description |
|-------|-------------|
| `ic` | IC-light prompt-based relighting |
| `ref` | Reference image-based |
| `hdr` | HDR image-based |
| `bg` | Background replacement |

### Relight Parameters Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `relight_prompt` | string | **Required** | Lighting condition description |
| `bg_source` | enum | "Left" | Light direction: `Left`, `Right`, `Top`, `Bottom` |
| `cfg` | float | 2 | Classifier-free guidance scale |
| `use_sky_mask` | boolean | false | Use sky masking for outdoor scenes |

### Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `video` | object | Generated video file |
| `seed` | integer | Seed used |
| `input_video` | object | Optional: processed input video |
| `viz_video` | object | Optional: visualization video |

---

## LightX Recamera

Change camera angles and movements in videos.

**Endpoint**: `fal-ai/lightx/recamera`

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/lightx/recamera", {
  input: {
    video_url: "https://example.com/video.mp4",
    camera: "traj",
    mode: "gradual",
    trajectory: {
      theta: [0, 15, 30],
      phi: [0, 5, 10],
      radius: [1.0, 1.1, 1.2]
    }
  }
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `video_url` | string | **Yes** | - | Input video URL |
| `prompt` | string | No | auto | Text prompt |
| `seed` | integer | No | random | Random seed |
| `camera` | enum | No | "traj" | Camera control mode: `traj` or `target` |
| `mode` | enum | No | "gradual" | Motion mode |
| `trajectory` | object | **Yes** (for traj) | - | Camera trajectory parameters |
| `target_pose` | array | **Yes** (for target) | - | Target pose `[theta, phi, radius, x, y]` |

### Camera Motion Modes

| Value | Description |
|-------|-------------|
| `gradual` | Smooth gradual movement |
| `bullet` | Bullet-time effect |
| `direct` | Direct movement |
| `dolly-zoom` | Dolly zoom effect |

### Trajectory Parameters

| Field | Type | Description |
|-------|------|-------------|
| `theta` | array[float] | Horizontal rotation angles (degrees) per keyframe |
| `phi` | array[float] | Vertical rotation angles (degrees) per keyframe |
| `radius` | array[float] | Camera distance scaling factors per keyframe |

---

## Additional Video-to-Video Providers

### Half-Moon-AI Face Swap

**Endpoint**: `half-moon-ai/ai-face-swap-video`

Replace faces in videos with AI-generated faces.

### Kling Video v2.6

**Endpoint**: `kling-video/v2.6/standard/video-to-video`

Transfer movements from a reference video to any subject.

### Decart Lucy-Restyle

**Endpoint**: `decart/lucy-restyle`

Restyle videos up to 30 minutes while maintaining consistency.

### SCAIL Character Animation

**Endpoint**: `scail`

Pose-driven character animation model.

### ClarityAI Crystal-Video

**Endpoint**: `clarityai/crystal-video-upscaler`

High-precision video upscaling.

### Wan v2.6 Reference-to-Video

**Endpoint**: `wan/v2.6/reference-to-video`

Generate videos based on reference images.

### Veo 3.1 Extend Video

**Endpoint**: `veo3.1/extend-video`

Extend Veo-created videos up to 30 seconds.

### Steady-Dancer

**Endpoint**: `steady-dancer`

Create smooth, realistic videos from single images.

### One-to-All Animation

**Endpoint**: `one-to-all-animation/video-to-video`

Pose-driven video model for character animation.

### Sync-Lipsync React-1

**Endpoint**: `sync-lipsync/react-1`

Refine lip sync in videos using React-1 from SyncLabs.

### VEED Background Removal

**Endpoint**: `veed/video-background-removal`

Remove backgrounds from videos with people.

---

## Common API Patterns

### Installation

```bash
npm install --save @fal-ai/client
```

### Authentication

```javascript
// Environment variable (recommended)
export FAL_KEY="YOUR_API_KEY"

// Manual configuration
import { fal } from "@fal-ai/client";
fal.config({ credentials: "YOUR_FAL_KEY" });
```

### Queue-based Processing

```javascript
import { fal } from "@fal-ai/client";

// Submit
const { request_id } = await fal.queue.submit("endpoint", {
  input: { /* ... */ },
  webhookUrl: "https://optional.webhook.url"
});

// Check status
const status = await fal.queue.status("endpoint", {
  requestId: request_id,
  logs: true
});

// Get result
const result = await fal.queue.result("endpoint", {
  requestId: request_id
});
```

## Key Notes

1. **Video Duration Limits**: Most models have duration limits (typically 5-30 seconds)
2. **Resolution Limits**: Check individual models for max resolution (e.g., Bria: 14142x14142)
3. **Audio Preservation**: Many models can preserve original audio or generate new audio
4. **Commercial Use**: Most listed models support commercial use (check individual model pages)
5. **Processing Time**: Video-to-video operations are compute-intensive; use queue-based processing
6. **Seeds**: Use seeds for reproducible results across generations
