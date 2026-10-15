/**
 * freeAiProvider.js
 * Multi-provider AI engine with automatic fallback and retry chain:
 *   1. Google Gemini 1.5 Flash (if GEMINI_API_KEY set)
 *   2. Groq LLaMA 3.3 70B (if GROQ_API_KEY set)
 *   3. OpenRouter (if OPENROUTER_API_KEY set)
 *   4. Free Pollinations AI ("openai-fast" model with automated 402-concurrency retry)
 */

const https = require("https");

// ── HTTPS helpers ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const httpsPost = (urlStr, headers, body, timeoutMs = 35000) => {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
                ...headers
            },
            timeout: timeoutMs
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ statusCode: res.statusCode, data });
                } else {
                    const err = new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`);
                    err.statusCode = res.statusCode;
                    err.data = data;
                    reject(err);
                }
            });
        });

        req.on("timeout", () => {
            req.destroy();
            reject(new Error(`Request timed out after ${timeoutMs}ms`));
        });

        req.on("error", reject);
        req.write(body);
        req.end();
    });
};

const extractOpenAIText = (rawJson) => {
    const parsed = JSON.parse(rawJson);
    const text = parsed?.choices?.[0]?.message?.content;
    if (!text) throw new Error("No choices in OpenAI-compatible response");
    return text.trim();
};

// ── Providers ─────────────────────────────────────────────────────────────────

/**
 * Google Gemini 1.5 Flash (Free tier at https://aistudio.google.com/app/apikey)
 */
const callGemini = async (apiKey, systemPrompt, userPrompt) => {
    const contents = [];
    if (systemPrompt) {
        contents.push({ role: "user", parts: [{ text: systemPrompt }] });
        contents.push({ role: "model", parts: [{ text: "Understood. I will act as the requested engineering mentor." }] });
    }
    contents.push({ role: "user", parts: [{ text: userPrompt }] });

    const payload = JSON.stringify({
        contents,
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2500
        }
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await httpsPost(url, {}, payload, 30000);
    const parsed = JSON.parse(res.data);
    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty Gemini response");
    return text.trim();
};

/**
 * Groq (Free tier at https://console.groq.com - LLaMA 3.3 70B)
 */
const callGroq = async (apiKey, systemPrompt, userPrompt) => {
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: userPrompt });

    const payload = JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.3,
        max_tokens: 2500
    });

    const res = await httpsPost(
        "https://api.groq.com/openai/v1/chat/completions",
        { Authorization: `Bearer ${apiKey}` },
        payload,
        30000
    );
    return extractOpenAIText(res.data);
};

/**
 * OpenRouter Free Models (https://openrouter.ai)
 */
const callOpenRouter = async (apiKey, systemPrompt, userPrompt) => {
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: userPrompt });

    const payload = JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages,
        temperature: 0.3,
        max_tokens: 2500
    });

    const res = await httpsPost(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://campusquest.edu",
            "X-Title": "CampusQuest"
        },
        payload,
        35000
    );
    return extractOpenAIText(res.data);
};

/**
 * Free Pollinations AI ("openai-fast" model with automatic retry on 402 throttling)
 */
const callPollinationsWithRetry = async (systemPrompt, userPrompt, maxRetries = 2) => {
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: userPrompt });

    const payload = JSON.stringify({
        messages,
        model: "openai-fast",
        seed: Math.floor(Math.random() * 100000)
    });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const res = await httpsPost("https://text.pollinations.ai/", {}, payload, 35000);
            if (res.data && res.data.trim().length > 10) {
                return res.data.trim();
            }
        } catch (err) {
            if (err.statusCode === 402 && attempt < maxRetries) {
                const waitTime = (attempt + 1) * 2500;
                console.log(`[AI Provider] Free AI busy/rate-limited (HTTP 402). Waiting ${waitTime}ms and retrying...`);
                await sleep(waitTime);
                continue;
            }
            if (attempt >= maxRetries) {
                throw err;
            }
        }
    }
    throw new Error("Free AI provider exhausted all retry attempts");
};

// ── Universal Generation Entrypoint ──────────────────────────────────────────

const generateAnswer = async (userPrompt, { systemPrompt = "", jsonMode = false } = {}) => {
    let finalPrompt = userPrompt;
    let finalSystemPrompt = systemPrompt;

    if (jsonMode) {
        finalPrompt += "\n\nCRITICAL: Respond ONLY with a valid JSON object. Do not wrap in markdown or add explanations.";
    }

    // 1. Google Gemini
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
        try {
            console.log("[AI] Routing request to Google Gemini 1.5 Flash...");
            const res = await callGemini(process.env.GEMINI_API_KEY.trim(), finalSystemPrompt, finalPrompt);
            if (res) return { text: res, provider: "Google Gemini 1.5 Flash" };
        } catch (err) {
            console.warn("[AI] Gemini failed:", err.message);
        }
    }

    // 2. Groq
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
        try {
            console.log("[AI] Routing request to Groq (LLaMA 3.3 70B)...");
            const res = await callGroq(process.env.GROQ_API_KEY.trim(), finalSystemPrompt, finalPrompt);
            if (res) return { text: res, provider: "Groq (LLaMA 3.3 70B)" };
        } catch (err) {
            console.warn("[AI] Groq failed:", err.message);
        }
    }

    // 3. OpenRouter
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim()) {
        try {
            console.log("[AI] Routing request to OpenRouter...");
            const res = await callOpenRouter(process.env.OPENROUTER_API_KEY.trim(), finalSystemPrompt, finalPrompt);
            if (res) return { text: res, provider: "OpenRouter AI" };
        } catch (err) {
            console.warn("[AI] OpenRouter failed:", err.message);
        }
    }

    // 4. Free AI Engine (openai-fast with retry)
    try {
        console.log("[AI] Routing request to Free AI Engine (openai-fast)...");
        const res = await callPollinationsWithRetry(finalSystemPrompt, finalPrompt, 2);
        if (res) return { text: res, provider: "Free AI Engine (GPT-OSS 20B)" };
    } catch (err) {
        console.warn("[AI] Free AI Engine failed:", err.message);
        throw err;
    }
};

const getAvailableProviders = () => {
    const list = [];
    if (process.env.GEMINI_API_KEY?.trim()) list.push("Google Gemini 1.5 Flash");
    if (process.env.GROQ_API_KEY?.trim()) list.push("Groq LLaMA 3.3 70B");
    if (process.env.OPENROUTER_API_KEY?.trim()) list.push("OpenRouter");
    list.push("Free AI Engine (GPT-OSS 20B)");
    return list;
};

module.exports = {
    generateAnswer,
    callGemini,
    callGroq,
    callOpenRouter,
    callPollinations: callPollinationsWithRetry,
    getAvailableProviders
};
