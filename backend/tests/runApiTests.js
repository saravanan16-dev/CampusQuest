const http = require("http");

// Helper to make HTTP requests
const request = (options, postData) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => body += chunk);
            res.on("end", () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, headers: res.headers, raw: body });
                }
            });
        });

        req.on("error", (e) => reject(e));

        if (postData) {
            req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
        }
        req.end();
    });
};

const runAllTests = async () => {
    console.log("==========================================");
    console.log("  CAMPUSQUEST API ENDPOINT TEST RUNNER   ");
    console.log("==========================================\n");

    let studentToken = null;
    let adminToken = null;
    let testSubjectId = null;
    let testQuestionId = null;
    let practiceAttemptId = null;
    let mockTestId = null;
    let mockTestAttemptId = null;

    try {
        // 1. Health check
        console.log("1. Testing Health Check...");
        const healthRes = await request({
            host: "localhost",
            port: 5000,
            path: "/api/health",
            method: "GET"
        });
        console.log("  Status:", healthRes.statusCode, "Success:", healthRes.body.success);
        if (healthRes.statusCode !== 200) throw new Error("Health check failed");

        // 2. Admin Login
        console.log("\n2. Testing Admin Login...");
        const adminLoginRes = await request({
            host: "localhost",
            port: 5000,
            path: "/login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            email: "admin@campusquest.com",
            password: "Admin@123"
        });
        console.log("  Status:", adminLoginRes.statusCode, "Success:", adminLoginRes.body.success);
        if (!adminLoginRes.body.success) throw new Error("Admin login failed: " + adminLoginRes.body.message);
        adminToken = adminLoginRes.body.data.token;
        console.log("  Admin Token retrieved successfully.");

        // 3. Student Login
        console.log("\n3. Testing Student Login...");
        const studentLoginRes = await request({
            host: "localhost",
            port: 5000,
            path: "/login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            email: "student@campusquest.com",
            password: "Student@123"
        });
        console.log("  Status:", studentLoginRes.statusCode, "Success:", studentLoginRes.body.success);
        if (!studentLoginRes.body.success) throw new Error("Student login failed: " + studentLoginRes.body.message);
        studentToken = studentLoginRes.body.data.token;
        console.log("  Student Token retrieved successfully.");

        // 4. Student Profile (Protected)
        console.log("\n4. Testing GET /profile with Bearer Token...");
        const profileRes = await request({
            host: "localhost",
            port: 5000,
            path: "/profile",
            method: "GET",
            headers: { "Authorization": `Bearer ${studentToken}` }
        });
        console.log("  Status:", profileRes.statusCode, "User:", profileRes.body.data.user.name, "XP:", profileRes.body.data.gamification.total_xp);
        if (profileRes.statusCode !== 200) throw new Error("Profile retrieval failed");

        // 5. Get Subjects
        console.log("\n5. Testing GET /subjects...");
        const subRes = await request({
            host: "localhost",
            port: 5000,
            path: "/subjects",
            method: "GET"
        });
        console.log("  Status:", subRes.statusCode, "Total subjects:", subRes.body.data.length);
        if (subRes.body.data.length === 0) throw new Error("No subjects found");
        
        // Pick a subject with questions (e.g. DBMS)
        const targetSub = subRes.body.data.find(s => s.name.includes("Database")) || subRes.body.data[0];
        testSubjectId = targetSub.id;
        console.log("  Using subject:", targetSub.name, "(ID:", testSubjectId, ")");

        // 6. Get Notes
        console.log(`\n6. Testing GET /subjects/${testSubjectId}/notes...`);
        const notesRes = await request({
            host: "localhost",
            port: 5000,
            path: `/subjects/${testSubjectId}/notes`,
            method: "GET"
        });
        console.log("  Status:", notesRes.statusCode, "Notes found:", notesRes.body.data.length);

        // 7. Get Questions
        console.log(`\n7. Testing GET /questions?subjectId=${testSubjectId}...`);
        const qRes = await request({
            host: "localhost",
            port: 5000,
            path: `/questions?subjectId=${testSubjectId}`,
            method: "GET"
        });
        console.log("  Status:", qRes.statusCode, "Questions found:", qRes.body.data.length);
        if (qRes.body.data.length > 0) {
            testQuestionId = qRes.body.data[0].id;
        }

        // 8. Start Practice Arena Session
        console.log("\n8. Testing POST /practice/start...");
        const practiceStartRes = await request({
            host: "localhost",
            port: 5000,
            path: "/practice/start",
            method: "POST",
            headers: {
                "Authorization": `Bearer ${studentToken}`,
                "Content-Type": "application/json"
            }
        }, {
            subject_id: testSubjectId,
            count: 2
        });
        console.log("  Status:", practiceStartRes.statusCode, "Attempt ID:", practiceStartRes.body.data.attempt_id);
        practiceAttemptId = practiceStartRes.body.data.attempt_id;
        const practiceQuestions = practiceStartRes.body.data.questions;

        // 9. Submit Practice Answers
        console.log(`\n9. Testing POST /practice/${practiceAttemptId}/submit...`);
        const submitPracticeRes = await request({
            host: "localhost",
            port: 5000,
            path: `/practice/${practiceAttemptId}/submit`,
            method: "POST",
            headers: {
                "Authorization": `Bearer ${studentToken}`,
                "Content-Type": "application/json"
            }
        }, {
            time_taken_seconds: 25,
            answers: practiceQuestions.map(q => ({
                question_id: q.id,
                selected_option: q.options[0]?.option_key || "A"
            }))
        });
        console.log("  Status:", submitPracticeRes.statusCode, "Score:", submitPracticeRes.body.data.correct_answers, "XP Earned:", submitPracticeRes.body.data.xp_earned);

        // 10. Get Progress & Weak Areas
        console.log("\n10. Testing GET /progress and GET /progress/weak-areas...");
        const progressRes = await request({
            host: "localhost",
            port: 5000,
            path: "/progress",
            method: "GET",
            headers: { "Authorization": `Bearer ${studentToken}` }
        });
        console.log("  Overall Accuracy:", progressRes.body.data.stats.overall_accuracy + "%", "Attempted:", progressRes.body.data.stats.questions_attempted);

        const weakRes = await request({
            host: "localhost",
            port: 5000,
            path: "/progress/weak-areas",
            method: "GET",
            headers: { "Authorization": `Bearer ${studentToken}` }
        });
        console.log("  Weak areas detected:", weakRes.body.data.count);

        // 11. Mock Tests Flow
        console.log("\n11. Testing Mock Tests Flow...");
        const mockListRes = await request({
            host: "localhost",
            port: 5000,
            path: "/mock-tests",
            method: "GET"
        });
        console.log("  Mock Tests found:", mockListRes.body.data.length);
        if (mockListRes.body.data.length > 0) {
            mockTestId = mockListRes.body.data[0].id;

            const startMockRes = await request({
                host: "localhost",
                port: 5000,
                path: `/mock-tests/${mockTestId}/start`,
                method: "POST",
                headers: { "Authorization": `Bearer ${studentToken}` }
            });
            console.log("  Mock Test started. Attempt ID:", startMockRes.body.data.attempt_id);
            mockTestAttemptId = startMockRes.body.data.attempt_id;
            const mockQuestions = startMockRes.body.data.questions;

            const submitMockRes = await request({
                host: "localhost",
                port: 5000,
                path: `/mock-tests/${mockTestAttemptId}/submit`,
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${studentToken}`,
                    "Content-Type": "application/json"
                }
            }, {
                answers: mockQuestions.map(q => ({
                    question_id: q.id,
                    selected_option: q.options[0]?.option_key || "A"
                }))
            });
            console.log("  Mock Test submitted. Score:", submitMockRes.body.data.score, "Passed:", submitMockRes.body.data.passed, "XP Earned:", submitMockRes.body.data.xp_earned);
        }

        // 12. Leaderboard
        console.log("\n12. Testing GET /leaderboard...");
        const leadRes = await request({
            host: "localhost",
            port: 5000,
            path: "/leaderboard",
            method: "GET"
        });
        console.log("  Leaderboard entries:", leadRes.body.data.length);
        if (leadRes.body.data.length > 0) {
            console.log("  Top rank:", leadRes.body.data[0].name, "XP:", leadRes.body.data[0].total_xp);
        }

        // 13. Gamification XP & Achievements
        console.log("\n13. Testing Gamification & Achievements...");
        const achRes = await request({
            host: "localhost",
            port: 5000,
            path: "/achievements",
            method: "GET",
            headers: { "Authorization": `Bearer ${studentToken}` }
        });
        const unlocked = achRes.body.data.filter(a => a.is_unlocked === 1);
        console.log("  Total achievements:", achRes.body.data.length, "Unlocked:", unlocked.length);

        // 14. Admin Analytics (Admin Protected)
        console.log("\n14. Testing Admin Analytics (Admin Only)...");
        const adminAnalyticsRes = await request({
            host: "localhost",
            port: 5000,
            path: "/admin/analytics",
            method: "GET",
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        console.log("  Students count:", adminAnalyticsRes.body.data.total_students, "Subjects:", adminAnalyticsRes.body.data.total_subjects, "Accuracy:", adminAnalyticsRes.body.data.system_overall_accuracy + "%");

        // 15. AI Recommendations & Exam Intelligence
        console.log("\n15. Testing AI Features...");
        const aiRecRes = await request({
            host: "localhost",
            port: 5000,
            path: "/ai/recommendations",
            method: "GET",
            headers: { "Authorization": `Bearer ${studentToken}` }
        });
        console.log("  AI Rec Status:", aiRecRes.statusCode, "Body:", aiRecRes.body);
        console.log("  AI Advice:", aiRecRes.body?.data?.advice);

        const aiIntelRes = await request({
            host: "localhost",
            port: 5000,
            path: `/ai/exam-intelligence/${testSubjectId}`,
            method: "GET"
        });
        console.log("  Exam Intelligence Subject:", aiIntelRes.body.data.subject, "High priority revision:", aiIntelRes.body.data.revision_priorities.length);

        console.log("\n==========================================");
        console.log("  ALL BACKEND TESTS PASSED SUCCESSFULLY!  ");
        console.log("==========================================");
        process.exit(0);
    } catch (err) {
        console.error("\nTEST FAILED:", err.message);
        process.exit(1);
    }
};

runAllTests();
