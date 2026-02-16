import type React from 'react';
import { useCallback } from 'react';
import { formatRelativeTime } from '../utils/formatTime';
import './PromptOverlay.css';

interface PromptOverlayProps {
    prompt: string;
    modelName: string;
    timestamp: number;
    /** Max visible lines before truncation (default 2) */
    maxLines?: number;
    /** Render as standalone block (for audio/text cards without an image behind) */
    standalone?: boolean;
}

export const PromptOverlay: React.FC<PromptOverlayProps> = ({
    prompt,
    modelName,
    timestamp,
    maxLines = 2,
    standalone = false,
}) => {
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(prompt).catch(() => {
            // Clipboard API may not be available in all contexts
        });
    }, [prompt]);

    return (
        <div className={`prompt-overlay ${standalone ? 'prompt-overlay--standalone' : ''}`}>
            <p
                className="prompt-overlay-text"
                style={{ WebkitLineClamp: maxLines }}
                title={prompt}
            >
                {prompt}
            </p>
            <div className="prompt-overlay-meta">
                <span className="prompt-overlay-model">{modelName}</span>
                <span className="prompt-overlay-time">{formatRelativeTime(timestamp)}</span>
                <button
                    type="button"
                    className="prompt-overlay-copy"
                    onClick={handleCopy}
                    title="Copy prompt"
                    aria-label="Copy prompt to clipboard"
                >
                    Copy
                </button>
            </div>
        </div>
    );
};
