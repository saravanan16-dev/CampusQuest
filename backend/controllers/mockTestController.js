const mockTestService = require("../services/mockTestService");

const getMockTests = async (req, res) => {
    try {
        const { subjectId, subject_id } = req.query;
        const mockTests = await mockTestService.getAllMockTests(subjectId || subject_id);
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
        const data = await mockTestService.startMockTest({
            userId: req.user.id,
            mockTestId: req.params.id
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
        const attemptId = req.params.id; // or passed in body
        const { answers, attempt_id } = req.body;
        const targetAttemptId = attempt_id || attemptId;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: "Answers array is required"
            });
        }

        const data = await mockTestService.submitMockTest({
            userId: req.user.id,
            attemptId: targetAttemptId,
            answers
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
        const data = await mockTestService.getMockTestResult(req.params.id, req.user.id);
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
        const { title, subject_id, duration_minutes, total_marks, passing_marks, description, question_ids, marks_per_question } = req.body;

        if (!title || !subject_id) {
            return res.status(400).json({
                success: false,
                message: "Title and subject_id are required"
            });
        }

        const mockTest = await mockTestService.createMockTest({
            title,
            subject_id,
            duration_minutes,
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
