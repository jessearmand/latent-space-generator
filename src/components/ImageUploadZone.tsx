/**
 * Drag-and-drop image upload zone component
 * Supports single or multiple image uploads based on maxImages prop
 */

import type React from 'react';
import { useState, useRef, useCallback } from 'react';
import './ImageUploadZone.css';

interface ImageUploadZoneProps {
    /** Array of uploaded files */
    uploadedImages: File[];
    /** Array of preview URLs (created via URL.createObjectURL) */
    imagePreviews: string[];
    /** Callback when files change */
    onImagesChange: (files: File[]) => void;
    /** Maximum number of images allowed (1 = single image mode) */
    maxImages?: number;
    /** Whether the upload zone is disabled */
    disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
    uploadedImages,
    imagePreviews,
    onImagesChange,
    maxImages = 1,
    disabled = false,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isMultiImage = maxImages > 1;
    const canAddMore = uploadedImages.length < maxImages;

    const validateFile = useCallback((file: File): string | null => {
        if (!file.type.startsWith('image/')) {
            return 'Please upload an image file (PNG, JPEG, etc.)';
        }
        if (file.size > MAX_FILE_SIZE) {
            return `File size exceeds 10MB limit (${formatFileSize(file.size)})`;
        }
        return null;
    }, []);

    const handleFiles = useCallback(
        (files: FileList | File[]) => {
            const fileArray = Array.from(files);
            const validFiles: File[] = [];
            const errors: string[] = [];

            // Calculate how many more files we can accept
            const slotsAvailable = maxImages - uploadedImages.length;

            for (let i = 0; i < Math.min(fileArray.length, slotsAvailable); i++) {
                const file = fileArray[i];
                const validationError = validateFile(file);
                if (validationError) {
                    errors.push(`${file.name}: ${validationError}`);
                } else {
                    validFiles.push(file);
                }
            }

            if (fileArray.length > slotsAvailable) {
                errors.push(`Only ${slotsAvailable} more image(s) can be added (max ${maxImages})`);
            }

            if (errors.length > 0) {
                setError(errors.join('\n'));
            } else {
                setError(null);
            }

            if (validFiles.length > 0) {
                if (isMultiImage) {
                    // Add to existing files
                    onImagesChange([...uploadedImages, ...validFiles]);
                } else {
                    // Replace existing file
                    onImagesChange(validFiles);
                }
            }
        },
        [validateFile, onImagesChange, uploadedImages, maxImages, isMultiImage]
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled && canAddMore) {
                setIsDragOver(true);
            }
        },
        [disabled, canAddMore]
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

            if (disabled || !canAddMore) return;

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFiles(files);
            }
        },
        [disabled, canAddMore, handleFiles]
    );

    const handleClick = useCallback(() => {
        if (!disabled && canAddMore) {
            fileInputRef.current?.click();
        }
    }, [disabled, canAddMore]);

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                handleFiles(files);
            }
            // Reset input so the same file can be selected again
            e.target.value = '';
        },
        [handleFiles]
    );

    const handleRemove = useCallback(
        (index: number) => (e: React.MouseEvent) => {
            e.stopPropagation();
            setError(null);
            const newFiles = uploadedImages.filter((_, i) => i !== index);
            onImagesChange(newFiles);
        },
        [uploadedImages, onImagesChange]
    );

    const handleRemoveAll = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            setError(null);
            onImagesChange([]);
        },
        [onImagesChange]
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
        uploadedImages.length > 0 && 'has-image',
        disabled && 'disabled',
        !canAddMore && 'max-reached',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className="image-upload-container">
            <label htmlFor="image-upload-input" className="upload-label">
                Upload Image{isMultiImage ? `s (up to ${maxImages})` : ''}:
            </label>

            {/* Show uploaded images grid for multi-image mode */}
            {isMultiImage && uploadedImages.length > 0 && (
                <div className="uploaded-images-grid">
                    {uploadedImages.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="uploaded-image-item">
                            <img
                                src={imagePreviews[index]}
                                alt={`Preview ${index + 1}`}
                                className="uploaded-image-preview"
                            />
                            <div className="uploaded-image-overlay">
                                <span className="uploaded-image-number">{index + 1}</span>
                                <button
                                    type="button"
                                    className="remove-image-btn"
                                    onClick={handleRemove(index)}
                                    aria-label={`Remove image ${index + 1}`}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Show clear all button for multi-image mode */}
            {isMultiImage && uploadedImages.length > 1 && (
                <button
                    type="button"
                    className="clear-all-btn"
                    onClick={handleRemoveAll}
                >
                    Clear All
                </button>
            )}

            {/* biome-ignore lint/a11y/useSemanticElements: Drop zone requires div for drag-and-drop functionality */}
            <div
                className={zoneClasses}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={disabled || !canAddMore ? -1 : 0}
                aria-label={
                    !canAddMore
                        ? `Maximum ${maxImages} images reached`
                        : uploadedImages.length > 0
                            ? 'Click to add more images'
                            : 'Click or drag to upload image'
                }
            >
                <input
                    ref={fileInputRef}
                    id="image-upload-input"
                    type="file"
                    accept="image/*"
                    multiple={isMultiImage}
                    onChange={handleFileInputChange}
                    className="file-input-hidden"
                    disabled={disabled || !canAddMore}
                />

                {/* Single image mode: show preview in the zone */}
                {!isMultiImage && uploadedImages.length > 0 && imagePreviews[0] ? (
                    <div className="upload-preview">
                        <img src={imagePreviews[0]} alt="Preview" className="preview-image" />
                        <div className="preview-info">
                            <span className="file-name">{uploadedImages[0].name}</span>
                            <span className="file-size">{formatFileSize(uploadedImages[0].size)}</span>
                            <button
                                type="button"
                                className="remove-btn"
                                onClick={handleRemove(0)}
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
                            {!canAddMore
                                ? `Maximum ${maxImages} images uploaded`
                                : isMultiImage && uploadedImages.length > 0
                                    ? `Add more images (${uploadedImages.length}/${maxImages})`
                                    : 'Drag and drop image(s) here, or click to select'}
                        </p>
                        <p className="upload-hint">
                            Supports PNG, JPEG, WebP (max 10MB each)
                        </p>
                    </div>
                )}
            </div>

            {error && <p className="upload-error">{error}</p>}
        </div>
    );
};
