/**
 * Drag-and-drop image upload zone component
 */

import type React from 'react';
import { useState, useRef, useCallback } from 'react';
import './ImageUploadZone.css';

interface ImageUploadZoneProps {
    uploadedImage: File | null;
    imagePreview: string | null;
    onImageChange: (file: File | null) => void;
    disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
    uploadedImage,
    imagePreview,
    onImageChange,
    disabled = false,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateFile = useCallback((file: File): string | null => {
        if (!file.type.startsWith('image/')) {
            return 'Please upload an image file (PNG, JPEG, etc.)';
        }
        if (file.size > MAX_FILE_SIZE) {
            return `File size exceeds 10MB limit (${formatFileSize(file.size)})`;
        }
        return null;
    }, []);

    const handleFile = useCallback(
        (file: File) => {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                return;
            }
            setError(null);
            onImageChange(file);
        },
        [validateFile, onImageChange]
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) {
                setIsDragOver(true);
            }
        },
        [disabled]
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);

            if (disabled) return;

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        },
        [disabled, handleFile]
    );

    const handleClick = useCallback(() => {
        if (!disabled) {
            fileInputRef.current?.click();
        }
    }, [disabled]);

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                handleFile(files[0]);
            }
            // Reset input so the same file can be selected again
            e.target.value = '';
        },
        [handleFile]
    );

    const handleRemove = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            setError(null);
            onImageChange(null);
        },
        [onImageChange]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
            }
        },
        [handleClick]
    );

    const zoneClasses = [
        'image-upload-zone',
        isDragOver && 'drag-over',
        uploadedImage && 'has-image',
        disabled && 'disabled',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className="image-upload-container">
            <label htmlFor="image-upload-input" className="upload-label">Upload Image:</label>

            {/* biome-ignore lint/a11y/useSemanticElements: Drop zone requires div for drag-and-drop functionality */}
            <div
                className={zoneClasses}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={uploadedImage ? 'Click to change image' : 'Click or drag to upload image'}
            >
                <input
                    ref={fileInputRef}
                    id="image-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="file-input-hidden"
                    disabled={disabled}
                />

                {uploadedImage && imagePreview ? (
                    <div className="upload-preview">
                        <img src={imagePreview} alt="Preview" className="preview-image" />
                        <div className="preview-info">
                            <span className="file-name">{uploadedImage.name}</span>
                            <span className="file-size">{formatFileSize(uploadedImage.size)}</span>
                            <button
                                type="button"
                                className="remove-btn"
                                onClick={handleRemove}
                                aria-label="Remove uploaded image"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="upload-placeholder">
                        <div className="upload-icon">+</div>
                        <p className="upload-text">
                            Drag and drop an image here, or click to select
                        </p>
                        <p className="upload-hint">Supports PNG, JPEG, WebP (max 10MB)</p>
                    </div>
                )}
            </div>

            {error && <p className="upload-error">{error}</p>}
        </div>
    );
};
