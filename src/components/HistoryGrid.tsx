import type React from 'react';
import type { HistoryEntry } from '../types/history';
import { HistoryImageCard } from './HistoryImageCard';
import { HistoryVideoCard } from './HistoryVideoCard';
import { HistoryAudioCard } from './HistoryAudioCard';
import './HistoryGrid.css';

interface HistoryGridProps {
    entries: HistoryEntry[];
    onRemove: (id: string) => void;
}

export const HistoryGrid: React.FC<HistoryGridProps> = ({ entries, onRemove }) => {
    return (
        <div className="history-grid">
            {entries.map((entry) => {
                switch (entry.type) {
                    case 'image':
                        return <HistoryImageCard key={entry.id} entry={entry} onRemove={onRemove} />;
                    case 'video':
                        return <HistoryVideoCard key={entry.id} entry={entry} onRemove={onRemove} />;
                    case 'audio':
                    case 'text':
                        return <HistoryAudioCard key={entry.id} entry={entry} onRemove={onRemove} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
};
