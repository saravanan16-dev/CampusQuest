const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { query } = require('../../db');
const { HttpError } = require('../../utils');
const { teacherTeaches, teacherTeachesClass, studentEnrolled, canAccessClassSubject } = require('../../middleware/auth');

async function assertClassAccess(user, classId) {
  const ok =
    user.role === 'admin' ||
    (user.role === 'student' && (await studentEnrolled(user.id, classId))) ||
    (user.role === 'teacher' && (await teacherTeachesClass(user, classId)));
  if (!ok) throw new HttpError(403, 'You do not have access to this class');
}

async function list(user, { classId, subjectId, topicId, q, page, limit, offset }) {
  await assertClassAccess(user, classId);
  const where = ['r.class_id=?'];
  const params = [classId];
  if (subjectId) { where.push('r.subject_id=?'); params.push(subjectId); }
  if (topicId) { where.push('r.topic_id=?'); params.push(topicId); }
  if (q) { where.push('(r.title LIKE ? OR t.name LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  // Teachers only see subjects they teach in that class.
  if (user.role === 'teacher') {
    where.push('EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id=? AND ta.class_id=r.class_id AND ta.subject_id=r.subject_id)');
    params.push(user.id);
  }
  const from = `FROM resources r JOIN subjects s ON s.id=r.subject_id LEFT JOIN topics t ON t.id=r.topic_id
                JOIN users u ON u.id=r.uploaded_by WHERE ${where.join(' AND ')}`;
  const [{ total }] = await query(`SELECT COUNT(*) AS total ${from}`, params);
  const items = await query(
    `SELECT r.id, r.title, r.original_name, r.file_type, r.created_at, r.subject_id, s.code AS subject_code,
            r.topic_id, t.name AS topic_name, u.name AS uploaded_by_name
     ${from} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { items, total, page, limit };
}

async function create(user, file, { class_id, subject_id, topic_id, title }) {
  try {
    if (!(await teacherTeaches(user, class_id, subject_id))) throw new HttpError(403, 'You are not assigned to this class and subject');
    if (topic_id) {
      const t = await query('SELECT id FROM topics WHERE id=? AND subject_id=?', [topic_id, subject_id]);
      if (!t.length) throw new HttpError(400, 'Topic does not belong to this subject');
    }
    const r = await query(
      'INSERT INTO resources (subject_id,class_id,topic_id,title,file_path,original_name,file_type,uploaded_by) VALUES (?,?,?,?,?,?,?,?)',
      [subject_id, class_id, topic_id || null, title, file.filename, file.originalname, file.mimetype, user.id]
    );
    return { id: r.insertId, title };
  } catch (err) {
    fs.unlink(file.path, () => {}); // do not leave orphan files behind
    throw err;
  }
}

async function getForDownload(user, id) {
  const rows = await query('SELECT * FROM resources WHERE id=?', [id]);
  const r = rows[0];
  if (!r) throw new HttpError(404, 'Resource not found');
  if (!(await canAccessClassSubject(user, r.class_id, r.subject_id))) throw new HttpError(403, 'You do not have access to this resource');
  const full = path.resolve(config.uploadDir, r.file_path);
  if (!fs.existsSync(full)) throw new HttpError(404, 'The file is missing from storage', 'file_missing');
  return { full, name: r.original_name, type: r.file_type };
}

async function remove(user, id) {
  const rows = await query('SELECT * FROM resources WHERE id=?', [id]);
  const r = rows[0];
  if (!r) throw new HttpError(404, 'Resource not found');
  if (!(await teacherTeaches(user, r.class_id, r.subject_id))) throw new HttpError(403, 'You cannot remove this resource');
  await query('DELETE FROM resources WHERE id=?', [id]);
  fs.unlink(path.resolve(config.uploadDir, r.file_path), () => {});
}

// Resources tagged with given topic ids, limited to the student's classes (used by recommendations).
async function forTopicsForStudent(studentId, topicIds) {
  if (!topicIds.length) return [];
  return query(
    `SELECT r.id, r.title, r.topic_id, r.original_name
     FROM resources r JOIN student_enrollments e ON e.class_id=r.class_id AND e.student_id=?
     WHERE r.topic_id IN (?) ORDER BY r.created_at DESC`,
    [studentId, topicIds]
  );
}

module.exports = { list, create, getForDownload, remove, forTopicsForStudent };
