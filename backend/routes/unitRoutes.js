const express = require("express");
const {
    getUnits,
    getUnit,
    getUnitsBySubject,
    createUnit,
    updateUnit,
    deleteUnit
} = require("../controllers/unitController");

const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.get("/units", getUnits);
router.get("/units/:id", getUnit);
router.get("/subjects/:id/units", getUnitsBySubject);
router.post("/units", createUnit);
router.put("/units/:id", updateUnit);
router.delete("/units/:id", deleteUnit);

module.exports = router;
