const pyqService = require("../services/pyqService");

const getPYQs = async (req, res) => {
    try {
        const { subjectId, subject_id, year, regulation, semester } = req.query;
        const pyqs = await pyqService.getPYQs({
            subject_id: subjectId || subject_id,
            year,
            regulation,
            semester
        });

        res.json({
            success: true,
            data: pyqs
        });
    } catch (error) {
        console.error("Get PYQs error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching previous year questions"
        });
    }
};

const getPYQ = async (req, res) => {
    try {
        const pyq = await pyqService.getPYQById(req.params.id);
        if (!pyq) {
            return res.status(404).json({
                success: false,
                message: "Previous year question paper not found"
            });
        }

        res.json({
            success: true,
            data: pyq
        });
    } catch (error) {
        console.error("Get PYQ error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching PYQ"
        });
    }
};

const createPYQ = async (req, res) => {
    try {
        const { subject_id, regulation, year, semester, exam_type, title, file_url } = req.body;

        if (!subject_id || !regulation || !year || !semester || !title) {
            return res.status(400).json({
                success: false,
                message: "Subject ID, regulation, year, semester, and title are required"
            });
        }

        const id = await pyqService.createPYQ({
            subject_id,
            regulation,
            year,
            semester,
            exam_type,
            title,
            file_url
        });

        const created = await pyqService.getPYQById(id);
        res.status(201).json({
            success: true,
            data: created
        });
    } catch (error) {
        console.error("Create PYQ error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while creating PYQ"
        });
    }
};

const updatePYQ = async (req, res) => {
    try {
        const result = await pyqService.updatePYQ(req.params.id, req.body);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "PYQ not found"
            });
        }

        const updated = await pyqService.getPYQById(req.params.id);
        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error("Update PYQ error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while updating PYQ"
        });
    }
};

const deletePYQ = async (req, res) => {
    try {
        const result = await pyqService.deletePYQ(req.params.id);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "PYQ not found"
            });
        }

        res.json({
            success: true,
            message: "PYQ deleted successfully"
        });
    } catch (error) {
        console.error("Delete PYQ error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while deleting PYQ"
        });
    }
};

module.exports = {
    getPYQs,
    getPYQ,
    createPYQ,
    updatePYQ,
    deletePYQ
};
