/**
 * Bun proxy server for fal.ai API calls
 * Keeps API keys server-side and handles CORS for browser requests
 */

const FAL_API_KEY = process.env.FAL_API_KEY;
const PORT = 3001;

// Allowed fal.ai domains for security
const ALLOWED_HOSTS = [
    "api.fal.ai",
    "queue.fal.run",
    "fal.run",
    "storage.fal.ai",
    "gateway.fal.ai",
];

// CORS headers for browser requests
const corsHeaders = {
    "Access-Control-Allow-Origin": "http://localhost:3000",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-fal-target-url, x-fal-queue-priority, Authorization",
    "Access-Control-Max-Age": "86400",
};

function isAllowedHost(url: string): boolean {
    try {
        const { host } = new URL(url);
        return ALLOWED_HOSTS.some(allowed => host === allowed || host.endsWith(`.${allowed}`));
    } catch {
        return false;
    }
}

Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);

        // Debug logging for all requests
        console.log(`[Request] ${req.method} ${url.pathname} - Headers:`, Object.fromEntries(req.headers.entries()));

        // Handle CORS preflight requests
        if (req.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders,
            });
        }

        // Health check endpoint
        if (url.pathname === "/health") {
            return new Response(JSON.stringify({ status: "ok", hasApiKey: !!FAL_API_KEY }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Main proxy endpoint
        if (url.pathname === "/api/fal/proxy") {
            const targetUrl = req.headers.get("x-fal-target-url");

            // Validate target URL
            if (!targetUrl) {
                return new Response(
                    JSON.stringify({ error: "Missing x-fal-target-url header" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            if (!isAllowedHost(targetUrl)) {
                return new Response(
                    JSON.stringify({ error: "Target URL not allowed. Must be a fal.ai domain." }),
                    { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            if (!FAL_API_KEY) {
                return new Response(
                    JSON.stringify({ error: "FAL_API_KEY environment variable not set on server" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            try {
                // Forward headers from client, excluding hop-by-hop headers
                const forwardHeaders: HeadersInit = {
                    "Authorization": `Key ${FAL_API_KEY}`,
                };

                // Preserve content-type if present
                const contentType = req.headers.get("content-type");
                if (contentType) {
                    forwardHeaders["Content-Type"] = contentType;
                }

                // Get request body for non-GET methods
                let body: BodyInit | null = null;
                if (req.method !== "GET" && req.method !== "HEAD") {
                    body = await req.text();
                }

                console.log(`[Proxy] ${req.method} ${targetUrl}`);

                // Make request to fal.ai
                const response = await fetch(targetUrl, {
                    method: req.method,
                    headers: forwardHeaders,
                    body,
                });

                // Get response body
                const responseBody = await response.text();

                // Return response with CORS headers
                return new Response(responseBody, {
                    status: response.status,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": response.headers.get("Content-Type") || "application/json",
                    },
                });
            } catch (error) {
                console.error("[Proxy] Error:", error);
                const message = error instanceof Error ? error.message : "Unknown error";
                return new Response(
                    JSON.stringify({ error: `Proxy error: ${message}` }),
                    { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // OpenAI Images API proxy endpoint
        if (url.pathname === "/api/openai/images") {
            if (req.method !== "POST") {
                return new Response(
                    JSON.stringify({ error: "Method not allowed" }),
                    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            try {
                const body = await req.json();
                const { openai_api_key, ...imageParams } = body;

                if (!openai_api_key) {
                    return new Response(
                        JSON.stringify({ error: "Missing openai_api_key in request body" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                console.log(`[OpenAI] Generating image with model: ${imageParams.model}`);

                const response = await fetch("https://api.openai.com/v1/images/generations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${openai_api_key}`,
                    },
                    body: JSON.stringify(imageParams),
                });

                const responseBody = await response.text();

                return new Response(responseBody, {
                    status: response.status,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                });
            } catch (error) {
                console.error("[OpenAI] Error:", error);
                const message = error instanceof Error ? error.message : "Unknown error";
                return new Response(
                    JSON.stringify({ error: `OpenAI proxy error: ${message}` }),
                    { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // 404 for unknown routes
        return new Response(
            JSON.stringify({ error: "Not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    },
});

console.log(`Fal.ai proxy server running on http://localhost:${PORT}`);
console.log(`API key configured: ${FAL_API_KEY ? "Yes" : "No"}`);
