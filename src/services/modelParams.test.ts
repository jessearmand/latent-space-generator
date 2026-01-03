import { describe, it, expect } from 'vitest';
import { getImageInputConfig } from './modelParams';

describe('getImageInputConfig', () => {
    describe('Flux Edit models (multi-image, no strength)', () => {
        it.each([
            ['fal-ai/flux-2-pro/edit', 8],
            ['fal-ai/flux-2/edit', 8],
            ['fal-ai/flux-2/flash/edit', 8],
        ])('%s should have maxImages=%i, array format, no strength', (modelId, maxImages) => {
            const config = getImageInputConfig(modelId);
            expect(config).toEqual({
                paramName: 'image_urls',
                isArray: true,
                strengthParam: null,
                maxImages,
            });
        });
    });

    describe('Qwen Edit models with date suffix (multi-image, no strength)', () => {
        it.each([
            ['fal-ai/qwen-image-edit-2509', 4],
            ['fal-ai/qwen-image-edit-2511', 4],
            ['fal-ai/qwen-image-edit-plus', 4],
        ])('%s should have maxImages=%i, array format, no strength', (modelId, maxImages) => {
            const config = getImageInputConfig(modelId);
            expect(config).toEqual({
                paramName: 'image_urls',
                isArray: true,
                strengthParam: null,
                maxImages,
            });
        });
    });

    describe('Image-to-image models (single image, with strength)', () => {
        it.each([
            'fal-ai/flux-lora/image-to-image',
            'fal-ai/flux/dev/image-to-image',
            'fal-ai/qwen-image/image-to-image',
            'fal-ai/qwen-image-edit/image-to-image',
        ])('%s should have single image_url with strength parameter', (modelId) => {
            const config = getImageInputConfig(modelId);
            expect(config).toEqual({
                paramName: 'image_url',
                isArray: false,
                strengthParam: 'strength',
                maxImages: 1,
            });
        });
    });

    describe('Kontext model (single image, no strength)', () => {
        it('fal-ai/flux-pro/kontext should have single image_url, no strength', () => {
            const config = getImageInputConfig('fal-ai/flux-pro/kontext');
            expect(config).toEqual({
                paramName: 'image_url',
                isArray: false,
                strengthParam: null,
                maxImages: 1,
            });
        });
    });

    describe('Qwen base edit model (single image, no strength)', () => {
        it('fal-ai/qwen-image-edit should have single image_url, no strength', () => {
            const config = getImageInputConfig('fal-ai/qwen-image-edit');
            expect(config).toEqual({
                paramName: 'image_url',
                isArray: false,
                strengthParam: null,
                maxImages: 1,
            });
        });
    });

    describe('Qwen layered model (single image, no strength)', () => {
        it('fal-ai/qwen-image-layered should have single image_url, no strength', () => {
            const config = getImageInputConfig('fal-ai/qwen-image-layered');
            expect(config).toEqual({
                paramName: 'image_url',
                isArray: false,
                strengthParam: null,
                maxImages: 1,
            });
        });
    });

    describe('WAN models (multi-image, no strength)', () => {
        it.each([
            'fal-ai/wan/v2.6/image-to-image',
            'fal-ai/wan-pro/image',
        ])('%s should have array format, no strength', (modelId) => {
            const config = getImageInputConfig(modelId);
            expect(config).toEqual({
                paramName: 'image_urls',
                isArray: true,
                strengthParam: null,
                maxImages: 4,
            });
        });
    });
});
