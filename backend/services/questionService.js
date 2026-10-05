const questionModel = require("../models/questionModel");

const getQuestions = async (filters) => {
    return await questionModel.getQuestions(filters);
};

const getQuestionById = async (id) => {
    return await questionModel.getQuestionById(id);
};

const createQuestion = async ({ subject_id, unit, topic, question_text, difficulty, question_type, correct_answer, explanation, options }) => {
    const questionId = await questionModel.createQuestion({
        subject_id,
        unit,
        topic,
        question_text,
        difficulty,
        question_type,
        correct_answer,
        explanation
    });

    if (options && Array.isArray(options)) {
        for (const opt of options) {
            await questionModel.addOption(questionId, opt.key || opt.option_key, opt.text || opt.option_text);
        }
    }

    return await questionModel.getQuestionById(questionId);
};

const updateQuestion = async (id, data) => {
    await questionModel.updateQuestion(id, data);
    if (data.options && Array.isArray(data.options)) {
        await questionModel.deleteOptionsByQuestionId(id);
        for (const opt of data.options) {
            await questionModel.addOption(id, opt.key || opt.option_key, opt.text || opt.option_text);
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
