const router = require("express").Router();
const c = require("../controllers/unitController");
router.get("/", c.getUnits); router.post("/", c.createUnit); router.put("/:id", c.updateUnit); router.delete("/:id", c.deleteUnit);
module.exports = router;
