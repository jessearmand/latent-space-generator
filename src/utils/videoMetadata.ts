/**
 * Probe an uploaded video file for metadata the extend-video UI needs:
 * duration/dimensions (from a detached <video> element) and a poster frame
 * (first frame drawn to a canvas). Runs entirely client-side on the local
 * File — nothing is uploaded.
 */

export interface VideoFileMetadata {
    /** Duration in seconds (may be fractional). */
    duration: number;
    width: number;
    height: number;
    /** Data URL of the first frame, or null when the codec blocks canvas capture. */
    posterUrl: string | null;
}

/** Capture the current frame of a video element as a JPEG data URL. */
function captureFrame(video: HTMLVideoElement): string | null {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx || canvas.width === 0 || canvas.height === 0) {
            return null;
        }
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.7);
    } catch {
        // Tainted canvas or unsupported codec — poster is optional.
        return null;
    }
}

export function probeVideoFile(file: File): Promise<VideoFileMetadata> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;

        const cleanup = () => {
            video.removeAttribute('src');
            video.load();
            URL.revokeObjectURL(objectUrl);
        };

        video.addEventListener('error', () => {
            cleanup();
            reject(new Error('Could not read video metadata from the selected file.'));
        });

        video.addEventListener('loadedmetadata', () => {
            const { videoWidth, videoHeight } = video;
            const finish = () => {
                // Re-read after seeking: Chrome reports Infinity for
                // MediaRecorder-produced webm until forced past the end.
                const duration = video.duration;
                const posterUrl = captureFrame(video);
                cleanup();
                if (!Number.isFinite(duration) || duration <= 0) {
                    reject(new Error('Could not determine the video duration.'));
                    return;
                }
                resolve({ duration, width: videoWidth, height: videoHeight, posterUrl });
            };
            video.addEventListener('seeked', finish, { once: true });
            // Non-finite duration: seek far past the end so the browser
            // computes the real duration; otherwise grab an early frame.
            video.currentTime = Number.isFinite(video.duration) ? Math.min(0.1, video.duration / 2) : 1e10;
        });

        video.src = objectUrl;
    });
}
