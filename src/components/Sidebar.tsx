/**
 * Sidebar navigation component for switching between generation modes.
 * Organizes modes by media type: Image, Video, Audio, and Generation History.
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
import type { AppView, HistoryFilter } from '../types/appView';
import './Sidebar.css';

interface SidebarProps {
    activeMode: GenerationMode;
    onModeChange: (mode: GenerationMode) => void;
    activeView: AppView;
    onViewChange: (view: AppView) => void;
    historyBadgeCounts?: Record<HistoryFilter, number>;
    disabled?: boolean;
}

interface SectionConfig {
    id: string;
    label: string;
    isHistory?: boolean;
    modes: { id: string; label: string }[];
}

export interface TreeNode {
    type: 'section' | 'mode';
    sectionId: string;
    modeId?: string;
}

/** Map from history mode id (e.g. 'history-image') to HistoryFilter */
const historyModeToFilter: Record<string, HistoryFilter> = {
    'history-image': 'image',
    'history-video': 'video',
    'history-audio': 'audio',
};

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
    {
        id: 'history',
        label: 'Generation History',
        isHistory: true,
        modes: [
            { id: 'history-image', label: 'Images' },
            { id: 'history-video', label: 'Videos' },
            { id: 'history-audio', label: 'Audio' },
        ],
    },
];

/** Storage key for expanded sections */
const EXPANDED_SECTIONS_KEY = 'fal_sidebar_expanded';

/** Get section containing a generation mode (only searches non-history sections) */
function getSectionForMode(mode: GenerationMode): string {
    for (const section of sections) {
        if (!section.isHistory && section.modes.some((m) => m.id === mode)) {
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
function findNodeIndex(nodes: TreeNode[], sectionId: string, modeId?: string): number {
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

/** Check if a section is the history section */
function isHistorySection(sectionId: string): boolean {
    return sections.find((s) => s.id === sectionId)?.isHistory === true;
}

export const Sidebar: React.FC<SidebarProps> = ({
    activeMode,
    onModeChange,
    activeView,
    onViewChange,
    historyBadgeCounts,
    disabled = false,
}) => {
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

    // Sync focusedIndex when activeMode or activeView changes externally
    useEffect(() => {
        if (activeView.kind === 'history') {
            const historyModeId = `history-${activeView.filter}`;
            const idx = findNodeIndex(visibleNodes, 'history', historyModeId);
            if (idx !== -1) {
                setFocusedIndex(idx);
            }
        } else {
            const idx = findNodeIndex(visibleNodes, getSectionForMode(activeMode), activeMode);
            if (idx !== -1) {
                setFocusedIndex(idx);
            }
        }
    }, [activeMode, activeView, visibleNodes]);

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

    /** Handle activating a mode item (either generation mode or history filter) */
    const activateMode = useCallback(
        (modeId: string, sectionId: string) => {
            if (isHistorySection(sectionId)) {
                const filter = historyModeToFilter[modeId];
                if (filter) {
                    onViewChange({ kind: 'history', filter });
                }
            } else {
                onModeChange(modeId as GenerationMode);
            }
        },
        [onModeChange, onViewChange],
    );

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
                        activateMode(node.modeId, node.sectionId);
                    }
                    break;

                default:
                    handled = false;
            }

            if (handled) {
                e.preventDefault();
            }
        },
        [disabled, visibleNodes, expandedSections, moveFocus, toggleSection, activateMode]
    );

    /** Check if a mode item is currently active */
    const isModeActive = useCallback(
        (modeId: string, sectionIsHistory: boolean): boolean => {
            if (sectionIsHistory) {
                const filter = historyModeToFilter[modeId];
                return activeView.kind === 'history' && activeView.filter === filter;
            }
            return activeView.kind === 'generate' && activeMode === modeId;
        },
        [activeMode, activeView],
    );

    /** Check if a section has any active child */
    const isSectionActive = useCallback(
        (section: SectionConfig): boolean => {
            return section.modes.some((m) => isModeActive(m.id, section.isHistory === true));
        },
        [isModeActive],
    );

    // Track ref index counter during render
    let refIndex = 0;

    return (
        <div className="sidebar" role="tree" aria-label="Generation modes">
            {sections.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const hasModeActive = isSectionActive(section);

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
                            <span className="sidebar-section-icon">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                            <span className="sidebar-section-label">{section.label}</span>
                        </button>

                        {isExpanded && (
                            <div
                                role="group"
                                className="sidebar-mode-list"
                            >
                                {section.modes.map((mode) => {
                                    const isActive = isModeActive(mode.id, section.isHistory === true);
                                    const modeRefIndex = refIndex++;

                                    // Badge count for history items
                                    const badgeCount = section.isHistory && historyBadgeCounts
                                        ? historyBadgeCounts[historyModeToFilter[mode.id] as HistoryFilter]
                                        : undefined;

                                    return (
                                        <button
                                            key={mode.id}
                                            type="button"
                                            role="treeitem"
                                            aria-level={2}
                                            aria-selected={isActive}
                                            className={`sidebar-mode-item ${isActive ? 'active' : ''}`}
                                            onClick={() => !disabled && activateMode(mode.id, section.id)}
                                            onKeyDown={handleTreeKeyDown}
                                            onFocus={() => setFocusedIndex(modeRefIndex)}
                                            tabIndex={focusedIndex === modeRefIndex ? 0 : -1}
                                            ref={(el) => { nodeRefs.current[modeRefIndex] = el; }}
                                            disabled={disabled}
                                        >
                                            {mode.label}
                                            {badgeCount !== undefined && badgeCount > 0 && (
                                                <span className="sidebar-badge">{badgeCount}</span>
                                            )}
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
