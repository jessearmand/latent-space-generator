/**
 * Prompt Optimizer Component
 * Uses OpenRouter LLMs via Vercel AI SDK to enhance image generation prompts
 */

import type React from "react";
import { useState, useCallback, useRef } from "react";
import { useCompletion } from "@ai-sdk/react";
import { useOpenRouter } from "../contexts/OpenRouterContext";
import { useOpenRouterAuth } from "../contexts/OpenRouterAuthContext";
import type { OpenRouterModel } from "../types/openrouter";
import { getProviderFromId } from "../types/openrouter";
import "./PromptOptimizer.css";

/** Output format for the optimized prompt */
export type PromptOutputFormat = "plain" | "json" | "xml";

interface PromptOptimizerProps {
    /** The original prompt text from the main input */
    originalPrompt: string;
    /** Callback when user accepts the optimized prompt */
    onPromptOptimized: (optimizedPrompt: string) => void;
}

export const PromptOptimizer: React.FC<PromptOptimizerProps> = ({
    originalPrompt,
    onPromptOptimized,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [outputFormat, setOutputFormat] = useState<PromptOutputFormat>("plain");

    const {
        filteredModels,
        availableProviders,
        isLoading: modelsLoading,
        error: modelsError,
        selectedModel,
        setSelectedModel,
        filters,
        setFilters,
        refreshModels,
    } = useOpenRouter();

    const { userApiKey } = useOpenRouterAuth();

    // Use refs to track current values for the custom fetch function
    // This avoids stale closure issues with useCompletion's body option
    const selectedModelRef = useRef<OpenRouterModel | null>(selectedModel);
    selectedModelRef.current = selectedModel;
    const userApiKeyRef = useRef<string | null>(userApiKey);
    userApiKeyRef.current = userApiKey;

    // Vercel AI SDK useCompletion hook with custom fetch to inject current model
    const {
        completion,
        isLoading: isOptimizing,
        error: completionError,
        complete,
        stop,
    } = useCompletion({
        api: "/api/openrouter/completion",
        // Use streamProtocol: 'text' to match server's toTextStreamResponse()
        streamProtocol: "text",
        // Custom fetch to inject the current model and user key at request time
        fetch: (async (url: RequestInfo | URL, init?: RequestInit) => {
            const body = JSON.parse((init?.body as string) || "{}");
            // Use ref as fallback if model not already in body
            if (!body.model) {
                body.model = selectedModelRef.current?.id;
            }
            // Inject user's OAuth key if available
            if (userApiKeyRef.current) {
                body.openrouter_user_key = userApiKeyRef.current;
            }
            return fetch(url, {
                ...init,
                body: JSON.stringify(body),
            });
        }) as typeof globalThis.fetch,
        onError: (error) => {
            console.error("Prompt optimization error:", error);
        },
    });

    const handleOptimize = useCallback(async () => {
        if (!originalPrompt.trim() || !selectedModel) return;
        // Pass model and format directly in complete() options
        await complete(originalPrompt, {
            body: { model: selectedModel.id, format: outputFormat },
        });
    }, [originalPrompt, selectedModel, outputFormat, complete]);

    const handleUsePrompt = useCallback(() => {
        if (completion) {
            onPromptOptimized(completion);
        }
    }, [completion, onPromptOptimized]);

    const handleCopy = useCallback(async () => {
        if (completion) {
            try {
                await navigator.clipboard.writeText(completion);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (error) {
                console.error("Failed to copy:", error);
            }
        }
    }, [completion]);

    const handleModelChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const modelId = e.target.value;
            const model = filteredModels.find((m) => m.id === modelId);
            if (model) {
                setSelectedModel(model);
            }
        },
        [filteredModels, setSelectedModel]
    );

    const handleProviderChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const provider = e.target.value || null;
            setFilters({ ...filters, provider });
        },
        [filters, setFilters]
    );

    const handleContextLengthChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value;
            setFilters({
                ...filters,
                minContextLength: value ? Number.parseInt(value, 10) : null,
            });
        },
        [filters, setFilters]
    );

    const handleMaxTokensChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value;
            setFilters({
                ...filters,
                minMaxCompletionTokens: value ? Number.parseInt(value, 10) : null,
            });
        },
        [filters, setFilters]
    );

    const handleModeratedChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value;
            setFilters({
                ...filters,
                isModerated: value === "" ? null : value === "true",
            });
        },
        [filters, setFilters]
    );

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setFilters({ ...filters, search: e.target.value });
        },
        [filters, setFilters]
    );

    const hasApiKeyError =
        modelsError?.includes("OPENROUTER_API_KEY") ||
        (completionError as Error | undefined)?.message?.includes("OPENROUTER_API_KEY");

    return (
        <div className="prompt-optimizer">
            <button
                type="button"
                className="prompt-optimizer-header"
                onClick={() => setIsCollapsed(!isCollapsed)}
                aria-expanded={!isCollapsed}
            >
                <h4>
                    <span className="collapse-icon">{isCollapsed ? "▶" : "▼"}</span>
                    Prompt Optimizer
                </h4>
            </button>

            {!isCollapsed && (
                <div className="prompt-optimizer-content">
                    {hasApiKeyError ? (
                        <div className="no-api-key-message">
                            OpenRouter API key not configured. Set OPENROUTER_API_KEY
                            environment variable on the server.
                        </div>
                    ) : (
                        <>
                            {/* Filter row */}
                            <div className="optimizer-filter-row">
                                <select
                                    className="optimizer-provider-select"
                                    value={filters.provider || ""}
                                    onChange={handleProviderChange}
                                    title="Filter by provider"
                                >
                                    <option value="">All Providers</option>
                                    {availableProviders.map((provider) => (
                                        <option key={provider} value={provider}>
                                            {provider}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    className="optimizer-search"
                                    placeholder="Search models..."
                                    value={filters.search || ""}
                                    onChange={handleSearchChange}
                                />
                            </div>

                            {/* Advanced filters row */}
                            <div className="optimizer-advanced-filters">
                                <select
                                    className="optimizer-context-select"
                                    value={filters.minContextLength ?? ""}
                                    onChange={handleContextLengthChange}
                                    title="Minimum context length (input)"
                                >
                                    <option value="">Any Context</option>
                                    <option value="8192">8K+</option>
                                    <option value="32768">32K+</option>
                                    <option value="65536">64K+</option>
                                    <option value="131072">128K+</option>
                                    <option value="262144">256K+</option>
                                    <option value="1000000">1M+</option>
                                </select>
                                <select
                                    className="optimizer-max-tokens-select"
                                    value={filters.minMaxCompletionTokens ?? ""}
                                    onChange={handleMaxTokensChange}
                                    title="Minimum output tokens capacity"
                                >
                                    <option value="">Any Output</option>
                                    <option value="4096">4K+</option>
                                    <option value="8192">8K+</option>
                                    <option value="16384">16K+</option>
                                    <option value="32768">32K+</option>
                                    <option value="65536">64K+</option>
                                    <option value="131072">128K+</option>
                                </select>
                                <select
                                    className="optimizer-moderated-select"
                                    value={filters.isModerated == null ? "" : String(filters.isModerated)}
                                    onChange={handleModeratedChange}
                                    title="Content moderation"
                                >
                                    <option value="">Any Moderation</option>
                                    <option value="false">Unmoderated</option>
                                    <option value="true">Moderated</option>
                                </select>
                            </div>

                            {/* Model selector row */}
                            <div className="optimizer-model-row">
                                <select
                                    className="optimizer-model-select"
                                    value={selectedModel?.id || ""}
                                    onChange={handleModelChange}
                                    disabled={modelsLoading || filteredModels.length === 0}
                                >
                                    {modelsLoading && filteredModels.length === 0 ? (
                                        <option>Loading models...</option>
                                    ) : filteredModels.length === 0 ? (
                                        <option>No models available</option>
                                    ) : (
                                        filteredModels.map((model) => (
                                            <option key={model.id} value={model.id}>
                                                {model.name} ({getProviderFromId(model.id)})
                                            </option>
                                        ))
                                    )}
                                </select>
                                <button
                                    type="button"
                                    className="optimizer-model-refresh"
                                    onClick={refreshModels}
                                    disabled={modelsLoading}
                                    title="Refresh model list"
                                >
                                    {modelsLoading ? "..." : "⟳"}
                                </button>
                            </div>

                            {modelsError && !hasApiKeyError && (
                                <div className="optimizer-error">{modelsError}</div>
                            )}

                            {completionError && !hasApiKeyError && (
                                <div className="optimizer-error">
                                    {(completionError as Error).message || "Optimization failed"}
                                </div>
                            )}

                            {/* Format selector and action buttons */}
                            <div className="optimizer-format-row">
                                <span className="format-label">Output format:</span>
                                <label className="format-option">
                                    <input
                                        type="radio"
                                        name="outputFormat"
                                        value="plain"
                                        checked={outputFormat === "plain"}
                                        onChange={() => setOutputFormat("plain")}
                                    />
                                    Plain Text
                                </label>
                                <label className="format-option">
                                    <input
                                        type="radio"
                                        name="outputFormat"
                                        value="json"
                                        checked={outputFormat === "json"}
                                        onChange={() => setOutputFormat("json")}
                                    />
                                    JSON
                                </label>
                                <label className="format-option">
                                    <input
                                        type="radio"
                                        name="outputFormat"
                                        value="xml"
                                        checked={outputFormat === "xml"}
                                        onChange={() => setOutputFormat("xml")}
                                    />
                                    XML
                                </label>
                            </div>

                            {/* Action buttons */}
                            <div className="optimizer-actions">
                                {isOptimizing ? (
                                    <button
                                        type="button"
                                        className="stop-btn"
                                        onClick={stop}
                                    >
                                        Stop
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="optimize-btn"
                                        onClick={handleOptimize}
                                        disabled={
                                            !originalPrompt.trim() ||
                                            !selectedModel ||
                                            modelsLoading
                                        }
                                    >
                                        {isOptimizing && (
                                            <span className="loading-spinner" />
                                        )}
                                        Optimize Prompt
                                    </button>
                                )}
                            </div>

                            {/* Completion preview */}
                            <div
                                className={`optimizer-preview ${
                                    isOptimizing
                                        ? "streaming"
                                        : completion
                                        ? ""
                                        : "empty"
                                }`}
                            >
                                {completion ||
                                    (isOptimizing
                                        ? "Generating..."
                                        : "Optimized prompt will appear here...")}
                            </div>

                            {/* Result actions */}
                            {completion && !isOptimizing && (
                                <div className="optimizer-result-actions">
                                    <button
                                        type="button"
                                        className="use-prompt-btn"
                                        onClick={handleUsePrompt}
                                    >
                                        Use This Prompt
                                    </button>
                                    <button
                                        type="button"
                                        className="regenerate-btn"
                                        onClick={handleOptimize}
                                        disabled={!originalPrompt.trim() || !selectedModel}
                                    >
                                        Regenerate
                                    </button>
                                    <button
                                        type="button"
                                        className="copy-btn"
                                        onClick={handleCopy}
                                    >
                                        {copied ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
