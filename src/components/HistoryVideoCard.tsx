import type React from 'react';
import { useState, useCallback } from 'react';
import type { HistoryEntry } from '../types/history';
import { PromptOverlay } from './PromptOverlay';
import { DownloadButton } from './DownloadButton';
import { VideoPlayer } from './VideoPlayer';
import './HistoryVideoCard.css';

interface HistoryVideoCardProps {
    entry: HistoryEntry;
    onRemove: (id: string) => void;
}

export const HistoryVideoCard: React.FC<HistoryVideoCardProps> = ({ entry, onRemove }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggle = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const handleRemove = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onRemove(entry.id);
        },
        [entry.id, onRemove],
    );

    const videoUrl = entry.urls[0];
    if (!videoUrl) return null;

    return (
        <div className="history-video-card">
            {isExpanded ? (
                <div className="history-video-expanded">
                    <VideoPlayer src={videoUrl} />
                    <button
                        type="button"
                        className="history-video-collapse"
                        onClick={handleToggle}
                        aria-label="Collapse video"
                    >
                        &#9650;
                    </button>
                </div>
            ) : (
                // biome-ignore lint/a11y/useSemanticElements: div wraps video thumbnail with complex layout
                <div
                    className="history-video-thumb"
                    onClick={handleToggle}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); } }}
                    aria-label={`Play video: ${entry.prompt || 'Generated video'}`}
                >
                    <video src={videoUrl} preload="metadata" muted>
                        <track kind="captions" />
                    </video>
                    <span className="history-video-play-icon" aria-hidden="true" />
                </div>
            )}

            <div className="history-card-actions">
                {!isExpanded && <DownloadButton url={videoUrl} label="Download video" />}
                <button
                    type="button"
                    className="history-card-remove"
                    onClick={handleRemove}
                    aria-label={`Remove ${entry.modelName} entry`}
                >
                    &#10005;
                </button>
            </div>

            <PromptOverlay
                prompt={entry.prompt}
                modelName={entry.modelName}
                timestamp={entry.timestamp}
                standalone={isExpanded}
            />
        </div>
    );
};
