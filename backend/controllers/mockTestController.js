const mockTestService = require("../services/mockTestService");

const getMockTests = async (req, res) => {
    try {
        const { subjectId, subject_id } = req.query;
        const mockTests = await mockTestService.getAllMockTests(subject_id || subjectId);
        res.json({
            success: true,
            data: mockTests
        });
    } catch (error) {
        console.error("Get mock tests error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching mock tests"
        });
    }
};

const getMockTest = async (req, res) => {
    try {
        const mockTest = await mockTestService.getMockTestById(req.params.id);
        if (!mockTest) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found"
            });
        }

        res.json({
            success: true,
            data: mockTest
        });
    } catch (error) {
        console.error("Get mock test error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching mock test"
        });
    }
};

const startMockTest = async (req, res) => {
    try {
        const mockTestId = req.params.id || req.body.mock_test_id || req.body.mockTestId;
        if (!mockTestId) {
            return res.status(400).json({
                success: false,
                message: "mock_test_id is required"
            });
        }

        const data = await mockTestService.startMockTest({
            userId: req.user.id,
            mockTestId
        });

        res.status(201).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Start mock test error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to start mock test"
        });
    }
};

const submitMockTest = async (req, res) => {
    try {
        const attemptId = req.params.id || req.body.attempt_id || req.body.attemptId;
        const { answers, time_used_seconds, time_taken_seconds } = req.body;

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

        const data = await mockTestService.submitMockTest({
            userId: req.user.id,
            attemptId,
            answers,
            timeUsedSeconds: time_used_seconds || time_taken_seconds || 0
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Submit mock test error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to submit mock test"
        });
    }
};

const getMockTestResult = async (req, res) => {
    try {
        const attemptId = req.params.id || req.query.attempt_id || req.params.attemptId;
        const data = await mockTestService.getMockTestResult(attemptId, req.user.id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Get mock test result error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to retrieve mock test result"
        });
    }
};

const getUserTestHistory = async (req, res) => {
    try {
        const history = await mockTestService.getUserTestHistory(req.user.id);
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error("Get test history error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve test history"
        });
    }
};

const createMockTest = async (req, res) => {
    try {
        const {
            title,
            subject_id,
            subjectId,
            duration,
            duration_minutes,
            total_questions,
            total_marks,
            passing_marks,
            description,
            question_ids,
            marks_per_question
        } = req.body;

        const targetSubId = subject_id || subjectId;
        if (!title || !targetSubId) {
            return res.status(400).json({
                success: false,
                message: "Title and subject_id are required"
            });
        }

        const mockTest = await mockTestService.createMockTest({
            title,
            subject_id: targetSubId,
            duration: duration || duration_minutes || 30,
            duration_minutes: duration || duration_minutes || 30,
            total_questions,
            total_marks,
            passing_marks,
            description,
            question_ids,
            marks_per_question
        });

        res.status(201).json({
            success: true,
            data: mockTest
        });
    } catch (error) {
        console.error("Create mock test error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while creating mock test"
        });
    }
};

const deleteMockTest = async (req, res) => {
    try {
        const result = await mockTestService.deleteMockTest(req.params.id);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found"
            });
        }

        res.json({
            success: true,
            message: "Mock test deleted successfully"
        });
    } catch (error) {
        console.error("Delete mock test error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while deleting mock test"
        });
    }
};

module.exports = {
    getMockTests,
    getMockTest,
    startMockTest,
    submitMockTest,
    getMockTestResult,
    getUserTestHistory,
    createMockTest,
    deleteMockTest
};
