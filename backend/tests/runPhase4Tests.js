const http = require("http");

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, headers: res.headers, body });
                }
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
    console.log("   CAMPUSQUEST PHASE 4 TEST SUITE         ");
    console.log("   PYQs + Timed Mock Tests System         ");
    console.log("==========================================");

    const testEmail = `phase4_${Date.now()}@test.com`;
    const testUsername = `phase4_${Date.now()}`;
    const testPassword = "Password123!";

    // 0. Setup: Register student user
    console.log("\n0. Setup: Register student user...");
    const regRes = await request({
        host: "localhost",
        port: 5000,
        path: "/register",
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Phase 4 Student",
        username: testUsername,
        email: testEmail,
        password: testPassword,
        department: "Computer Science",
        semester: 5
    });
    assert(regRes.statusCode === 200 || regRes.statusCode === 201, `Register failed with status ${regRes.statusCode}`);
    const token = regRes.body.token || regRes.body.data?.token;
    assert(token, "Authentication token missing from register response");
    console.log("  Student registered. Token obtained.");

    // Retrieve subjects and units for testing
    const subjectsRes = await request({
        host: "localhost",
        port: 5000,
        path: "/subjects",
        method: "GET"
    });
    assert(subjectsRes.statusCode === 200 && subjectsRes.body.data.length > 0, "Subjects fetch failed");
    const testSubject = subjectsRes.body.data[0];
    const testSubjectId = testSubject.id;

    const unitsRes = await request({
        host: "localhost",
        port: 5000,
        path: `/subjects/${testSubjectId}/units`,
        method: "GET"
    });
    assert(unitsRes.statusCode === 200 && unitsRes.body.data.length > 0, "Units fetch failed");
    const testUnit = unitsRes.body.data[0];
    const testUnitId = testUnit.id;
    console.log(`  Using Subject: "${testSubject.name}" (ID: ${testSubjectId}), Unit: "${testUnit.name}" (ID: ${testUnitId})`);

    // ==========================================
    // MODULE 1: PREVIOUS YEAR QUESTIONS (PYQs)
    // ==========================================

    // 1. Create a PYQ
    console.log("\n1. Testing POST /pyqs (Create PYQ with Subject, Unit, Year, Marks, Question #)...");
    const createPyqRes = await request({
        host: "localhost",
        port: 5000,
        path: "/pyqs",
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    }, {
        subject_id: testSubjectId,
        unit_id: testUnitId,
        question: "Explain the ACID properties of database transactions with real-world banking examples.",
        year: 2025,
        exam_type: "End Semester",
        regulation: "2021",
        marks: 13,
        question_number: "Q5"
    });
    assert(createPyqRes.statusCode === 201, `Expected 201 create PYQ, got ${createPyqRes.statusCode}`);
    const createdPyq = createPyqRes.body.data;
    assert(createdPyq && createdPyq.id, "PYQ ID missing in response");
    const createdPyqId = createdPyq.id;
    assert(Number(createdPyq.year) === 2025, `Expected year 2025, got ${createdPyq.year}`);
    assert(Number(createdPyq.marks) === 13, `Expected 13 marks, got ${createdPyq.marks}`);
    console.log(`  PYQ created successfully with ID: ${createdPyqId}, Year: ${createdPyq.year}, Marks: ${createdPyq.marks}`);

    // 2. Retrieve PYQ by ID
    console.log(`\n2. Testing GET /pyqs/${createdPyqId}...`);
    const getPyqRes = await request({
        host: "localhost",
        port: 5000,
        path: `/pyqs/${createdPyqId}`,
        method: "GET"
    });
    assert(getPyqRes.statusCode === 200, "Get PYQ failed");
    assert(getPyqRes.body.data.id === createdPyqId, "PYQ ID mismatch");
    assert(getPyqRes.body.data.question.includes("ACID"), "PYQ question text mismatch");
    console.log(`  Retrieved PYQ: "${getPyqRes.body.data.question.slice(0, 60)}..."`);

    // 3. Filter PYQs by subject_id
    console.log(`\n3. Testing GET /pyqs?subject_id=${testSubjectId}...`);
    const filterSubRes = await request({
        host: "localhost",
        port: 5000,
        path: `/pyqs?subject_id=${testSubjectId}`,
        method: "GET"
    });
    assert(filterSubRes.statusCode === 200, "Filter by subject_id failed");
    assert(Array.isArray(filterSubRes.body.data) && filterSubRes.body.data.length > 0, "No PYQs returned for subject");
    console.log(`  Found ${filterSubRes.body.data.length} PYQ(s) for subject ${testSubjectId}`);

    // 4. Filter PYQs by year
    console.log("\n4. Testing GET /pyqs?year=2025...");
    const filterYearRes = await request({
        host: "localhost",
        port: 5000,
        path: "/pyqs?year=2025",
        method: "GET"
    });
    assert(filterYearRes.statusCode === 200, "Filter by year failed");
    assert(Array.isArray(filterYearRes.body.data) && filterYearRes.body.data.length > 0, "No PYQs returned for 2025");
    console.log(`  Found ${filterYearRes.body.data.length} PYQ(s) for year 2025`);

    // 5. Filter PYQs by unit_id
    console.log(`\n5. Testing GET /pyqs?unit_id=${testUnitId}...`);
    const filterUnitRes = await request({
        host: "localhost",
        port: 5000,
        path: `/pyqs?unit_id=${testUnitId}`,
        method: "GET"
    });
    assert(filterUnitRes.statusCode === 200, "Filter by unit_id failed");
    console.log(`  Found ${filterUnitRes.body.data.length} PYQ(s) for unit ${testUnitId}`);

    // 6. Filter PYQs by marks
    console.log("\n6. Testing GET /pyqs?marks=13...");
    const filterMarksRes = await request({
        host: "localhost",
        port: 5000,
        path: "/pyqs?marks=13",
        method: "GET"
    });
    assert(filterMarksRes.statusCode === 200, "Filter by marks failed");
    console.log(`  Found ${filterMarksRes.body.data.length} PYQ(s) with 13 marks`);

    // 7. Update PYQ
    console.log(`\n7. Testing PUT /pyqs/${createdPyqId}...`);
    const updatePyqRes = await request({
        host: "localhost",
        port: 5000,
        path: `/pyqs/${createdPyqId}`,
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    }, {
        marks: 16,
        question: "Explain the ACID properties of database transactions in detail and describe Concurrency Control anomalies."
    });
    assert(updatePyqRes.statusCode === 200, "Update PYQ failed");
    assert(Number(updatePyqRes.body.data.marks) === 16, "Marks not updated");
    console.log(`  PYQ updated. New marks: ${updatePyqRes.body.data.marks}`);

    // ==========================================
    // MODULE 2: TIMED MOCK TEST SYSTEM
    // ==========================================

    // 8. Create a Mock Test
    console.log("\n8. Testing POST /mock-tests (Create Timed Mock Test)...");
    const createMockRes = await request({
        host: "localhost",
        port: 5000,
        path: "/mock-tests",
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    }, {
        title: "Phase 4 Semester Readiness Mock Test",
        subject_id: testSubjectId,
        duration: 30, // 30 minutes
        total_questions: 3,
        total_marks: 3,
        description: "Official 30-minute timed exam with auto-submission and negative marking check."
    });
    assert(createMockRes.statusCode === 201, `Create mock test failed: ${createMockRes.statusCode}`);
    const createdMockTest = createMockRes.body.data;
    assert(createdMockTest && createdMockTest.id, "Mock test ID missing");
    const mockTestId = createdMockTest.id;
    console.log(`  Mock test created: ID #${mockTestId}, Title: "${createdMockTest.title}", Duration: ${createdMockTest.duration || createdMockTest.duration_minutes} min`);

    // 9. Start Mock Test Session (Timer & Questions delivery)
    console.log(`\n9. Testing POST /mock-tests/${mockTestId}/start...`);
    const startTestRes = await request({
        host: "localhost",
        port: 5000,
        path: `/mock-tests/${mockTestId}/start`,
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });
    assert(startTestRes.statusCode === 201, `Start mock test failed: ${startTestRes.statusCode}`);
    const startData = startTestRes.body.data;
    const testAttemptId = startData.attempt_id;
    const testQuestions = startData.questions;
    assert(testAttemptId, "Test attempt ID missing");
    assert(Array.isArray(testQuestions) && testQuestions.length > 0, "No questions delivered for mock test");
    assert(startData.mock_test.duration === 30 || startData.mock_test.duration_minutes === 30, "Duration must be 30 minutes");
    console.log(`  Mock test started. Attempt ID: ${testAttemptId}, Questions: ${testQuestions.length}, Duration: 30 min`);

    // Verify option correctness is NOT exposed during active test
    for (const q of testQuestions) {
        for (const opt of q.options) {
            assert(opt.is_correct === undefined, "is_correct must NOT be leaked during timed mock test!");
        }
    }
    console.log("  Verified: Option correctness is hidden from student during active exam.");

    // 10. Submit Mock Test Answers (with time used)
    console.log(`\n10. Testing POST /mock-tests/submit (Submit Answers & Time Used)...`);
    // Find answers for questions
    const q1 = testQuestions[0];
    const q1Detail = (await request({ host: "localhost", port: 5000, path: `/questions/${q1.id}`, method: "GET" })).body.data;
    const q1Correct = q1Detail.options.find(o => o.is_correct === true || o.option_key === q1Detail.correct_answer);

    const answersPayload = [];
    // Answer 1: Correct
    answersPayload.push({
        question_id: q1.id,
        selected_option_id: q1Correct?.id,
        selected_option: q1Correct?.option_key || "A"
    });

    // Answer 2 (if present): Wrong
    if (testQuestions.length > 1) {
        const q2 = testQuestions[1];
        const q2Detail = (await request({ host: "localhost", port: 5000, path: `/questions/${q2.id}`, method: "GET" })).body.data;
        const q2Wrong = q2Detail.options.find(o => o.is_correct === false || o.option_key !== q2Detail.correct_answer);
        answersPayload.push({
            question_id: q2.id,
            selected_option_id: q2Wrong?.id,
            selected_option: q2Wrong?.option_key || "Z"
        });
    }

    // Question 3 (if present): Leave unanswered to test unanswered count!
    const submitTestRes = await request({
        host: "localhost",
        port: 5000,
        path: "/mock-tests/submit",
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    }, {
        attempt_id: testAttemptId,
        answers: answersPayload,
        time_used_seconds: 1472 // 24 minutes 32 seconds
    });
    assert(submitTestRes.statusCode === 200, `Submit mock test failed: ${submitTestRes.statusCode}`);
    const submitResult = submitTestRes.body.data;
    console.log("  Mock test submitted successfully.");
    console.log(`  Score: ${submitResult.score} / ${submitResult.total_marks} (${submitResult.percentage}%)`);
    console.log(`  Correct: ${submitResult.correct_answers}, Wrong: ${submitResult.wrong_answers}, Unanswered: ${submitResult.unanswered}`);
    console.log(`  Time Used: ${submitResult.time_used_formatted} (${submitResult.time_used_seconds}s)`);

    assert(submitResult.score === 1, `Expected score 1, got ${submitResult.score}`);
    assert(submitResult.correct_answers === 1, `Expected 1 correct, got ${submitResult.correct_answers}`);
    if (testQuestions.length >= 3) {
        assert(submitResult.unanswered >= 1, `Expected at least 1 unanswered question, got ${submitResult.unanswered}`);
    }
    assert(submitResult.time_used_formatted === "24:32", `Expected time 24:32, got ${submitResult.time_used_formatted}`);

    // 11. Verify Test Persistence in MySQL
    console.log("\n11. Verifying persistence in test_attempts and test_answers MySQL tables...");
    const db = require("../config/db");
    const [attRows] = await db.query("SELECT * FROM test_attempts WHERE id = ?", [testAttemptId]);
    assert(attRows.length === 1, "test_attempts row missing");
    assert(attRows[0].score === 1, "Stored score in DB mismatch");
    assert(attRows[0].completed_at !== null, "completed_at should be recorded");
    assert(Number(attRows[0].time_used_seconds) === 1472, "Stored time_used_seconds mismatch");
    console.log(`  test_attempts row verified. Status: ${attRows[0].status}, Score: ${attRows[0].score}, Time: ${attRows[0].time_used_seconds}s`);

    const [ansRows] = await db.query("SELECT * FROM test_answers WHERE attempt_id = ?", [testAttemptId]);
    assert(ansRows.length >= answersPayload.length, `Expected at least ${answersPayload.length} test_answers, found ${ansRows.length}`);
    console.log(`  test_answers verified. Stored ${ansRows.length} answers linked to attempt #${testAttemptId}`);

    // 12. Retrieve Test Result & Detailed Review
    console.log(`\n12. Testing GET /mock-tests/result/${testAttemptId}...`);
    const getResultRes = await request({
        host: "localhost",
        port: 5000,
        path: `/mock-tests/result/${testAttemptId}`,
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
    assert(getResultRes.statusCode === 200, "Get test result failed");
    const resultObj = getResultRes.body.data;
    assert(Array.isArray(resultObj.review) && resultObj.review.length > 0, "Review array missing from result");
    const firstReview = resultObj.review[0];
    assert(firstReview.question, "Review question text missing");
    assert(firstReview.your_answer, "Review your_answer missing");
    assert(firstReview.correct_answer || firstReview.correct_answer_text, "Review correct_answer missing");
    assert(firstReview.marks !== undefined, "Review marks missing");
    console.log("  Test Result Review verified:");
    console.log(`    Q1: "${firstReview.question}"`);
    console.log(`    Your Answer: "${firstReview.your_answer}" | Correct: "${firstReview.correct_answer_text || firstReview.correct_answer}" | Status: ${firstReview.is_correct ? "✓ Correct" : "✗ Wrong"}`);

    // 13. Retrieve Test Performance History
    console.log("\n13. Testing GET /mock-tests/history...");
    const historyRes = await request({
        host: "localhost",
        port: 5000,
        path: "/mock-tests/history",
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
    assert(historyRes.statusCode === 200, "Get test history failed");
    assert(Array.isArray(historyRes.body.data) && historyRes.body.data.length > 0, "No test history returned");
    const latestTest = historyRes.body.data[0];
    console.log(`  History verified. Found ${historyRes.body.data.length} attempt(s). Latest: "${latestTest.test_title}" - ${latestTest.score}/${latestTest.total_marks} (${latestTest.percentage}%)`);

    // ==========================================
    // MODULE 3: EXAM PREPARATION DASHBOARD
    // ==========================================

    // 14. Test GET /dashboard for Exam Prep components
    console.log("\n14. Testing GET /dashboard (Continue Learning, PYQs, Mock Tests)...");
    const dashRes = await request({
        host: "localhost",
        port: 5000,
        path: "/dashboard",
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
    assert(dashRes.statusCode === 200, "Get dashboard failed");
    const dashData = dashRes.body.data;
    assert(Array.isArray(dashData.continue_learning), "continue_learning missing from dashboard");
    assert(Array.isArray(dashData.pyqs_years), "pyqs_years missing from dashboard");
    assert(Array.isArray(dashData.mock_tests), "mock_tests missing from dashboard");
    console.log("  Dashboard verified:");
    console.log(`    Continue Learning: ${dashData.continue_learning.length} subjects with progress percentages`);
    console.log(`    PYQ Years: [${dashData.pyqs_years.join(", ")}]`);
    console.log(`    Available Mock Tests: ${dashData.mock_tests.length} tests ready for student exam-prep`);

    // 15. Delete test PYQ cleanup
    console.log(`\n15. Testing DELETE /pyqs/${createdPyqId}...`);
    const delPyqRes = await request({
        host: "localhost",
        port: 5000,
        path: `/pyqs/${createdPyqId}`,
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });
    assert(delPyqRes.statusCode === 200, "Delete PYQ failed");
    console.log("  PYQ cleanup successful.");

    console.log("\n==========================================");
    console.log("   ALL PHASE 4 TEST SCENARIOS PASSED 100%!");
    console.log("==========================================");
    process.exit(0);
}

run().catch(err => {
    console.error("\nPHASE 4 TEST FAILED:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
});
