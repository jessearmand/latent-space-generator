import type React from 'react';
import { useCallback } from 'react';
import type { HistoryEntry } from '../types/history';
import './GenerationHistory.css';

interface GenerationHistoryProps {
    history: HistoryEntry[];
    onClearHistory: () => void;
    onRemoveEntry: (id: string) => void;
}

/** Format a timestamp as relative time ("2m ago", "1h ago") */
function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/** Render the thumbnail area based on entry type */
const HistoryThumbnail: React.FC<{ entry: HistoryEntry }> = ({ entry }) => {
    if ((entry.type === 'image' || entry.type === 'video') && entry.urls.length > 0) {
        return (
            <div className="history-thumb">
                <img
                    src={entry.urls[0]}
                    alt={`${entry.type} thumbnail`}
                    loading="lazy"
                />
            </div>
        );
    }
    if (entry.type === 'audio') {
        return (
            <div className="history-thumb">
                <span className="history-thumb-icon" aria-hidden="true">
                    &#9835;
                </span>
            </div>
        );
    }
    // text type (audio understanding)
    return (
        <div className="history-thumb">
            <span className="history-thumb-icon" aria-hidden="true">
                T
            </span>
        </div>
    );
};

export const GenerationHistory: React.FC<GenerationHistoryProps> = ({
    history,
    onClearHistory,
    onRemoveEntry,
}) => {
    const handleRemove = useCallback(
        (e: React.MouseEvent, id: string) => {
            e.stopPropagation();
            onRemoveEntry(id);
        },
        [onRemoveEntry],
    );

    return (
        <div className="generation-history">
            <div className="history-header">
                <h4>History</h4>
                <button
                    type="button"
                    className="history-clear-btn"
                    onClick={onClearHistory}
                >
                    Clear
                </button>
            </div>

            <div className="history-list">
                {history.map((entry) => (
                    <div
                        key={entry.id}
                        className="history-entry"
                        title={entry.prompt}
                    >
                        <HistoryThumbnail entry={entry} />
                        <div className="history-info">
                            <span className="history-model">{entry.modelName}</span>
                            <span className="history-time">
                                {formatRelativeTime(entry.timestamp)}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="history-remove-btn"
                            onClick={(e) => handleRemove(e, entry.id)}
                            aria-label={`Remove ${entry.modelName} entry`}
                        >
                            &#10005;
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
