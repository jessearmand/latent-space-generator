/**
 * Bun proxy server for fal.ai and OpenRouter API calls
 * Keeps API keys server-side and handles CORS for browser requests
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

const FAL_API_KEY = process.env.FAL_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = 3001;

// Base system prompt for image generation prompt optimization
const PROMPT_OPTIMIZATION_BASE = `Focus on crafting prompts for image or video generation models like FLUX, LTX, Kling, Veo, Hunyuan, SDXL, Stable Diffusion, Qwen, Z-image, WAN, GPT, Gemini and many more.
Your task is to enhance the user's prompt to produce better image or video scene.

Guidelines:
1. Expand on the visual description with specific details about lighting, composition, style, and mood
2. Add relevant artistic style references (e.g., "cinematic lighting", "hyperrealistic", "digital art")
3. Include technical photography terms when appropriate (e.g., "shallow depth of field", "golden hour")
4. Include technical videography terms when appropriate (e.g., "wide angle lens", "slow motion")
5. Maintain the core intent of the original prompt
6. Keep the enhanced prompt concise but descriptive (typically 1-3 sentences)
7. Avoid negative prompts or instructions - focus only on what should be in the image
8. Do not include any explanations or commentary - output only the enhanced prompt`;

// Format-specific output instructions
const FORMAT_INSTRUCTIONS = {
    plain: "",
    json: `

Output Format:
Return a valid JSON object with the following structure:
{
  "prompt": "the enhanced prompt text",
  "subject": "subject in the scene",
  "background": "background in the scene",
  "camera": "camera settings",
  "style": "detected or suggested artistic style",
  "visual": "visual elements"
}
Output ONLY the JSON object, no markdown code blocks or additional text.`,
    xml: `

Output Format:
Return valid XML with the following structure:
<optimized_prompt>
  <prompt>the enhanced prompt text</prompt>
  <subject>subject in the scene</subject>
  <background>background in the scene</background>
  <camera>camera settings</camera>
  <style>detected or suggested artistic style</style>
  <visual>visual elements</visual>
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

        // Health check endpoint (under /api/ so Vite proxy forwards it)
        if (url.pathname === "/health" || url.pathname === "/api/health") {
            return new Response(JSON.stringify({
                status: "ok",
                keys: {
                    fal: !!FAL_API_KEY,
                    openai: !!OPENAI_API_KEY,
                    openrouter: !!OPENROUTER_API_KEY,
                },
            }), {
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
                if (!OPENAI_API_KEY) {
                    return new Response(
                        JSON.stringify({ error: "OPENAI_API_KEY environment variable not set on server" }),
                        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const imageParams = await req.json();

                // Whitelist only fields supported by the OpenAI Images API
                const payload: Record<string, unknown> = {
                    model: imageParams.model,
                    prompt: imageParams.prompt,
                };
                if (imageParams.size) payload.size = imageParams.size;
                if (imageParams.quality) payload.quality = imageParams.quality;
                if (imageParams.background) payload.background = imageParams.background;
                if (imageParams.n) payload.n = imageParams.n;
                if (imageParams.output_format) payload.output_format = imageParams.output_format;
                if (imageParams.style) payload.style = imageParams.style;
                if (imageParams.response_format) payload.response_format = imageParams.response_format;
                if (imageParams.user) payload.user = imageParams.user;

                console.log(`[OpenAI] Generating image with model: ${payload.model}`);

                const response = await fetch("https://api.openai.com/v1/images/generations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify(payload),
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

            // Use client-provided OAuth key (via Authorization header) or fall back to server env var
            const authHeader = req.headers.get("authorization");
            const userKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
            const apiKey = userKey || OPENROUTER_API_KEY;

            if (!apiKey) {
                return new Response(
                    JSON.stringify({ error: "No API key available. Please log in with OpenRouter or set OPENROUTER_API_KEY." }),
                    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            try {
                console.log(`[OpenRouter] Fetching user models (source: ${userKey ? "user OAuth" : "server key"})`);

                const response = await fetch("https://openrouter.ai/api/v1/models/user", {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://github.com/jessearmand/latent-space-generator",
                        "X-Title": "latent-space-generator",
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

            try {
                const body = await req.json();
                const { prompt, model, format = "plain", openrouter_user_key } = body;

                // Use user's OAuth key if provided, otherwise fall back to server key
                const apiKey = openrouter_user_key || OPENROUTER_API_KEY;

                if (!apiKey) {
                    return new Response(
                        JSON.stringify({ error: "No API key available. Please log in with OpenRouter or set OPENROUTER_API_KEY." }),
                        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

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
                    apiKey,
                    headers: {
                        "HTTP-Referer": "https://github.com/jessearmand/latent-space-generator",
                        "X-Title": "latent-space-generator",
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

        // OpenRouter Image Generation API endpoint
        if (url.pathname === "/api/openrouter/images") {
            if (req.method !== "POST") {
                return new Response(
                    JSON.stringify({ error: "Method not allowed" }),
                    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            try {
                const body = await req.json();
                const { model, prompt, openrouter_user_key, image_config } = body;

                const apiKey = openrouter_user_key || OPENROUTER_API_KEY;

                if (!apiKey) {
                    return new Response(
                        JSON.stringify({ error: "No API key available. Please log in with OpenRouter or set OPENROUTER_API_KEY." }),
                        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                if (!prompt || !model) {
                    return new Response(
                        JSON.stringify({ error: "Missing prompt or model in request body" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                console.log(`[OpenRouter Images] Generating image with model: ${model}`);

                // Build request body for OpenRouter chat completions with image modality
                // GPT models need plain string content; Gemini handles both formats
                const requestBody: Record<string, unknown> = {
                    model,
                    modalities: ["image", "text"],
                    messages: [
                        { role: "user", content: prompt },
                    ],
                };

                // Add image config for models that support it (e.g. Gemini)
                if (image_config) {
                    if (image_config.aspect_ratio) {
                        requestBody.aspect_ratio = image_config.aspect_ratio;
                    }
                    if (image_config.image_size) {
                        requestBody.image_size = image_config.image_size;
                    }
                }

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`,
                        "HTTP-Referer": "https://github.com/jessearmand/latent-space-generator",
                        "X-Title": "latent-space-generator",
                    },
                    body: JSON.stringify(requestBody),
                });

                const responseData = await response.json();

                if (!response.ok) {
                    const errorMsg = responseData?.error?.message || `OpenRouter API error: ${response.status}`;
                    return new Response(
                        JSON.stringify({ error: errorMsg }),
                        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Extract base64 image from OpenRouter response
                // Response format: choices[0].message.images[].image_url.url
                const choices = responseData?.choices;
                if (!choices?.length) {
                    return new Response(
                        JSON.stringify({ error: "No choices in OpenRouter response" }),
                        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const message = choices[0]?.message;
                let b64Json: string | null = null;

                // Primary path: images are in message.images[]
                if (Array.isArray(message?.images) && message.images.length > 0) {
                    const imagePart = message.images[0];
                    const dataUrl = imagePart?.image_url?.url;
                    if (dataUrl) {
                        // Strip data:image/...;base64, prefix if present
                        const base64Match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
                        b64Json = base64Match ? base64Match[1] : dataUrl;
                    }
                }

                // Fallback: check message.content array for image_url parts
                if (!b64Json && Array.isArray(message?.content)) {
                    const imagePart = message.content.find(
                        (part: { type: string }) => part.type === "image_url"
                    );
                    if (imagePart?.image_url?.url) {
                        const dataUrl = imagePart.image_url.url;
                        const base64Match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
                        b64Json = base64Match ? base64Match[1] : dataUrl;
                    }
                }

                if (!b64Json) {
                    console.error("[OpenRouter Images] Could not extract image from response:", JSON.stringify(responseData).substring(0, 500));
                    return new Response(
                        JSON.stringify({ error: "No image data found in OpenRouter response" }),
                        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Return normalized format matching OpenAI proxy response shape
                return new Response(
                    JSON.stringify({
                        created: Math.floor(Date.now() / 1000),
                        data: [{ b64_json: b64Json }],
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            } catch (error) {
                console.error("[OpenRouter Images] Error:", error);
                const message = error instanceof Error ? error.message : "Unknown error";
                return new Response(
                    JSON.stringify({ error: `OpenRouter image generation error: ${message}` }),
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
console.log(`OPENAI_API_KEY configured: ${OPENAI_API_KEY ? "Yes" : "No"}`);
