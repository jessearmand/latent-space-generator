/**
 * Error parsing utilities for fal.ai API responses
 */

/**
 * Structure of a fal.ai validation error detail item
 */
interface FalValidationErrorDetail {
    loc: string[];
    msg: string;
    type: string;
    ctx?: Record<string, unknown>;
}

/**
 * Structure of a fal.ai validation error response
 */
interface FalValidationErrorResponse {
    detail: FalValidationErrorDetail[];
}

/**
 * Checks if an error body matches the fal.ai validation error format
 */
function isFalValidationError(body: unknown): body is FalValidationErrorResponse {
    if (typeof body !== 'object' || body === null) return false;
    const obj = body as Record<string, unknown>;
    if (!Array.isArray(obj.detail)) return false;
    return obj.detail.every((item: unknown) => {
        if (typeof item !== 'object' || item === null) return false;
        const detail = item as Record<string, unknown>;
        return Array.isArray(detail.loc) && typeof detail.msg === 'string';
    });
}

/**
 * Formats a single validation error detail into a user-friendly message
 */
function formatValidationDetail(detail: FalValidationErrorDetail): string {
    // Get the field name from loc (e.g., ["body", "safety_tolerance"] -> "safety_tolerance")
    const fieldName = detail.loc.length > 1 ? detail.loc[detail.loc.length - 1] : detail.loc[0] || 'unknown';
    return `${fieldName}: ${detail.msg}`;
}

/**
 * Parses a fal.ai error response and returns a user-friendly error message
 *
 * @param error - The error object from the fal.ai client
 * @returns A formatted error message string
 */
export function parseFalError(error: unknown): string {
    // Handle fal.ai client errors which may have a body property
    if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;

        // Try to get the response body from various possible locations
        let body: unknown = null;

        // fal.ai client may expose the error body directly
        if ('body' in errorObj && errorObj.body) {
            body = errorObj.body;
        }

        // Or it might be nested in a response
        if ('response' in errorObj && typeof errorObj.response === 'object' && errorObj.response !== null) {
            const response = errorObj.response as Record<string, unknown>;
            if ('body' in response) {
                body = response.body;
            }
        }

        // Check if we have a validation error format
        if (isFalValidationError(body)) {
            const messages = body.detail.map(formatValidationDetail);
            if (messages.length === 1) {
                return `Invalid parameter - ${messages[0]}`;
            }
            return `Invalid parameters:\n${messages.map(m => `• ${m}`).join('\n')}`;
        }

        // Handle string body (might be JSON string)
        if (typeof body === 'string') {
            try {
                const parsed = JSON.parse(body);
                if (isFalValidationError(parsed)) {
                    const messages = parsed.detail.map(formatValidationDetail);
                    if (messages.length === 1) {
                        return `Invalid parameter - ${messages[0]}`;
                    }
                    return `Invalid parameters:\n${messages.map(m => `• ${m}`).join('\n')}`;
                }
            } catch {
                // Not JSON, use as-is
            }
        }

        // Check if the error message itself contains JSON
        if (error instanceof Error && error.message) {
            try {
                // Sometimes the error message contains the JSON response
                const jsonMatch = error.message.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (isFalValidationError(parsed)) {
                        const messages = parsed.detail.map(formatValidationDetail);
                        if (messages.length === 1) {
                            return `Invalid parameter - ${messages[0]}`;
                        }
                        return `Invalid parameters:\n${messages.map(m => `• ${m}`).join('\n')}`;
                    }
                }
            } catch {
                // Not valid JSON in message
            }
        }
    }

    // Fall back to standard error message
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}
