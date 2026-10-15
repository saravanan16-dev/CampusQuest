const http = require("http");

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            const chunks = [];
            res.on("data", chunk => chunks.push(chunk));
            res.on("end", () => {
                const buffer = Buffer.concat(chunks);
                let json = null;
                try {
                    json = JSON.parse(buffer.toString("utf8"));
                } catch (e) {}
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: json,
                    rawBuffer: buffer
                });
            });
        });
        req.on("error", reject);
        if (data) {
            req.write(typeof data === "string" ? data : JSON.stringify(data));
        }
        req.end();
    });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

async function run() {
    console.log("==================================================");
    console.log("   CAMPUSQUEST AI ASSISTANT FREE API TESTS        ");
    console.log("==================================================");

    // 1. Authenticate Student
    console.log("\n1. Authenticating student user...");
    const studentLogin = await request({
        host: "localhost",
        port: 5000,
        path: "/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: "student@campusquest.com", password: "Student@123" });
    assert(studentLogin.statusCode === 200, "Student login failed");
    const studentData = studentLogin.body.data || studentLogin.body;
    const studentToken = studentData.token;
    console.log(`  Student authenticated: ${studentData.user.name}`);

    // 2. Test POST /ai/ask (Free AI Question Generation)
    console.log("\n2. Testing POST /ai/ask (Free AI Answer Generation)...");
    const askRes = await request({
        host: "localhost",
        port: 5000,
        path: "/ai/ask",
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        question: "Why does QuickSort have an average time complexity of O(n log n)?",
        subject_name: "Data Structures & Algorithms"
    });
    assert(askRes.statusCode === 200, `POST /ai/ask failed with status ${askRes.statusCode}`);
    const askData = askRes.body.data;
    assert(askData && askData.answer && askData.answer.length > 20, "AI did not return a valid answer string");
    console.log(`  Provider: ${askData.provider}`);
    console.log(`  Generated Answer preview: "${askData.answer.slice(0, 120)}..."`);

    // 3. Test POST /ai/explain-concept with free AI
    console.log("\n3. Testing POST /ai/explain-concept (Dynamic AI Concept Breakdown)...");
    const conceptRes = await request({
        host: "localhost",
        port: 5000,
        path: "/ai/explain-concept",
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        concept: "Dijkstra Shortest Path Algorithm",
        subject_name: "Data Structures & Algorithms"
    });
    assert(conceptRes.statusCode === 200, `POST /ai/explain-concept failed with status ${conceptRes.statusCode}`);
    const conceptData = conceptRes.body.data;
    assert(conceptData.concept && conceptData.definition, "Missing concept or definition");
    assert(Array.isArray(conceptData.key_points) && conceptData.key_points.length > 0, "Missing key_points");
    console.log(`  Concept: ${conceptData.concept}`);
    console.log(`  Definition: ${conceptData.definition.slice(0, 100)}...`);
    console.log(`  Key Points Count: ${conceptData.key_points.length}`);
    console.log(`  Exam Tip: ${conceptData.exam_tip ? conceptData.exam_tip.slice(0, 80) : "N/A"}...`);

    // 4. Test POST /ai/explain-wrong-answer with free AI
    console.log("\n4. Testing POST /ai/explain-wrong-answer...");
    const wrongRes = await request({
        host: "localhost",
        port: 5000,
        path: "/ai/explain-wrong-answer",
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        question_text: "What is the worst-case time complexity of QuickSort?",
        selected_answer: "O(log n)",
        correct_answer: "O(n^2)",
        explanation: "When the pivot chosen is consistently the smallest or largest element, partitioning produces unbalanced subproblems leading to O(n^2)."
    });
    assert(wrongRes.statusCode === 200, `POST /ai/explain-wrong-answer failed`);
    const wrongData = wrongRes.body.data;
    assert(wrongData.why_incorrect && wrongData.concept_breakdown, "Missing pedagogical explanation fields");
    console.log(`  Why Incorrect: ${wrongData.why_incorrect.slice(0, 100)}...`);
    console.log(`  Concept Breakdown: ${wrongData.concept_breakdown.slice(0, 100)}...`);

    // 5. Test GET /ai/recommendations
    console.log("\n5. Testing GET /ai/recommendations...");
    const recRes = await request({
        host: "localhost",
        port: 5000,
        path: "/ai/recommendations",
        method: "GET",
        headers: { "Authorization": `Bearer ${studentToken}` }
    });
    assert(recRes.statusCode === 200, "Get recommendations failed");
    const recData = recRes.body.data;
    assert(recData.advice, "Missing advice");
    console.log(`  Personalized Advice: "${recData.advice.slice(0, 90)}..."`);

    // 6. Test GET /ai/exam-intelligence/:subjectId
    console.log("\n6. Testing GET /ai/exam-intelligence/8...");
    const intelRes = await request({
        host: "localhost",
        port: 5000,
        path: "/ai/exam-intelligence/8",
        method: "GET"
    });
    assert(intelRes.statusCode === 200, "Exam intelligence failed");
    const intelData = intelRes.body.data;
    assert(intelData.subject, "Missing subject name");
    console.log(`  Exam Intelligence Subject: ${intelData.subject}`);
    console.log(`  PYQs Analyzed: ${intelData.total_pyqs_analyzed}`);

    console.log("\n==================================================");
    console.log("   ALL AI ASSISTANT FREE API TESTS PASSED 100%!  ");
    console.log("==================================================\n");
}

run().catch(err => {
    console.error("\n❌ TEST FAILED:", err);
    process.exit(1);
});
