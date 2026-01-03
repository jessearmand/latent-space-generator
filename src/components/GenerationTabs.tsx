/**
 * Tab bar component for switching between text-to-image and image-to-image modes
 */

import type React from 'react';
import { useCallback } from 'react';
import './GenerationTabs.css';

export type GenerationMode = 'text-to-image' | 'image-to-image';

interface GenerationTabsProps {
    activeTab: GenerationMode;
    onTabChange: (tab: GenerationMode) => void;
    disabled?: boolean;
}

const tabs: { id: GenerationMode; label: string }[] = [
    { id: 'text-to-image', label: 'Text to Image' },
    { id: 'image-to-image', label: 'Image to Image' },
];

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
