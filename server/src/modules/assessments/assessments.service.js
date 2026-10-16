const { query, withTransaction } = require('../../db');
const { HttpError } = require('../../utils');
const { teacherTeaches, studentEnrolled } = require('../../middleware/auth');
const { parseOptions } = require('../questions/questions.service');

const toDb = (v) => (v ? String(v).replace('T', ' ').slice(0, 19) : null);

async function loadAssessment(id) {
  const rows = await query(
    `SELECT a.*, c.name AS class_name, s.code AS subject_code, s.name AS subject_name,
            (a.opens_at IS NULL OR a.opens_at<=NOW()) AS opened,
            (a.closes_at IS NULL OR a.closes_at>NOW()) AS not_closed
     FROM assessments a JOIN classes c ON c.id=a.class_id JOIN subjects s ON s.id=a.subject_id WHERE a.id=?`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, 'Assessment not found');
  return rows[0];
}

async function assertManage(user, a) {
  if (!(await teacherTeaches(user, a.class_id, a.subject_id))) throw new HttpError(403, 'You do not manage this assessment');
}

async function validateQuestions(subjectId, questions) {
  const ids = questions.map((q) => q.question_id);
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'A question can only be added once', 'validation');
  const rows = await query('SELECT id FROM questions WHERE id IN (?) AND subject_id=? AND archived=0', [ids, subjectId]);
  if (rows.length !== ids.length) throw new HttpError(400, 'Some questions are missing, archived, or belong to another subject', 'validation');
}

async function create(user, data) {
  if (!(await teacherTeaches(user, data.class_id, data.subject_id))) throw new HttpError(403, 'You are not assigned to this class and subject');
  await validateQuestions(data.subject_id, data.questions);
  return withTransaction(async (q) => {
    const r = await q(
      'INSERT INTO assessments (class_id,subject_id,title,created_by,opens_at,closes_at,duration_min) VALUES (?,?,?,?,?,?,?)',
      [data.class_id, data.subject_id, data.title, user.id, toDb(data.opens_at), toDb(data.closes_at), data.duration_min || null]
    );
    for (const [i, item] of data.questions.entries()) {
      await q('INSERT INTO assessment_questions (assessment_id,question_id,position,marks) VALUES (?,?,?,?)', [
        r.insertId, item.question_id, i, item.marks || 1,
      ]);
    }
    return { id: r.insertId };
  });
}

async function setStatus(user, id, status) {
  const a = await loadAssessment(id);
  await assertManage(user, a);
  if (status === 'published') {
    if (a.status !== 'draft') throw new HttpError(409, 'Only a draft can be published');
    const [{ n }] = await query('SELECT COUNT(*) AS n FROM assessment_questions WHERE assessment_id=?', [id]);
    if (!n) throw new HttpError(400, 'Add at least one question before publishing');
  }
  if (status === 'closed' && a.status !== 'published') throw new HttpError(409, 'Only a published assessment can be closed');
  await query('UPDATE assessments SET status=? WHERE id=?', [status, id]);
}

async function removeDraft(user, id) {
  const a = await loadAssessment(id);
  await assertManage(user, a);
  if (a.status !== 'draft') throw new HttpError(409, 'Only drafts can be deleted');
  await query('DELETE FROM assessments WHERE id=?', [id]);
}

async function list(user, { classId }) {
  if (user.role === 'student') {
    const params = [user.id, user.id];
    let extra = '';
    if (classId) { extra = 'AND a.class_id=?'; params.push(classId); }
    return query(
      `SELECT a.id,a.title,a.class_id,c.name AS class_name,a.subject_id,s.code AS subject_code,a.opens_at,a.closes_at,
              a.duration_min,a.status,
              (SELECT COUNT(*) FROM assessment_questions aq WHERE aq.assessment_id=a.id) AS question_count,
              (a.opens_at IS NULL OR a.opens_at<=NOW()) AS opened, (a.closes_at IS NULL OR a.closes_at>NOW()) AS not_closed,
              sub.id AS submission_id, sub.submitted_at, sub.total_score, sub.max_score
       FROM assessments a
       JOIN student_enrollments e ON e.class_id=a.class_id AND e.student_id=?
       JOIN classes c ON c.id=a.class_id JOIN subjects s ON s.id=a.subject_id
       LEFT JOIN submissions sub ON sub.assessment_id=a.id AND sub.student_id=?
       WHERE a.status IN ('published','closed') ${extra} ORDER BY a.created_at DESC`,
      params
    );
  }
  const params = [];
  const where = [];
  if (user.role === 'teacher') {
    where.push('EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id=? AND ta.class_id=a.class_id AND ta.subject_id=a.subject_id)');
    params.push(user.id);
  }
  if (classId) { where.push('a.class_id=?'); params.push(classId); }
  return query(
    `SELECT a.id,a.title,a.class_id,c.name AS class_name,a.subject_id,s.code AS subject_code,a.opens_at,a.closes_at,
            a.duration_min,a.status,
            (SELECT COUNT(*) FROM assessment_questions aq WHERE aq.assessment_id=a.id) AS question_count,
            (SELECT COUNT(*) FROM submissions sb WHERE sb.assessment_id=a.id AND sb.submitted_at IS NOT NULL) AS submitted_count
     FROM assessments a JOIN classes c ON c.id=a.class_id JOIN subjects s ON s.id=a.subject_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.created_at DESC`,
    params
  );
}

