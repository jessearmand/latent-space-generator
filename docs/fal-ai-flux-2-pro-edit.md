# FLUX.2 [pro] Edit API

**Endpoint**: `fal-ai/flux-2-pro/edit`

**Source**: https://fal.ai/models/fal-ai/flux-2-pro/edit/api

Production-grade multi-reference image editing with FLUX.2 [pro] from Black Forest Labs. Combines up to 9 reference images (9 MP total) with zero-configuration.

## Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/flux-2-pro/edit", {
  input: {
    prompt: "Place realistic flames emerging from the top of the coffee cup",
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
| `prompt` | string | **Yes** | - | The prompt to generate an image from |
| `image_urls` | list<string> | **Yes** | - | List of URLs of input images for editing |
| `image_size` | ImageSize \| Enum | No | "auto" | Size of the generated image |
| `seed` | integer | No | random | Seed for reproducible generation |
| `safety_tolerance` | enum | No | "2" | Safety level: `1` (strict) to `5` (permissive) - **API only** |
| `enable_safety_checker` | boolean | No | true | Enable safety checker |
| `output_format` | enum | No | "jpeg" | Format: `jpeg`, `png` |
| `sync_mode` | boolean | No | false | Return as data URI |

### ImageSize Enum Values
- `auto`, `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9`
- Or custom: `{ "width": 1280, "height": 720 }`

### Safety Tolerance Values
- `1` - Most strict
- `2` - Default
- `3` - Moderate
- `4` - Permissive
- `5` - Most permissive

**Note**: Values must be strings (`"1"`, `"2"`, etc.), not numbers.

## Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `images` | list<ImageFile> | The generated images |
| `seed` | integer | Seed used for generation |

## Example Input

```json
{
  "prompt": "Place realistic flames emerging from the top of the coffee cup",
  "image_size": "auto",
  "safety_tolerance": "2",
  "enable_safety_checker": true,
  "output_format": "jpeg",
  "image_urls": [
    "https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png"
  ]
}
```

## Key Notes

- Uses `image_urls` (array) - can accept up to 9 reference images
- Does NOT support strength parameter
- `safety_tolerance` must be a STRING ("1"-"5"), not a number
- Maximum 9 megapixels total across all input images
- Supports sequential/chained editing workflows
