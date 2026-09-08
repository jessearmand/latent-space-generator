import { useEffect, useState } from 'react';

/**
 * Derive a browser object URL from a controlled `File | null` value.
 *
 * The URL is created whenever `file` changes to a non-null value and revoked
 * when it changes again or the owning component unmounts, so the URL can never
 * drift from the file it was made for — regardless of whether the file was set
 * by the component itself, cleared by a parent, or already present on mount
 * (e.g. an upload that survived a generation-mode switch).
 *
 * Returns null while there is no file, and during the render before the
 * effect commits.
 */
export function useObjectUrl(file: File | Blob | null): string | null {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [file]);

    return url;
}
