const router = require("express").Router();
const c = require("../controllers/subjectController");
router.get("/", c.getSubjects); router.post("/", c.addSubject); router.put("/:id", c.updateSubject); router.delete("/:id", c.deleteSubject);
module.exports = router;
