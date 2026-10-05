const subjectService = require("../services/subjectService");

const getSubjects = async (req, res) => {
    try {
        const { semester } = req.query;
        const subjects = await subjectService.getAllSubjects(semester);
        res.json({
            success: true,
            data: subjects
        });
    } catch (error) {
        console.error("Get subjects error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching subjects"
        });
    }
};

const getSubject = async (req, res) => {
    try {
        const subject = await subjectService.getSubjectById(req.params.id);

        if (!subject) {
            return res.status(404).json({
                success: false,
                message: "Subject not found"
            });
        }

        res.json({
            success: true,
            data: subject
        });
    } catch (error) {
        console.error("Get subject error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching subject"
        });
    }
};

const addSubject = async (req, res) => {
    try {
        const { name, description, semester } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Subject name is required"
            });
        }

        const id = await subjectService.createSubject({ name, description, semester });

        res.status(201).json({
            success: true,
            data: {
                id,
                name,
                description: description || "",
                semester: semester || 1
            }
        });
    } catch (error) {
        console.error("Add subject error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while creating subject"
        });
    }
};

const updateSubject = async (req, res) => {
    try {
        const { name, description, semester } = req.body;

        const result = await subjectService.updateSubject(req.params.id, {
            name,
            description,
            semester
        });

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Subject not found"
            });
        }

        const updated = await subjectService.getSubjectById(req.params.id);

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error("Update subject error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while updating subject"
        });
    }
};

const deleteSubject = async (req, res) => {
    try {
        const result = await subjectService.deleteSubject(req.params.id);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Subject not found"
            });
        }

        res.json({
            success: true,
            message: "Subject deleted successfully"
        });
    } catch (error) {
        console.error("Delete subject error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while deleting subject"
        });
    }
};

module.exports = {
    getSubjects,
    getSubject,
    addSubject,
    updateSubject,
    deleteSubject
};