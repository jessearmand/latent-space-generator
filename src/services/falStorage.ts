import { fal } from '@fal-ai/client';

/**
 * Upload local files to fal storage in parallel, returning their public URLs
 * in the same order. Shared by the generation hooks so upload behavior
 * (parallelism, future retries or size checks) lives in one place.
 */
export async function uploadFilesToFalStorage(files: File[]): Promise<string[]> {
    return Promise.all(files.map((file) => fal.storage.upload(file)));
}
