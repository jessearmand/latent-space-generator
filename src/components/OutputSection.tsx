import type React from 'react';
import type { StatusType } from '../hooks/useStatusMessage';
import { AudioPlayer } from './AudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import { DownloadButton } from './DownloadButton';

export interface OutputSectionProps {
    audioUrl: string | null;
    videoUrl: string | null;
    imageUrls: string[];
    statusMessage: string;
    statusType: StatusType;
}

export const OutputSection: React.FC<OutputSectionProps> = ({
    audioUrl,
    videoUrl,
    imageUrls,
    statusMessage,
    statusType,
}) => {
    return (
        <div className="output-section">
            {/* Audio output */}
            {audioUrl && <AudioPlayer src={audioUrl} title="Generated Audio" />}

            {/* Video output */}
            {videoUrl && !audioUrl && (
                <div className="video-container">
                    <h3>Generated Video</h3>
                    <VideoPlayer src={videoUrl} />
                </div>
            )}

            {/* Single image output */}
            {imageUrls.length === 1 && !videoUrl && !audioUrl && (
                <div className="image-container">
                    <div className="image-header">
                        <h3>Generated Image</h3>
                        <DownloadButton url={imageUrls[0]} />
                    </div>
                    <img src={imageUrls[0]} alt="Generated result" className="generated-image" />
                </div>
            )}

            {/* Multiple images (layers) output */}
            {imageUrls.length > 1 && !videoUrl && !audioUrl && (
                <div className="image-container">
                    <h3>Generated Layers ({imageUrls.length})</h3>
                    <div className="layer-gallery">
                        {imageUrls.map((url, idx) => (
                            <div key={url} className="layer-item">
                                <div className="layer-header">
                                    <span className="layer-label">Layer {idx + 1}</span>
                                    <DownloadButton url={url} />
                                </div>
                                <img src={url} alt={`Layer ${idx + 1}`} className="layer-image" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <p className={`status-message ${statusType}`}>{statusMessage}</p>
        </div>
    );
};