// Teacher detail: includes keys.
async function detailForTeacher(user, id) {
  const a = await loadAssessment(id);
  await assertManage(user, a);
  const qs = await query(
    `SELECT q.id,q.text,q.type,q.options,q.correct_answer,q.difficulty,t.name AS topic_name,aq.marks,aq.position
     FROM assessment_questions aq JOIN questions q ON q.id=aq.question_id JOIN topics t ON t.id=q.topic_id
     WHERE aq.assessment_id=? ORDER BY aq.position`,
    [id]
  );
  return { ...a, questions: qs.map((r) => ({ ...r, options: parseOptions(r.options) })) };
}

// Student starts (or resumes) an attempt. Answer keys are not selected here at all.
async function start(user, id) {
  const a = await loadAssessment(id);
  if (!(await studentEnrolled(user.id, a.class_id))) throw new HttpError(403, 'You are not enrolled in this class');
  if (a.status !== 'published') throw new HttpError(409, 'This assessment is not open');
  if (!a.opened) throw new HttpError(409, 'This assessment has not opened yet');
  if (!a.not_closed) throw new HttpError(409, 'This assessment has closed');

  let sub = (await query('SELECT * FROM submissions WHERE assessment_id=? AND student_id=?', [id, user.id]))[0];
  if (sub && sub.submitted_at) throw new HttpError(409, 'You have already submitted this assessment', 'already_submitted');
  if (!sub) {
    try {
      await query('INSERT INTO submissions (assessment_id,student_id) VALUES (?,?)', [id, user.id]);
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY') throw e; // double-click: another request created it first
    }
    sub = (await query('SELECT * FROM submissions WHERE assessment_id=? AND student_id=?', [id, user.id]))[0];
  }
  const qs = await query(
    `SELECT q.id,q.text,q.type,q.options,aq.marks FROM assessment_questions aq
     JOIN questions q ON q.id=aq.question_id WHERE aq.assessment_id=? ORDER BY aq.position`,
    [id]
  );
  // Elapsed time is computed by the database clock so the browser's time zone cannot skew the timer.
  const [{ elapsed }] = await query('SELECT TIMESTAMPDIFF(SECOND, ?, NOW()) AS elapsed', [sub.started_at]);
  return {
    assessment: { id: a.id, title: a.title, subject_code: a.subject_code, duration_min: a.duration_min, closes_at: a.closes_at },
    started_at: sub.started_at,
    seconds_elapsed: Math.max(0, Number(elapsed)),
    questions: qs.map((r) => ({ ...r, options: parseOptions(r.options) })),
  };
}

async function resultFor(submissionId) {
  const sub = (await query(
    `SELECT sb.*, a.title, a.class_id, a.subject_id, s.code AS subject_code, u.name AS student_name
     FROM submissions sb JOIN assessments a ON a.id=sb.assessment_id JOIN subjects s ON s.id=a.subject_id
     JOIN users u ON u.id=sb.student_id WHERE sb.id=?`,
    [submissionId]
  ))[0];
  if (!sub) return null;
  const answers = await query(
    `SELECT sa.question_id, sa.selected_answer, sa.is_correct, sa.marks_awarded, q.text, q.options, q.correct_answer,
            q.explanation, t.id AS topic_id, t.name AS topic_name, aq.marks
     FROM submission_answers sa JOIN questions q ON q.id=sa.question_id JOIN topics t ON t.id=q.topic_id
     JOIN assessment_questions aq ON aq.assessment_id=? AND aq.question_id=sa.question_id
     WHERE sa.submission_id=? ORDER BY aq.position`,
    [sub.assessment_id, submissionId]
  );
  return { ...sub, answers: answers.map((r) => ({ ...r, options: parseOptions(r.options) })) };
}

