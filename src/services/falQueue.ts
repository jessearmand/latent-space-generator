import { fal } from '@fal-ai/client';
import { sanitizeLogMessage } from '../utils/logSanitizer';

export interface FalQueueOptions {
    modelId: string;
    input: Record<string, unknown>;
    onStatus: (message: string) => void;
    pollInterval?: number;
    /**
     * Checked before and after each status poll; returning true aborts with
     * FalQueueCancelledError (e.g. the calling component unmounted).
     */
    shouldCancel?: () => boolean;
    /** Overall deadline; exceeding it aborts with FalQueueTimeoutError. */
    timeoutMs?: number;
}

export interface FalQueueResult {
    data: Record<string, unknown>;
}

/** Polling was abandoned because the caller cancelled (not an API failure). */
export class FalQueueCancelledError extends Error {
    constructor() {
        super('Request cancelled');
        this.name = 'FalQueueCancelledError';
    }
}

/** The request did not complete within `timeoutMs`. */
export class FalQueueTimeoutError extends Error {
    constructor(timeoutMs: number) {
        super(`Request timed out after ${Math.round(timeoutMs / 60000)} minutes.`);
        this.name = 'FalQueueTimeoutError';
    }
}

export async function submitAndPollFalQueue({
    modelId,
    input,
    onStatus,
    pollInterval = 2000,
    shouldCancel,
    timeoutMs,
}: FalQueueOptions): Promise<FalQueueResult> {
    const submitResult = await fal.queue.submit(modelId, { input });
    const requestId = submitResult.request_id;
    console.log(`Request submitted. Request ID: ${requestId}`);
    onStatus(`Request submitted. Request ID: ${requestId}. Waiting for completion...`);

    const startedAt = Date.now();

    while (true) {
        if (shouldCancel?.()) {
            throw new FalQueueCancelledError();
        }
        if (timeoutMs !== undefined && Date.now() - startedAt > timeoutMs) {
            throw new FalQueueTimeoutError(timeoutMs);
        }

        const statusResult = await fal.queue.status(modelId, {
            requestId,
            logs: true,
        });
        if (shouldCancel?.()) {
            throw new FalQueueCancelledError();
        }
        console.log(`Status update for request ID ${requestId}:`, statusResult.status);

        if (statusResult.status === 'IN_QUEUE' || statusResult.status === 'IN_PROGRESS') {
            const logs = (statusResult as { logs?: Array<{ message: string }> }).logs;
            const latestLog = sanitizeLogMessage(logs?.length ? logs[logs.length - 1].message : '');
            onStatus(`Request is ${statusResult.status}: ${latestLog}`);
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
        } else if (statusResult.status === 'COMPLETED') {
            const result = await fal.queue.result(modelId, { requestId });
            console.log(`Request completed. Full result:`, result);
            return { data: result.data as Record<string, unknown> };
        } else {
            const status = (statusResult as { status: string }).status;
            throw new Error(`Request failed with status: ${status}`);
        }
    }
}
