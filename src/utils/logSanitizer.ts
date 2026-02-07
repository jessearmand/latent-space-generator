/**
 * Sanitizes log messages from fal.ai API that may contain
 * ANSI escape codes and control characters.
 *
 * The "A" character appearing in status messages is typically
 * from `\x1b[A` (ANSI cursor-up escape code) used by progress
 * libraries like tqdm.
 */
// Regex patterns to match control characters - these are intentional
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching ANSI escape sequences
const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*[A-Za-z]/g;
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching control characters
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;

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
