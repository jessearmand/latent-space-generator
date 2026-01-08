/**
 * Downloads an image from a URL (supports both HTTP URLs and data URLs)
 * Uses the original filename from the URL when available (like Chrome's "Save Image As...")
 * @param url - The image URL or data URL to download
 * @param filename - Optional override filename (without extension). If not provided, extracts from URL.
 */
export async function downloadImage(url: string, filename?: string): Promise<void> {
    try {
        let blob: Blob;
        let resolvedFilename: string;

        if (url.startsWith('data:')) {
            // Handle data URLs (from OpenAI models)
            blob = dataUrlToBlob(url);
            // Data URLs don't have filenames, so generate one
            const extension = getExtensionFromMimeType(blob.type);
            resolvedFilename = filename
                ? `${filename}.${extension}`
                : `${generateFilename()}.${extension}`;
        } else {
            // Handle HTTP URLs (from fal.ai models)
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            blob = await response.blob();

            // Extract filename from URL (like Chrome's "Save Image As...")
            if (filename) {
                const extension = getExtensionFromMimeType(blob.type);
                resolvedFilename = `${filename}.${extension}`;
            } else {
                resolvedFilename = extractFilenameFromUrl(url, blob.type);
            }
        }

        // Create download link and trigger download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = resolvedFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Failed to download image:', error);
        throw error;
    }
}

/**
 * Extracts the filename from a URL, similar to Chrome's "Save Image As..." behavior
 */
function extractFilenameFromUrl(url: string, mimeType: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        // Get the last segment of the path
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
            const lastSegment = segments[segments.length - 1];

            // Check if the segment looks like a filename (has an extension)
            if (/\.[a-zA-Z0-9]+$/.test(lastSegment)) {
                // Decode URI component to handle encoded characters
                return decodeURIComponent(lastSegment);
            }
        }

        // Fallback: generate a filename with proper extension
        const extension = getExtensionFromMimeType(mimeType);
        return `${generateFilename()}.${extension}`;
    } catch {
        // If URL parsing fails, generate a fallback filename
        const extension = getExtensionFromMimeType(mimeType);
        return `${generateFilename()}.${extension}`;
    }
}

/**
 * Converts a data URL to a Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64Data] = dataUrl.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    const byteString = atob(base64Data);
    const byteArray = new Uint8Array(byteString.length);

    for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
    }

    return new Blob([byteArray], { type: mimeType });
}

/**
 * Gets the file extension from a MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
    const mimeToExtension: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif',
    };

    return mimeToExtension[mimeType] || 'png';
}

/**
 * Generates a timestamped filename for downloads
 */
export function generateFilename(prefix = 'generated-image'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${prefix}-${timestamp}`;
}
