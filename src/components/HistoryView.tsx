import type React from 'react';
import { useMemo } from 'react';
import type { HistoryEntry } from '../types/history';
import type { HistoryFilter } from '../types/appView';
import { outputTypeToHistoryFilter } from '../types/appView';
import { HistoryGrid } from './HistoryGrid';
import './HistoryView.css';

interface HistoryViewProps {
    filter: HistoryFilter;
    history: HistoryEntry[];
    onRemoveEntry: (id: string) => void;
    onClearFilter: (filter: HistoryFilter) => void;
}

const filterLabels: Record<HistoryFilter, string> = {
    image: 'Image History',
    video: 'Video History',
    audio: 'Audio History',
};

const emptyIcons: Record<HistoryFilter, string> = {
    image: '\uD83D\uDDBC\uFE0F',
    video: '\uD83C\uDFA5',
    audio: '\uD83C\uDFB5',
};

export const HistoryView: React.FC<HistoryViewProps> = ({
    filter,
    history,
    onRemoveEntry,
    onClearFilter,
}) => {
    const filteredEntries = useMemo(
        () => history.filter((entry) => outputTypeToHistoryFilter(entry.type) === filter),
        [history, filter],
    );

    return (
        <div className="history-view">
            <div className="history-view-header">
                <h2>{filterLabels[filter]}</h2>
                {filteredEntries.length > 0 && (
                    <button
                        type="button"
                        className="history-view-clear-btn"
                        onClick={() => onClearFilter(filter)}
                    >
                        Clear All
                    </button>
                )}
            </div>

            {filteredEntries.length === 0 ? (
                <div className="history-view-empty">
                    <div className="history-view-empty-icon" aria-hidden="true">
                        {emptyIcons[filter]}
                    </div>
                    <p>No {filter} generations yet.</p>
                    <p>Generate some content and it will appear here.</p>
                </div>
            ) : (
                <HistoryGrid entries={filteredEntries} onRemove={onRemoveEntry} />
            )}
        </div>
    );
};
