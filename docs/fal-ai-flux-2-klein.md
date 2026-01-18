# Flux 2 [klein] Image Generation API

Flux 2 [klein] is a family of fast, efficient image generation models from Black Forest Labs. Available in 4B and 9B parameter variants, with text-to-image and edit capabilities.

## Model Variants

| Model | Endpoint | Parameters | Description |
|-------|----------|------------|-------------|
| Flux 2 [klein] 4B | `fal-ai/flux-2-klein-4b` | 4 billion | Fast 4-step inference for text-to-image |
| Flux 2 [klein] 9B | `fal-ai/flux-2-klein-9b` | 9 billion | Higher quality text-to-image |
| Flux 2 [klein] 4B Edit | `fal-ai/flux-2-klein-4b/edit` | 4 billion | Image editing with fast inference |
| Flux 2 [klein] 9B Edit | `fal-ai/flux-2-klein-9b/edit` | 9 billion | Higher quality image editing |

**Source**: https://fal.ai/models/fal-ai/flux-2-klein-4b/api

## Text-to-Image API

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/flux-2-klein-4b", {
  input: {
    prompt: "A serene Japanese garden with cherry blossoms and a wooden bridge",
    image_size: "landscape_16_9",
    num_inference_steps: 4,
    guidance_scale: 3.5
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
```

### Input Schema (Text-to-Image)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | **Yes** | - | Text description of the image to generate |
| `image_size` | ImageSize \| Enum | No | "landscape_4_3" | Output image dimensions |
| `num_inference_steps` | integer | No | 4 | Number of denoising steps |
| `guidance_scale` | float | No | 3.5 | CFG scale for prompt adherence |
| `seed` | integer | No | random | Seed for reproducible generation |
| `safety_tolerance` | enum | No | "2" | Safety level: `1` (strict) to `5` (permissive) |
| `enable_safety_checker` | boolean | No | true | Enable safety checker |
| `output_format` | enum | No | "jpeg" | Format: `jpeg`, `png` |
| `sync_mode` | boolean | No | false | Return as data URI |

### ImageSize Enum Values

- `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9`
- Or custom: `{ "width": 1280, "height": 720 }`

### Safety Tolerance Values

| Value | Description |
|-------|-------------|
| `"1"` | Most strict |
| `"2"` | Default |
| `"3"` | Moderate |
| `"4"` | Permissive |
| `"5"` | Most permissive |

**Note**: Values must be strings (`"1"`, `"2"`, etc.), not numbers.

## Edit API

### Usage Example (Edit)

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/flux-2-klein-4b/edit", {
  input: {
    prompt: "Add a golden crown on the person's head",
    image_urls: ["https://example.com/portrait.jpg"],
    image_size: "auto"
  }
});
```

### Input Schema (Edit)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | **Yes** | - | Edit instruction describing desired changes |
| `image_urls` | list<string> | **Yes** | - | URLs of input images (up to 8) |
| `image_size` | ImageSize \| Enum | No | "auto" | Output dimensions |
| `seed` | integer | No | random | Seed for reproducibility |
| `safety_tolerance` | enum | No | "2" | Safety level (string) |
| `enable_safety_checker` | boolean | No | true | Enable safety checker |
| `output_format` | enum | No | "jpeg" | Format: `jpeg`, `png` |

## Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `images` | list<ImageFile> | Generated images with `url`, `width`, `height` |
| `seed` | integer | Seed used for generation |
| `has_nsfw_concepts` | list<boolean> | NSFW detection results per image |

## Key Notes

1. **4-Step Inference**: Flux 2 [klein] models use only 4 inference steps by default, making them significantly faster than other Flux variants
2. **4B vs 9B**: The 9B model produces higher quality results but is slower; 4B is optimized for speed
3. **Edit Mode**: Edit variants accept `image_urls` (array) for multi-reference editing like Flux 2 [pro] Edit
4. **Image Budget**: Edit mode has a 9 MP total budget for input + output combined
5. **Safety Tolerance**: Must be passed as a string, not a number

## Example Input (Text-to-Image)

```json
{
  "prompt": "A cyberpunk cityscape at night with neon signs and flying cars",
  "image_size": "landscape_16_9",
  "num_inference_steps": 4,
  "guidance_scale": 3.5,
  "safety_tolerance": "2",
  "enable_safety_checker": true,
  "output_format": "png"
}
```

## Example Input (Edit)

```json
{
  "prompt": "Replace the background with a tropical beach",
  "image_urls": [
    "https://example.com/portrait.jpg"
  ],
  "image_size": "auto",
  "safety_tolerance": "2",
  "output_format": "jpeg"
}
```

## Performance Comparison

| Model | Steps | Speed | Quality |
|-------|-------|-------|---------|
| Flux 2 [klein] 4B | 4 | Fastest | Good |
| Flux 2 [klein] 9B | 4 | Fast | Better |
| Flux [schnell] | 4 | Fast | Good |
| Flux [pro] | 25+ | Slower | Best |

The [klein] models offer a good balance between speed and quality, making them suitable for interactive applications and rapid iteration.
