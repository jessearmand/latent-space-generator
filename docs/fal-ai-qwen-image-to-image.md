# Qwen Image Image to Image API

**Endpoint**: `fal-ai/qwen-image/image-to-image`

**Source**: https://fal.ai/models/fal-ai/qwen-image/image-to-image/api

Qwen-Image (Image-to-Image) transforms and edits input images with high fidelity, enabling precise style transfer, enhancement, and creative modification.

## Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/qwen-image/image-to-image", {
  input: {
    prompt: "Mount Fuji with purple japanese wisteria...",
    image_url: "https://example.com/input.png",
    strength: 0.8
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
| `image_url` | string | **Yes** | - | The reference image to guide the generation |
| `strength` | float | No | 0.6 | Denoising strength. 1.0 = fully remake; 0.0 = preserve original |
| `image_size` | ImageSize \| Enum | No | (from image) | Size of the generated image |
| `num_inference_steps` | integer | No | 30 | The number of inference steps to perform |
| `seed` | integer | No | random | Seed for reproducible generation |
| `guidance_scale` | float | No | 2.5 | CFG scale - how closely to follow the prompt |
| `num_images` | integer | No | 1 | Number of images to generate |
| `enable_safety_checker` | boolean | No | true | Enable safety checker |
| `output_format` | enum | No | "png" | Format: `jpeg`, `png` |
| `negative_prompt` | string | No | " " | Negative prompt for the generation |
| `acceleration` | enum | No | "none" | `none`, `regular`, `high` - higher = faster |
| `loras` | list<LoraWeight> | No | - | LoRAs for image generation (up to 3) |
| `use_turbo` | boolean | No | false | Enable turbo mode (10 steps, CFG=1.2) |

### ImageSize Enum Values
- `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9`
- Or custom: `{ "width": 1280, "height": 720 }`

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
  "prompt": "Mount Fuji with purple japanese wisteria...",
  "num_inference_steps": 30,
  "guidance_scale": 2.5,
  "num_images": 1,
  "enable_safety_checker": true,
  "output_format": "png",
  "negative_prompt": "blurry, ugly",
  "acceleration": "none",
  "use_turbo": true,
  "image_url": "https://v3.fal.media/files/rabbit/KoIbq6nhDBDPxDQrivW-m.png",
  "strength": 0.8
}
```

## Key Notes

- Uses `image_url` (string) NOT `image_urls` (array)
- Uses `strength` parameter for transformation control
- Supports LoRA adapters
- Has acceleration options for faster generation
