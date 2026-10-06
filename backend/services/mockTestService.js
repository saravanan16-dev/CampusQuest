const mockTestModel = require("../models/mockTestModel");
const questionModel = require("../models/questionModel");
const gamificationService = require("./gamificationService");

const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
};

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
        total_marks: totalMarks,
        total_questions: questions.length
    });

    return {
        attempt_id: attemptId,
        id: attemptId,
        mock_test: {
            id: mockTest.id,
            title: mockTest.title,
            subject_id: mockTest.subject_id,
            subject_name: mockTest.subject_name,
            duration: mockTest.duration || mockTest.duration_minutes || 30,
            duration_minutes: mockTest.duration || mockTest.duration_minutes || 30,
            total_questions: questions.length,
            total_marks: totalMarks,
            passing_marks: mockTest.passing_marks
        },
        questions: questions.map(q => ({
            id: q.id,
            question: q.question || q.question_text,
            question_text: q.question_text || q.question,
            topic: q.topic,
            unit: q.unit,
            unit_id: q.unit_id,
            difficulty: q.difficulty,
            marks: q.marks || 1,
            options: q.options // Options without is_correct
        }))
    };
};

const submitMockTest = async ({ userId, attemptId, answers = [], timeUsedSeconds = 0 }) => {
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

    // Get all assigned questions for this mock test
    const allAssignedQuestions = await mockTestModel.getMockTestQuestions(attempt.mock_test_id, true);
    const assignedQuestionMap = new Map();
    allAssignedQuestions.forEach(q => assignedQuestionMap.set(q.id, q));

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const review = [];

    // Map submitted answers by question_id
    const submittedMap = new Map();
    if (Array.isArray(answers)) {
        answers.forEach(a => submittedMap.set(a.question_id, a));
    }

    for (const testQ of allAssignedQuestions) {
        const qId = testQ.id;
        const subAnswer = submittedMap.get(qId);
        const marksForQ = testQ.marks || 1;

        const options = testQ.options || [];
        const correctOpt = options.find(o => o.option_key === testQ.correct_answer);
        const correctOptText = correctOpt ? correctOpt.option_text : testQ.correct_answer;

        let isCorrect = false;
        let selectedOptionId = null;
        let selectedOptionKey = null;
        let yourAnswerText = "Not Answered";

        if (subAnswer && (subAnswer.selected_option_id !== undefined || subAnswer.selected_option !== undefined)) {
            selectedOptionId = subAnswer.selected_option_id || subAnswer.option_id || null;
            selectedOptionKey = subAnswer.selected_option || null;

            if (selectedOptionId) {
                const chosen = options.find(o => o.id === Number(selectedOptionId));
                if (chosen) {
                    selectedOptionKey = chosen.option_key;
                    yourAnswerText = chosen.option_text;
                    if (chosen.option_key === testQ.correct_answer) {
                        isCorrect = true;
                    }
                }
            } else if (selectedOptionKey) {
                const chosen = options.find(o =>
                    String(o.option_key).trim().toUpperCase() === String(selectedOptionKey).trim().toUpperCase() ||
                    String(o.option_text).trim().toLowerCase() === String(selectedOptionKey).trim().toLowerCase()
                );
                if (chosen) {
                    selectedOptionId = chosen.id;
                    yourAnswerText = chosen.option_text;
                    selectedOptionKey = chosen.option_key;
                    if (chosen.option_key === testQ.correct_answer) {
                        isCorrect = true;
                    }
                } else {
                    yourAnswerText = String(selectedOptionKey);
                    if (String(selectedOptionKey).trim().toUpperCase() === String(testQ.correct_answer).trim().toUpperCase()) {
                        isCorrect = true;
                    }
                }
            }
        }

        const marksAwarded = isCorrect ? marksForQ : 0;
        if (!subAnswer || (!selectedOptionId && !selectedOptionKey)) {
            unansweredCount++;
        } else if (isCorrect) {
            score += marksAwarded;
            correctCount++;
        } else {
            wrongCount++;
        }

        await mockTestModel.saveTestAnswer({
            attempt_id: attemptId,
            question_id: qId,
            selected_option_id: selectedOptionId,
            selected_option: selectedOptionKey,
            is_correct: isCorrect,
            marks_awarded: marksAwarded
        });

        review.push({
            question_id: qId,
            question: testQ.question || testQ.question_text,
            question_text: testQ.question_text || testQ.question,
            topic: testQ.topic,
            marks: marksForQ,
            marks_awarded: marksAwarded,
            selected_option: selectedOptionKey,
            selected_option_id: selectedOptionId,
            your_answer: yourAnswerText,
            correct_answer: testQ.correct_answer,
            correct_answer_text: correctOptText,
            is_correct: isCorrect,
            explanation: testQ.explanation,
            options: options
        });
    }

    const totalQuestions = allAssignedQuestions.length;
    const totalMarks = allAssignedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0) || attempt.total_marks || totalQuestions;
    const percentage = totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0;
    const passingMarks = attempt.passing_marks || Math.ceil(totalMarks * 0.4);
    const passed = score >= passingMarks;
    const timeUsed = Number(timeUsedSeconds) || 0;

    // Update test attempt record
    await mockTestModel.completeTestAttempt(attemptId, {
        score,
        total_marks: totalMarks,
        total_questions: totalQuestions,
        percentage,
        correct_answers: correctCount,
        wrong_answers: wrongCount,
        unanswered: unansweredCount,
        time_used_seconds: timeUsed,
        status: "COMPLETED"
    });

    // Award +50 XP for mock test
    await gamificationService.awardXP(
        userId,
        50,
        `Completed Mock Test: ${attempt.test_title} (Score: ${score}/${totalMarks})`
    );

    // Update streak
    await gamificationService.updateStreak(userId);

    // Check achievements
    const newlyUnlocked = await gamificationService.checkAndUnlockAchievements(userId);

    return {
        attempt_id: attemptId,
        id: attemptId,
        mock_test_id: attempt.mock_test_id,
        test_title: attempt.test_title,
        subject_name: attempt.subject_name,
        score,
        total_marks: totalMarks,
        total_questions: totalQuestions,
        percentage,
        correct_answers: correctCount,
        correct_count: correctCount, // Backwards compatibility
        wrong_answers: wrongCount,
        unanswered: unansweredCount,
        time_used_seconds: timeUsed,
        time_used_formatted: formatSeconds(timeUsed),
        passed,
        xp_earned: 50,
        new_achievements: newlyUnlocked,
        review,
        answers: review // Backwards compatibility
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

    const review = answers.map(a => ({
        question_id: a.question_id,
        question: a.question || a.question_text,
        question_text: a.question_text || a.question,
        topic: a.topic,
        marks: a.marks_awarded > 0 ? a.marks_awarded : 1,
        marks_awarded: a.marks_awarded || 0,
        selected_option: a.selected_option,
        selected_option_id: a.selected_option_id,
        your_answer: a.selected_option_text || a.selected_option || "Not Answered",
        correct_answer: a.correct_answer,
        correct_answer_text: a.correct_option_text || a.correct_answer,
        is_correct: Boolean(a.is_correct),
        explanation: a.explanation,
        options: a.options
    }));

    const score = attempt.score !== null ? attempt.score : 0;
    const totalMarks = attempt.total_marks || answers.length;
    const totalQuestions = attempt.total_questions || answers.length;
    const percentage = totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : (attempt.percentage || 0);
    const correctCount = attempt.correct_answers !== null ? attempt.correct_answers : review.filter(r => r.is_correct).length;
    const wrongCount = attempt.wrong_answers !== null ? attempt.wrong_answers : review.filter(r => !r.is_correct && r.your_answer !== 'Not Answered').length;
    const unansweredCount = attempt.unanswered !== null ? attempt.unanswered : (totalQuestions - (correctCount + wrongCount));
    const timeUsed = attempt.time_used_seconds || 0;

    return {
        attempt_id: attempt.id,
        id: attempt.id,
        mock_test_id: attempt.mock_test_id,
        test_title: attempt.test_title,
        subject_name: attempt.subject_name,
        score,
        total_marks: totalMarks,
        total_questions: totalQuestions,
        percentage,
        correct_answers: correctCount,
        correct_count: correctCount,
        wrong_answers: wrongCount,
        unanswered: unansweredCount,
        time_used_seconds: timeUsed,
        time_used_formatted: formatSeconds(timeUsed),
        started_at: attempt.started_at || attempt.start_time,
        completed_at: attempt.completed_at || attempt.end_time,
        status: attempt.status,
        review,
        answers: review,
        attempt
    };
};

