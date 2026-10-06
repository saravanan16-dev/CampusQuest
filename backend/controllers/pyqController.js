const pyqService = require("../services/pyqService");

const getPYQs = async (req, res) => {
    try {
        const { subjectId, subject_id, unitId, unit_id, year, marks, regulation, exam_type, semester } = req.query;
        const pyqs = await pyqService.getPYQs({
            subject_id: subject_id || subjectId,
            unit_id: unit_id || unitId,
            year,
            marks,
            regulation,
            exam_type,
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
                message: "Previous year question not found"
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
        const {
            subject_id,
            subjectId,
            unit_id,
            unitId,
            question,
            question_text,
            year,
            exam_type,
            regulation,
            marks,
            question_number,
            title,
            file_url,
            semester
        } = req.body;

        const targetSubjectId = subject_id || subjectId;
        const targetUnitId = unit_id || unitId;
        const targetQuestion = question || question_text || title;

        if (!targetSubjectId || !year || !targetQuestion) {
            return res.status(400).json({
                success: false,
                message: "subject_id, year, and question (or title) are required"
            });
        }

        const id = await pyqService.createPYQ({
            subject_id: targetSubjectId,
            unit_id: targetUnitId,
            question: targetQuestion,
            year,
            exam_type: exam_type || "Regular",
            regulation: regulation || "2021",
            marks: marks !== undefined ? marks : 13,
            question_number,
            title: title || targetQuestion,
            file_url,
            semester
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
