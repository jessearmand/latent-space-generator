import type React from 'react';
import { useState, useCallback } from 'react';
import Modal from 'react-modal';
import { DownloadButton } from './DownloadButton';
import { formatRelativeTime } from '../utils/formatTime';
import './ImagePreviewModal.css';

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    urls: string[];
    prompt: string;
    modelName: string;
    timestamp: number;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
    isOpen,
    onClose,
    urls,
    prompt,
    modelName,
    timestamp,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const hasMultiple = urls.length > 1;

    const handlePrev = useCallback(() => {
        setCurrentIndex((i) => Math.max(0, i - 1));
    }, []);

    const handleNext = useCallback(() => {
        setCurrentIndex((i) => Math.min(urls.length - 1, i + 1));
    }, [urls.length]);

    const handleCopyPrompt = useCallback(() => {
        navigator.clipboard.writeText(prompt).catch(() => {});
    }, [prompt]);

    // Reset index when modal opens with new content
    const handleAfterOpen = useCallback(() => {
        setCurrentIndex(0);
    }, []);

    const currentUrl = urls[currentIndex] || '';

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            onAfterOpen={handleAfterOpen}
            className="image-preview-modal"
            overlayClassName="image-preview-overlay"
        >
            <div className="image-preview-header">
                <h3>{modelName} &middot; {formatRelativeTime(timestamp)}</h3>
                <button type="button" className="image-preview-close" onClick={onClose} aria-label="Close preview">
                    X
                </button>
            </div>

            <div className="image-preview-body">
                {hasMultiple ? (
                    <div className="image-preview-gallery">
                        <button
                            type="button"
                            className="image-preview-nav"
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            aria-label="Previous image"
                        >
                            &#8249;
                        </button>
                        <img src={currentUrl} alt={prompt || 'Generated image'} />
                        <button
                            type="button"
                            className="image-preview-nav"
                            onClick={handleNext}
                            disabled={currentIndex === urls.length - 1}
                            aria-label="Next image"
                        >
                            &#8250;
                        </button>
                    </div>
                ) : (
                    <img src={currentUrl} alt={prompt || 'Generated image'} />
                )}
            </div>

            {hasMultiple && (
                <div className="image-preview-counter">
                    {currentIndex + 1} / {urls.length}
                </div>
            )}

            <div className="image-preview-footer">
                <p className="image-preview-prompt">{prompt}</p>
                <div className="image-preview-actions">
                    <button
                        type="button"
                        className="image-preview-copy-btn"
                        onClick={handleCopyPrompt}
                    >
                        Copy Prompt
                    </button>
                    <DownloadButton url={currentUrl} label="Download image" />
                </div>
            </div>
        </Modal>
    );
};
