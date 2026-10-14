const router = require("express").Router();
const c = require("../controllers/pyqController");
router.get("/", c.getPYQs); router.get("/:id", c.getPYQ); router.post("/", c.createPYQ); router.put("/:id", c.updatePYQ); router.delete("/:id", c.deletePYQ);
module.exports = router;
