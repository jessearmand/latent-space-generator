# Qwen Image Layered API

**Endpoint**: `fal-ai/qwen-image-layered`

**Source**: https://fal.ai/models/fal-ai/qwen-image-layered/api

Qwen-Image-Layered is a model capable of decomposing an image into multiple RGBA layers. Unlike other image-to-image models that transform images, this model separates an input image into distinct visual layers.

## Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/qwen-image-layered", {
  input: {
    image_url: "https://example.com/input.png",
    prompt: "A layered composition",
    num_layers: 4,
    acceleration: "regular"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});

// Result contains multiple images (one per layer)
console.log(result.data.images); // Array of layer images
```

## Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `image_url` | string | **Yes** | - | URL of the input image to decompose |
| `prompt` | string | No | - | A caption for the input image |
| `negative_prompt` | string | No | "" | Negative prompt |
| `num_layers` | integer | No | 4 | Number of layers to generate (1-10) |
| `num_inference_steps` | integer | No | 28 | Number of inference steps (1-50) |
| `guidance_scale` | float | No | 5 | Guidance scale (1-20) |
| `seed` | integer | No | random | Seed for reproducible generation |
| `enable_safety_checker` | boolean | No | true | Enable safety checker |
| `output_format` | enum | No | "png" | Format: `png`, `webp` |
| `acceleration` | enum | No | "regular" | `none`, `regular`, `high` |
| `sync_mode` | boolean | No | false | Return as data URI |

## Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `images` | list<Image> | Generated layer images (one per layer) |
| `timings` | Timings | Timing information |
| `seed` | integer | Seed used for generation |
| `has_nsfw_concepts` | list<boolean> | Whether images contain NSFW concepts |
| `prompt` | string | The prompt used |

## Example Input

```json
{
  "image_url": "https://example.com/input.png",
  "prompt": "A layered composition",
  "num_layers": 4,
  "num_inference_steps": 28,
  "guidance_scale": 5,
  "enable_safety_checker": true,
  "output_format": "png",
  "acceleration": "regular"
}
```

## Example Output

```json
{
  "images": [
    { "url": "https://fal.media/files/.../layer1.png" },
    { "url": "https://fal.media/files/.../layer2.png" },
    { "url": "https://fal.media/files/.../layer3.png" },
    { "url": "https://fal.media/files/.../layer4.png" }
  ],
  "seed": 12345,
  "has_nsfw_concepts": [false, false, false, false],
  "prompt": "A layered composition"
}
```

## Key Notes

- Uses `image_url` (STRING) - single image input only
- Does NOT have strength parameter - this is layer decomposition, not transformation
- Returns MULTIPLE images (one per layer) - handle array response
- `num_layers` controls how many layers the image is decomposed into (1-10)
- `acceleration` affects speed vs quality tradeoff:
  - `none` - highest quality, slowest
  - `regular` - balanced (default)
  - `high` - fastest, may reduce quality
- Output images are RGBA with transparency for layered compositing
