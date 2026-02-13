/**
 * Audio player component for generated audio
 * Provides playback controls and download functionality
 */

import type React from 'react';
import { useRef, useState, useCallback } from 'react';
import { DownloadButton } from './DownloadButton';
import './AudioPlayer.css';

interface AudioPlayerProps {
    src: string;
    title?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title = 'Generated Audio' }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const handlePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(() => {
                // Autoplay may be blocked by the browser; user interaction will retry
            });
        }
    }, [isPlaying]);

    const handleTimeUpdate = useCallback(() => {
        const audio = audioRef.current;
        if (audio) {
            setCurrentTime(audio.currentTime);
        }
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        const audio = audioRef.current;
        if (audio) {
            setDuration(audio.duration);
        }
    }, []);

    const handlePlay = useCallback(() => setIsPlaying(true), []);
    const handlePause = useCallback(() => setIsPlaying(false), []);
    const handleEnded = useCallback(() => {
        setIsPlaying(false);
        setCurrentTime(0);
    }, []);

    const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (audio) {
            const newTime = parseFloat(e.target.value);
            audio.currentTime = newTime;
            setCurrentTime(newTime);
        }
    }, []);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="audio-player">
            <div className="audio-player-header">
                <h4 className="audio-player-title">{title}</h4>
                <DownloadButton url={src} label="Download audio" />
            </div>

            {/* biome-ignore lint/a11y/useMediaCaption: Generated audio, no captions available */}
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
            />

            <div className="audio-player-controls">
                <button
                    type="button"
                    className="audio-play-btn"
                    onClick={handlePlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? '⏸' : '▶'}
                </button>

                <div className="audio-progress">
                    <span className="audio-time">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        className="audio-seek-bar"
                        min={0}
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        aria-label="Seek"
                    />
                    <span className="audio-time">{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};
