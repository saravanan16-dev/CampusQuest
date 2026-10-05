const aiService = require("../services/aiService");

const getPersonalizedRecommendations = async (req, res) => {
    try {
        const data = await aiService.getPersonalizedRecommendations(req.user.id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("AI recommendations error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to generate personalized recommendations"
        });
    }
};

const explainConcept = async (req, res) => {
    try {
        const { concept, subject_name } = req.body;
        if (!concept) {
            return res.status(400).json({
                success: false,
                message: "Concept is required for explanation"
            });
        }

        const data = await aiService.explainConcept(concept, subject_name);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Explain concept error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to explain concept"
        });
    }
};

const explainWrongAnswer = async (req, res) => {
    try {
        const { question_text, selected_answer, correct_answer, explanation } = req.body;
        if (!question_text || !selected_answer || !correct_answer) {
            return res.status(400).json({
                success: false,
                message: "question_text, selected_answer, and correct_answer are required"
            });
        }

        const data = await aiService.explainWrongAnswer({
            questionText: question_text,
            selectedAnswer: selected_answer,
            correctAnswer: correct_answer,
            explanation
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Explain wrong answer error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to explain answer"
        });
    }
};

const getExamIntelligence = async (req, res) => {
    try {
        const data = await aiService.getExamIntelligence(req.params.subjectId);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Exam intelligence error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to generate exam intelligence"
        });
    }
};

module.exports = {
    getPersonalizedRecommendations,
    explainConcept,
    explainWrongAnswer,
    getExamIntelligence
};
