// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { VideoUploadZone } from './VideoUploadZone';

vi.mock('./VideoUploadZone.css', () => ({}));

// jsdom does not implement object URLs.
const createObjectURL = vi.fn((file: Blob) => `blob:mock/${(file as File).name}`);
const revokeObjectURL = vi.fn();

beforeEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
});

afterEach(() => {
    cleanup();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
});

const makeFile = (name = 'clip.mp4') => new File(['x'], name, { type: 'video/mp4' });
const getPreview = () => document.querySelector<HTMLVideoElement>('video.video-preview-player');

describe('VideoUploadZone preview sync (issue #4)', () => {
    it('renders a preview when mounted with a file already set by the parent', () => {
        render(<VideoUploadZone uploadedFile={makeFile()} onFileChange={vi.fn()} />);

        expect(screen.getByText('clip.mp4')).toBeTruthy();
        expect(getPreview()?.src).toBe('blob:mock/clip.mp4');
    });

    it('renders a preview when the parent sets a file after mount', () => {
        const { rerender } = render(<VideoUploadZone uploadedFile={null} onFileChange={vi.fn()} />);
        expect(getPreview()).toBeNull();

        rerender(<VideoUploadZone uploadedFile={makeFile('later.mp4')} onFileChange={vi.fn()} />);
        expect(getPreview()?.src).toBe('blob:mock/later.mp4');
    });

    it('drops the preview and revokes its URL when the parent clears the file', () => {
        const { rerender } = render(<VideoUploadZone uploadedFile={makeFile()} onFileChange={vi.fn()} />);
        expect(getPreview()).not.toBeNull();

        rerender(<VideoUploadZone uploadedFile={null} onFileChange={vi.fn()} />);
        expect(getPreview()).toBeNull();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/clip.mp4');
    });

    it('swaps the preview when the parent replaces the file', () => {
        const { rerender } = render(<VideoUploadZone uploadedFile={makeFile('one.mp4')} onFileChange={vi.fn()} />);
        rerender(<VideoUploadZone uploadedFile={makeFile('two.mp4')} onFileChange={vi.fn()} />);

        expect(getPreview()?.src).toBe('blob:mock/two.mp4');
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/one.mp4');
    });

    it('reports a valid dropped file to the parent without creating its own URL', () => {
        const onFileChange = vi.fn();
        render(<VideoUploadZone uploadedFile={null} onFileChange={onFileChange} />);
        const file = makeFile('dropped.mp4');

        fireEvent.drop(screen.getByRole('button', { name: 'Upload video file' }), {
            dataTransfer: { files: [file] },
        });

        expect(onFileChange).toHaveBeenCalledWith(file);
        // The URL is derived from the prop, so nothing is created until the parent echoes the file back.
        expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('rejects a file with an unsupported type', () => {
        const onFileChange = vi.fn();
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<VideoUploadZone uploadedFile={null} onFileChange={onFileChange} />);

        fireEvent.drop(screen.getByRole('button', { name: 'Upload video file' }), {
            dataTransfer: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] },
        });

        expect(onFileChange).not.toHaveBeenCalled();
        error.mockRestore();
    });

    it('reports null to the parent when Remove is clicked', () => {
        const onFileChange = vi.fn();
        render(<VideoUploadZone uploadedFile={makeFile()} onFileChange={onFileChange} />);

        fireEvent.click(screen.getByText('Remove'));
        expect(onFileChange).toHaveBeenCalledWith(null);
    });
});
