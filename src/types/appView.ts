import type { OutputType } from './models';

/** Filter categories for history view — maps to media output types */
export type HistoryFilter = 'image' | 'video' | 'audio';

/**
 * Top-level view routing.
 * - 'generate': normal generation UI (preserved GenerationMode)
 * - 'history': dedicated history grid filtered by media type
 */
export type AppView =
    | { kind: 'generate' }
    | { kind: 'history'; filter: HistoryFilter };

/**
 * Map an OutputType to a HistoryFilter.
 * 'text' (audio-understanding) maps to 'audio' since those results belong in audio history.
 */
export function outputTypeToHistoryFilter(type: OutputType): HistoryFilter {
    switch (type) {
        case 'image':
            return 'image';
        case 'video':
            return 'video';
        case 'audio':
        case 'text':
            return 'audio';
    }
}
