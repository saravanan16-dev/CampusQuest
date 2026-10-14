const router = require("express").Router();
const c = require("../controllers/questionController");
const { bulkImportQuestions } = require("../controllers/adminQuestionController");
router.post("/bulk", bulkImportQuestions); router.get("/", c.getQuestions); router.get("/:id", c.getQuestion); router.post("/", c.createQuestion); router.put("/:id", c.updateQuestion); router.delete("/:id", c.deleteQuestion);
module.exports = router;
