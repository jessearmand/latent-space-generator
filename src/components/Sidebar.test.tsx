// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Sidebar, buildVisibleNodes } from './Sidebar';

// Mock CSS import
vi.mock('./Sidebar.css', () => ({}));

/** Get the closest button ancestor of an element, throwing if not found */
function getButton(text: string): HTMLButtonElement {
    const el = screen.getByText(text).closest('button');
    if (!el) throw new Error(`No button found for text "${text}"`);
    return el;
}

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    cleanup();
});

describe('buildVisibleNodes', () => {
    it('returns only section headers when no sections expanded', () => {
        const nodes = buildVisibleNodes(new Set());
        expect(nodes).toEqual([
            { type: 'section', sectionId: 'image' },
            { type: 'section', sectionId: 'video' },
            { type: 'section', sectionId: 'audio' },
            { type: 'section', sectionId: 'history' },
        ]);
    });

    it('includes mode children for expanded sections', () => {
        const nodes = buildVisibleNodes(new Set(['image']));
        expect(nodes).toEqual([
            { type: 'section', sectionId: 'image' },
            { type: 'mode', sectionId: 'image', modeId: 'text-to-image' },
            { type: 'mode', sectionId: 'image', modeId: 'image-to-image' },
            { type: 'section', sectionId: 'video' },
            { type: 'section', sectionId: 'audio' },
            { type: 'section', sectionId: 'history' },
        ]);
    });

    it('includes all children when all sections expanded', () => {
        const nodes = buildVisibleNodes(new Set(['image', 'video', 'audio', 'history']));
        // 4 sections + 2 image + 3 video + 5 audio + 3 history = 17
        expect(nodes).toHaveLength(17);
        expect(nodes[0]).toEqual({ type: 'section', sectionId: 'image' });
        expect(nodes[3]).toEqual({ type: 'section', sectionId: 'video' });
        expect(nodes[7]).toEqual({ type: 'section', sectionId: 'audio' });
        expect(nodes[13]).toEqual({ type: 'section', sectionId: 'history' });
    });
});

