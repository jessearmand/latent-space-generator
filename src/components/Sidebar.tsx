/**
 * Sidebar navigation component for switching between generation modes.
 * Organizes modes by media type: Image, Video, Audio.
 *
 * Implements WAI-ARIA TreeView pattern with roving tabindex:
 * - Arrow keys navigate between visible tree items
 * - Left/Right expand/collapse sections
 * - Home/End jump to first/last item
 * - Enter/Space activate (toggle section or select mode)
 * - Focus does NOT follow selection (unlike GenerationTabs)
 */

import type React from 'react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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

export interface TreeNode {
    type: 'section' | 'mode';
    sectionId: string;
    modeId?: GenerationMode;
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
            { id: 'audio-understanding', label: 'Audio Understanding' },
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

/** Build flat list of visible (focusable) nodes based on which sections are expanded */
export function buildVisibleNodes(expandedSections: Set<string>): TreeNode[] {
    const nodes: TreeNode[] = [];
    for (const section of sections) {
        nodes.push({ type: 'section', sectionId: section.id });
        if (expandedSections.has(section.id)) {
            for (const mode of section.modes) {
                nodes.push({ type: 'mode', sectionId: section.id, modeId: mode.id });
            }
        }
    }
    return nodes;
}

/** Find index of a node matching a mode or section */
function findNodeIndex(nodes: TreeNode[], sectionId: string, modeId?: GenerationMode): number {
    return nodes.findIndex((n) => {
        if (modeId) return n.type === 'mode' && n.modeId === modeId;
        return n.type === 'section' && n.sectionId === sectionId;
    });
}

/** Get initial expanded sections from localStorage */
function getInitialExpandedSections(activeMode: GenerationMode): Set<string> {
    try {
        const saved = localStorage.getItem(EXPANDED_SECTIONS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as string[];
            const expanded = new Set(parsed);
            expanded.add(getSectionForMode(activeMode));
            return expanded;
        }
    } catch {
        // Ignore parse errors
    }
    return new Set([getSectionForMode(activeMode)]);
}

export const Sidebar: React.FC<SidebarProps> = ({ activeMode, onModeChange, disabled = false }) => {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(() =>
        getInitialExpandedSections(activeMode)
    );
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);
    const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const visibleNodes = useMemo(() => buildVisibleNodes(expandedSections), [expandedSections]);

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

    // Sync focusedIndex when activeMode changes externally
    useEffect(() => {
        const idx = findNodeIndex(visibleNodes, getSectionForMode(activeMode), activeMode);
        if (idx !== -1) {
            setFocusedIndex(idx);
        }
    }, [activeMode, visibleNodes]);

    // When a section collapses and focused child disappears, move focus to parent section
    useEffect(() => {
        if (focusedIndex >= visibleNodes.length) {
            // Focused node is beyond the list — clamp to last
            setFocusedIndex(visibleNodes.length - 1);
        }
    }, [focusedIndex, visibleNodes]);

    const moveFocus = useCallback(
        (newIndex: number) => {
            const clamped = Math.max(0, Math.min(newIndex, visibleNodes.length - 1));
            setFocusedIndex(clamped);
            nodeRefs.current[clamped]?.focus();
        },
        [visibleNodes.length]
    );

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

    const handleTreeKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (disabled) return;

            // Derive current index from the event target to avoid stale closure issues
            const currentIdx = nodeRefs.current.indexOf(e.currentTarget);
            if (currentIdx === -1) return;

            const node = visibleNodes[currentIdx];
            if (!node) return;

            let handled = true;

            switch (e.key) {
                case 'ArrowDown':
                    moveFocus(currentIdx + 1);
                    break;

                case 'ArrowUp':
                    moveFocus(currentIdx - 1);
                    break;

                case 'ArrowRight':
                    if (node.type === 'section') {
                        if (!expandedSections.has(node.sectionId)) {
                            toggleSection(node.sectionId);
                        } else {
                            moveFocus(currentIdx + 1);
                        }
                    }
                    break;

                case 'ArrowLeft':
                    if (node.type === 'section' && expandedSections.has(node.sectionId)) {
                        toggleSection(node.sectionId);
                    } else {
                        const parentIdx = findNodeIndex(visibleNodes, node.sectionId);
                        if (parentIdx !== -1 && parentIdx !== currentIdx) {
                            moveFocus(parentIdx);
                        }
                    }
                    break;

                case 'Home':
                    moveFocus(0);
                    break;

                case 'End':
                    moveFocus(visibleNodes.length - 1);
                    break;

                case 'Enter':
                case ' ':
                    if (node.type === 'section') {
                        toggleSection(node.sectionId);
                    } else if (node.modeId) {
                        onModeChange(node.modeId);
                    }
                    break;

                default:
                    handled = false;
            }

            if (handled) {
                e.preventDefault();
            }
        },
        [disabled, visibleNodes, expandedSections, moveFocus, toggleSection, onModeChange]
    );

    // Track ref index counter during render
    let refIndex = 0;

    return (
        <div className="sidebar" role="tree" aria-label="Generation modes">
            {sections.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const hasModeActive = section.modes.some((m) => m.id === activeMode);

                // Capture the ref index for this section header
                const sectionRefIndex = refIndex++;

                return (
                    <div key={section.id} className="sidebar-section">
                        <button
                            type="button"
                            role="treeitem"
                            aria-level={1}
                            aria-expanded={isExpanded}
                            className={`sidebar-section-header ${hasModeActive ? 'active' : ''}`}
                            onClick={() => toggleSection(section.id)}
                            onKeyDown={handleTreeKeyDown}
                            onFocus={() => setFocusedIndex(sectionRefIndex)}
                            tabIndex={focusedIndex === sectionRefIndex ? 0 : -1}
                            ref={(el) => { nodeRefs.current[sectionRefIndex] = el; }}
                            disabled={disabled}
                        >
                            <span className="sidebar-section-icon">{isExpanded ? '▼' : '▶'}</span>
                            <span className="sidebar-section-label">{section.label}</span>
                        </button>

                        {isExpanded && (
                            // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA TreeView requires role="group" for child grouping
                            <div
                                role="group"
                                className="sidebar-mode-list"
                            >
                                {section.modes.map((mode) => {
                                    const isActive = activeMode === mode.id;
                                    const modeRefIndex = refIndex++;

                                    return (
                                        <button
                                            key={mode.id}
                                            type="button"
                                            role="treeitem"
                                            aria-level={2}
                                            aria-selected={isActive}
                                            className={`sidebar-mode-item ${isActive ? 'active' : ''}`}
                                            onClick={() => !disabled && onModeChange(mode.id)}
                                            onKeyDown={handleTreeKeyDown}
                                            onFocus={() => setFocusedIndex(modeRefIndex)}
                                            tabIndex={focusedIndex === modeRefIndex ? 0 : -1}
                                            ref={(el) => { nodeRefs.current[modeRefIndex] = el; }}
                                            disabled={disabled}
                                        >
                                            {mode.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
