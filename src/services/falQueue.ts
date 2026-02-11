import { fal } from '@fal-ai/client';
import { sanitizeLogMessage } from '../utils/logSanitizer';

export interface FalQueueOptions {
    modelId: string;
    input: Record<string, unknown>;
    onStatus: (message: string) => void;
    pollInterval?: number;
}

export interface FalQueueResult {
    data: Record<string, unknown>;
}

export async function submitAndPollFalQueue({
    modelId,
    input,
    onStatus,
    pollInterval = 2000,
}: FalQueueOptions): Promise<FalQueueResult> {
    const submitResult = await fal.queue.submit(modelId, { input });
    const requestId = submitResult.request_id;
    console.log(`Request submitted. Request ID: ${requestId}`);
    onStatus(`Request submitted. Request ID: ${requestId}. Waiting for completion...`);

    while (true) {
        const statusResult = await fal.queue.status(modelId, {
            requestId,
            logs: true,
        });
        console.log(`Status update for request ID ${requestId}:`, statusResult.status);

        if (statusResult.status === "IN_QUEUE" || statusResult.status === "IN_PROGRESS") {
            const logs = (statusResult as { logs?: Array<{ message: string }> }).logs;
            const latestLog = sanitizeLogMessage(logs?.length ? logs[logs.length - 1].message : '');
            onStatus(`Request is ${statusResult.status}: ${latestLog}`);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        } else if (statusResult.status === "COMPLETED") {
            const result = await fal.queue.result(modelId, { requestId });
            console.log(`Request completed. Full result:`, result);
            return { data: result.data as Record<string, unknown> };
        } else {
            const status = (statusResult as { status: string }).status;
            throw new Error(`Request failed with status: ${status}`);
        }
    }
}
