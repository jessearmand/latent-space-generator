/**
 * Video upload zone component for video-to-video and video-to-audio generation
 * Supports drag-and-drop and file selection with video preview
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import './VideoUploadZone.css';

interface VideoUploadZoneProps {
    uploadedFile: File | null;
    onFileChange: (file: File | null) => void;
    disabled?: boolean;
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const ACCEPTED_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi'];

export const VideoUploadZone: React.FC<VideoUploadZoneProps> = ({
    uploadedFile,
    onFileChange,
    disabled = false,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync preview URL when parent clears the file externally
    useEffect(() => {
        if (!uploadedFile && videoPreviewUrl) {
            URL.revokeObjectURL(videoPreviewUrl);
            setVideoPreviewUrl(null);
        }
    }, [uploadedFile, videoPreviewUrl]);

    // Revoke object URL on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
        };
    }, [videoPreviewUrl]);

    const handleFile = useCallback(
        (file: File) => {
            // Validate file type
            const isValidType = ACCEPTED_VIDEO_TYPES.includes(file.type);
            const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) =>
                file.name.toLowerCase().endsWith(ext)
            );

            if (!isValidType && !hasValidExtension) {
                console.error('Invalid video file type:', file.type);
                return;
            }

            // Create preview URL
            if (videoPreviewUrl) {
                URL.revokeObjectURL(videoPreviewUrl);
            }
            const url = URL.createObjectURL(file);
            setVideoPreviewUrl(url);

            onFileChange(file);
        },
        [videoPreviewUrl, onFileChange]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            if (disabled) return;

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        },
        [disabled, handleFile]
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                handleFile(files[0]);
            }
        },
        [handleFile]
    );

    const handleRemove = useCallback(() => {
        if (videoPreviewUrl) {
            URL.revokeObjectURL(videoPreviewUrl);
        }
        setVideoPreviewUrl(null);
        onFileChange(null);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [videoPreviewUrl, onFileChange]);

    const handleClick = useCallback(() => {
        if (!disabled) {
            fileInputRef.current?.click();
        }
    }, [disabled]);

    return (
        <div className="video-upload-zone-container">
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Associated with hidden file input */}
            <label className="video-upload-label">Upload Video File:</label>

            {!uploadedFile ? (
                <button
                    type="button"
                    className={`video-upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                    disabled={disabled}
                    aria-label="Upload video file"
                >
                    <div className="video-upload-content">
                        <span className="video-upload-icon">🎬</span>
                        <span className="video-upload-text">
                            Drag & drop a video file here, or click to select
                        </span>
                        <span className="video-upload-hint">
                            Supported: MP4, WebM, MOV, AVI
                        </span>
                    </div>
                </button>
            ) : (
                <div className="video-preview">
                    <div className="video-preview-info">
                        <span className="video-preview-icon">🎬</span>
                        <span className="video-preview-name">{uploadedFile.name}</span>
                        <span className="video-preview-size">
                            ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                    </div>
                    {videoPreviewUrl && (
                        /* biome-ignore lint/a11y/useMediaCaption: Uploaded video, no captions available */
                        <video
                            src={videoPreviewUrl}
                            controls
                            className="video-preview-player"
                        />
                    )}
                    <button
                        type="button"
                        className="video-remove-btn"
                        onClick={handleRemove}
                        disabled={disabled}
                    >
                        Remove
                    </button>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                onChange={handleInputChange}
                style={{ display: 'none' }}
                disabled={disabled}
            />
        </div>
    );
};
