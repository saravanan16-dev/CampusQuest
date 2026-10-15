const https = require("https");

const callPollinations = (messages, { jsonMode = false, systemPrompt = "" } = {}) => {
    return new Promise((resolve, reject) => {
        const fullMessages = [];
        if (systemPrompt) {
            fullMessages.push({ role: "system", content: systemPrompt });
        }
        fullMessages.push(...messages);

        const payload = JSON.stringify({
            messages: fullMessages,
            model: "openai",
            jsonMode: Boolean(jsonMode)
        });

        const req = https.request("https://text.pollinations.ai/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload)
            },
            timeout: 15000
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`API responded with status ${res.statusCode}: ${data.slice(0, 200)}`));
                }
            });
        });

        req.on("timeout", () => {
            req.destroy();
            reject(new Error("AI generation request timed out"));
        });

        req.on("error", (err) => {
            reject(err);
        });

        req.write(payload);
        req.end();
    });
};

const callGemini = async (apiKey, prompt) => {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        });
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const req = https.request(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload)
            },
            timeout: 15000
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) resolve(text);
                    else reject(new Error("Invalid Gemini response format"));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on("timeout", () => { req.destroy(); reject(new Error("Gemini timeout")); });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
};

/**
 * Universal text generation with automatic fallback
 */
const generateAnswer = async (prompt, { systemPrompt = "", jsonMode = false } = {}) => {
    // 1. Try Gemini if GEMINI_API_KEY is available
    if (process.env.GEMINI_API_KEY) {
        try {
            const combinedPrompt = systemPrompt ? `${systemPrompt}\n\nTask:\n${prompt}` : prompt;
            const res = await callGemini(process.env.GEMINI_API_KEY, combinedPrompt);
            if (res) return res;
        } catch (err) {
            console.warn("Gemini API call failed, falling back to free provider:", err.message);
        }
    }

    // 2. Free Pollinations AI (no key needed)
    try {
        const messages = [{ role: "user", content: prompt }];
        const res = await callPollinations(messages, { jsonMode, systemPrompt });
        if (res) return res;
    } catch (err) {
        console.warn("Free AI provider failed:", err.message);
        throw err;
    }
};

module.exports = {
    generateAnswer,
    callPollinations
};