const getUserTestHistory = async (userId) => {
    const rows = await mockTestModel.getUserTestHistory(userId);
    return rows.map(r => {
        const score = r.score !== null ? r.score : 0;
        const total = r.total_marks || r.total_questions || 0;
        const percentage = total > 0 ? Number(((score / total) * 100).toFixed(2)) : (r.percentage || 0);
        const timeUsed = r.time_used_seconds || 0;
        return {
            ...r,
            score,
            total_marks: total,
            percentage,
            time_used_seconds: timeUsed,
            time_used_formatted: formatSeconds(timeUsed),
            started_at: r.started_at || r.start_time,
            completed_at: r.completed_at || r.end_time
        };
    });
};

const createMockTest = async (data) => {
    const dur = data.duration || data.duration_minutes || 30;
    const totalQ = data.total_questions || (data.question_ids ? data.question_ids.length : 5);
    const totalM = data.total_marks || totalQ;

    const id = await mockTestModel.createMockTest({
        title: data.title,
        subject_id: data.subject_id,
        duration: dur,
        duration_minutes: dur,
        total_questions: totalQ,
        total_marks: totalM,
        passing_marks: data.passing_marks || Math.ceil(totalM * 0.4),
        description: data.description || ""
    });

    if (data.question_ids && Array.isArray(data.question_ids) && data.question_ids.length > 0) {
        for (const qId of data.question_ids) {
            await mockTestModel.addQuestionToMockTest(id, qId, data.marks_per_question || 1);
        }
    } else if (data.subject_id) {
        // Auto-assign existing questions for this subject
        const questions = await questionModel.getQuestions({ subject_id: data.subject_id, limit: totalQ });
        for (const q of questions) {
            await mockTestModel.addQuestionToMockTest(id, q.id, data.marks_per_question || 1);
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
