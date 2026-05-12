import { describe, it, expect } from 'vitest';
import { normalizeModel } from './models';

describe('normalizeModel', () => {
    it('overrides category to reference-to-video for /reference-to-video endpoints, even when fal.ai labels them image-to-video', () => {
        const seedanceR2V = normalizeModel({
            endpoint_id: 'bytedance/seedance-2.0/reference-to-video',
            metadata: { category: 'image-to-video', description: 'r2v' },
        });
        expect(seedanceR2V.category).toBe('reference-to-video');
        expect(seedanceR2V.supportsImageInput).toBe(true);
        expect(seedanceR2V.outputType).toBe('video');

        const seedanceFastR2V = normalizeModel({
            endpoint_id: 'bytedance/seedance-2.0/fast/reference-to-video',
            metadata: { category: 'image-to-video' },
        });
        expect(seedanceFastR2V.category).toBe('reference-to-video');
    });

    it('preserves metadata.category for non-reference-to-video endpoints', () => {
        const seedanceI2V = normalizeModel({
            endpoint_id: 'bytedance/seedance-2.0/image-to-video',
            metadata: { category: 'image-to-video' },
        });
        expect(seedanceI2V.category).toBe('image-to-video');

        const klingI2V = normalizeModel({
            endpoint_id: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
            metadata: { category: 'image-to-video' },
        });
        expect(klingI2V.category).toBe('image-to-video');
    });

    it('falls back to text-to-image when metadata.category is missing', () => {
        const noMetadata = normalizeModel({
            endpoint_id: 'fal-ai/some-image-model',
        });
        expect(noMetadata.category).toBe('text-to-image');
    });
});
