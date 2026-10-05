const questionModel = require("../models/questionModel");
const practiceModel = require("../models/practiceModel");
const progressModel = require("../models/progressModel");
const gamificationService = require("./gamificationService");

const startPractice = async ({ userId, subject_id, subjectId, unit_id, unitId, unit, difficulty, count = 5 }) => {
    const targetSubjectId = subject_id || subjectId;
    const targetUnitId = unit_id || unitId;

    // 1. Get randomized questions
    const questions = await questionModel.getQuestionsForPractice({
        subject_id: targetSubjectId,
        unit_id: targetUnitId,
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
        subject_id: targetSubjectId,
        unit_id: targetUnitId,
        unit: unit ? Number(unit) : null,
        difficulty: difficulty || "ALL",
        total_questions: questions.length
    });

    return {
        attempt_id: attemptId,
        id: attemptId,
        subject_id: targetSubjectId,
        unit_id: targetUnitId,
        unit: unit,
        total_questions: questions.length,
        questions: questions.map(q => ({
            id: q.id,
            subject_id: q.subject_id,
            unit_id: q.unit_id,
            unit: q.unit,
            topic: q.topic,
            question: q.question || q.question_text,
            question_text: q.question_text || q.question,
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
    const review = [];

    for (const item of answers) {
        const question = await questionModel.getQuestionById(item.question_id);
        if (!question) continue;

        let isCorrect = false;
        let selectedOptionId = item.selected_option_id || item.option_id || null;
        let selectedOptionKey = item.selected_option || null;
        let yourAnswerText = "";

        const options = question.options || [];
        const correctOpt = options.find(o => o.is_correct === 1 || o.is_correct === true || o.option_key === question.correct_answer);
        const correctAnswerText = correctOpt ? correctOpt.option_text : question.correct_answer;

        if (selectedOptionId) {
            const chosen = options.find(o => o.id === Number(selectedOptionId));
            if (chosen) {
                selectedOptionKey = chosen.option_key;
                yourAnswerText = chosen.option_text;
                if (chosen.is_correct === 1 || chosen.is_correct === true || chosen.option_key === question.correct_answer) {
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
                if (chosen.is_correct === 1 || chosen.is_correct === true || chosen.option_key === question.correct_answer) {
                    isCorrect = true;
                }
            } else {
                yourAnswerText = String(selectedOptionKey);
                if (String(selectedOptionKey).trim().toUpperCase() === String(question.correct_answer).trim().toUpperCase()) {
                    isCorrect = true;
                }
            }
        }

        if (isCorrect) {
            correctCount++;
        } else {
            incorrectCount++;
        }

        await practiceModel.savePracticeAnswer({
            practice_attempt_id: attemptId,
            attempt_id: attemptId,
            question_id: question.id,
            selected_option_id: selectedOptionId,
            selected_option: selectedOptionKey || yourAnswerText,
            is_correct: isCorrect
        });

        review.push({
            question_id: question.id,
            question: question.question || question.question_text,
            question_text: question.question_text || question.question,
            topic: question.topic,
            difficulty: question.difficulty,
            selected_option: selectedOptionKey,
            selected_option_id: selectedOptionId,
            your_answer: yourAnswerText || selectedOptionKey || "Not Answered",
            correct_answer: question.correct_answer,
            correct_answer_text: correctAnswerText,
            is_correct: isCorrect,
            explanation: question.explanation,
            options: options
        });
    }

    const totalAnswered = correctCount + incorrectCount;
    const totalQuestions = attempt.total_questions || totalAnswered;
    const percentage = totalAnswered > 0 ? Number(((correctCount / totalAnswered) * 100).toFixed(2)) : 0;
    const accuracy = percentage;

    // Calculate XP: +10 for practice session completion, +5 per correct answer
    let xpEarned = 10 + (correctCount * 5);
    if (accuracy === 100 && totalAnswered >= 3) {
        xpEarned += 20;
    }

    // 1. Update practice attempt record
    await practiceModel.updatePracticeAttempt(attemptId, {
        score: correctCount,
        total_questions: totalAnswered,
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
        await gamificationService.awardXP(userId, 0, "Perfect Score check");
    }

    // 6. Check and unlock achievements
    const newlyUnlocked = await gamificationService.checkAndUnlockAchievements(userId);

    return {
        attempt_id: attemptId,
        id: attemptId,
        subject_id: attempt.subject_id,
        subject_name: attempt.subject_name,
        score: correctCount,
        total_questions: totalAnswered,
        percentage,
        accuracy,
        correct_answers: correctCount,
        incorrect_answers: incorrectCount,
        time_taken_seconds: timeTakenSeconds,
        xp_earned: xpEarned,
        total_xp: xpResult.totalXp,
        level_info: xpResult.levelInfo,
        new_achievements: newlyUnlocked,
        review,
        results: review
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

    const review = answers.map(a => ({
        question_id: a.question_id,
        question: a.question || a.question_text,
        question_text: a.question_text || a.question,
        topic: a.topic,
        difficulty: a.difficulty,
        selected_option: a.selected_option,
        selected_option_id: a.selected_option_id,
        your_answer: a.selected_option_text || a.selected_option || "Not Answered",
        correct_answer: a.correct_answer,
        correct_answer_text: a.correct_option_text || a.correct_answer,
        is_correct: Boolean(a.is_correct),
        explanation: a.explanation,
        options: a.options
    }));

    const score = attempt.score !== null ? attempt.score : (attempt.correct_answers || 0);
    const totalQuestions = attempt.total_questions || answers.length;
    const percentage = totalQuestions > 0 ? Number(((score / totalQuestions) * 100).toFixed(2)) : 0;

    return {
        attempt_id: attempt.id,
        id: attempt.id,
        score,
        total_questions: totalQuestions,
        percentage,
        correct_answers: attempt.correct_answers !== null ? attempt.correct_answers : score,
        incorrect_answers: attempt.incorrect_answers !== null ? attempt.incorrect_answers : (totalQuestions - score),
        accuracy: attempt.accuracy || percentage,
        time_taken_seconds: attempt.time_taken_seconds,
        xp_earned: attempt.xp_earned,
        completed_at: attempt.completed_at || attempt.created_at,
        created_at: attempt.created_at,
        subject_id: attempt.subject_id,
        subject_name: attempt.subject_name,
        unit_id: attempt.unit_id,
        unit_name: attempt.unit_name,
        unit_number: attempt.unit_number,
        attempt,
        answers,
        review,
        results: review
    };
};

const getUserPracticeHistory = async (userId) => {
    const history = await practiceModel.getUserPracticeHistory(userId);
    return history.map(item => {
        const score = item.score !== null ? item.score : (item.correct_answers || 0);
        const total = item.total_questions || 0;
        const percentage = total > 0 ? Number(((score / total) * 100).toFixed(2)) : (item.accuracy || 0);
        return {
            ...item,
            score,
            percentage,
            completed_at: item.completed_at || item.created_at
        };
    });
};

module.exports = {
    startPractice,
    submitPractice,
    getPracticeResult,
    getUserPracticeHistory
};