// Score on the server only. Idempotent: a repeat submit returns the stored result.
async function submit(user, id, answers) {
  const a = await loadAssessment(id);
  if (!(await studentEnrolled(user.id, a.class_id))) throw new HttpError(403, 'You are not enrolled in this class');

  const submissionId = await withTransaction(async (q) => {
    const sub = (await q('SELECT * FROM submissions WHERE assessment_id=? AND student_id=? FOR UPDATE', [id, user.id]))[0];
    if (!sub) throw new HttpError(400, 'Start the assessment before submitting', 'not_started');
    if (sub.submitted_at) return sub.id; // duplicate request

    if (a.status !== 'published') throw new HttpError(409, 'This assessment is no longer open');
    if (!a.not_closed) throw new HttpError(409, 'The deadline has passed');
    if (a.duration_min) {
      const [{ over }] = await q('SELECT (TIMESTAMPDIFF(SECOND, ?, NOW()) > ?) AS over', [sub.started_at, a.duration_min * 60 + 60]);
      if (over) throw new HttpError(409, 'The time limit has passed');
    }

    const keys = await q(
      `SELECT q.id, q.correct_answer, aq.marks FROM assessment_questions aq JOIN questions q ON q.id=aq.question_id
       WHERE aq.assessment_id=?`,
      [id]
    );
    const given = answers || {};
    // Reject answers for questions that are not part of this assessment.
    const valid = new Set(keys.map((k) => String(k.id)));
    for (const qid of Object.keys(given)) {
      if (!valid.has(String(qid))) throw new HttpError(400, 'Submission contains a question that is not in this assessment', 'validation');
    }
    let total = 0;
    let max = 0;
    for (const k of keys) {
      const sel = given[k.id] ?? given[String(k.id)] ?? null;
      const correct = sel !== null && sel === k.correct_answer;
      const marks = correct ? k.marks : 0;
      total += marks;
      max += k.marks;
      await q('INSERT INTO submission_answers (submission_id,question_id,selected_answer,is_correct,marks_awarded) VALUES (?,?,?,?,?)', [
        sub.id, k.id, sel, correct ? 1 : 0, marks,
      ]);
    }
    await q('UPDATE submissions SET submitted_at=NOW(), total_score=?, max_score=? WHERE id=?', [total, max, sub.id]);
    return sub.id;
  });
  return resultFor(submissionId);
}

async function myHistory(user) {
  return query(
    `SELECT sb.id AS submission_id, a.id AS assessment_id, a.title, s.code AS subject_code, sb.submitted_at, sb.total_score, sb.max_score
     FROM submissions sb JOIN assessments a ON a.id=sb.assessment_id JOIN subjects s ON s.id=a.subject_id
     WHERE sb.student_id=? AND sb.submitted_at IS NOT NULL ORDER BY sb.submitted_at DESC`,
    [user.id]
  );
}

async function getSubmission(user, id) {
  const r = await resultFor(id);
  if (!r) throw new HttpError(404, 'Submission not found');
  if (!r.submitted_at) throw new HttpError(409, 'This attempt has not been submitted yet');
  const ok =
    user.role === 'admin' ||
    (user.role === 'student' && r.student_id === user.id) ||
    (user.role === 'teacher' && (await teacherTeaches(user, r.class_id, r.subject_id)));
  // 404 rather than 403 so other students' submission ids are not confirmed to exist.
  if (!ok) throw new HttpError(404, 'Submission not found');
  return r;
}

async function submissionsForAssessment(user, id) {
  const a = await loadAssessment(id);
  await assertManage(user, a);
  return query(
    `SELECT sb.id AS submission_id, u.id AS student_id, u.name, sb.submitted_at, sb.total_score, sb.max_score
     FROM submissions sb JOIN users u ON u.id=sb.student_id
     WHERE sb.assessment_id=? AND sb.submitted_at IS NOT NULL ORDER BY u.name`,
    [id]
  );
}

module.exports = { create, setStatus, removeDraft, list, detailForTeacher, start, submit, myHistory, getSubmission, submissionsForAssessment };
