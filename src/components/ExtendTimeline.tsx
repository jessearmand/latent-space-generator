/**
 * Visual timeline for extend-video: the source clip strip plus a hatched
 * band showing how far the selected model can extend it. The band doubles
 * as a slider (an invisible range input) for setting the extension length.
 * Purely presentational — all state lives in ExtendVideoOptions.
 */

import type React from 'react';
import './ExtendTimeline.css';

export interface ExtendTimelineProps {
    /** Source clip duration in seconds. */
    srcDuration: number;
    /** Poster frame data URL, or null when capture failed. */
    posterUrl: string | null;
    /** Extension bounds/step from the capability profile. */
    minSec: number;
    maxSec: number;
    stepSec: number;
    /** Current extension length in seconds (ignored while durationAuto). */
    extSec: number;
    /** FLUX auto mode: the model picks the length; the band is inert. */
    durationAuto: boolean;
    /** Where the extension attaches. */
    mode: 'end' | 'start';
    /** Context seconds to highlight on the source strip, or null when auto/unsupported. */
    contextSec: number | null;
    onExtChange: (seconds: number) => void;
}

const fmt = (n: number): string => `${(Math.round(n * 10) / 10).toFixed(1)}s`;

export const ExtendTimeline: React.FC<ExtendTimelineProps> = ({
    srcDuration,
    posterUrl,
    minSec,
    maxSec,
    stepSec,
    extSec,
    durationAuto,
    mode,
    contextSec,
    onExtChange,
}) => {
    const atEnd = mode === 'end';
    const span = srcDuration + maxSec;
    const srcPct = `${((srcDuration / span) * 100).toFixed(2)}%`;
    const extPct = `${((maxSec / span) * 100).toFixed(2)}%`;
    const fillPct = maxSec > 0 ? `${((extSec / maxSec) * 100).toFixed(2)}%` : '0%';
    const ctxPct =
        contextSec !== null ? `${((Math.min(contextSec, srcDuration) / srcDuration) * 100).toFixed(2)}%` : '0%';

    // Tick labels every 5s across the whole span; negative side when extending
    // at the start. Guarded against non-finite spans so a corrupt duration can
    // never loop unbounded.
    const ticks: { label: string; left: string }[] = [];
    if (Number.isFinite(span) && span > 0) {
        const t0 = atEnd ? 0 : -maxSec;
        for (let s = Math.ceil(t0 / 5) * 5; s <= t0 + span; s += 5) {
            ticks.push({
                label: `${s < 0 ? '−' : ''}${Math.abs(Math.round(s))}s`,
                left: `${(((s - t0) / span) * 100).toFixed(2)}%`,
            });
        }
    }

    return (
        <div className="extend-timeline">
            <div className="extend-timeline-ticks">
                {ticks.map((t) => (
                    <div key={t.label} className="extend-timeline-tick" style={{ left: t.left }}>
                        <span className="extend-timeline-tick-label">{t.label}</span>
                        <span className="extend-timeline-tick-mark" />
                    </div>
                ))}
            </div>

            <div className={`extend-timeline-strip ${atEnd ? '' : 'reversed'}`}>
                <div className="extend-timeline-source" style={{ width: srcPct }}>
                    <div
                        className="extend-timeline-source-frame"
                        style={posterUrl ? { backgroundImage: `url(${posterUrl})` } : undefined}
                    />
                    <span className="extend-timeline-source-label">SOURCE CLIP</span>
                    {contextSec !== null && (
                        <div
                            className={`extend-timeline-context ${atEnd ? 'at-right' : 'at-left'}`}
                            style={{ width: ctxPct }}
                        >
                            <span className="extend-timeline-context-label">CONTEXT {Math.round(contextSec)}s</span>
                        </div>
                    )}
                </div>

                <div className="extend-timeline-extension" style={{ width: extPct }}>
                    {durationAuto ? (
                        <div className="extend-timeline-auto">
                            <span className="extend-timeline-fill-pill">auto</span>
                            <span className="extend-timeline-auto-hint">model decides, up to {maxSec}s</span>
                        </div>
                    ) : (
                        <>
                            <div
                                className={`extend-timeline-fill ${atEnd ? 'from-left' : 'from-right'}`}
                                style={{ width: fillPct }}
                            >
                                <span className="extend-timeline-fill-pill">+{fmt(extSec)}</span>
                            </div>
                            <div
                                className="extend-timeline-headroom"
                                style={atEnd ? { left: fillPct, right: 0 } : { right: fillPct, left: 0 }}
                            >
                                <span>{fmt(maxSec - extSec)} left</span>
                            </div>
                        </>
                    )}
                    <input
                        type="range"
                        className="extend-timeline-range"
                        min={minSec}
                        max={maxSec}
                        step={stepSec}
                        value={extSec}
                        disabled={durationAuto}
                        onChange={(e) => onExtChange(parseFloat(e.target.value))}
                        aria-label="Extension length in seconds"
                    />
                </div>
            </div>
        </div>
    );
};
