# Qwen Image Edit API

**Endpoint**: `fal-ai/qwen-image-edit`

**Source**: https://fal.ai/models/fal-ai/qwen-image-edit/api

Qwen's Image Editing model with superior text editing capabilities. Single-image editing.

## Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/qwen-image-edit", {
  input: {
    prompt: "Change bag to apple macbook",
    image_url: "https://example.com/input.png"
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
| `prompt` | string | **Yes** | - | The prompt to generate the image with |
| `image_url` | string | **Yes** | - | The URL of the image to edit |
| `image_size` | ImageSize \| Enum | No | - | Size of the generated image |
| `num_inference_steps` | integer | No | 30 | Number of inference steps |
| `seed` | integer | No | random | Seed for reproducible generation |
| `guidance_scale` | float | No | 4 | CFG scale |
| `num_images` | integer | No | 1 | Number of images to generate |
| `enable_safety_checker` | boolean | No | true | Enable safety checker |
| `output_format` | enum | No | "png" | Format: `jpeg`, `png` |
| `negative_prompt` | string | No | " " | Negative prompt |
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
  "prompt": "Change bag to apple macbook",
  "num_inference_steps": 30,
  "guidance_scale": 4,
  "num_images": 1,
  "enable_safety_checker": true,
  "output_format": "png",
  "image_url": "https://example.com/input.png",
  "negative_prompt": "blurry, ugly",
  "acceleration": "regular"
}
```

## Related: Image-to-Image Variant

`fal-ai/qwen-image-edit/image-to-image` - Same model but with additional `strength` parameter (default 0.94) for controlling transformation intensity.

## Key Notes

- Uses `image_url` (STRING) - single image input
- Does NOT have strength parameter (use /image-to-image variant for that)
- Superior text editing capabilities
- Good for object replacement and text modifications
