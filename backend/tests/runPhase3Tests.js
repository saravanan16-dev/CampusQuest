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
    console.log("   CAMPUSQUEST PHASE 3 TEST SUITE         ");
    console.log("   Question Bank & Practice Arena         ");
    console.log("==========================================");

    const testEmail = `phase3_${Date.now()}@test.com`;
    const testUsername = `phase3_${Date.now()}`;
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
        name: "Phase 3 Tester",
        username: testUsername,
        email: testEmail,
        password: testPassword,
        department: "Computer Science",
        semester: 4
    });
    assert(regRes.statusCode === 200 || regRes.statusCode === 201, `Expected 200/201 register, got ${regRes.statusCode}`);
    const token = regRes.body.token || regRes.body.data?.token;
    console.log("  Student registered. Token obtained.");

    // Retrieve a subject and its units for testing
    const subjectsRes = await request({
        host: "localhost",
        port: 5000,
        path: "/subjects",
        method: "GET"
    });
    assert(subjectsRes.statusCode === 200, "Subjects fetch failed");
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
    console.log(`  Using Subject ID: ${testSubjectId} (${testSubject.name}), Unit ID: ${testUnitId} (${testUnit.name})`);

    let createdQuestionId = null;

    // 1-3. Scenario 1, 2, 3: Create question, add options, mark correct option
    console.log("\n1-3. Scenarios 1-3: POST /questions with options and is_correct...");
    const createQRes = await request({
        host: "localhost",
        port: 5000,
        path: "/questions",
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    }, {
        subject_id: testSubjectId,
        unit_id: testUnitId,
        question: "Which SQL clause is used to filter records based on a specified condition?",
        difficulty: "easy",
        explanation: "The WHERE clause is used to filter records that fulfill a specified condition.",
        options: [
            { option_text: "ORDER BY", is_correct: false },
            { option_text: "GROUP BY", is_correct: false },
            { option_text: "WHERE", is_correct: true },
            { option_text: "HAVING", is_correct: false }
        ]
    });
    assert(createQRes.statusCode === 201, `Expected 201 created question, got ${createQRes.statusCode}`);
    assert(createQRes.body.data && createQRes.body.data.id, "Question ID missing in response");
    createdQuestionId = createQRes.body.data.id;
    const createdOpts = createQRes.body.data.options;
    assert(createdOpts.length === 4, `Expected 4 options, got ${createdOpts.length}`);
    const correctOpt = createdOpts.find(o => o.is_correct === 1 || o.is_correct === true);
    assert(correctOpt && correctOpt.option_text === "WHERE", "Correct option marked properly");
    console.log(`  Question created successfully with ID: ${createdQuestionId}`);
    console.log(`  Options added: 4, Correct Option: ${correctOpt.option_text} (${correctOpt.option_key})`);

    // 4. Scenario 4: Retrieve question by ID
    console.log(`\n4. Scenario 4: GET /questions/${createdQuestionId}...`);
    const getQRes = await request({
        host: "localhost",
        port: 5000,
        path: `/questions/${createdQuestionId}`,
        method: "GET"
    });
    assert(getQRes.statusCode === 200, "Get question failed");
    assert(getQRes.body.data.id === createdQuestionId, "Question ID mismatch");
    assert(getQRes.body.data.question.includes("WHERE") || getQRes.body.data.explanation.includes("WHERE"), "Question text mismatch");
    console.log("  Retrieved question successfully:", getQRes.body.data.question);

    // 5. Scenario 5: Filter questions by subject_id
    console.log(`\n5. Scenario 5: GET /questions?subject_id=${testSubjectId}...`);
    const filterSubRes = await request({
        host: "localhost",
        port: 5000,
        path: `/questions?subject_id=${testSubjectId}`,
        method: "GET"
    });
    assert(filterSubRes.statusCode === 200, "Filter by subject_id failed");
    assert(Array.isArray(filterSubRes.body.data) && filterSubRes.body.data.length > 0, "No questions returned for subject");
    console.log(`  Questions found for subject ${testSubjectId}: ${filterSubRes.body.data.length}`);

    // 6. Scenario 6: Filter questions by unit_id and difficulty
    console.log(`\n6. Scenario 6: GET /questions?unit_id=${testUnitId}&difficulty=easy...`);
    const filterUnitRes = await request({
        host: "localhost",
        port: 5000,
        path: `/questions?unit_id=${testUnitId}&difficulty=easy`,
        method: "GET"
    });
    assert(filterUnitRes.statusCode === 200, "Filter by unit_id & difficulty failed");
    assert(Array.isArray(filterUnitRes.body.data), "Expected array of questions");
    console.log(`  Questions found for unit ${testUnitId} with difficulty 'easy': ${filterUnitRes.body.data.length}`);

    // 7. Scenario 7: Start Practice Session (POST /practice/start)
    console.log("\n7. Scenario 7: POST /practice/start...");
    const startPracticeRes = await request({
        host: "localhost",
        port: 5000,
        path: "/practice/start",
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    }, {
        subject_id: testSubjectId,
        unit_id: testUnitId,
        count: 2
    });
    assert(startPracticeRes.statusCode === 201, `Expected 201 start practice, got ${startPracticeRes.statusCode}`);
    const attemptId = startPracticeRes.body.data.attempt_id;
    const practiceQuestions = startPracticeRes.body.data.questions;
    assert(attemptId, "Attempt ID missing");
    assert(practiceQuestions.length > 0, "Questions array missing");
    // Verify is_correct is NOT leaked in practice start
    for (const q of practiceQuestions) {
        for (const opt of q.options) {
            assert(opt.is_correct === undefined, "is_correct should NOT be exposed during practice session!");
        }
    }
    console.log(`  Practice session started: Attempt #${attemptId}, Questions count: ${practiceQuestions.length}`);
    console.log("  Verified: Option correctness is hidden during practice session.");

    // 8-10. Scenarios 8-10: Submit answers (correct & incorrect) and complete practice
    console.log("\n8-10. Scenarios 8-10: POST /practice/submit (1 correct, 1 incorrect)...");
    
    // Question 1: Submit with correct option id or key
    const q1 = practiceQuestions[0];
    // Find the correct option for q1 by inspecting GET /questions/:id
    const q1Details = (await request({ host: "localhost", port: 5000, path: `/questions/${q1.id}`, method: "GET" })).body.data;
    const q1CorrectOpt = q1Details.options.find(o => o.is_correct === 1 || o.is_correct === true || o.option_key === q1Details.correct_answer);
    
    // Prepare answers: 1 correct, 1 incorrect (if 2 questions)
    const answersToSubmit = [];
    answersToSubmit.push({
        question_id: q1.id,
        selected_option_id: q1CorrectOpt ? q1CorrectOpt.id : undefined,
        selected_option: q1CorrectOpt ? q1CorrectOpt.option_key : "A"
    });

    if (practiceQuestions.length > 1) {
        const q2 = practiceQuestions[1];
        const q2Details = (await request({ host: "localhost", port: 5000, path: `/questions/${q2.id}`, method: "GET" })).body.data;
        const q2WrongOpt = q2Details.options.find(o => o.is_correct === 0 || o.is_correct === false || o.option_key !== q2Details.correct_answer);
        answersToSubmit.push({
            question_id: q2.id,
            selected_option_id: q2WrongOpt ? q2WrongOpt.id : undefined,
            selected_option: q2WrongOpt ? q2WrongOpt.option_key : "Z"
        });
    }

    const submitRes = await request({
        host: "localhost",
        port: 5000,
        path: "/practice/submit",
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    }, {
        attempt_id: attemptId,
        answers: answersToSubmit,
        time_taken_seconds: 35
    });

    assert(submitRes.statusCode === 200, `Expected 200 submit practice, got ${submitRes.statusCode}`);
    const submitData = submitRes.body.data;
    console.log("  Practice session submitted successfully.");

    // 11. Scenario 11: Calculate score & percentage
    console.log("\n11. Scenario 11: Verify score and percentage calculation...");
    console.log(`  Total: ${submitData.total_questions}, Score: ${submitData.score}, Correct: ${submitData.correct_answers}, Incorrect: ${submitData.incorrect_answers}, Percentage: ${submitData.percentage}%`);
    assert(submitData.score === 1, `Expected score 1, got ${submitData.score}`);
    assert(submitData.correct_answers === 1, `Expected 1 correct answer, got ${submitData.correct_answers}`);
    if (practiceQuestions.length > 1) {
        assert(submitData.incorrect_answers === 1, `Expected 1 incorrect answer, got ${submitData.incorrect_answers}`);
        assert(submitData.percentage === 50, `Expected 50% percentage, got ${submitData.percentage}`);
    }

    // 12-13. Scenario 12-13: Verify practice attempt and individual answers stored in database
    console.log("\n12-13. Scenarios 12-13: Verify MySQL persistence...");
    const db = require("../config/db");
    const [attRows] = await db.query("SELECT * FROM practice_attempts WHERE id = ?", [attemptId]);
    assert(attRows.length === 1, "Attempt not found in DB");
    assert(attRows[0].score === 1, "Stored score in DB does not match");
    assert(attRows[0].completed_at !== null, "completed_at should be set");
    console.log(`  practice_attempts ID: ${attRows[0].id}, DB Score: ${attRows[0].score}, Completed at: ${attRows[0].completed_at}`);

    const [ansRows] = await db.query("SELECT * FROM practice_answers WHERE (practice_attempt_id = ? OR attempt_id = ?)", [attemptId, attemptId]);
    assert(ansRows.length === answersToSubmit.length, `Expected ${answersToSubmit.length} saved answers, found ${ansRows.length}`);
    console.log(`  practice_answers stored: ${ansRows.length} answers linked to attempt #${attemptId}`);

    // 14. Scenario 14: View practice result
    console.log(`\n14. Scenario 14: GET /practice/result/${attemptId}...`);
    const resultRes = await request({
        host: "localhost",
        port: 5000,
        path: `/practice/result/${attemptId}`,
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
    assert(resultRes.statusCode === 200, `Expected 200 result, got ${resultRes.statusCode}`);
    const resultData = resultRes.body.data;
    assert(resultData.score === 1, "Score mismatch in result");
    assert(Array.isArray(resultData.review), "Review array missing in result");
    console.log(`  Result API returned score: ${resultData.score}/${resultData.total_questions} (${resultData.percentage}%)`);

    // 15. Scenario 15: Review answers (question, your_answer, correct_answer, explanation)
    console.log("\n15. Scenario 15: Review answers and mistakes breakdown...");
    const firstReview = resultData.review[0];
    assert(firstReview.question, "Review question text missing");
    assert(firstReview.your_answer, "Review your_answer missing");
    assert(firstReview.correct_answer || firstReview.correct_answer_text, "Review correct_answer missing");
    assert(firstReview.explanation !== undefined, "Review explanation missing");
    console.log(`  Question: "${firstReview.question}"`);
    console.log(`  Your Answer: "${firstReview.your_answer}" | Correct: "${firstReview.correct_answer_text || firstReview.correct_answer}" | Status: ${firstReview.is_correct ? "✓ Correct" : "✗ Wrong"}`);
    console.log(`  Explanation: "${firstReview.explanation}"`);

    // 16. Scenario 16: Practice history (Attempt history & practice again)
    console.log("\n16. Scenario 16: GET /practice/history...");
    const historyRes = await request({
        host: "localhost",
        port: 5000,
        path: "/practice/history",
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
    assert(historyRes.statusCode === 200, "History fetch failed");
    assert(Array.isArray(historyRes.body.data) && historyRes.body.data.length > 0, "No history records returned");
    const latestAttempt = historyRes.body.data[0];
    console.log(`  History retrieved: ${historyRes.body.data.length} attempt(s) found.`);
    console.log(`  Latest attempt: Subject: "${latestAttempt.subject_name}", Score: ${latestAttempt.score}/${latestAttempt.total_questions}, Percentage: ${latestAttempt.percentage}%`);

    console.log("\n==========================================");
    console.log("   ALL 16 PHASE 3 SCENARIOS PASSED 100%!  ");
    console.log("==========================================");
    process.exit(0);
}

run().catch(err => {
    console.error("\nPHASE 3 TEST FAILED:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
});
