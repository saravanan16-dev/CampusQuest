const questionModel = require("../models/questionModel");
const practiceModel = require("../models/practiceModel");
const progressModel = require("../models/progressModel");
const gamificationService = require("./gamificationService");

const startPractice = async ({ userId, subjectId, unit, difficulty, count = 5 }) => {
    // 1. Get randomized questions
    const questions = await questionModel.getQuestionsForPractice({
        subject_id: subjectId,
        unit: unit ? Number(unit) : null,
        difficulty: difficulty || null,
        count: Number(count)
    });

    if (questions.length === 0) {
        const error = new Error("No questions found matching the selected criteria");
        error.statusCode = 404;
        throw error;
    }

    // 2. Create practice attempt record
    const attemptId = await practiceModel.createPracticeAttempt({
        user_id: userId,
        subject_id: subjectId,
        unit: unit ? Number(unit) : null,
        difficulty: difficulty || "ALL",
        total_questions: questions.length
    });

    return {
        attempt_id: attemptId,
        total_questions: questions.length,
        questions: questions.map(q => ({
            id: q.id,
            subject_id: q.subject_id,
            unit: q.unit,
            topic: q.topic,
            question_text: q.question_text,
            difficulty: q.difficulty,
            options: q.options
        }))
    };
};

const submitPractice = async ({ userId, attemptId, answers, timeTakenSeconds = 0 }) => {
    const attempt = await practiceModel.getPracticeAttemptById(attemptId);
    if (!attempt) {
        const error = new Error("Practice session not found");
        error.statusCode = 404;
        throw error;
    }

    if (attempt.user_id !== userId) {
        const error = new Error("Unauthorized to submit this practice session");
        error.statusCode = 403;
        throw error;
    }

    let correctCount = 0;
    let incorrectCount = 0;
    const evaluatedAnswers = [];

    for (const item of answers) {
        const question = await questionModel.getQuestionById(item.question_id);
        if (!question) continue;

        const isCorrect = String(item.selected_option).trim().toUpperCase() === String(question.correct_answer).trim().toUpperCase();
        if (isCorrect) {
            correctCount++;
        } else {
            incorrectCount++;
        }

        await practiceModel.savePracticeAnswer({
            practice_attempt_id: attemptId,
            question_id: question.id,
            selected_option: item.selected_option,
            is_correct: isCorrect
        });

        evaluatedAnswers.push({
            question_id: question.id,
            question_text: question.question_text,
            topic: question.topic,
            difficulty: question.difficulty,
            selected_option: item.selected_option,
            correct_answer: question.correct_answer,
            is_correct: isCorrect,
            explanation: question.explanation,
            options: question.options
        });
    }

    const totalAnswered = correctCount + incorrectCount;
    const accuracy = totalAnswered > 0 ? Number(((correctCount / totalAnswered) * 100).toFixed(2)) : 0;

    // Calculate XP: +10 for practice session completion, +5 per correct answer
    let xpEarned = 10 + (correctCount * 5);

    // Bonus for perfect score with at least 3 questions
    if (accuracy === 100 && totalAnswered >= 3) {
        xpEarned += 20;
    }

    // 1. Update practice attempt record
    await practiceModel.updatePracticeAttempt(attemptId, {
        correct_answers: correctCount,
        incorrect_answers: incorrectCount,
        accuracy,
        time_taken_seconds: timeTakenSeconds,
        xp_earned: xpEarned
    });

    // 2. Update user subject progress
    await progressModel.upsertUserProgress({
        user_id: userId,
        subject_id: attempt.subject_id,
        additional_attempted: totalAnswered,
        additional_correct: correctCount
    });

    // 3. Update streak
    await gamificationService.updateStreak(userId);

    // 4. Award XP
    const xpResult = await gamificationService.awardXP(
        userId,
        xpEarned,
        `Practice Session: ${attempt.subject_name} (${correctCount}/${totalAnswered} correct)`
    );

    // 5. Perfect score achievement check
    if (accuracy === 100 && totalAnswered >= 3) {
        await gamificationService.awardXP(userId, 0, "Perfect Score check"); // unlocks via achievement service
    }

    // 6. Check and unlock achievements
    const newlyUnlocked = await gamificationService.checkAndUnlockAchievements(userId);

    return {
        attempt_id: attemptId,
        subject_id: attempt.subject_id,
        subject_name: attempt.subject_name,
        total_questions: totalAnswered,
        correct_answers: correctCount,
        incorrect_answers: incorrectCount,
        accuracy,
        time_taken_seconds: timeTakenSeconds,
        xp_earned: xpEarned,
        total_xp: xpResult.totalXp,
        level_info: xpResult.levelInfo,
        new_achievements: newlyUnlocked,
        results: evaluatedAnswers
    };
};

const getPracticeResult = async (attemptId, userId) => {
    const attempt = await practiceModel.getPracticeAttemptById(attemptId);
    if (!attempt) {
        const error = new Error("Practice attempt not found");
        error.statusCode = 404;
        throw error;
    }

    if (attempt.user_id !== userId) {
        const error = new Error("Unauthorized to view this practice result");
        error.statusCode = 403;
        throw error;
    }

    const answers = await practiceModel.getPracticeAnswersByAttemptId(attemptId);

    return {
        attempt,
        answers
    };
};

const getUserPracticeHistory = async (userId) => {
    return await practiceModel.getUserPracticeHistory(userId);
};

module.exports = {
    startPractice,
    submitPractice,
    getPracticeResult,
    getUserPracticeHistory
};
