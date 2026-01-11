import type React from 'react';
import { useState } from 'react';
import { downloadImage } from '../utils/download';
import './DownloadButton.css';

interface DownloadButtonProps {
    url: string;
    /** Optional override filename. If not provided, uses original filename from URL. */
    filename?: string;
    className?: string;
}

/**
 * A download button component that appears in the top-right corner of images.
 * Handles both HTTP URLs (fal.ai) and data URLs (OpenAI).
 * Uses the original filename from the URL when available (like Chrome's "Save Image As...").
 */
export const DownloadButton: React.FC<DownloadButtonProps> = ({
    url,
    filename,
    className = '',
}) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (isDownloading) return;

        setIsDownloading(true);
        try {
            // Pass filename only if explicitly provided; otherwise downloadImage extracts from URL
            await downloadImage(url, filename);
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            type="button"
            className={`download-button ${className}`}
            onClick={handleDownload}
            disabled={isDownloading}
            title="Download image"
            aria-label="Download image"
        >
            {isDownloading ? (
                <svg
                    className="download-icon spinning"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
            ) : (
                <svg
                    className="download-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
            )}
        </button>
    );
};
