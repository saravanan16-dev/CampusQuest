const progressService = require("../services/progressService");

const getOverallProgress = async (req, res) => {
    try {
        const data = await progressService.getOverallProgress(req.user.id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Get overall progress error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching progress"
        });
    }
};

const getSubjectProgress = async (req, res) => {
    try {
        const data = await progressService.getSubjectProgress(req.user.id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Get subject progress error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching subject progress"
        });
    }
};

const getWeakAreas = async (req, res) => {
    try {
        const data = await progressService.getWeakAreas(req.user.id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Get weak areas error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while analyzing weak areas"
        });
    }
};

module.exports = {
    getOverallProgress,
    getSubjectProgress,
    getWeakAreas
};
