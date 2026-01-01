# Qwen Image Edit 2511 API (Multi-Image)

**Endpoint**: `fal-ai/qwen-image-edit-2511`

**Source**: https://fal.ai/models/fal-ai/qwen-image-edit-2511/api

Qwen's Image Editing 2511 model with multi-image support.

## Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/qwen-image-edit-2511", {
  input: {
    prompt: "Change angle to front view",
    image_urls: ["https://example.com/input.png"]
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
```

## Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | **Yes** | - | The prompt to edit the image with |
| `image_urls` | list<string> | **Yes** | - | URLs of images to edit (multi-image) |
| `negative_prompt` | string | No | "" | Negative prompt |
| `image_size` | ImageSize \| Enum | No | (input dims) | Size of the generated image |
| `num_inference_steps` | integer | No | 28 | Number of inference steps |
| `guidance_scale` | float | No | 4.5 | Guidance scale |
| `seed` | integer | No | random | Seed for reproducible generation |
| `num_images` | integer | No | 1 | Number of images to generate |
| `enable_safety_checker` | boolean | No | true | Enable safety checker |
| `output_format` | enum | No | "png" | Format: `jpeg`, `png`, `webp` |
| `acceleration` | enum | No | "regular" | `none`, `regular`, `high` |

## Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `images` | list<Image> | Generated image files info |
| `timings` | Timings | Timing information |
| `seed` | integer | Seed used for generation |
| `has_nsfw_concepts` | list<boolean> | Whether images contain NSFW concepts |
| `prompt` | string | The prompt used |

## Example Input

```json
{
  "prompt": "Change angle to front view",
  "image_urls": [
    "https://example.com/input.png"
  ],
  "num_inference_steps": 28,
  "guidance_scale": 4.5,
  "num_images": 1,
  "enable_safety_checker": true,
  "output_format": "png",
  "acceleration": "regular"
}
```

## Key Notes

- Uses `image_urls` (ARRAY) - supports multiple reference images
- Does NOT have strength parameter
- Supports webp output format
- Has `high` acceleration option
