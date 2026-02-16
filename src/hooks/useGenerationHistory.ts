import { useState, useCallback } from 'react';
import type { OutputType } from '../types/models';
import type { GenerationMode } from '../components/GenerationTabs';
import {
    type HistoryEntry,
    MAX_HISTORY_ENTRIES,
    generateHistoryId,
} from '../types/history';
import { type HistoryFilter, outputTypeToHistoryFilter } from '../types/appView';

export interface AddToHistoryParams {
    type: OutputType;
    urls: string[];
    textContent?: string;
    prompt: string;
    modelName: string;
    mode: GenerationMode;
}

export interface UseGenerationHistoryReturn {
    history: HistoryEntry[];
    addToHistory: (params: AddToHistoryParams) => void;
    removeHistoryEntry: (id: string) => void;
    clearHistory: () => void;
    clearHistoryByFilter: (filter: HistoryFilter) => void;
    getCountByFilter: (filter: HistoryFilter) => number;
}

/**
 * Session-only hook for generation history.
 * Not persisted to localStorage because fal.ai CDN URLs expire.
 * Entries are newest-first, capped at MAX_HISTORY_ENTRIES.
 */
export function useGenerationHistory(): UseGenerationHistoryReturn {
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    const addToHistory = useCallback((params: AddToHistoryParams) => {
        const entry: HistoryEntry = {
            id: generateHistoryId(),
            type: params.type,
            urls: params.urls,
            textContent: params.textContent,
            prompt: params.prompt,
            modelName: params.modelName,
            mode: params.mode,
            timestamp: Date.now(),
        };
        setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY_ENTRIES));
    }, []);

    const removeHistoryEntry = useCallback((id: string) => {
        setHistory((prev) => prev.filter((entry) => entry.id !== id));
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    const clearHistoryByFilter = useCallback((filter: HistoryFilter) => {
        setHistory((prev) => prev.filter((entry) => outputTypeToHistoryFilter(entry.type) !== filter));
    }, []);

    const getCountByFilter = useCallback(
        (filter: HistoryFilter): number => {
            return history.filter((entry) => outputTypeToHistoryFilter(entry.type) === filter).length;
        },
        [history],
    );

    return { history, addToHistory, removeHistoryEntry, clearHistory, clearHistoryByFilter, getCountByFilter };
}
