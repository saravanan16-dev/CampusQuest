const db = require("../config/db");
const questionService = require("../services/questionService");

// Bulk imports accept already-parsed CSV/XLSX rows. Validation happens before a row is persisted.
const bulkImportQuestions = async (req, res) => {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json({ success: false, message: "A non-empty rows array is required" });
    if (rows.length > 500) return res.status(400).json({ success: false, message: "Import is limited to 500 questions at a time" });

    const errors = [];
    const prepared = [];
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const subjectName = String(row.subject || "").trim();
        const unitName = String(row.unit || "").trim();
        const correct = String(row.correct || row.correct_answer || "").trim().toUpperCase();
        const question = String(row.question || row.question_text || "").trim();
        const options = ["A", "B", "C", "D"].map(key => ({ key, text: String(row[`option${key}`] || row[`option_${key.toLowerCase()}`] || "").trim() }));
        if (!subjectName || !unitName || !question || !/^[A-D]$/.test(correct) || options.some(option => !option.text)) {
            errors.push({ row: index + 1, message: "subject, unit, question, optionA-D, and correct (A-D) are required" });
            continue;
        }
        const [subjects] = await db.query("SELECT id FROM subjects WHERE LOWER(name) = LOWER(?) LIMIT 1", [subjectName]);
        if (!subjects[0]) { errors.push({ row: index + 1, message: `Subject '${subjectName}' was not found` }); continue; }
        const [units] = await db.query("SELECT id, unit_number FROM units WHERE subject_id = ? AND (LOWER(name) = LOWER(?) OR unit_number = ?) LIMIT 1", [subjects[0].id, unitName, Number(unitName.replace(/\D/g, "")) || 0]);
        if (!units[0]) { errors.push({ row: index + 1, message: `Unit '${unitName}' was not found for ${subjectName}` }); continue; }
        const difficulty = String(row.difficulty || "MEDIUM").toUpperCase();
        if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) { errors.push({ row: index + 1, message: "difficulty must be EASY, MEDIUM, or HARD" }); continue; }
        prepared.push({ subject_id: subjects[0].id, unit_id: units[0].id, unit: units[0].unit_number, topic: row.topic || "General", question, difficulty, correct_answer: correct, explanation: row.explanation || "", options });
    }
    if (errors.length) return res.status(422).json({ success: false, message: "Import validation failed; no questions were imported", errors });
    if (req.body.preview === true) return res.json({ success: true, data: { valid: prepared.length, preview: prepared.map(({ options, ...row }) => row) } });
    const created = [];
    for (const item of prepared) created.push(await questionService.createQuestion(item));
    res.status(201).json({ success: true, data: { imported: created.length, questions: created } });
};

module.exports = { bulkImportQuestions };
