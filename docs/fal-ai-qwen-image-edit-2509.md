# Qwen Image Edit 2509 API (Multi-Image)

**Endpoint**: `fal-ai/qwen-image-edit-2509`

**Source**: https://fal.ai/models/fal-ai/qwen-image-edit-2509/api

Qwen's Image Editing Plus model (Qwen-Image-Edit-2509). Has superior text editing capabilities and **multi-image support**.

## Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/qwen-image-edit-2509", {
  input: {
    prompt: "Close shot of a woman standing next to this car on this highway",
    image_urls: [
      "https://example.com/woman.png",
      "https://example.com/car.png",
      "https://example.com/highway.png"
    ]
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
| `image_urls` | list<string> | **Yes** | - | URLs of images to edit (multi-image) |
| `image_size` | ImageSize \| Enum | No | "square_hd" | Size of the generated image |
| `num_inference_steps` | integer | No | 50 | Number of inference steps |
| `seed` | integer | No | random | Seed for reproducible generation |
| `guidance_scale` | float | No | 4 | CFG scale |
| `num_images` | integer | No | 1 | Number of images to generate |
| `enable_safety_checker` | boolean | No | true | Enable safety checker |
| `output_format` | enum | No | "png" | Format: `jpeg`, `png` |
| `negative_prompt` | string | No | " " | Negative prompt |
| `acceleration` | enum | No | "regular" | `none`, `regular` |

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
  "prompt": "Close shot of a woman standing next to this car on this highway",
  "image_size": "square_hd",
  "num_inference_steps": 50,
  "guidance_scale": 4,
  "num_images": 1,
  "enable_safety_checker": true,
  "output_format": "png",
  "image_urls": [
    "https://example.com/image1.png",
    "https://example.com/image2.png",
    "https://example.com/image3.png"
  ],
  "negative_prompt": " ",
  "acceleration": "regular"
}
```

## Key Notes

- Uses `image_urls` (ARRAY) - supports multiple reference images
- Does NOT have strength parameter
- Specifically designed for multi-image compositing and editing
- Higher default inference steps (50) than other Qwen models
