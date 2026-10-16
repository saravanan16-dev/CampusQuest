const config = require('../../config');
const { query } = require('../../db');
const { HttpError } = require('../../utils');
const { teacherTeachesClass, studentEnrolled } = require('../../middleware/auth');
const resources = require('../resources/resources.service');

const rules = () => config.rules;

// ---- pure rules live in rules.js; these wrappers bind the configured thresholds ----
const pure = require('./rules');
const ratio = pure.ratio;
const classify = (c, n, r = rules()) => pure.classify(c, n, r);
const classGap = (cc, ca, ws, as, r = rules()) => pure.classGap(cc, ca, ws, as, r);
const improvement = (rows, r = rules()) => pure.improvement(rows, r);

// ---- scoping ----
// Subjects the user may analyse inside a class.
async function allowedSubjects(user, classId, subjectId) {
  const rows =
    user.role === 'teacher'
      ? await query('SELECT DISTINCT subject_id FROM teacher_assignments WHERE teacher_id=? AND class_id=?', [user.id, classId])
      : await query('SELECT DISTINCT subject_id FROM teacher_assignments WHERE class_id=?', [classId]);
  let ids = rows.map((r) => r.subject_id);
  if (subjectId) ids = ids.filter((s) => s === subjectId);
  return ids;
}

async function assertTeacherClass(user, classId) {
  if (!(await teacherTeachesClass(user, classId))) throw new HttpError(403, 'You do not have access to this class');
}

// ---- student analytics ----
// Per-topic accuracy from graded submissions only, so every figure is traceable to stored answers.
async function topicStatsForStudent(studentId, { subjectId } = {}) {
  const params = [studentId];
  let subj = '';
  if (subjectId) { subj = 'AND a.subject_id=?'; params.push(subjectId); }
  const rows = await query(
    `SELECT t.id AS topic_id, t.name AS topic_name, s.id AS subject_id, s.code AS subject_code,
            SUM(sa.is_correct) AS correct, COUNT(*) AS attempted
     FROM submission_answers sa
     JOIN submissions sb ON sb.id=sa.submission_id AND sb.submitted_at IS NOT NULL
     JOIN assessments a ON a.id=sb.assessment_id
     JOIN questions q ON q.id=sa.question_id
     JOIN topics t ON t.id=q.topic_id JOIN subjects s ON s.id=t.subject_id
     WHERE sb.student_id=? ${subj}
     GROUP BY t.id, t.name, s.id, s.code ORDER BY s.code, t.name`,
    params
  );
  return rows.map((r) => {
    const correct = Number(r.correct);
    const attempted = Number(r.attempted);
    return { ...r, correct, attempted, accuracy: ratio(correct, attempted), status: classify(correct, attempted) };
  });
}

async function topicHistoryForStudent(studentId, subjectId) {
  const params = [studentId];
  let subj = '';
  if (subjectId) { subj = 'AND a.subject_id=?'; params.push(subjectId); }
  return query(
    `SELECT q.topic_id, sb.id AS submission_id, sb.submitted_at, SUM(sa.is_correct) AS correct, COUNT(*) AS attempted
     FROM submission_answers sa
     JOIN submissions sb ON sb.id=sa.submission_id AND sb.submitted_at IS NOT NULL
     JOIN assessments a ON a.id=sb.assessment_id JOIN questions q ON q.id=sa.question_id
     WHERE sb.student_id=? ${subj} GROUP BY q.topic_id, sb.id, sb.submitted_at`,
    params
  );
}

async function studentTopics(studentId, opts) {
  const stats = await topicStatsForStudent(studentId, opts);
  const history = await topicHistoryForStudent(studentId, opts && opts.subjectId);
  const byTopic = new Map();
  for (const h of history) {
    if (!byTopic.has(h.topic_id)) byTopic.set(h.topic_id, []);
    byTopic.get(h.topic_id).push(h);
  }
  return stats.map((s) => ({ ...s, improvement: improvement(byTopic.get(s.topic_id) || []) }));
}

async function studentTrend(studentId) {
  const rows = await query(
    `SELECT sb.id AS submission_id, a.title, s.code AS subject_code, sb.submitted_at, sb.total_score, sb.max_score
     FROM submissions sb JOIN assessments a ON a.id=sb.assessment_id JOIN subjects s ON s.id=a.subject_id
     WHERE sb.student_id=? AND sb.submitted_at IS NOT NULL ORDER BY sb.submitted_at`,
    [studentId]
  );
  return rows.map((r) => ({ ...r, percent: r.max_score ? Math.round((r.total_score / r.max_score) * 1000) / 10 : null }));
}

