const { query } = require('../../db');
const { HttpError } = require('../../utils');
const { teacherTeachesSubject } = require('../../middleware/auth');

const parseOptions = (o) => (typeof o === 'string' ? JSON.parse(o) : o);

function checkShape({ type, options, correct_answer }) {
  const opts = type === 'true_false' ? ['True', 'False'] : options;
  if (!opts || opts.length < 2) throw new HttpError(400, 'A multiple-choice question needs at least two options', 'validation');
  if (new Set(opts).size !== opts.length) throw new HttpError(400, 'Options must be different from each other', 'validation');
  if (!opts.includes(correct_answer)) throw new HttpError(400, 'The correct answer must be one of the options', 'validation');
  return opts;
}

async function assertTopicInSubject(topic_id, subject_id) {
  const t = await query('SELECT id FROM topics WHERE id=? AND subject_id=?', [topic_id, subject_id]);
  if (!t.length) throw new HttpError(400, 'Topic does not belong to this subject', 'validation');
}

async function create(user, data) {
  if (!(await teacherTeachesSubject(user, data.subject_id))) throw new HttpError(403, 'You are not assigned to this subject');
  await assertTopicInSubject(data.topic_id, data.subject_id);
  const options = checkShape(data);
  const r = await query(
    `INSERT INTO questions (subject_id,topic_id,text,type,options,correct_answer,difficulty,explanation,created_by)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [data.subject_id, data.topic_id, data.text, data.type, JSON.stringify(options), data.correct_answer, data.difficulty, data.explanation || null, user.id]
  );
  return { id: r.insertId };
}

// Teacher view: includes answer keys, limited to subjects they teach.
async function listForTeacher(user, { subjectId, topicId, difficulty, q, page, limit, offset }) {
  const where = ['q.archived=0'];
  const params = [];
  if (user.role === 'teacher') {
    where.push('q.subject_id IN (SELECT subject_id FROM teacher_assignments WHERE teacher_id=?)');
    params.push(user.id);
  }
  if (subjectId) { where.push('q.subject_id=?'); params.push(subjectId); }
  if (topicId) { where.push('q.topic_id=?'); params.push(topicId); }
  if (difficulty) { where.push('q.difficulty=?'); params.push(difficulty); }
  if (q) { where.push('q.text LIKE ?'); params.push(`%${q}%`); }
  const from = `FROM questions q JOIN topics t ON t.id=q.topic_id JOIN subjects s ON s.id=q.subject_id WHERE ${where.join(' AND ')}`;
  const [{ total }] = await query(`SELECT COUNT(*) AS total ${from}`, params);
  const rows = await query(
    `SELECT q.id,q.subject_id,s.code AS subject_code,q.topic_id,t.name AS topic_name,q.text,q.type,q.options,
            q.correct_answer,q.difficulty,q.explanation ${from} ORDER BY q.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { items: rows.map((r) => ({ ...r, options: parseOptions(r.options) })), total, page, limit };
}

async function update(user, id, data) {
  const rows = await query('SELECT * FROM questions WHERE id=?', [id]);
  const q = rows[0];
  if (!q) throw new HttpError(404, 'Question not found');
  if (!(await teacherTeachesSubject(user, q.subject_id))) throw new HttpError(403, 'You cannot edit this question');
  // Editing a question that already has graded answers would silently rewrite history.
  const used = await query('SELECT 1 FROM submission_answers WHERE question_id=? LIMIT 1', [id]);
  if (used.length) throw new HttpError(409, 'This question already has submitted answers. Archive it and create a new one instead.', 'in_use');
  await assertTopicInSubject(data.topic_id, q.subject_id);
  const options = checkShape(data);
  await query(
    'UPDATE questions SET topic_id=?,text=?,type=?,options=?,correct_answer=?,difficulty=?,explanation=? WHERE id=?',
    [data.topic_id, data.text, data.type, JSON.stringify(options), data.correct_answer, data.difficulty, data.explanation || null, id]
  );
}

async function archive(user, id) {
  const rows = await query('SELECT subject_id FROM questions WHERE id=?', [id]);
  if (!rows[0]) throw new HttpError(404, 'Question not found');
  if (!(await teacherTeachesSubject(user, rows[0].subject_id))) throw new HttpError(403, 'You cannot archive this question');
  await query('UPDATE questions SET archived=1 WHERE id=?', [id]);
}

// ---- student practice (answer keys are never sent) ----
async function practiceQuestions(studentId, { topicId, difficulty, limit }) {
  const topic = await query(
    `SELECT t.id FROM topics t
     WHERE t.id=? AND t.subject_id IN (
       SELECT ta.subject_id FROM teacher_assignments ta JOIN student_enrollments e ON e.class_id=ta.class_id WHERE e.student_id=?)`,
    [topicId, studentId]
  );
  if (!topic.length) throw new HttpError(403, 'This topic is not part of your classes');
  const params = [topicId];
  let diff = '';
  if (difficulty) { diff = 'AND q.difficulty=?'; params.push(difficulty); }
  const rows = await query(
    `SELECT q.id,q.topic_id,q.text,q.type,q.options,q.difficulty FROM questions q
     WHERE q.topic_id=? AND q.archived=0 ${diff} ORDER BY RAND() LIMIT ?`,
    [...params, limit]
  );
  return rows.map((r) => ({ ...r, options: parseOptions(r.options) }));
}

async function checkPracticeAnswer(studentId, { questionId, selected }) {
  const rows = await query('SELECT * FROM questions WHERE id=? AND archived=0', [questionId]);
  const q = rows[0];
  if (!q) throw new HttpError(404, 'Question not found');
  const allowed = await query(
    `SELECT 1 FROM teacher_assignments ta JOIN student_enrollments e ON e.class_id=ta.class_id
     WHERE e.student_id=? AND ta.subject_id=? LIMIT 1`,
    [studentId, q.subject_id]
  );
  if (!allowed.length) throw new HttpError(403, 'This question is not part of your classes');
  const correct = selected === q.correct_answer;
  await query('INSERT INTO practice_attempts (student_id,question_id,selected_answer,is_correct) VALUES (?,?,?,?)', [
    studentId, questionId, selected, correct ? 1 : 0,
  ]);
  // The key is revealed only after the attempt is stored.
  return { correct, correct_answer: q.correct_answer, explanation: q.explanation };
}

module.exports = { create, listForTeacher, update, archive, practiceQuestions, checkPracticeAnswer, parseOptions };
