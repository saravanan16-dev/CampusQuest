const unitService = require("../services/unitService");

const getUnits = async (req, res) => {
    try {
        const { subject_id, subjectId } = req.query;
        const targetSubjectId = subject_id || subjectId;
        const units = await unitService.getAllUnits(targetSubjectId);
        res.json({
            success: true,
            data: units
        });
    } catch (error) {
        console.error("Get units error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching units"
        });
    }
};

const getUnit = async (req, res) => {
    try {
        const unit = await unitService.getUnitById(req.params.id);
        if (!unit) {
            return res.status(404).json({
                success: false,
                message: "Unit not found"
            });
        }
        res.json({
            success: true,
            data: unit
        });
    } catch (error) {
        console.error("Get unit error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching unit"
        });
    }
};

const getUnitsBySubject = async (req, res) => {
    try {
        const units = await unitService.getUnitsBySubjectId(req.params.id);
        res.json({
            success: true,
            data: units
        });
    } catch (error) {
        console.error("Get units by subject error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching units for subject"
        });
    }
};

const createUnit = async (req, res) => {
    try {
        const { subject_id, unit_number, name } = req.body;
        if (!subject_id || !unit_number || !name) {
            return res.status(400).json({
                success: false,
                message: "subject_id, unit_number, and name are required"
            });
        }

        const unit = await unitService.createUnit({
            subject_id: Number(subject_id),
            unit_number: Number(unit_number),
            name
        });

        res.status(201).json({
            success: true,
            data: unit
        });
    } catch (error) {
        console.error("Create unit error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while creating unit"
        });
    }
};

const updateUnit = async (req, res) => {
    try {
        const { unit_number, name } = req.body;
        const unit = await unitService.updateUnit(req.params.id, { unit_number, name });
        if (!unit) {
            return res.status(404).json({
                success: false,
                message: "Unit not found"
            });
        }
        res.json({
            success: true,
            data: unit
        });
    } catch (error) {
        console.error("Update unit error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while updating unit"
        });
    }
};

const deleteUnit = async (req, res) => {
    try {
        const result = await unitService.deleteUnit(req.params.id);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Unit not found"
            });
        }
        res.json({
            success: true,
            message: "Unit deleted successfully"
        });
    } catch (error) {
        console.error("Delete unit error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while deleting unit"
        });
    }
};

module.exports = {
    getUnits,
    getUnit,
    getUnitsBySubject,
    createUnit,
    updateUnit,
    deleteUnit
};
