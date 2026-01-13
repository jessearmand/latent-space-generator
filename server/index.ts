/**
 * Bun proxy server for fal.ai and OpenRouter API calls
 * Keeps API keys server-side and handles CORS for browser requests
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

const FAL_API_KEY = process.env.FAL_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PORT = 3001;

// Base system prompt for image generation prompt optimization
const PROMPT_OPTIMIZATION_BASE = `Focus on crafting prompts for image or video generation models like FLUX, SDXL, Stable Diffusion, Qwen, Z-image, WAN, GPT, Gemini and many more.
Your task is to enhance the user's prompt to produce better image results.

Guidelines:
1. Expand on the visual description with specific details about lighting, composition, style, and mood
2. Add relevant artistic style references (e.g., "cinematic lighting", "hyperrealistic", "digital art")
3. Include technical photography terms when appropriate (e.g., "shallow depth of field", "golden hour")
4. Maintain the core intent of the original prompt
5. Keep the enhanced prompt concise but descriptive (typically 1-3 sentences)
6. Avoid negative prompts or instructions - focus only on what should be in the image
7. Do not include any explanations or commentary - output only the enhanced prompt`;

// Format-specific output instructions
const FORMAT_INSTRUCTIONS = {
    plain: "",
    json: `

Output Format:
Return a valid JSON object with the following structure:
{
  "prompt": "the enhanced prompt text",
  "style": "detected or suggested artistic style",
  "keywords": ["key", "visual", "elements"]
}
Output ONLY the JSON object, no markdown code blocks or additional text.`,
    xml: `

Output Format:
Return valid XML with the following structure:
<optimized_prompt>
  <prompt>the enhanced prompt text</prompt>
  <style>detected or suggested artistic style</style>
  <keywords>
    <keyword>key</keyword>
    <keyword>visual</keyword>
    <keyword>elements</keyword>
  </keywords>
</optimized_prompt>
Output ONLY the XML, no markdown code blocks or additional text.`,
};

type PromptFormat = keyof typeof FORMAT_INSTRUCTIONS;

function buildSystemPrompt(format: PromptFormat = "plain"): string {
    return PROMPT_OPTIMIZATION_BASE + (FORMAT_INSTRUCTIONS[format] || "");
}

// Regex to validate fal.ai domains (matches official fal proxy implementation)
// Allows: fal.run, fal.ai, fal.dev and any subdomain (*.fal.run, *.fal.ai, *.fal.dev)
const FAL_URL_REG_EXP = /(\.|^)fal\.(run|ai|dev)$/;

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
        return FAL_URL_REG_EXP.test(host);
    } catch {
        return false;
    }
}

Bun.serve({
    port: PORT,
    // Increase idle timeout for streaming responses (default is 10s)
    idleTimeout: 120, // 2 minutes
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

        // OpenRouter Models API proxy endpoint
        if (url.pathname === "/api/openrouter/models") {
            if (req.method !== "GET") {
                return new Response(
                    JSON.stringify({ error: "Method not allowed" }),
                    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            if (!OPENROUTER_API_KEY) {
                return new Response(
                    JSON.stringify({ error: "OPENROUTER_API_KEY environment variable not set on server" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            try {
                console.log("[OpenRouter] Fetching user models");

                const response = await fetch("https://openrouter.ai/api/v1/models/user", {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://github.com/jessearmand/fal-generator-ts",
                        "X-Title": "fal-generator-ts",
                    },
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
                console.error("[OpenRouter] Error fetching models:", error);
                const message = error instanceof Error ? error.message : "Unknown error";
                return new Response(
                    JSON.stringify({ error: `OpenRouter models error: ${message}` }),
                    { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // OpenRouter Completion API endpoint (streaming with Vercel AI SDK)
        if (url.pathname === "/api/openrouter/completion") {
            if (req.method !== "POST") {
                return new Response(
                    JSON.stringify({ error: "Method not allowed" }),
                    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            if (!OPENROUTER_API_KEY) {
                return new Response(
                    JSON.stringify({ error: "OPENROUTER_API_KEY environment variable not set on server" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            try {
                const body = await req.json();
                const { prompt, model, format = "plain" } = body;

                if (!prompt) {
                    return new Response(
                        JSON.stringify({ error: "Missing prompt in request body" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                if (!model) {
                    return new Response(
                        JSON.stringify({ error: "Missing model in request body" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Validate format
                const validFormat = (["plain", "json", "xml"].includes(format) ? format : "plain") as PromptFormat;
                const systemPrompt = buildSystemPrompt(validFormat);

                console.log(`[OpenRouter] Streaming completion with model: ${model}, format: ${validFormat}`);

                const openrouter = createOpenRouter({
                    apiKey: OPENROUTER_API_KEY,
                    headers: {
                        "HTTP-Referer": "https://github.com/jessearmand/fal-generator-ts",
                        "X-Title": "fal-generator-ts",
                    },
                });

                const result = streamText({
                    model: openrouter(model),
                    system: systemPrompt,
                    prompt: prompt,
                });

                // Return streaming response compatible with useCompletion hook
                // toTextStreamResponse() for plain text streaming (useCompletion)
                // toDataStreamResponse() is for structured data streaming (useChat)
                const response = result.toTextStreamResponse();

                // Add CORS headers to the streaming response
                const headers = new Headers(response.headers);
                Object.entries(corsHeaders).forEach(([key, value]) => {
                    headers.set(key, value);
                });

                return new Response(response.body, {
                    status: response.status,
                    headers,
                });
            } catch (error) {
                console.error("[OpenRouter] Error:", error);
                const message = error instanceof Error ? error.message : "Unknown error";
                return new Response(
                    JSON.stringify({ error: `OpenRouter completion error: ${message}` }),
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

console.log(`Proxy server running on http://localhost:${PORT}`);
console.log(`FAL_API_KEY configured: ${FAL_API_KEY ? "Yes" : "No"}`);
console.log(`OPENROUTER_API_KEY configured: ${OPENROUTER_API_KEY ? "Yes" : "No"}`);