describe('Sidebar component', () => {
    const defaultProps = {
        activeMode: 'text-to-image' as const,
        onModeChange: vi.fn(),
        activeView: { kind: 'generate' as const },
        onViewChange: vi.fn(),
    };

    beforeEach(() => {
        defaultProps.onModeChange.mockClear();
        defaultProps.onViewChange.mockClear();
    });

    it('renders with tree role and treeitem roles', () => {
        render(<Sidebar {...defaultProps} />);
        expect(screen.getByRole('tree')).toBeTruthy();
        const treeitems = screen.getAllByRole('treeitem');
        expect(treeitems.length).toBeGreaterThan(0);
    });

    it('sets aria-expanded on section headers', () => {
        render(<Sidebar {...defaultProps} />);
        const imageHeader = getButton('Generate Image');
        expect(imageHeader.getAttribute('aria-expanded')).toBe('true');
    });

    it('sets aria-selected on active mode', () => {
        render(<Sidebar {...defaultProps} />);
        const activeItem = screen.getByText('Text to Image');
        expect(activeItem.getAttribute('aria-selected')).toBe('true');
    });

    it('sets aria-level on section headers and mode items', () => {
        render(<Sidebar {...defaultProps} />);
        const imageHeader = getButton('Generate Image');
        expect(imageHeader.getAttribute('aria-level')).toBe('1');

        const modeItem = screen.getByText('Text to Image');
        expect(modeItem.getAttribute('aria-level')).toBe('2');
    });

    it('renders history section', () => {
        render(<Sidebar {...defaultProps} />);
        expect(screen.getByText('Generation History')).toBeTruthy();
    });

    it('calls onViewChange when clicking a history item', () => {
        render(<Sidebar {...defaultProps} />);
        // Expand history section
        const historyHeader = getButton('Generation History');
        fireEvent.click(historyHeader);
        // Click Images history item
        const imagesItem = screen.getByText('Images');
        fireEvent.click(imagesItem);
        expect(defaultProps.onViewChange).toHaveBeenCalledWith({ kind: 'history', filter: 'image' });
    });

    it('highlights history item when activeView is history', () => {
        render(
            <Sidebar
                {...defaultProps}
                activeView={{ kind: 'history', filter: 'video' }}
            />
        );
        // Expand history section
        const historyHeader = getButton('Generation History');
        fireEvent.click(historyHeader);
        const videosItem = screen.getByText('Videos');
        expect(videosItem.getAttribute('aria-selected')).toBe('true');
    });

    describe('keyboard navigation', () => {
        it('ArrowDown moves focus to next visible node', () => {
            render(<Sidebar {...defaultProps} />);
            const imageHeader = getButton('Generate Image');
            imageHeader.focus();
            fireEvent.keyDown(imageHeader, { key: 'ArrowDown' });

            const textToImage = screen.getByText('Text to Image');
            expect(document.activeElement).toBe(textToImage);
        });

        it('ArrowUp moves focus to previous visible node', () => {
            render(<Sidebar {...defaultProps} />);
            const textToImage = screen.getByText('Text to Image');
            textToImage.focus();
            fireEvent.keyDown(textToImage, { key: 'ArrowUp' });

            const imageHeader = screen.getByText('Generate Image').closest('button');
            expect(document.activeElement).toBe(imageHeader);
        });

        it('ArrowDown clamps at last visible node', () => {
            render(<Sidebar {...defaultProps} />);
            // Last visible node is now the History section header (collapsed)
            const historyHeader = getButton('Generation History');
            historyHeader.focus();
            fireEvent.keyDown(historyHeader, { key: 'ArrowDown' });

            expect(document.activeElement).toBe(historyHeader);
        });

        it('ArrowRight expands a collapsed section', () => {
            render(<Sidebar {...defaultProps} />);
            const videoHeader = getButton('Generate Video');

            expect(videoHeader.getAttribute('aria-expanded')).toBe('false');

            videoHeader.focus();
            fireEvent.keyDown(videoHeader, { key: 'ArrowRight' });

            expect(videoHeader.getAttribute('aria-expanded')).toBe('true');
        });

        it('ArrowRight on expanded section moves to first child', () => {
            render(<Sidebar {...defaultProps} />);
            const imageHeader = getButton('Generate Image');

            expect(imageHeader.getAttribute('aria-expanded')).toBe('true');

            imageHeader.focus();
            fireEvent.keyDown(imageHeader, { key: 'ArrowRight' });

            const textToImage = screen.getByText('Text to Image');
            expect(document.activeElement).toBe(textToImage);
        });

        it('ArrowLeft on expanded section collapses it', () => {
            render(<Sidebar {...defaultProps} />);
            // First expand the video section (which doesn't contain the active mode)
            const videoHeader = getButton('Generate Video');
            videoHeader.focus();
            fireEvent.keyDown(videoHeader, { key: 'ArrowRight' });
            expect(videoHeader.getAttribute('aria-expanded')).toBe('true');

            // Now collapse it with ArrowLeft
            fireEvent.keyDown(videoHeader, { key: 'ArrowLeft' });
            expect(videoHeader.getAttribute('aria-expanded')).toBe('false');
        });

        it('ArrowLeft on leaf moves focus to parent section', () => {
            render(<Sidebar {...defaultProps} />);
            const textToImage = screen.getByText('Text to Image');
            textToImage.focus();
            fireEvent.keyDown(textToImage, { key: 'ArrowLeft' });

            const imageHeader = screen.getByText('Generate Image').closest('button');
            expect(document.activeElement).toBe(imageHeader);
        });

        it('Home moves focus to first node', () => {
            render(<Sidebar {...defaultProps} />);
            const imageToImage = screen.getByText('Image to Image');
            imageToImage.focus();
            fireEvent.keyDown(imageToImage, { key: 'Home' });

            const imageHeader = screen.getByText('Generate Image').closest('button');
            expect(document.activeElement).toBe(imageHeader);
        });

        it('End moves focus to last visible node', () => {
            render(<Sidebar {...defaultProps} />);
            const imageHeader = getButton('Generate Image');
            imageHeader.focus();
            fireEvent.keyDown(imageHeader, { key: 'End' });

            // Last visible node is now History header (collapsed)
            const historyHeader = screen.getByText('Generation History').closest('button');
            expect(document.activeElement).toBe(historyHeader);
        });

        it('Enter on section header toggles expand', () => {
            render(<Sidebar {...defaultProps} />);
            const videoHeader = getButton('Generate Video');
            expect(videoHeader.getAttribute('aria-expanded')).toBe('false');

            videoHeader.focus();
            fireEvent.keyDown(videoHeader, { key: 'Enter' });
            expect(videoHeader.getAttribute('aria-expanded')).toBe('true');
        });

        it('Space on mode item calls onModeChange', () => {
            render(<Sidebar {...defaultProps} />);
            const imageToImage = screen.getByText('Image to Image');
            imageToImage.focus();
            fireEvent.keyDown(imageToImage, { key: ' ' });

            expect(defaultProps.onModeChange).toHaveBeenCalledWith('image-to-image');
        });

        it('Enter on mode item calls onModeChange', () => {
            render(<Sidebar {...defaultProps} />);
            const textToImage = screen.getByText('Text to Image');
            textToImage.focus();
            fireEvent.keyDown(textToImage, { key: 'Enter' });

            expect(defaultProps.onModeChange).toHaveBeenCalledWith('text-to-image');
        });

        it('Enter on history mode item calls onViewChange', () => {
            render(<Sidebar {...defaultProps} />);
            // Expand history section
            const historyHeader = getButton('Generation History');
            fireEvent.click(historyHeader);

            const audiosItem = screen.getByText('Audio');
            audiosItem.focus();
            fireEvent.keyDown(audiosItem, { key: 'Enter' });

            expect(defaultProps.onViewChange).toHaveBeenCalledWith({ kind: 'history', filter: 'audio' });
        });
    });

    describe('disabled state', () => {
        it('keyboard navigation is blocked when disabled', () => {
            render(<Sidebar {...defaultProps} disabled />);
            const imageHeader = getButton('Generate Image');
            imageHeader.focus();
            fireEvent.keyDown(imageHeader, { key: 'ArrowDown' });

            // Focus should remain on the same element
            expect(document.activeElement).toBe(imageHeader);
            // onModeChange should not have been called
            expect(defaultProps.onModeChange).not.toHaveBeenCalled();
        });
    });

    describe('roving tabindex', () => {
        it('only the focused node has tabIndex 0', () => {
            render(<Sidebar {...defaultProps} />);
            const treeitems = screen.getAllByRole('treeitem');

            const tabbable = treeitems.filter((el) => el.tabIndex === 0);
            expect(tabbable).toHaveLength(1);

            const nonTabbable = treeitems.filter((el) => el.tabIndex === -1);
            expect(nonTabbable.length).toBe(treeitems.length - 1);
        });
    });
});
