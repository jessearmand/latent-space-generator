# LTX-2 Video Generation API

LTX-2 is a family of text-to-video and image-to-video models from Lightricks, available on fal.ai. The family includes Pro, Fast, and 19B variants with different capabilities.

## Model Variants

| Model | Endpoint | Duration | Resolution | FPS | Audio |
|-------|----------|----------|------------|-----|-------|
| LTX-2 Pro T2V | `fal-ai/ltx-2/text-to-video` | 6, 8, 10s | 1080p-2160p | 25, 50 | Yes |
| LTX-2 Fast T2V | `fal-ai/ltx-2/text-to-video/fast` | 6-20s | 1080p-2160p | 25, 50 | Yes |
| LTX-2 Pro I2V | `fal-ai/ltx-2/image-to-video` | 6, 8, 10s | 1080p-2160p | 25, 50 | Yes |
| LTX-2 19B | `fal-ai/ltx-2-19b/text-to-video` | via num_frames | via video_size | float | No |

**Source**: https://fal.ai/models/fal-ai/ltx-2/text-to-video/api

## LTX-2 Pro/Fast API

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/ltx-2/text-to-video", {
  input: {
    prompt: "A majestic dragon flying over a medieval castle at sunset",
    duration: 6,
    resolution: "1080p",
    aspect_ratio: "16:9",
    fps: 25,
    generate_audio: true
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
```

### Input Schema (Pro/Fast)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | **Yes** | - | Text description of the video to generate |
| `duration` | integer | No | 6 | Duration in seconds (Pro: 6, 8, 10; Fast: 6-20) |
| `resolution` | enum | No | "1080p" | Video resolution: `1080p`, `1440p`, `2160p` |
| `aspect_ratio` | enum | No | "16:9" | Only `16:9` is supported |
| `fps` | integer | No | 25 | Frame rate: `25` or `50` |
| `generate_audio` | boolean | No | true | Whether to generate audio track |
| `seed` | integer | No | random | Seed for reproducible generation |
| `negative_prompt` | string | No | - | Content to avoid in generation |

### Image-to-Video Input (Pro I2V)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `image_url` | string | **Yes** | - | URL of the starting image |
| `prompt` | string | **Yes** | - | Text description of the video motion |
| *(other parameters same as above)* |

### Duration Limits

- **LTX-2 Pro**: 6, 8, or 10 seconds
- **LTX-2 Fast**: 6-20 seconds (longer durations require 25fps + 1080p)

### Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `video` | object | Contains `url` field with video URL |
| `seed` | integer | Seed used for generation |

## LTX-2 19B API

The 19B variant has different parameters optimized for advanced control.

**Endpoint**: `fal-ai/ltx-2-19b/text-to-video`

### Usage Example (19B)

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/ltx-2-19b/text-to-video", {
  input: {
    prompt: "Cinematic shot of a forest with morning mist",
    num_frames: 121,
    video_size: "landscape_16_9",
    num_inference_steps: 40,
    acceleration: "regular",
    use_multiscale: true,
    camera_lora: "dolly_in",
    camera_lora_scale: 0.8
  }
});
```

### Input Schema (19B)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | **Yes** | - | Text description of the video |
| `num_frames` | integer | No | 121 | Number of frames (9-481), ~5s at 25fps |
| `video_size` | enum | No | "landscape_4_3" | Video dimensions preset |
| `num_inference_steps` | integer | No | 40 | Denoising steps (8-50) |
| `acceleration` | enum | No | "regular" | Speed/quality trade-off |
| `use_multiscale` | boolean | No | true | Better coherence and details |
| `camera_lora` | enum | No | - | Camera movement preset |
| `camera_lora_scale` | float | No | 1.0 | Camera movement strength (0-1) |
| `enable_prompt_expansion` | boolean | No | false | Auto-enhance prompt |
| `guidance_scale` | float | No | 3.0 | CFG scale for prompt adherence |
| `seed` | integer | No | random | Seed for reproducibility |

### Video Size Presets (19B)

| Value | Aspect Ratio |
|-------|--------------|
| `landscape_16_9` | 16:9 |
| `landscape_4_3` | 4:3 |
| `portrait_9_16` | 9:16 |
| `portrait_3_4` | 3:4 |
| `square` | 1:1 |
| `square_hd` | 1:1 (higher resolution) |

### Acceleration Options (19B)

| Value | Description |
|-------|-------------|
| `none` | Highest quality, slowest |
| `regular` | Balanced (default) |
| `high` | Faster generation |
| `full` | Fastest, lower quality |

### Camera LoRA Presets (19B)

| Value | Description |
|-------|-------------|
| `dolly_in` | Camera moves forward |
| `dolly_out` | Camera moves backward |
| `dolly_left` | Camera moves left |
| `dolly_right` | Camera moves right |
| `jib_up` | Camera moves upward |
| `jib_down` | Camera moves downward |
| `static` | No camera movement |

## Key Notes

1. **Audio Generation**: LTX-2 Pro/Fast support automatic audio generation via `generate_audio: true`
2. **Aspect Ratio**: Only 16:9 is supported for Pro/Fast variants; 19B has more options via `video_size`
3. **FPS Selection**: Higher FPS (50) creates smoother motion but limits duration options for Fast variant
4. **19B vs Pro/Fast**: 19B uses `num_frames` and `video_size` instead of `duration` and `resolution`
5. **Camera Movement**: Only available on 19B model via `camera_lora` parameter

## Example Input (Pro)

```json
{
  "prompt": "A futuristic cityscape with flying cars and neon lights",
  "duration": 8,
  "resolution": "1080p",
  "aspect_ratio": "16:9",
  "fps": 25,
  "generate_audio": true,
  "negative_prompt": "blurry, low quality, distorted"
}
```

## Example Input (19B)

```json
{
  "prompt": "Aerial view of ocean waves crashing on a rocky coastline",
  "num_frames": 121,
  "video_size": "landscape_16_9",
  "num_inference_steps": 40,
  "acceleration": "regular",
  "use_multiscale": true,
  "guidance_scale": 3.0,
  "camera_lora": "dolly_out",
  "camera_lora_scale": 0.7
}
```
