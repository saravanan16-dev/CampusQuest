const practiceService = require("../services/practiceService");

const startPractice = async (req, res) => {
    try {
        const { subject_id, subjectId, unit, unit_id, unitId, difficulty, count } = req.body;
        const targetSubjectId = subject_id || subjectId;

        if (!targetSubjectId) {
            return res.status(400).json({
                success: false,
                message: "subject_id is required to start a practice session"
            });
        }

        const data = await practiceService.startPractice({
            userId: req.user.id,
            subject_id: targetSubjectId,
            subjectId: targetSubjectId,
            unit_id: unit_id || unitId,
            unitId: unit_id || unitId,
            unit,
            difficulty,
            count: count || 5
        });

        res.status(201).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Start practice error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to start practice session"
        });
    }
};

const submitPractice = async (req, res) => {
    try {
        const attemptId = req.params.id || req.body.attempt_id || req.body.practice_attempt_id || req.body.id;
        const { answers, time_taken_seconds } = req.body;

        if (!attemptId) {
            return res.status(400).json({
                success: false,
                message: "attempt_id is required"
            });
        }

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: "Answers array is required"
            });
        }

        const data = await practiceService.submitPractice({
            userId: req.user.id,
            attemptId,
            answers,
            timeTakenSeconds: time_taken_seconds || 0
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Submit practice error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to submit practice session"
        });
    }
};

const getPracticeResult = async (req, res) => {
    try {
        const attemptId = req.params.id || req.query.attempt_id || req.params.attemptId;
        const data = await practiceService.getPracticeResult(attemptId, req.user.id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Get practice result error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to retrieve practice result"
        });
    }
};

const getUserPracticeHistory = async (req, res) => {
    try {
        const history = await practiceService.getUserPracticeHistory(req.user.id);
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error("Get practice history error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve practice history"
        });
    }
};

module.exports = {
    startPractice,
    submitPractice,
    getPracticeResult,
    getUserPracticeHistory
};
