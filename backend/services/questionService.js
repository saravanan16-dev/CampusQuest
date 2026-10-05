const questionModel = require("../models/questionModel");

const getQuestions = async (filters = {}) => {
    return await questionModel.getQuestions(filters);
};

const getQuestionById = async (id) => {
    return await questionModel.getQuestionById(id);
};

const createQuestion = async ({ subject_id, unit_id, unit, topic, question, question_text, difficulty, question_type, correct_answer, explanation, options }) => {
    const qText = question || question_text;
    
    // Determine correct_answer from options if is_correct is set
    const defaultKeys = ["A", "B", "C", "D", "E", "F"];
    let resolvedCorrectAnswer = correct_answer;
    if (options && Array.isArray(options)) {
        const correctIdx = options.findIndex(o => o.is_correct === true || o.is_correct === 1 || o.is_correct === "true");
        if (correctIdx !== -1) {
            resolvedCorrectAnswer = options[correctIdx].option_key || options[correctIdx].key || defaultKeys[correctIdx];
        }
    }
    if (!resolvedCorrectAnswer) {
        resolvedCorrectAnswer = "A";
    }

    const questionId = await questionModel.createQuestion({
        subject_id,
        unit_id,
        unit,
        topic,
        question: qText,
        question_text: qText,
        difficulty,
        question_type,
        correct_answer: resolvedCorrectAnswer,
        explanation
    });

    if (options && Array.isArray(options)) {
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const key = opt.option_key || opt.key || defaultKeys[i];
            const text = opt.option_text || opt.text || "";
            const isCorrect = (opt.is_correct === true || opt.is_correct === 1 || opt.is_correct === "true") || (key === resolvedCorrectAnswer);
            await questionModel.addOption(questionId, key, text, isCorrect);
        }
    }

    return await questionModel.getQuestionById(questionId);
};

const updateQuestion = async (id, data) => {
    await questionModel.updateQuestion(id, data);
    if (data.options && Array.isArray(data.options)) {
        await questionModel.deleteOptionsByQuestionId(id);
        const defaultKeys = ["A", "B", "C", "D", "E", "F"];
        for (let i = 0; i < data.options.length; i++) {
            const opt = data.options[i];
            const key = opt.option_key || opt.key || defaultKeys[i];
            const text = opt.option_text || opt.text || "";
            const isCorrect = opt.is_correct === true || opt.is_correct === 1 || key === data.correct_answer;
            await questionModel.addOption(id, key, text, isCorrect);
        }
    }
    return await questionModel.getQuestionById(id);
};

const deleteQuestion = async (id) => {
    return await questionModel.deleteQuestion(id);
};

module.exports = {
    getQuestions,
    getQuestionById,
    createQuestion,
    updateQuestion,
    deleteQuestion
};
