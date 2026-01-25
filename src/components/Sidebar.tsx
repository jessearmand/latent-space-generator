/**
 * Sidebar navigation component for switching between generation modes
 * Organizes modes by media type: Image, Video, Audio
 */

import type React from 'react';
import { useState, useCallback, useEffect } from 'react';
import type { GenerationMode } from './GenerationTabs';
import './Sidebar.css';

interface SidebarProps {
    activeMode: GenerationMode;
    onModeChange: (mode: GenerationMode) => void;
    disabled?: boolean;
}

interface SectionConfig {
    id: string;
    label: string;
    modes: { id: GenerationMode; label: string }[];
}

const sections: SectionConfig[] = [
    {
        id: 'image',
        label: 'Generate Image',
        modes: [
            { id: 'text-to-image', label: 'Text to Image' },
            { id: 'image-to-image', label: 'Image to Image' },
        ],
    },
    {
        id: 'video',
        label: 'Generate Video',
        modes: [
            { id: 'text-to-video', label: 'Text to Video' },
            { id: 'image-to-video', label: 'Image to Video' },
            { id: 'video-to-video', label: 'Video to Video' },
        ],
    },
    {
        id: 'audio',
        label: 'Generate Audio',
        modes: [
            { id: 'text-to-speech', label: 'Text to Speech' },
            { id: 'text-to-audio', label: 'Text to Audio' },
            { id: 'audio-to-audio', label: 'Audio to Audio' },
            { id: 'video-to-audio', label: 'Video to Audio' },
        ],
    },
];

/** Storage key for expanded sections */
const EXPANDED_SECTIONS_KEY = 'fal_sidebar_expanded';

/** Get section containing a mode */
function getSectionForMode(mode: GenerationMode): string {
    for (const section of sections) {
        if (section.modes.some((m) => m.id === mode)) {
            return section.id;
        }
    }
    return 'image';
}

/** Get initial expanded sections from localStorage */
function getInitialExpandedSections(activeMode: GenerationMode): Set<string> {
    try {
        const saved = localStorage.getItem(EXPANDED_SECTIONS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as string[];
            const expanded = new Set(parsed);
            // Ensure the section containing the active mode is expanded
            expanded.add(getSectionForMode(activeMode));
            return expanded;
        }
    } catch {
        // Ignore parse errors
    }
    // Default: expand the section containing the active mode
    return new Set([getSectionForMode(activeMode)]);
}

export const Sidebar: React.FC<SidebarProps> = ({ activeMode, onModeChange, disabled = false }) => {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(() =>
        getInitialExpandedSections(activeMode)
    );

    // Persist expanded sections to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(EXPANDED_SECTIONS_KEY, JSON.stringify([...expandedSections]));
        } catch {
            // Ignore storage errors
        }
    }, [expandedSections]);

    // Ensure the section containing the active mode is expanded
    useEffect(() => {
        const sectionId = getSectionForMode(activeMode);
        if (!expandedSections.has(sectionId)) {
            setExpandedSections((prev) => new Set([...prev, sectionId]));
        }
    }, [activeMode, expandedSections]);

    const toggleSection = useCallback((sectionId: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLButtonElement>, sectionId: string, modeId?: GenerationMode) => {
            if (disabled) return;

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (modeId) {
                    onModeChange(modeId);
                } else {
                    toggleSection(sectionId);
                }
            }
        },
        [disabled, onModeChange, toggleSection]
    );

    return (
        <nav className="sidebar" aria-label="Generation modes">
            {sections.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const hasModeActive = section.modes.some((m) => m.id === activeMode);

                return (
                    <div key={section.id} className="sidebar-section">
                        <button
                            type="button"
                            className={`sidebar-section-header ${hasModeActive ? 'active' : ''}`}
                            onClick={() => toggleSection(section.id)}
                            onKeyDown={(e) => handleKeyDown(e, section.id)}
                            aria-expanded={isExpanded}
                            aria-controls={`sidebar-section-${section.id}`}
                            disabled={disabled}
                        >
                            <span className="sidebar-section-icon">{isExpanded ? '▼' : '▶'}</span>
                            <span className="sidebar-section-label">{section.label}</span>
                        </button>

                        {isExpanded && (
                            <ul
                                id={`sidebar-section-${section.id}`}
                                className="sidebar-mode-list"
                            >
                                {section.modes.map((mode) => {
                                    const isActive = activeMode === mode.id;
                                    return (
                                        <li key={mode.id}>
                                            <button
                                                type="button"
                                                className={`sidebar-mode-item ${isActive ? 'active' : ''}`}
                                                onClick={() => !disabled && onModeChange(mode.id)}
                                                onKeyDown={(e) => handleKeyDown(e, section.id, mode.id)}
                                                aria-current={isActive ? 'page' : undefined}
                                                disabled={disabled}
                                            >
                                                {mode.label}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                );
            })}
        </nav>
    );
};
