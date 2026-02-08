/**
 * OpenRouter OAuth PKCE authentication utilities
 * Handles the PKCE flow for obtaining user-specific API keys
 */

/**
 * Base64url-encode a Uint8Array (no +, /, or = characters)
 */
function base64UrlEncode(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Generate a cryptographically random code verifier (96 bytes, base64url-encoded)
 */
export function generateCodeVerifier(): string {
    const buffer = new Uint8Array(96);
    crypto.getRandomValues(buffer);
    return base64UrlEncode(buffer);
}

/**
 * Generate a SHA-256 code challenge from a code verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(hash));
}

const SESSION_KEY = 'OPENROUTER_CODE_VERIFIER';

/**
 * Initiate the OpenRouter OAuth PKCE login flow
 * Generates a code verifier, stores it in sessionStorage, and redirects to OpenRouter
 */
export async function initiateLogin(): Promise<void> {
    const verifier = generateCodeVerifier();
    sessionStorage.setItem(SESSION_KEY, verifier);

    const challenge = await generateCodeChallenge(verifier);
    const callbackUrl = window.location.origin;

    const authUrl = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}&code_challenge=${challenge}&code_challenge_method=S256`;
    window.location.href = authUrl;
}

/**
 * Handle the OAuth callback by exchanging the authorization code for an API key
 * Returns the API key string, or null if no code is present in the URL
 */
export async function handleCallback(): Promise<string | null> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) return null;

    const verifier = sessionStorage.getItem(SESSION_KEY);
    if (!verifier) {
        throw new Error('Missing code verifier. Please try logging in again.');
    }

    const response = await fetch('https://openrouter.ai/api/v1/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            code_verifier: verifier,
            code_challenge_method: 'S256',
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to exchange code for API key: ${errorText}`);
    }

    const data = await response.json();
    sessionStorage.removeItem(SESSION_KEY);

    // OpenRouter returns the key directly as a string
    return typeof data === 'string' ? data : data.key;
}
