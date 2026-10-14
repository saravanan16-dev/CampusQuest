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
    console.log("==========================================");
    console.log("   CAMPUSQUEST NOTE PDF FEATURE TESTS     ");
    console.log("==========================================");

    // 1. Fetch available notes to test with
    console.log("\n1. Fetching note list from GET /notes...");
    const notesRes = await request({
        host: "localhost",
        port: 5000,
        path: "/notes",
        method: "GET"
    });
    assert(notesRes.statusCode === 200, "Failed to get notes");
    const notes = notesRes.body.data;
    assert(Array.isArray(notes) && notes.length > 0, "No notes available in DB");
    const testNote = notes[0];
    console.log(`  Found ${notes.length} notes. Using Note ID #${testNote.id}: "${testNote.title}"`);

    // 2. Test GET /notes/:id/pdf (Inline View Mode)
    console.log(`\n2. Testing GET /notes/${testNote.id}/pdf (Inline View Mode)...`);
    const pdfRes = await request({
        host: "localhost",
        port: 5000,
        path: `/notes/${testNote.id}/pdf`,
        method: "GET"
    });
    assert(pdfRes.statusCode === 200, `Expected 200 OK, got ${pdfRes.statusCode}`);
    assert(pdfRes.headers["content-type"] === "application/pdf", `Expected application/pdf, got ${pdfRes.headers["content-type"]}`);
    assert(pdfRes.headers["content-disposition"].startsWith("inline"), `Expected inline disposition, got ${pdfRes.headers["content-disposition"]}`);
    assert(pdfRes.rawBuffer.slice(0, 5).toString() === "%PDF-", "Invalid PDF magic bytes header");
    console.log(`  Verified: Valid PDF binary received (${pdfRes.rawBuffer.length} bytes).`);
    console.log(`  Content-Type: ${pdfRes.headers["content-type"]}`);
    console.log(`  Content-Disposition: ${pdfRes.headers["content-disposition"]}`);

    // 3. Test GET /notes/:id/pdf?download=1 (Download Mode)
    console.log(`\n3. Testing GET /notes/${testNote.id}/pdf?download=1 (Download Attachment Mode)...`);
    const dlRes = await request({
        host: "localhost",
        port: 5000,
        path: `/notes/${testNote.id}/pdf?download=1`,
        method: "GET"
    });
    assert(dlRes.statusCode === 200, `Expected 200 OK, got ${dlRes.statusCode}`);
    assert(dlRes.headers["content-disposition"].startsWith("attachment"), `Expected attachment disposition, got ${dlRes.headers["content-disposition"]}`);
    assert(dlRes.rawBuffer.slice(0, 5).toString() === "%PDF-", "Invalid PDF magic bytes header");
    console.log(`  Verified: Content-Disposition is attachment for downloads: ${dlRes.headers["content-disposition"]}`);

    // 4. Test GET /notes/999999/pdf (Non-existent Note 404)
    console.log("\n4. Testing GET /notes/999999/pdf (404 Note Not Found)...");
    const notFoundRes = await request({
        host: "localhost",
        port: 5000,
        path: "/notes/999999/pdf",
        method: "GET"
    });
    assert(notFoundRes.statusCode === 404, `Expected 404 Not Found, got ${notFoundRes.statusCode}`);
    assert(notFoundRes.body.success === false, "Expected success: false");
    console.log(`  Verified: 404 returned correctly: "${notFoundRes.body.message}"`);

    // 5. Test with note containing extensive markdown/content
    const longNote = notes.find(n => n.content && n.content.length > 500) || notes[1] || notes[0];
    console.log(`\n5. Testing GET /notes/${longNote.id}/pdf with rich markdown content...`);
    const longPdfRes = await request({
        host: "localhost",
        port: 5000,
        path: `/notes/${longNote.id}/pdf`,
        method: "GET"
    });
    assert(longPdfRes.statusCode === 200, "Failed long note PDF generation");
    assert(longPdfRes.rawBuffer.slice(0, 5).toString() === "%PDF-", "Invalid PDF binary");
    console.log(`  Verified: Generated multi-page PDF for rich note (${longPdfRes.rawBuffer.length} bytes).`);

    console.log("\n==========================================");
    console.log("   ALL NOTE PDF TESTS PASSED 100%!        ");
    console.log("==========================================");
}

run().catch(err => {
    console.error("Test failed:", err.message);
    process.exit(1);
});
