const questionService = require("../services/questionService");

const getQuestions = async (req, res) => {
    try {
        const { subjectId, subject_id, unit, difficulty, topic, limit } = req.query;
        const questions = await questionService.getQuestions({
            subject_id: subjectId || subject_id,
            unit,
            difficulty,
            topic,
            limit
        });

        res.json({
            success: true,
            data: questions
        });
    } catch (error) {
        console.error("Get questions error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching questions"
        });
    }
};

const getQuestion = async (req, res) => {
    try {
        const question = await questionService.getQuestionById(req.params.id);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question not found"
            });
        }

        res.json({
            success: true,
            data: question
        });
    } catch (error) {
        console.error("Get question error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching question"
        });
    }
};

const createQuestion = async (req, res) => {
    try {
        const { subject_id, unit, topic, question_text, difficulty, question_type, correct_answer, explanation, options } = req.body;

        if (!subject_id || !unit || !question_text || !correct_answer) {
            return res.status(400).json({
                success: false,
                message: "Subject ID, unit, question text, and correct answer are required"
            });
        }

        const question = await questionService.createQuestion({
            subject_id,
            unit,
            topic: topic || "General",
            question_text,
            difficulty: difficulty || "MEDIUM",
            question_type: question_type || "MCQ",
            correct_answer,
            explanation,
            options: options || []
        });

        res.status(201).json({
            success: true,
            data: question
        });
    } catch (error) {
        console.error("Create question error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while creating question"
        });
    }
};

const updateQuestion = async (req, res) => {
    try {
        const updated = await questionService.updateQuestion(req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Question not found"
            });
        }

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error("Update question error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while updating question"
        });
    }
};

const deleteQuestion = async (req, res) => {
    try {
        const result = await questionService.deleteQuestion(req.params.id);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Question not found"
            });
        }

        res.json({
            success: true,
            message: "Question deleted successfully"
        });
    } catch (error) {
        console.error("Delete question error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while deleting question"
        });
    }
};

module.exports = {
    getQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion
};
