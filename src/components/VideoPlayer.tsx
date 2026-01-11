/**
 * Video player component for displaying generated videos
 * Includes playback controls and download functionality
 */

import type React from 'react';
import { useRef, useState } from 'react';
import './VideoPlayer.css';

interface VideoPlayerProps {
    src: string;
    className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, className }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLooping, setIsLooping] = useState(false);

    const handleDownload = async () => {
        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `generated-video-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download video:', error);
            // Fallback: open in new tab
            window.open(src, '_blank');
        }
    };

    const toggleLoop = () => {
        setIsLooping(!isLooping);
        if (videoRef.current) {
            videoRef.current.loop = !isLooping;
        }
    };

    return (
        <div className={`video-player-container ${className || ''}`}>
            <video
                ref={videoRef}
                src={src}
                controls
                loop={isLooping}
                className="video-player"
                preload="metadata"
            >
                <track kind="captions" srcLang="en" label="No captions available" default />
                Your browser does not support the video tag.
            </video>

            <div className="video-player-controls">
                <button
                    type="button"
                    onClick={toggleLoop}
                    className={`video-control-btn ${isLooping ? 'active' : ''}`}
                    title={isLooping ? 'Disable loop' : 'Enable loop'}
                >
                    {isLooping ? '🔁 Loop On' : '🔁 Loop Off'}
                </button>

                <button
                    type="button"
                    onClick={handleDownload}
                    className="video-control-btn download-btn"
                    title="Download video"
                >
                    Download
                </button>
            </div>
        </div>
    );
};
