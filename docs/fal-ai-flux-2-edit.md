# FLUX.2 [dev] Edit API

**Endpoint**: `fal-ai/flux-2/edit`

**Source**: https://fal.ai/models/fal-ai/flux-2/edit/api

Lightweight multi-reference image editing with FLUX.2 [dev] from Black Forest Labs. Precise modifications using natural language descriptions and hex color control.

## Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/flux-2/edit", {
  input: {
    prompt: "Change his clothes to casual suit and tie",
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

## Streaming Support

This model supports streaming:

```javascript
const stream = await fal.stream("fal-ai/flux-2/edit", {
  input: {
    prompt: "Change his clothes to casual suit and tie",
    image_urls: ["https://example.com/input.png"]
  }
});

for await (const event of stream) {
  console.log(event);
}

const result = await stream.done();
```

## Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | **Yes** | - | The prompt to edit the image |
| `image_urls` | list<string> | **Yes** | - | URLs of images for editing (max 4, extras ignored) |
| `guidance_scale` | float | No | 2.5 | CFG scale - how closely to follow the prompt |
| `seed` | integer | No | random | Seed for reproducible generation |
| `num_inference_steps` | integer | No | 28 | Number of inference steps |
| `image_size` | ImageSize \| Enum | No | - | Size (512-2048px width/height) |
| `num_images` | integer | No | 1 | Number of images to generate |
| `acceleration` | enum | No | "regular" | `none`, `regular`, `high` |
| `enable_prompt_expansion` | boolean | No | false | Expand prompt for better results |
| `sync_mode` | boolean | No | false | Return as data URI |
| `enable_safety_checker` | boolean | No | true | Enable safety checker |
| `output_format` | enum | No | "png" | Format: `jpeg`, `png`, `webp` |

### ImageSize Enum Values
- `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9`
- Or custom: `{ "width": 1280, "height": 720 }`

## Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `images` | list<ImageFile> | The edited images |
| `timings` | Timings | Timing information |
| `seed` | integer | Seed used for generation |
| `has_nsfw_concepts` | list<boolean> | Whether images contain NSFW concepts |
| `prompt` | string | The prompt used |

## Example Input

```json
{
  "prompt": "Change his clothes to casual suit and tie",
  "guidance_scale": 2.5,
  "num_inference_steps": 28,
  "image_size": {
    "height": 1152,
    "width": 2016
  },
  "num_images": 1,
  "acceleration": "regular",
  "enable_safety_checker": true,
  "output_format": "png",
  "image_urls": [
    "https://storage.googleapis.com/falserverless/example_inputs/flux2_dev_edit_input.png"
  ]
}
```

## Key Notes

- Uses `image_urls` (array) - maximum 4 images
- Does NOT support strength parameter
- Does NOT have safety_tolerance parameter
- Supports streaming for real-time results
- Can be used as foundation for LoRA training
- More cost-effective than flux-2-pro/edit
