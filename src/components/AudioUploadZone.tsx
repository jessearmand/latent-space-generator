/**
 * Audio upload zone component for audio-to-audio generation
 * Supports drag-and-drop and file selection
 */

import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import './AudioUploadZone.css';

interface AudioUploadZoneProps {
    uploadedFile: File | null;
    onFileChange: (file: File | null) => void;
    disabled?: boolean;
}

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];

export const AudioUploadZone: React.FC<AudioUploadZoneProps> = ({
    uploadedFile,
    onFileChange,
    disabled = false,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(
        (file: File) => {
            // Validate file type
            const isValidType = ACCEPTED_AUDIO_TYPES.includes(file.type);
            const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) =>
                file.name.toLowerCase().endsWith(ext)
            );

            if (!isValidType && !hasValidExtension) {
                console.error('Invalid audio file type:', file.type);
                return;
            }

            // Create preview URL
            if (audioPreviewUrl) {
                URL.revokeObjectURL(audioPreviewUrl);
            }
            const url = URL.createObjectURL(file);
            setAudioPreviewUrl(url);

            onFileChange(file);
        },
        [audioPreviewUrl, onFileChange]
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
        if (audioPreviewUrl) {
            URL.revokeObjectURL(audioPreviewUrl);
        }
        setAudioPreviewUrl(null);
        onFileChange(null);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [audioPreviewUrl, onFileChange]);

    const handleClick = useCallback(() => {
        if (!disabled) {
            fileInputRef.current?.click();
        }
    }, [disabled]);

    return (
        <div className="audio-upload-zone-container">
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Associated with hidden file input */}
            <label className="audio-upload-label">Upload Audio File:</label>

            {!uploadedFile ? (
                <button
                    type="button"
                    className={`audio-upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                    onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                    disabled={disabled}
                    aria-label="Upload audio file"
                >
                    <div className="audio-upload-content">
                        <span className="audio-upload-icon">🎵</span>
                        <span className="audio-upload-text">
                            Drag & drop an audio file here, or click to select
                        </span>
                        <span className="audio-upload-hint">
                            Supported: MP3, WAV, OGG, M4A, AAC
                        </span>
                    </div>
                </button>
            ) : (
                <div className="audio-preview">
                    <div className="audio-preview-info">
                        <span className="audio-preview-icon">🎵</span>
                        <span className="audio-preview-name">{uploadedFile.name}</span>
                        <span className="audio-preview-size">
                            ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                    </div>
                    {audioPreviewUrl && (
                        /* biome-ignore lint/a11y/useMediaCaption: Uploaded audio, no captions available */
                        <audio
                            src={audioPreviewUrl}
                            controls
                            className="audio-preview-player"
                        />
                    )}
                    <button
                        type="button"
                        className="audio-remove-btn"
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
