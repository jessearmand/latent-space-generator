/**
 * Extend-video panel: source-clip chips, the extend timeline, and the
 * model-specific controls (duration, mode, context, resolution, audio,
 * aspect ratio, safety tolerance), all driven by the endpoint's
 * ExtendCapabilityProfile. Unprofiled endpoints get a minimal notice —
 * the hook sends only prompt + video_url for them.
 */

import type React from 'react';
import { useEffect } from 'react';
import { useConfig } from '../config';
import {
    checkExtendSource,
    formatSourceMaxBytes,
    getExtendCapabilityProfile,
} from '../services/extendVideoCapabilities';
import type { VideoFileMetadata } from '../utils/videoMetadata';
import type { ModelConfig } from '../types/models';
import { ExtendTimeline } from './ExtendTimeline';
import './ExtendVideoOptions.css';

interface ExtendVideoOptionsProps {
    selectedModel: ModelConfig;
    videoFile: File;
    /** Probed source metadata, owned by InputSection (which also gates Generate on it). */
    meta: VideoFileMetadata | null;
}

const fmt = (n: number): string => `${(Math.round(n * 10) / 10).toFixed(1)}s`;

export const ExtendVideoOptions: React.FC<ExtendVideoOptionsProps> = ({ selectedModel, videoFile, meta }) => {
    const config = useConfig();
    const profile = getExtendCapabilityProfile(selectedModel.endpointId);

    // Clamp the stored extension length into the selected model's bounds.
    useEffect(() => {
        if (!profile) return;
        const clamped = Math.min(Math.max(config.extendDuration, profile.durationMin), profile.durationMax);
        if (clamped !== config.extendDuration) {
            config.setExtendDuration(clamped);
        }
        // Reset resolution/aspect to the profile default when the stored value is invalid.
        if (profile.resolutions.length > 0 && !profile.resolutions.includes(config.videoResolution)) {
            config.setVideoResolution(profile.resolutions[0]);
        }
        if (profile.aspectRatios.length > 0 && !profile.aspectRatios.includes(config.extendAspectRatio)) {
            config.setExtendAspectRatio(profile.aspectRatios[0]);
        }
    }, [profile, config]);

    if (!profile) {
        return (
            <div className="extend-panel">
                <p className="extend-unprofiled-note">
                    This endpoint has no capability profile yet — only the prompt and video are sent, and the
                    model&#39;s own defaults apply.
                </p>
            </div>
        );
    }

    const durationAuto = profile.supportsAutoDuration && config.extendDurationAuto;
    const contextAuto = !profile.supportsContext || config.extendContextAuto;
    const mode = profile.supportsMode && config.extendMode === 'start' ? 'start' : 'end';
    const extSec = Math.min(Math.max(config.extendDuration, profile.durationMin), profile.durationMax);
    const effectiveExt = durationAuto ? profile.durationMax : extSec;

    // Guard against degenerate metadata (e.g. streams with unknown duration).
    const srcDuration = meta && Number.isFinite(meta.duration) && meta.duration > 0 ? meta.duration : null;
    // One predicate for duration, size, and container — the same check gates
    // Generate in InputSection, so chips and button state always agree.
    const srcCheck = checkExtendSource(profile, videoFile, srcDuration);
    const srcTooShort =
        profile.sourceMinSeconds !== null && srcDuration !== null && srcDuration < profile.sourceMinSeconds;
    const totalSec = srcDuration !== null ? srcDuration + effectiveExt : null;
    const resultOverCeiling =
        profile.sourceMaxSeconds !== null && totalSec !== null && totalSec > profile.sourceMaxSeconds;

    return (
        <div className="extend-panel">
            <div className="extend-panel-header">
                <h4>Extend Timeline</h4>
                {profile.supportsMode ? (
                    <div className="extend-mode-toggle-group">
                        <span className="extend-mode-toggle-label">Extend at</span>
                        <div className="extend-toggle">
                            <button
                                type="button"
                                className={mode === 'end' ? 'active' : ''}
                                onClick={() => config.setExtendMode('end')}
                            >
                                End
                            </button>
                            <button
                                type="button"
                                className={mode === 'start' ? 'active' : ''}
                                onClick={() => config.setExtendMode('start')}
                            >
                                Start
                            </button>
                        </div>
                    </div>
                ) : (
                    <span className="extend-end-only-note">
                        End-only &middot; this model appends after the final frame
                    </span>
                )}
            </div>

            <div className="extend-panel-body">
                <div className="extend-chips">
                    <span className="extend-chip">
                        Source&nbsp;
                        <strong>{srcDuration !== null ? fmt(srcDuration) : '…'}</strong>
                        {meta && (
                            <>
                                &nbsp;&middot; {meta.width}&times;{meta.height} &middot;{' '}
                                {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                            </>
                        )}
                    </span>
                    <span className="extend-chip accent">
                        Extendable up to&nbsp;<strong>{profile.durationMax}s</strong>&nbsp;per pass
                    </span>
                    {srcCheck.accepted && !srcTooShort && (
                        <span className="extend-chip success">
                            &#10003;{' '}
                            {profile.sourceNote
                                ? `Source accepted — ${profile.sourceNote}`
                                : `Source accepted by ${selectedModel.displayName}`}
                        </span>
                    )}
                    {srcCheck.tooLong && (
                        <span className="extend-chip warning">
                            &#9888; Source over the {profile.sourceMaxSeconds}s limit for this model &mdash; trim the
                            clip to extend it
                        </span>
                    )}
                    {srcTooShort && (
                        <span className="extend-chip warning">
                            &#9888; Source under the {profile.sourceMinSeconds}s minimum for this model
                        </span>
                    )}
                    {srcCheck.tooLarge && profile.sourceMaxBytes !== null && (
                        <span className="extend-chip warning">
                            &#9888; Source is {(videoFile.size / 1_000_000).toFixed(1)} MB &mdash; over the{' '}
                            {formatSourceMaxBytes(profile.sourceMaxBytes)} limit for this model
                        </span>
                    )}
                    {srcCheck.wrongContainer && (
                        <span className="extend-chip warning">&#9888; Source must be an MP4 file for this model</span>
                    )}
                    {profile.isDraft && <span className="extend-chip draft">Draft preview &middot; 720p only</span>}
                </div>

                {srcDuration !== null && (
                    <ExtendTimeline
                        srcDuration={srcDuration}
                        posterUrl={meta?.posterUrl ?? null}
                        minSec={profile.durationMin}
                        maxSec={profile.durationMax}
                        stepSec={profile.durationStep}
                        extSec={extSec}
                        durationAuto={durationAuto}
                        mode={mode}
                        contextSec={profile.supportsContext && !contextAuto ? config.extendContext : null}
                        onExtChange={config.setExtendDuration}
                    />
                )}

                {srcDuration !== null && totalSec !== null && (
                    <div className="extend-summary">
                        <span className="extend-summary-math">
                            {fmt(srcDuration)} source{' '}
                            <strong className="accent">+ {durationAuto ? 'auto' : fmt(extSec)}</strong> ={' '}
                            <strong>{durationAuto ? `up to ${fmt(totalSec)}` : fmt(totalSec)} total</strong>
                        </span>
                        <span className="extend-summary-hint">
                            {durationAuto
                                ? 'Switch to Manual to set the length yourself'
                                : 'Drag the highlighted band to set the extension'}
                        </span>
                    </div>
                )}

                {resultOverCeiling && (
                    <p className="extend-warning-note">
                        Result is {totalSec !== null ? fmt(totalSec) : ''} &mdash; past the {profile.sourceMaxSeconds}s
                        source ceiling, so it cannot be fed back in for another extension pass.
                    </p>
                )}

                {profile.isDraft && (
                    <p className="extend-draft-note">
                        The API also returns a draft cache for discounted full-quality re-rendering &mdash; this app
                        doesn&#39;t support the enhance step yet.
                    </p>
                )}

                <div className="extend-divider" />

                <div className="form-group">
                    <div className="extend-control-row">
                        <label htmlFor="extend-duration">
                            Extension Duration:{' '}
                            <span className="extend-value">{durationAuto ? 'auto' : fmt(extSec)}</span>
                        </label>
                        {profile.supportsAutoDuration && (
                            <div className="extend-toggle">
                                <button
                                    type="button"
                                    className={durationAuto ? 'active' : ''}
                                    onClick={() => config.setExtendDurationAuto(true)}
                                >
                                    Auto
                                </button>
                                <button
                                    type="button"
                                    className={durationAuto ? '' : 'active'}
                                    onClick={() => config.setExtendDurationAuto(false)}
                                >
                                    Manual
                                </button>
                            </div>
                        )}
                    </div>
                    <input
                        id="extend-duration"
                        type="range"
                        min={profile.durationMin}
                        max={profile.durationMax}
                        step={profile.durationStep}
                        value={extSec}
                        disabled={durationAuto}
                        onChange={(e) => config.setExtendDuration(parseFloat(e.target.value))}
                        className="extend-range"
                    />
                    <span className="hint">
                        {durationAuto
                            ? `(auto — the model picks the length, ${profile.durationMin}–${profile.durationMax}s)`
                            : `(${profile.durationMin}–${profile.durationMax}s per pass, ${
                                  profile.durationStep === 1 ? 'whole seconds' : `${profile.durationStep}s steps`
                              })`}
                    </span>
                </div>

                {profile.supportsContext && (
                    <div className="form-group">
                        <div className="extend-control-row">
                            <label htmlFor="extend-context">
                                Context Window:{' '}
                                <span className="extend-value">
                                    {contextAuto ? 'auto' : `${config.extendContext}s`}
                                </span>
                            </label>
                            <button
                                type="button"
                                className="extend-link-btn"
                                onClick={() => config.setExtendContextAuto(!config.extendContextAuto)}
                            >
                                {contextAuto ? 'Set manually' : 'Use auto'}
                            </button>
                        </div>
                        {contextAuto ? (
                            <span className="hint">
                                Field omitted &mdash; the model maximizes context within its 505-frame limit.
                            </span>
                        ) : (
                            <>
                                <input
                                    id="extend-context"
                                    type="range"
                                    min={1}
                                    max={20}
                                    step={1}
                                    value={config.extendContext}
                                    onChange={(e) => config.setExtendContext(parseInt(e.target.value, 10))}
                                    className="extend-range"
                                />
                                <span className="hint">(1&ndash;20s of the source the model conditions on)</span>
                            </>
                        )}
                    </div>
                )}

                {profile.resolutions.length > 0 && (
                    <div className="form-group">
                        <label htmlFor="extend-resolution">Resolution:</label>
                        <select
                            id="extend-resolution"
                            value={config.videoResolution}
                            onChange={(e) => config.setVideoResolution(e.target.value)}
                        >
                            {profile.resolutions.map((res) => (
                                <option key={res} value={res}>
                                    {res}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {profile.supportsGenerateAudio && (
                    <div className="form-group">
                        <label htmlFor="extend-generate-audio">Generate Audio:</label>
                        <input
                            id="extend-generate-audio"
                            type="checkbox"
                            checked={config.generateAudio}
                            onChange={(e) => config.setGenerateAudio(e.target.checked)}
                        />
                        <span className="hint"> (continues the source clip&#39;s audio)</span>
                    </div>
                )}

                {profile.aspectRatios.length > 0 && (
                    <div className="form-group">
                        <label htmlFor="extend-aspect-ratio">Aspect Ratio:</label>
                        <select
                            id="extend-aspect-ratio"
                            value={config.extendAspectRatio}
                            onChange={(e) => config.setExtendAspectRatio(e.target.value)}
                        >
                            {profile.aspectRatios.map((ratio) => (
                                <option key={ratio} value={ratio}>
                                    {ratio}
                                </option>
                            ))}
                        </select>
                        <span className="hint"> (auto keeps the source clip&#39;s ratio)</span>
                    </div>
                )}

                {profile.supportsSafetyTolerance && (
                    <div className="form-group">
                        <label htmlFor="extend-safety-tolerance">Safety Tolerance:</label>
                        <select
                            id="extend-safety-tolerance"
                            value={config.extendSafetyTolerance}
                            onChange={(e) => config.setExtendSafetyTolerance(parseInt(e.target.value, 10))}
                        >
                            {[0, 1, 2, 3, 4].map((level) => (
                                <option key={level} value={level}>
                                    {level}
                                </option>
                            ))}
                        </select>
                        <span className="hint"> (0 = strictest, 4 = most permissive)</span>
                    </div>
                )}
            </div>
        </div>
    );
};
