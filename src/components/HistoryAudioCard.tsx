import type React from 'react';
import { useCallback } from 'react';
import type { HistoryEntry } from '../types/history';
import { PromptOverlay } from './PromptOverlay';
import { AudioPlayer } from './AudioPlayer';
import './HistoryAudioCard.css';

interface HistoryAudioCardProps {
    entry: HistoryEntry;
    onRemove: (id: string) => void;
}

export const HistoryAudioCard: React.FC<HistoryAudioCardProps> = ({ entry, onRemove }) => {
    const handleRemove = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onRemove(entry.id);
        },
        [entry.id, onRemove],
    );

    const handleCopyText = useCallback(() => {
        if (entry.textContent) {
            navigator.clipboard.writeText(entry.textContent).catch(() => {});
        }
    }, [entry.textContent]);

    const isTextEntry = entry.type === 'text';
    const audioUrl = entry.urls[0];

    return (
        <div className="history-audio-card">
            <div className="history-card-actions">
                {isTextEntry && (
                    <button
                        type="button"
                        className="history-text-copy"
                        onClick={handleCopyText}
                        title="Copy text"
                        aria-label="Copy text content"
                    >
                        Copy
                    </button>
                )}
                <button
                    type="button"
                    className="history-card-remove"
                    onClick={handleRemove}
                    aria-label={`Remove ${entry.modelName} entry`}
                >
                    &#10005;
                </button>
            </div>

            {isTextEntry ? (
                <div className="history-text-content">{entry.textContent}</div>
            ) : (
                audioUrl && (
                    <div className="history-audio-player">
                        <AudioPlayer src={audioUrl} title={entry.modelName} />
                    </div>
                )
            )}

            <PromptOverlay
                prompt={entry.prompt}
                modelName={entry.modelName}
                timestamp={entry.timestamp}
                standalone
            />
        </div>
    );
};
