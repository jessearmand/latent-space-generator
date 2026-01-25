import { useState, useEffect, useCallback } from 'react';

export interface UseImageUploadReturn {
    uploadedImages: File[];
    imagePreviews: string[];
    setUploadedImages: (files: File[]) => void;
    clearImages: () => void;
}

/**
 * Hook for managing image uploads with automatic preview URL generation.
 * Handles cleanup of object URLs to prevent memory leaks.
 */
export function useImageUpload(): UseImageUploadReturn {
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    // Generate preview URLs and handle cleanup
    useEffect(() => {
        if (uploadedImages.length > 0) {
            const newPreviews = uploadedImages.map(file => URL.createObjectURL(file));
            setImagePreviews(newPreviews);

            // Cleanup: revoke object URLs when dependencies change
            return () => {
                for (const url of newPreviews) {
                    URL.revokeObjectURL(url);
                }
            };
        } else {
            setImagePreviews([]);
        }
    }, [uploadedImages]);

    const clearImages = useCallback(() => {
        setUploadedImages([]);
    }, []);

    return {
        uploadedImages,
        imagePreviews,
        setUploadedImages,
        clearImages,
    };
}
