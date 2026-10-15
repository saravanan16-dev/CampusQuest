const http = require("http");
const jwt = require("../node_modules/jsonwebtoken");

const token = jwt.sign(
    { id: 1, email: "student@campusquest.test", role: "STUDENT" },
    process.env.JWT_SECRET || "campusquest_super_secret_jwt_key_2026_dev_prod",
    { expiresIn: "1h" }
);

function makeRequest(path, method, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request({
            hostname: "localhost",
            port: 5000,
            path: path,
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "Content-Length": Buffer.byteLength(payload)
            },
            timeout: 45000
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timed out"));
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log("Waiting 2s for server startup...");
    await new Promise(r => setTimeout(r, 2000));

    console.log("\n================ TEST 1: Ask AI Assistant ================");
    const res1 = await makeRequest("/ai/ask", "POST", {
        question: "Explain the difference between B-Tree and B+ Tree in database index structures.",
        subject: "Database Management Systems"
    });
    console.log("Status:", res1.status);
    console.log("Provider:", res1.body?.data?.provider);
    console.log("Answer Preview:\n", (res1.body?.data?.answer || "").slice(0, 450));
    console.log("\nTotal Answer Length:", (res1.body?.data?.answer || "").length);

    console.log("\n================ TEST 2: Explain Concept ================");
    const res2 = await makeRequest("/ai/explain-concept", "POST", {
        concept: "Dijkstras Algorithm",
        subject: "Design and Analysis of Algorithms"
    });
    console.log("Status:", res2.status);
    console.log("AI Generated:", res2.body?.data?.ai_generated);
    console.log("Provider:", res2.body?.data?.provider);
    console.log("Definition:", res2.body?.data?.definition);
    console.log("Key Points:", res2.body?.data?.key_points);
}

runTests().catch(console.error);
