import { describe, expect, it } from 'vitest';
import { CURATED_IMAGE_TO_VIDEO_MODELS, CURATED_TEXT_TO_VIDEO_MODELS } from './videoModels';

describe('curated safety-configurable video models', () => {
    it('includes standard FLUX 3 text/image-to-video and Wan 2.7', () => {
        const textEndpointIds = CURATED_TEXT_TO_VIDEO_MODELS.map((model) => model.endpointId);
        const imageEndpointIds = CURATED_IMAGE_TO_VIDEO_MODELS.map((model) => model.endpointId);

        expect(textEndpointIds).toEqual(
            expect.arrayContaining(['blackforestlabs/flux-3/text-to-video', 'minimax/h3/text-to-video']),
        );
        expect(imageEndpointIds).toEqual(
            expect.arrayContaining([
                'blackforestlabs/flux-3/image-to-video',
                'fal-ai/wan/v2.7/image-to-video',
                'minimax/h3/image-to-video',
            ]),
        );
    });
});
