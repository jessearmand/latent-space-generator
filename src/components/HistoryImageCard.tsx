import type React from 'react';
import { useState, useCallback } from 'react';
import type { HistoryEntry } from '../types/history';
import { PromptOverlay } from './PromptOverlay';
import { DownloadButton } from './DownloadButton';
import { ImagePreviewModal } from './ImagePreviewModal';
import './HistoryImageCard.css';

interface HistoryImageCardProps {
    entry: HistoryEntry;
    onRemove: (id: string) => void;
}

export const HistoryImageCard: React.FC<HistoryImageCardProps> = ({ entry, onRemove }) => {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const openPreview = useCallback(() => {
        setIsPreviewOpen(true);
    }, []);

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.history-card-actions')) {
            return;
        }
        openPreview();
    }, [openPreview]);

    const handleRemove = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onRemove(entry.id);
        },
        [entry.id, onRemove],
    );

    const thumbnailUrl = entry.urls[0];
    if (!thumbnailUrl) return null;

    return (
        <>
            {/* biome-ignore lint/a11y/useSemanticElements: button wraps complex card layout with nested interactive elements */}
            <div
                className="history-image-card"
                onClick={handleClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPreview(); } }}
                aria-label={`Preview: ${entry.prompt || 'Generated image'}`}
            >
                {entry.urls.length > 1 && (
                    <span className="history-image-badge">{entry.urls.length} images</span>
                )}

                <div className="history-card-actions">
                    <DownloadButton url={thumbnailUrl} label="Download" />
                    <button
                        type="button"
                        className="history-card-remove"
                        onClick={handleRemove}
                        aria-label={`Remove ${entry.modelName} entry`}
                    >
                        &#10005;
                    </button>
                </div>

                <img src={thumbnailUrl} alt={entry.prompt || 'Generated image'} loading="lazy" />

                <PromptOverlay
                    prompt={entry.prompt}
                    modelName={entry.modelName}
                    timestamp={entry.timestamp}
                />
            </div>

            <ImagePreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                urls={entry.urls}
                prompt={entry.prompt}
                modelName={entry.modelName}
                timestamp={entry.timestamp}
            />
        </>
    );
};
