const mockTestModel = require("../models/mockTestModel");
const questionModel = require("../models/questionModel");
const progressModel = require("../models/progressModel");
const gamificationService = require("./gamificationService");

const getAllMockTests = async (subjectId) => {
    return await mockTestModel.getAllMockTests(subjectId);
};

const getMockTestById = async (id) => {
    return await mockTestModel.getMockTestById(id);
};

const startMockTest = async ({ userId, mockTestId }) => {
    const mockTest = await mockTestModel.getMockTestById(mockTestId);
    if (!mockTest) {
        const error = new Error("Mock test not found");
        error.statusCode = 404;
        throw error;
    }

    const questions = await mockTestModel.getMockTestQuestions(mockTestId, false);
    if (questions.length === 0) {
        const error = new Error("This mock test has no questions assigned yet");
        error.statusCode = 400;
        throw error;
    }

    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    const attemptId = await mockTestModel.createTestAttempt({
        user_id: userId,
        mock_test_id: mockTestId,
        total_marks: totalMarks
    });

    return {
        attempt_id: attemptId,
        mock_test: {
            id: mockTest.id,
            title: mockTest.title,
            subject_name: mockTest.subject_name,
            duration_minutes: mockTest.duration_minutes,
            total_marks: totalMarks,
            passing_marks: mockTest.passing_marks
        },
        questions: questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            topic: q.topic,
            unit: q.unit,
            marks: q.marks,
            options: q.options
        }))
    };
};

const submitMockTest = async ({ userId, attemptId, answers }) => {
    const attempt = await mockTestModel.getTestAttemptById(attemptId);
    if (!attempt) {
        const error = new Error("Test attempt not found");
        error.statusCode = 404;
        throw error;
    }

    if (attempt.user_id !== userId) {
        const error = new Error("Unauthorized to submit this test attempt");
        error.statusCode = 403;
        throw error;
    }

    if (attempt.status === "COMPLETED") {
        const error = new Error("This test attempt has already been submitted");
        error.statusCode = 400;
        throw error;
    }

    let score = 0;
    let correctCount = 0;
    let totalQuestions = 0;

    for (const item of answers) {
        totalQuestions++;
        const question = await questionModel.getQuestionById(item.question_id);
        if (!question) continue;

        const isCorrect = String(item.selected_option).trim().toUpperCase() === String(question.correct_answer).trim().toUpperCase();
        const marks = 1; // default or from mock_test_questions
        const marksAwarded = isCorrect ? marks : 0;

        if (isCorrect) {
            score += marksAwarded;
            correctCount++;
        }

        await mockTestModel.saveTestAnswer({
            attempt_id: attemptId,
            question_id: question.id,
            selected_option: item.selected_option,
            is_correct: isCorrect,
            marks_awarded: marksAwarded
        });
    }

    const totalMarks = attempt.total_marks || totalQuestions;
    const percentage = totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0;
    const passed = score >= (attempt.passing_marks || Math.ceil(totalMarks * 0.4));

    // Update attempt
    await mockTestModel.completeTestAttempt(attemptId, {
        score,
        percentage,
        status: "COMPLETED"
    });

    // Award +50 XP for mock test completion
    await gamificationService.awardXP(
        userId,
        50,
        `Completed Mock Test: ${attempt.test_title} (Score: ${score}/${totalMarks})`
    );

    // Update streak
    await gamificationService.updateStreak(userId);

    // Check achievements (e.g. FIRST_MOCK_TEST)
    const newlyUnlocked = await gamificationService.checkAndUnlockAchievements(userId);

    const detailedAnswers = await mockTestModel.getTestAnswersByAttemptId(attemptId);

    return {
        attempt_id: attemptId,
        test_title: attempt.test_title,
        subject_name: attempt.subject_name,
        score,
        total_marks: totalMarks,
        percentage,
        passed,
        correct_count: correctCount,
        total_questions: totalQuestions,
        xp_earned: 50,
        new_achievements: newlyUnlocked,
        answers: detailedAnswers
    };
};

const getMockTestResult = async (attemptId, userId) => {
    const attempt = await mockTestModel.getTestAttemptById(attemptId);
    if (!attempt) {
        const error = new Error("Test attempt not found");
        error.statusCode = 404;
        throw error;
    }

    if (attempt.user_id !== userId) {
        const error = new Error("Unauthorized to access this test result");
        error.statusCode = 403;
        throw error;
    }

    const answers = await mockTestModel.getTestAnswersByAttemptId(attemptId);

    return {
        attempt,
        answers
    };
};

const getUserTestHistory = async (userId) => {
    return await mockTestModel.getUserTestHistory(userId);
};

const createMockTest = async (data) => {
    const id = await mockTestModel.createMockTest(data);
    if (data.question_ids && Array.isArray(data.question_ids)) {
        for (const qId of data.question_ids) {
            await mockTestModel.addQuestionToMockTest(id, qId, data.marks_per_question || 1);
        }
    }
    return await mockTestModel.getMockTestById(id);
};

const deleteMockTest = async (id) => {
    return await mockTestModel.deleteMockTest(id);
};

module.exports = {
    getAllMockTests,
    getMockTestById,
    startMockTest,
    submitMockTest,
    getMockTestResult,
    getUserTestHistory,
    createMockTest,
    deleteMockTest
};
