const bcrypt = require('bcryptjs');
const { query } = require('../../db');
const { HttpError } = require('../../utils');
const { teacherTeachesSubject } = require('../../middleware/auth');

// ---- users (admin) ----
async function listUsers({ role, q }) {
  const where = [];
  const params = [];
  if (role) { where.push('role=?'); params.push(role); }
  if (q) { where.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  return query(
    `SELECT id,name,email,role,created_at FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY name LIMIT 500`,
    params
  );
}

async function createUser({ name, email, password, role }) {
  const hash = await bcrypt.hash(password, 10);
  const r = await query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', [name, email.toLowerCase(), hash, role]);
  return { id: r.insertId, name, email: email.toLowerCase(), role };
}

// ---- classes ----
const listClasses = () => query('SELECT * FROM classes ORDER BY academic_year DESC, name, section');
async function createClass({ name, academic_year, section }) {
  const r = await query('INSERT INTO classes (name,academic_year,section) VALUES (?,?,?)', [name, academic_year, section || 'A']);
  return { id: r.insertId, name, academic_year, section: section || 'A' };
}

// ---- subjects ----
const listSubjects = () => query('SELECT * FROM subjects ORDER BY code');
async function createSubject({ code, name }) {
  const r = await query('INSERT INTO subjects (code,name) VALUES (?,?)', [code.toUpperCase(), name]);
  return { id: r.insertId, code: code.toUpperCase(), name };
}

// ---- topics ----
const listTopics = (subjectId) =>
  subjectId
    ? query('SELECT * FROM topics WHERE subject_id=? ORDER BY name', [subjectId])
    : query('SELECT t.*, s.code AS subject_code FROM topics t JOIN subjects s ON s.id=t.subject_id ORDER BY s.code, t.name');

async function createTopic(user, { subject_id, name }) {
  if (!(await teacherTeachesSubject(user, subject_id))) throw new HttpError(403, 'You are not assigned to this subject');
  const r = await query('INSERT INTO topics (subject_id,name) VALUES (?,?)', [subject_id, name]);
  return { id: r.insertId, subject_id, name };
}

// ---- enrollments ----
async function enroll(classId, studentId) {
  const stu = await query("SELECT id FROM users WHERE id=? AND role='student'", [studentId]);
  if (!stu.length) throw new HttpError(400, 'That user is not a student');
  await query('INSERT INTO student_enrollments (class_id,student_id) VALUES (?,?)', [classId, studentId]);
}
const listEnrollments = (classId) =>
  query(
    `SELECT u.id, u.name, u.email FROM student_enrollments e JOIN users u ON u.id=e.student_id WHERE e.class_id=? ORDER BY u.name`,
    [classId]
  );
const unenroll = (classId, studentId) =>
  query('DELETE FROM student_enrollments WHERE class_id=? AND student_id=?', [classId, studentId]);

// ---- teacher assignments ----
async function assign({ teacher_id, class_id, subject_id }) {
  const t = await query("SELECT id FROM users WHERE id=? AND role='teacher'", [teacher_id]);
  if (!t.length) throw new HttpError(400, 'That user is not a teacher');
  const r = await query('INSERT INTO teacher_assignments (teacher_id,class_id,subject_id) VALUES (?,?,?)', [teacher_id, class_id, subject_id]);
  return { id: r.insertId };
}
const listAssignments = () =>
  query(
    `SELECT ta.id, ta.teacher_id, u.name AS teacher_name, ta.class_id, c.name AS class_name, c.academic_year, c.section,
            ta.subject_id, s.code AS subject_code, s.name AS subject_name
     FROM teacher_assignments ta
     JOIN users u ON u.id=ta.teacher_id JOIN classes c ON c.id=ta.class_id JOIN subjects s ON s.id=ta.subject_id
     ORDER BY c.name, s.code`
  );
const removeAssignment = (id) => query('DELETE FROM teacher_assignments WHERE id=?', [id]);

// ---- "my classes": what the signed-in user can work with ----
async function myClasses(user) {
  if (user.role === 'student') {
    return query(
      `SELECT c.id AS class_id, c.name AS class_name, c.academic_year, c.section,
              s.id AS subject_id, s.code AS subject_code, s.name AS subject_name
       FROM student_enrollments e
       JOIN classes c ON c.id=e.class_id
       JOIN teacher_assignments ta ON ta.class_id=c.id
       JOIN subjects s ON s.id=ta.subject_id
       WHERE e.student_id=? GROUP BY c.id, s.id ORDER BY c.name, s.code`,
      [user.id]
    );
  }
  if (user.role === 'teacher') {
    return query(
      `SELECT c.id AS class_id, c.name AS class_name, c.academic_year, c.section,
              s.id AS subject_id, s.code AS subject_code, s.name AS subject_name
       FROM teacher_assignments ta JOIN classes c ON c.id=ta.class_id JOIN subjects s ON s.id=ta.subject_id
       WHERE ta.teacher_id=? ORDER BY c.name, s.code`,
      [user.id]
    );
  }
  return query(
    `SELECT c.id AS class_id, c.name AS class_name, c.academic_year, c.section,
            s.id AS subject_id, s.code AS subject_code, s.name AS subject_name
     FROM classes c JOIN teacher_assignments ta ON ta.class_id=c.id JOIN subjects s ON s.id=ta.subject_id
     GROUP BY c.id, s.id ORDER BY c.name, s.code`
  );
}

module.exports = {
  listUsers, createUser, listClasses, createClass, listSubjects, createSubject, listTopics, createTopic,
  enroll, listEnrollments, unenroll, assign, listAssignments, removeAssignment, myClasses,
};
