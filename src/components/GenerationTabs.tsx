/**
 * Tab bar component for switching between generation modes
 * Supports both image and video generation tabs
 */

import type React from 'react';
import { useCallback } from 'react';
import './GenerationTabs.css';

export type GenerationMode =
    | 'text-to-image'
    | 'image-to-image'
    | 'text-to-video'
    | 'image-to-video'
    | 'video-to-video'
    | 'text-to-speech'
    | 'text-to-audio'
    | 'audio-to-audio'
    | 'video-to-audio'
    | 'audio-understanding';

interface GenerationTabsProps {
    activeTab: GenerationMode;
    onTabChange: (tab: GenerationMode) => void;
    disabled?: boolean;
}

const tabs: { id: GenerationMode; label: string }[] = [
    { id: 'text-to-image', label: 'Text to Image' },
    { id: 'image-to-image', label: 'Image to Image' },
    { id: 'text-to-video', label: 'Text to Video' },
    { id: 'image-to-video', label: 'Image to Video' },
];

/** Helper to check if a mode is a video generation mode */
export function isVideoMode(mode: GenerationMode): boolean {
    return mode === 'text-to-video' || mode === 'image-to-video' || mode === 'video-to-video';
}

/** Helper to check if a mode is an audio generation mode */
export function isAudioMode(mode: GenerationMode): boolean {
    return (
        mode === 'text-to-speech' ||
        mode === 'text-to-audio' ||
        mode === 'audio-to-audio' ||
        mode === 'video-to-audio' ||
        mode === 'audio-understanding'
    );
}

/** Helper to check if a mode requires image input */
export function requiresImageInput(mode: GenerationMode): boolean {
    return mode === 'image-to-image' || mode === 'image-to-video';
}

/** Helper to check if a mode requires video input */
export function requiresVideoInput(mode: GenerationMode): boolean {
    return mode === 'video-to-video' || mode === 'video-to-audio';
}

/** Helper to check if a mode requires audio input */
export function requiresAudioInput(mode: GenerationMode): boolean {
    return mode === 'audio-to-audio' || mode === 'audio-understanding';
}

/** Helper to validate if a string is a valid generation mode */
export function isValidGenerationMode(value: string): value is GenerationMode {
    return (
        value === 'text-to-image' ||
        value === 'image-to-image' ||
        value === 'text-to-video' ||
        value === 'image-to-video' ||
        value === 'video-to-video' ||
        value === 'text-to-speech' ||
        value === 'text-to-audio' ||
        value === 'audio-to-audio' ||
        value === 'video-to-audio' ||
        value === 'audio-understanding'
    );
}

export const GenerationTabs: React.FC<GenerationTabsProps> = ({
    activeTab,
    onTabChange,
    disabled = false,
}) => {
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
            if (disabled) return;

            let newIndex: number | null = null;

            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
            }

            if (newIndex !== null) {
                onTabChange(tabs[newIndex].id);
                // Focus the new tab button
                const tabButtons = document.querySelectorAll('.generation-tab');
                (tabButtons[newIndex] as HTMLButtonElement)?.focus();
            }
        },
        [disabled, onTabChange]
    );

    return (
        <div className="generation-tabs" role="tablist" aria-label="Generation mode">
            {tabs.map((tab, index) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        tabIndex={isActive ? 0 : -1}
                        className={`generation-tab ${isActive ? 'active' : ''}`}
                        onClick={() => !disabled && onTabChange(tab.id)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        disabled={disabled}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};
