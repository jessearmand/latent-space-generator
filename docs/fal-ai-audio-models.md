# fal.ai Audio Models API

This document covers the audio generation models available on fal.ai, including text-to-speech, voice cloning, music generation, and sound effects.

## Model Overview

| Provider | Model | Endpoint | Type | Commercial |
|----------|-------|----------|------|------------|
| Chatterbox | Text-to-Speech | `fal-ai/chatterbox/text-to-speech` | text-to-speech | Yes |
| MiniMax | Speech-02-HD | `fal-ai/minimax/speech-02-hd` | text-to-speech | Yes |
| Dia TTS | Voice Clone | `fal-ai/dia-tts/voice-clone` | audio-to-audio | Yes |
| Mirelo AI | SFX V1 (Audio) | `mirelo-ai/sfx-v1/video-to-audio` | video-to-audio | Yes |
| Mirelo AI | SFX V1 (Video) | `mirelo-ai/sfx-v1/video-to-video` | video-to-video | Yes |
| Beatoven | Music Generation | `beatoven/music-generation` | text-to-audio | Yes |
| Beatoven | Sound Effects | `beatoven/sound-effect-generation` | text-to-audio | Yes |

**Source**: https://fal.ai/explore/audio-models

---

## Chatterbox Text-to-Speech

High-quality TTS from Resemble AI with emotive tags support. Perfect for memes, videos, games, and AI agents.

