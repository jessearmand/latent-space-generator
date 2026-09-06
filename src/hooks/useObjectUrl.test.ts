// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useObjectUrl } from './useObjectUrl';

// jsdom does not implement object URLs; stub them with a deterministic counter
// so each createObjectURL call yields a distinct, inspectable string.
let counter = 0;
const createObjectURL = vi.fn((file: Blob) => `blob:mock/${(file as File).name ?? 'blob'}#${++counter}`);
const revokeObjectURL = vi.fn();

beforeEach(() => {
    counter = 0;
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
});

afterEach(() => {
    cleanup();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
});

const makeFile = (name: string) => new File(['x'], name, { type: 'video/mp4' });

describe('useObjectUrl', () => {
    it('returns null when there is no file', () => {
        const { result } = renderHook(() => useObjectUrl(null));
        expect(result.current).toBeNull();
        expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('creates a URL for a file that is already present on mount', () => {
        const file = makeFile('a.mp4');
        const { result } = renderHook(() => useObjectUrl(file));
        expect(result.current).toBe('blob:mock/a.mp4#1');
        expect(createObjectURL).toHaveBeenCalledWith(file);
    });

    it('creates a URL when the file is set after mount', () => {
        const { result, rerender } = renderHook(({ file }) => useObjectUrl(file), {
            initialProps: { file: null as File | null },
        });
        expect(result.current).toBeNull();

        rerender({ file: makeFile('b.mp4') });
        expect(result.current).toBe('blob:mock/b.mp4#1');
    });

    it('revokes the old URL and clears when the file is set to null', () => {
        const { result, rerender } = renderHook(({ file }) => useObjectUrl(file), {
            initialProps: { file: makeFile('c.mp4') as File | null },
        });
        expect(result.current).toBe('blob:mock/c.mp4#1');

        rerender({ file: null });
        expect(result.current).toBeNull();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/c.mp4#1');
    });

    it('revokes the old URL and creates a new one when the file is replaced', () => {
        const { result, rerender } = renderHook(({ file }) => useObjectUrl(file), {
            initialProps: { file: makeFile('d.mp4') },
        });
        rerender({ file: makeFile('e.mp4') });

        expect(result.current).toBe('blob:mock/e.mp4#2');
        expect(revokeObjectURL).toHaveBeenCalledTimes(1);
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/d.mp4#1');
    });

    it('does not recreate the URL when re-rendered with the same file', () => {
        const sameFile = makeFile('f.mp4');
        const { result, rerender } = renderHook(({ file }) => useObjectUrl(file), {
            initialProps: { file: sameFile },
        });
        rerender({ file: sameFile });

        expect(result.current).toBe('blob:mock/f.mp4#1');
        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(revokeObjectURL).not.toHaveBeenCalled();
    });

    it('revokes the URL on unmount', () => {
        const file = makeFile('g.mp4');
        const { unmount } = renderHook(() => useObjectUrl(file));
        unmount();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/g.mp4#1');
    });
});