// ---- recommendations (rule-based, with the reason attached) ----
async function recommendations(studentId, { subjectId } = {}) {
  const stats = (await topicStatsForStudent(studentId, { subjectId })).filter((s) => s.status === 'weak');
  stats.sort((a, b) => a.accuracy - b.accuracy);
  const topicIds = stats.map((s) => s.topic_id);
  const res = await resources.forTopicsForStudent(studentId, topicIds);
  const out = [];
  for (const s of stats) {
    // Exclude questions the student already got right, in an assessment or in practice.
    const qs = await query(
      `SELECT q.id, q.text, q.difficulty FROM questions q
       WHERE q.topic_id=? AND q.archived=0
         AND q.id NOT IN (SELECT sa.question_id FROM submission_answers sa JOIN submissions sb ON sb.id=sa.submission_id
                          WHERE sb.student_id=? AND sa.is_correct=1)
         AND q.id NOT IN (SELECT pa.question_id FROM practice_attempts pa WHERE pa.student_id=? AND pa.is_correct=1)
       ORDER BY FIELD(q.difficulty,'easy','medium','hard'), q.id LIMIT 5`,
      [s.topic_id, studentId, studentId]
    );
    out.push({
      topic_id: s.topic_id,
      topic_name: s.topic_name,
      subject_code: s.subject_code,
      accuracy: s.accuracy,
      correct: s.correct,
      attempted: s.attempted,
      reason: `${s.topic_name}: ${s.correct} of ${s.attempted} correct (${Math.round(s.accuracy * 100)}%)`,
      questions: qs,
      resources: res.filter((r) => r.topic_id === s.topic_id),
    });
  }
  return out;
}

// ---- class analytics (teacher) ----
async function classTopics(user, classId, subjectId) {
  await assertTeacherClass(user, classId);
  const subjects = await allowedSubjects(user, classId, subjectId);
  if (!subjects.length) return [];
  const rows = await query(
    `SELECT t.id AS topic_id, t.name AS topic_name, s.code AS subject_code, sb.student_id,
            SUM(sa.is_correct) AS correct, COUNT(*) AS attempted
     FROM submission_answers sa
     JOIN submissions sb ON sb.id=sa.submission_id AND sb.submitted_at IS NOT NULL
     JOIN assessments a ON a.id=sb.assessment_id AND a.class_id=?
     JOIN questions q ON q.id=sa.question_id JOIN topics t ON t.id=q.topic_id JOIN subjects s ON s.id=t.subject_id
     WHERE a.subject_id IN (?) GROUP BY t.id, t.name, s.code, sb.student_id`,
    [classId, subjects]
  );
  const topics = new Map();
  for (const r of rows) {
    if (!topics.has(r.topic_id)) topics.set(r.topic_id, { topic_id: r.topic_id, topic_name: r.topic_name, subject_code: r.subject_code, correct: 0, attempted: 0, weak_students: 0, assessed_students: 0, students: 0 });
    const t = topics.get(r.topic_id);
    const c = Number(r.correct);
    const n = Number(r.attempted);
    t.correct += c;
    t.attempted += n;
    t.students += 1;
    if (n >= rules().minAttempts) {
      t.assessed_students += 1;
      if (classify(c, n) === 'weak') t.weak_students += 1;
    }
  }
  return [...topics.values()]
    .map((t) => ({
      ...t,
      accuracy: ratio(t.correct, t.attempted),
      weak_share: t.assessed_students ? t.weak_students / t.assessed_students : null,
      is_gap: classGap(t.correct, t.attempted, t.weak_students, t.assessed_students),
    }))
    .sort((a, b) => (a.accuracy ?? 2) - (b.accuracy ?? 2));
}

