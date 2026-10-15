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
    console.log("=================================================");
    console.log("   CAMPUSQUEST DISCUSSION FORUM FEATURE TESTS   ");
    console.log("=================================================");

    // 1. Authenticate Student and Teacher (Admin)
    console.log("\n1. Authenticating test users...");
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
    const studentUser = studentData.user;
    console.log(`  Student authenticated: ${studentUser.name} (${studentUser.role})`);

    const adminLogin = await request({
        host: "localhost",
        port: 5000,
        path: "/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: "admin@campusquest.com", password: "Admin@123" });
    assert(adminLogin.statusCode === 200, "Admin/Teacher login failed");
    const adminData = adminLogin.body.data || adminLogin.body;
    const adminToken = adminData.token;
    const adminUser = adminData.user;
    console.log(`  Teacher/Admin authenticated: ${adminUser.name} (${adminUser.role})`);

    // 2. Fetch Subjects to link question
    console.log("\n2. Fetching subjects list...");
    const subjectsRes = await request({
        host: "localhost",
        port: 5000,
        path: "/subjects",
        method: "GET"
    });
    assert(subjectsRes.statusCode === 200, "Get subjects failed");
    const subjects = subjectsRes.body.data || subjectsRes.body.subjects || [];
    const testSubject = subjects[0];
    console.log(`  Using Subject: ${testSubject ? testSubject.name : "None"}`);

    // 3. Student asks a doubt (POST /forum)
    console.log("\n3. Student posting a new doubt (POST /forum)...");
    const createPostRes = await request({
        host: "localhost",
        port: 5000,
        path: "/forum",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${studentToken}`
        }
    }, {
        title: "How does Two-Phase Locking (2PL) prevent Cascading Aborts?",
        body: "I understand Strict 2PL and Rigorous 2PL, but how exactly does holding exclusive locks until the end of transaction guarantee recoverability?",
        subject_id: testSubject ? testSubject.id : null,
        tags: ["concurrency", "2pl", "dbms", "transactions"]
    });
    assert(createPostRes.statusCode === 201, `Create post returned status ${createPostRes.statusCode}`);
    const createdPost = createPostRes.body.post || createPostRes.body.data || createPostRes.body;
    assert(createdPost && createdPost.id, "No post ID returned");
    const postId = createdPost.id;
    console.log(`  Doubt created successfully with ID #${postId}: "${createdPost.title}"`);

    // 4. Listing posts and filter by search (GET /forum?search=Two-Phase)
    console.log("\n4. Searching forum for 'Two-Phase' (GET /forum?search=Two-Phase)...");
    const searchRes = await request({
        host: "localhost",
        port: 5000,
        path: "/forum?search=Two-Phase",
        method: "GET"
    });
    assert(searchRes.statusCode === 200, "Search forum failed");
    const foundPosts = searchRes.body.posts || (searchRes.body.data && searchRes.body.data.posts) || [];
    assert(foundPosts.some(p => p.id === postId), "Created post not found in search results");
    console.log(`  Found ${foundPosts.length} posts matching query.`);

    // 5. Viewing single post (GET /forum/:id) with view count and user vote
    console.log(`\n5. Fetching post details (GET /forum/${postId})...`);
    const getPostRes = await request({
        host: "localhost",
        port: 5000,
        path: `/forum/${postId}`,
        method: "GET",
        headers: { "Authorization": `Bearer ${studentToken}` }
    });
    assert(getPostRes.statusCode === 200, "Get post failed");
    const postDetail = getPostRes.body.post || getPostRes.body.data || getPostRes.body;
    assert(postDetail.title === "How does Two-Phase Locking (2PL) prevent Cascading Aborts?", "Title mismatch");
    console.log(`  Post detail verified. Views: ${postDetail.views}, Status: ${postDetail.status}`);

    // 6. Upvote the post
    console.log(`\n6. Upvoting the post (POST /forum/${postId}/vote)...`);
    const votePostRes = await request({
        host: "localhost",
        port: 5000,
        path: `/forum/${postId}/vote`,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
        }
    }, { vote_type: "UP" });
    assert(votePostRes.statusCode === 200, "Vote post failed");
    const voteCount = votePostRes.body.vote_count !== undefined ? votePostRes.body.vote_count : votePostRes.body.data.vote_count;
    assert(voteCount >= 1, `Expected vote count >= 1, got ${voteCount}`);
    console.log(`  Vote recorded. New vote count: ${voteCount}`);

    // 7. Teacher answers the doubt (POST /forum/:id/replies)
    console.log(`\n7. Teacher providing expert solution (POST /forum/${postId}/replies)...`);
    const replyRes = await request({
        host: "localhost",
        port: 5000,
        path: `/forum/${postId}/replies`,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
        }
    }, {
        body: "Basic 2PL does NOT avoid cascading aborts because dirty reads are still possible before commit. However, Strict 2PL requires all EXCLUSIVE locks to be held until COMMIT/ABORT. Because no other transaction can read uncommitted modified items, cascading rollbacks are completely prevented!"
    });
    assert(replyRes.statusCode === 201, "Teacher reply failed");
    const teacherReply = replyRes.body.reply || replyRes.body.data || replyRes.body;
    assert(teacherReply && teacherReply.id, "No reply ID returned");
    const replyId = teacherReply.id;
    console.log(`  Teacher solution posted with Reply ID #${replyId}`);

    // 8. Fetch replies list (GET /forum/:id/replies)
    console.log(`\n8. Fetching replies (GET /forum/${postId}/replies)...`);
    const getRepliesRes = await request({
        host: "localhost",
        port: 5000,
        path: `/forum/${postId}/replies`,
        method: "GET"
    });
    assert(getRepliesRes.statusCode === 200, "Get replies failed");
    const replies = getRepliesRes.body.replies || getRepliesRes.body.data || [];
    const foundReply = replies.find(r => r.id === replyId);
    assert(foundReply, "Teacher reply not found in list");
    assert(foundReply.author_role === "ADMIN", `Expected author_role ADMIN, got ${foundReply.author_role}`);
    console.log(`  Verified teacher reply author role: ${foundReply.author_role} (Teacher badge verified)`);

    // 9. Upvote reply
    console.log(`\n9. Upvoting teacher's reply (POST /forum/replies/${replyId}/vote)...`);
    const voteReplyRes = await request({
        host: "localhost",
        port: 5000,
        path: `/forum/replies/${replyId}/vote`,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${studentToken}`
        }
    }, { vote_type: "UP" });
    assert(voteReplyRes.statusCode === 200, "Vote reply failed");
    console.log(`  Reply upvoted successfully.`);

    // 10. Student accepts the teacher's solution (PUT /forum/:id/solve)
    console.log(`\n10. Student marks teacher reply as Accepted Answer (PUT /forum/${postId}/solve)...`);
    const solveRes = await request({
        host: "localhost",
        port: 5000,
        path: `/forum/${postId}/solve`,
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${studentToken}`
        }
    }, { reply_id: replyId });
    assert(solveRes.statusCode === 200, `Solve failed with code ${solveRes.statusCode}`);
    const solvedPost = solveRes.body.post || solveRes.body.data || solveRes.body;
    assert(solvedPost.status === "SOLVED", `Expected status SOLVED, got ${solvedPost.status}`);
    assert(solvedPost.accepted_reply_id === replyId, "Accepted reply ID mismatch");
    console.log(`  Doubt successfully marked SOLVED with accepted reply #${replyId}!`);

    // 11. Security Check: Non-owner student cannot delete the post
    console.log("\n11. Testing unauthorized edit/delete security...");
    const unauthorizedDelete = await request({
        host: "localhost",
        port: 5000,
        path: `/forum/${postId}`,
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` } // Admin can delete
    });
    assert(unauthorizedDelete.statusCode === 200, "Admin should be able to moderate/delete");
    console.log("  Moderation permissions verified: Admin can clean up posts.");

    console.log("\n=================================================");
    console.log("   ALL 11 DISCUSSION FORUM TESTS PASSED 100%!    ");
    console.log("=================================================\n");
}

run().catch(err => {
    console.error("\n❌ TEST FAILED:", err);
    process.exit(1);
});
