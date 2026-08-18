import { useEffect, useState } from 'react';
import { probeVideoFile, type VideoFileMetadata } from '../utils/videoMetadata';

/**
 * Probe an uploaded video file for duration/dimensions/poster. Returns null
 * while probing, when there is no file, or when metadata is unreadable —
 * callers that gate on limits should treat null as "unknown, let the API
 * decide" rather than as a failure.
 */
export function useVideoFileMetadata(file: File | null): VideoFileMetadata | null {
    const [meta, setMeta] = useState<VideoFileMetadata | null>(null);

    useEffect(() => {
        let stale = false;
        setMeta(null);
        if (!file) {
            return;
        }
        probeVideoFile(file)
            .then((m) => {
                if (!stale) setMeta(m);
            })
            .catch(() => {
                if (!stale) setMeta(null);
            });
        return () => {
            stale = true;
        };
    }, [file]);

    return meta;
}