async function classSummary(user, classId, subjectId) {
  await assertTeacherClass(user, classId);
  const subjects = await allowedSubjects(user, classId, subjectId);
  if (!subjects.length) return { enrolled: 0, assessments: [] };
  const [{ enrolled }] = await query('SELECT COUNT(*) AS enrolled FROM student_enrollments WHERE class_id=?', [classId]);
  const assessments = await query(
    `SELECT a.id, a.title, s.code AS subject_code, a.status, a.created_at,
            COUNT(sb.id) AS submitted, AVG(sb.total_score / NULLIF(sb.max_score,0)) AS avg_ratio,
            MIN(sb.total_score / NULLIF(sb.max_score,0)) AS min_ratio, MAX(sb.total_score / NULLIF(sb.max_score,0)) AS max_ratio
     FROM assessments a JOIN subjects s ON s.id=a.subject_id
     LEFT JOIN submissions sb ON sb.assessment_id=a.id AND sb.submitted_at IS NOT NULL
     WHERE a.class_id=? AND a.subject_id IN (?) AND a.status IN ('published','closed')
     GROUP BY a.id, a.title, s.code, a.status, a.created_at ORDER BY a.created_at`,
    [classId, subjects]
  );
  return {
    enrolled: Number(enrolled),
    assessments: assessments.map((a) => ({
      ...a,
      submitted: Number(a.submitted),
      avg_percent: a.avg_ratio === null ? null : Math.round(Number(a.avg_ratio) * 1000) / 10,
      min_percent: a.min_ratio === null ? null : Math.round(Number(a.min_ratio) * 1000) / 10,
      max_percent: a.max_ratio === null ? null : Math.round(Number(a.max_ratio) * 1000) / 10,
    })),
  };
}

async function classStudents(user, classId, subjectId) {
  await assertTeacherClass(user, classId);
  const subjects = await allowedSubjects(user, classId, subjectId);
  const students = await query(
    'SELECT u.id, u.name FROM student_enrollments e JOIN users u ON u.id=e.student_id WHERE e.class_id=? ORDER BY u.name',
    [classId]
  );
  if (!subjects.length) return students.map((s) => ({ ...s, submissions: 0, avg_percent: null, weak_topics: [] }));
  const scores = await query(
    `SELECT sb.student_id, COUNT(*) AS n, AVG(sb.total_score / NULLIF(sb.max_score,0)) AS avg_ratio
     FROM submissions sb JOIN assessments a ON a.id=sb.assessment_id
     WHERE a.class_id=? AND a.subject_id IN (?) AND sb.submitted_at IS NOT NULL GROUP BY sb.student_id`,
    [classId, subjects]
  );
  const topicRows = await query(
    `SELECT sb.student_id, t.name AS topic_name, SUM(sa.is_correct) AS correct, COUNT(*) AS attempted
     FROM submission_answers sa JOIN submissions sb ON sb.id=sa.submission_id AND sb.submitted_at IS NOT NULL
     JOIN assessments a ON a.id=sb.assessment_id AND a.class_id=?
     JOIN questions q ON q.id=sa.question_id JOIN topics t ON t.id=q.topic_id
     WHERE a.subject_id IN (?) GROUP BY sb.student_id, t.id, t.name`,
    [classId, subjects]
  );
  const scoreBy = new Map(scores.map((s) => [s.student_id, s]));
  const weakBy = new Map();
  for (const r of topicRows) {
    if (classify(Number(r.correct), Number(r.attempted)) === 'weak') {
      if (!weakBy.has(r.student_id)) weakBy.set(r.student_id, []);
      weakBy.get(r.student_id).push(r.topic_name);
    }
  }
  return students.map((s) => {
    const sc = scoreBy.get(s.id);
    return {
      ...s,
      submissions: sc ? Number(sc.n) : 0,
      avg_percent: sc && sc.avg_ratio !== null ? Math.round(Number(sc.avg_ratio) * 1000) / 10 : null,
      weak_topics: weakBy.get(s.id) || [],
    };
  });
}

// Teacher drill-down into one student, limited to the subjects this teacher teaches in the class.
async function studentTopicsForTeacher(user, classId, studentId, subjectId) {
  await assertTeacherClass(user, classId);
  if (!(await studentEnrolled(studentId, classId))) throw new HttpError(404, 'Student not found in this class');
  const subjects = await allowedSubjects(user, classId, subjectId);
  const all = await studentTopics(studentId, {});
  return all.filter((t) => subjects.includes(t.subject_id));
}

module.exports = {
  classify, classGap, improvement,
  studentTopics, studentTrend, recommendations, classTopics, classSummary, classStudents, studentTopicsForTeacher,
};
