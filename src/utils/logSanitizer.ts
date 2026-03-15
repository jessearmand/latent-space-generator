/**
 * Sanitizes log messages from fal.ai API that may contain
 * ANSI escape codes and control characters.
 *
 * The "A" character appearing in status messages is typically
 * from `\x1b[A` (ANSI cursor-up escape code) used by progress
 * libraries like tqdm.
 */
// Regex patterns to match ANSI and control characters.
// Unicode escapes preserve intent without embedding raw control characters.
// oxlint-disable-next-line no-control-regex -- This regex intentionally matches ANSI escape prefixes from external progress output.
const ANSI_ESCAPE_REGEX = /\u001B\[[0-9;]*[A-Za-z]/g;
// oxlint-disable-next-line no-control-regex -- This regex intentionally strips ASCII control characters except newlines.
const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export function sanitizeLogMessage(message: string): string {
    if (!message) return 'Processing...';

    return (
        message
            // Remove ANSI escape sequences (cursor movement, colors, etc.)
            .replace(ANSI_ESCAPE_REGEX, '')
            // Remove control characters except newlines
            .replace(CONTROL_CHAR_REGEX, '')
            // Normalize line endings
            .replace(/\r\n?/g, '\n')
            .trim() || 'Processing...'
    );
}
