import type { OutputType } from './models';
import type { GenerationMode } from '../components/GenerationTabs';

/** A single generation result saved to history */
export interface HistoryEntry {
    id: string;
    /** What kind of output this was */
    type: OutputType;
    /** CDN URLs — image array, or [videoUrl], or [audioUrl] */
    urls: string[];
    /** Text content for audio-understanding results */
    textContent?: string;
    /** The prompt used to generate this entry */
    prompt: string;
    /** Display name of the model used */
    modelName: string;
    /** Which generation mode produced this entry */
    mode: GenerationMode;
    /** Unix timestamp (ms) when the entry was created */
    timestamp: number;
}

/** Maximum entries kept in session history (fal.ai CDN URLs expire, so no localStorage) */
export const MAX_HISTORY_ENTRIES = 50;

let historyCounter = 0;

/** Generate a unique ID for a history entry */
export function generateHistoryId(): string {
    historyCounter += 1;
    return `h_${Date.now()}_${historyCounter}`;
}