**Endpoint**: `fal-ai/chatterbox/text-to-speech`

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/chatterbox/text-to-speech", {
  input: {
    text: "I just found a hidden treasure in the backyard! <laugh> Check it out!",
    exaggeration: 0.25,
    temperature: 0.7
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | **Yes** | - | Text to convert. Supports emotive tags: `<laugh>`, `<chuckle>`, `<sigh>`, `<cough>`, `<sniffle>`, `<groan>`, `<yawn>`, `<gasp>` |
| `audio_url` | string | No | sample URL | Reference audio URL for style/tone matching |
| `exaggeration` | float | No | 0.25 | Speech exaggeration factor (0.0 = none, 1.0 = maximum) |
| `temperature` | float | No | 0.7 | Generation temperature (higher = more creative) |
| `cfg` | float | No | 0.5 | Configuration scale |
| `seed` | integer | No | random | Seed for reproducibility (0 = random) |

### Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `audio` | object | Contains `url` field with generated audio URL |

### Example Input

```json
{
  "text": "Hello! <chuckle> How are you doing today?",
  "audio_url": "https://storage.googleapis.com/chatterbox-demo-samples/prompts/male_rickmorty.mp3",
  "exaggeration": 0.25,
  "temperature": 0.7,
  "cfg": 0.5
}
```

---

## MiniMax Speech-02-HD

Advanced HD text-to-speech with voice settings, emotions, and 30+ language support.

**Endpoint**: `fal-ai/minimax/speech-02-hd`

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/minimax/speech-02-hd", {
  input: {
    text: "Hello world! This is a test of the text-to-speech system.",
    voice_setting: {
      voice_id: "Wise_Woman",
      speed: 1,
      vol: 1,
      pitch: 0
    },
    output_format: "url"
  }
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | **Yes** | - | Text to convert (max 5000 chars, min 1 non-whitespace) |
| `voice_setting` | object | No | - | Voice configuration (see below) |
| `audio_setting` | object | No | - | Audio configuration (see below) |
| `language_boost` | enum | No | - | Enhance recognition for specific language |
| `output_format` | enum | No | "hex" | Output format: `url` or `hex` |
| `pronunciation_dict` | object | No | - | Custom pronunciation dictionary |

### Voice Setting Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `voice_id` | string | "Wise_Woman" | Predefined voice ID |
| `speed` | float | 1 | Speech speed (0.5-2.0) |
| `vol` | float | 1 | Volume (0-10) |
| `pitch` | integer | 0 | Voice pitch (-12 to 12) |
| `emotion` | enum | - | Emotion: `happy`, `sad`, `angry`, `fearful`, `disgusted`, `surprised`, `neutral` |
| `english_normalization` | boolean | false | Improves number reading performance |

### Audio Setting Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sample_rate` | enum | "32000" | Sample rate: `8000`, `16000`, `22050`, `24000`, `32000`, `44100` |
| `bitrate` | enum | "128000" | Bitrate: `32000`, `64000`, `128000`, `256000` |
| `format` | enum | "mp3" | Format: `mp3`, `pcm`, `flac` |
| `channel` | enum | "1" | Channels: `1` (mono) or `2` (stereo) |

### Supported Languages

Chinese, Cantonese, English, Arabic, Russian, Spanish, French, Portuguese, German, Turkish, Dutch, Ukrainian, Vietnamese, Indonesian, Japanese, Italian, Korean, Thai, Polish, Romanian, Greek, Czech, Finnish, Hindi, Bulgarian, Danish, Hebrew, Malay, Slovak, Swedish, Croatian, Hungarian, Norwegian, Slovenian, Catalan, Nynorsk, Afrikaans, auto

### Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `audio` | object | Contains `url` with generated audio |
| `duration_ms` | integer | Duration of audio in milliseconds |

---

## Dia TTS Voice Clone

Clone dialog voices from sample audio and generate multi-speaker dialogs.

**Endpoint**: `fal-ai/dia-tts/voice-clone`

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/dia-tts/voice-clone", {
  input: {
    text: "[S1] Hello, how are you? [S2] I'm good, thank you. [S1] What's your name?",
    ref_audio_url: "https://v3.fal.media/files/elephant/d5lORit2npFfBykcAtyUr_tmplacfh8oa.mp3",
    ref_text: "[S1] Dia is an open weights text to dialogue model. [S2] You get full control over scripts and voices."
  }
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | **Yes** | - | Dialog text with speaker tags `[S1]`, `[S2]` |
| `ref_audio_url` | string | **Yes** | - | Reference audio URL for voice cloning |
| `ref_text` | string | **Yes** | - | Transcript of reference audio with speaker tags |

### Key Features

- **Multi-speaker**: Use `[S1]` and `[S2]` tags to denote different speakers
- **Paralinguistic expressions**: Supports `(laughs)`, `(sighs)`, etc.
- **Voice cloning**: Matches style and tone from reference audio

### Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `audio` | object | Contains `url` with generated speech audio |

---

## Mirelo AI SFX V1

Generate synchronized sound effects for videos. Available in two variants: video-to-audio (returns audio only) and video-to-video (returns video with new soundtrack).

### Video-to-Audio

**Endpoint**: `mirelo-ai/sfx-v1/video-to-audio`

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("mirelo-ai/sfx-v1/video-to-audio", {
  input: {
    video_url: "https://di3otfzjg1gxa.cloudfront.net/input_example.mp4",
    text_prompt: "forest ambience with birds",
    num_samples: 2
  }
});
```

### Video-to-Video

**Endpoint**: `mirelo-ai/sfx-v1/video-to-video`

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("mirelo-ai/sfx-v1/video-to-video", {
  input: {
    video_url: "https://di3otfzjg1gxa.cloudfront.net/input_example.mp4",
    text_prompt: "dramatic action scene sounds"
  }
});
```

### Input Schema (Both Variants)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `video_url` | string | **Yes** | - | Video URL to process |
| `text_prompt` | string | No | "" | Additional description to guide the model |
| `num_samples` | integer | No | 2 | Number of samples to generate |
| `seed` | integer | No | 2105 | Random seed |
| `duration` | float | No | 10 | Audio duration in seconds |

### Output Schema

**Video-to-Audio**:

| Field | Type | Description |
|-------|------|-------------|
| `audio` | array | Array of audio files (WAV format) with `url`, `file_name`, `content_type` |

**Video-to-Video**:

| Field | Type | Description |
|-------|------|-------------|
| `video` | array | Array of video files (MP4) with embedded sound effects |

---

## Beatoven Music Generation

Generate royalty-free instrumental music from text prompts. Supports jazz, ambient, cinematic, latin, house, hip-hop, classical, and more.

**Endpoint**: `beatoven/music-generation`

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("beatoven/music-generation", {
  input: {
    prompt: "Jazz music for a late-night restaurant setting",
    duration: 90,
    refinement: 100,
    creativity: 16
  }
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | **Yes** | - | Music description (style, mood, instruments) |
| `negative_prompt` | string | No | "" | What to avoid in the music |
| `duration` | float | No | 90 | Length in seconds (5-150) |
| `refinement` | integer | No | 100 | Quality refinement level (higher = better, slower) |
| `creativity` | float | No | 16 | Creative interpretation level |
| `seed` | integer | No | random | Seed for reproducible results |

### Example Prompts

- "Jazz music for a late-night restaurant setting"
- "A lush, ambient soundscape featuring serene sounds, and a gentle, melancholic piano melody"
- "Hip-hop music, mellow keys and vinyl crackle"
- "House music with synthesizers, driving bass and a steady 4/4 beat"
- "Classical piano melody with emotional depth and gentle strings"

### Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `audio` | object | Generated WAV audio file with `url` |
| `prompt` | string | Processed prompt used for generation |
| `metadata` | object | Generation metadata (duration, sample rate, parameters) |

---

## Beatoven Sound Effect Generation

Create professional-grade sound effects from text descriptions.

**Endpoint**: `beatoven/sound-effect-generation`

### Usage Example

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("beatoven/sound-effect-generation", {
  input: {
    prompt: "Powerful helicopter takeoff: rapidly building rotor blades whirring and chopping",
    duration: 7,
    refinement: 40
  }
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | **Yes** | - | Sound effect description |
| `negative_prompt` | string | No | "" | Sounds to avoid (no double-negatives) |
| `duration` | float | No | 5 | Length in seconds (1.0-35.0) |
| `refinement` | integer | No | 40 | Quality level (higher = better, slower) |
| `creativity` | float | No | 16 | Creative interpretation level |
| `seed` | integer | No | random | Seed for reproducible results |

### Example Prompts

- "Footsteps on gravel"
- "A cinematic explosion with debris falling"
- "Rain falling on a window pane"
- "A futuristic spaceship door opening"
- "Unintelligible live announcements in an airport, with the general airport chaos all around"

### Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `audio` | object | Generated WAV audio file with `url` |
| `prompt` | string | Processed prompt used for generation |
| `metadata` | object | Generation metadata |

---

## Common API Patterns

### Installation

```bash
npm install --save @fal-ai/client
```

### Authentication

```javascript
// Option 1: Environment variable (recommended)
export FAL_KEY="YOUR_API_KEY"

// Option 2: Manual configuration
import { fal } from "@fal-ai/client";
fal.config({ credentials: "YOUR_FAL_KEY" });
```

### Queue-based Processing

For long-running requests:

```javascript
import { fal } from "@fal-ai/client";

// Submit request
const { request_id } = await fal.queue.submit("endpoint", {
  input: { /* ... */ },
  webhookUrl: "https://optional.webhook.url/for/results"
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

### File Handling

```javascript
import { fal } from "@fal-ai/client";

// Upload file
const file = new File(["content"], "audio.mp3", { type: "audio/mpeg" });
const url = await fal.storage.upload(file);

// Use in request
const result = await fal.subscribe("endpoint", {
  input: { audio_url: url }
});
```

## Key Notes

1. **Audio Formats**: Most models output WAV format at 44.1kHz stereo
2. **Duration Limits**: Vary by model (check individual schemas)
3. **Commercial Use**: All listed models support commercial use
4. **Seeds**: Use seeds for reproducible results across generations
5. **File Inputs**: Accept URLs or Base64 data URIs
