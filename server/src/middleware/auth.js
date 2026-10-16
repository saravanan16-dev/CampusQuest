const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../db');
const { HttpError, wrap } = require('../utils');

// Verifies the bearer token and attaches req.user = { id, role, name }.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Authentication required'));
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.id, role: payload.role, name: payload.name };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

// Role gate: requireRole('teacher', 'admin')
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new HttpError(403, 'You do not have permission for this action'));

// Ownership/scope checks. Admin passes all of them.
async function teacherTeaches(user, classId, subjectId) {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;
  const rows = await query(
    'SELECT 1 FROM teacher_assignments WHERE teacher_id=? AND class_id=? AND subject_id=? LIMIT 1',
    [user.id, classId, subjectId]
  );
  return rows.length > 0;
}

async function teacherTeachesClass(user, classId) {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;
  const rows = await query('SELECT 1 FROM teacher_assignments WHERE teacher_id=? AND class_id=? LIMIT 1', [user.id, classId]);
  return rows.length > 0;
}

async function teacherTeachesSubject(user, subjectId) {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;
  const rows = await query('SELECT 1 FROM teacher_assignments WHERE teacher_id=? AND subject_id=? LIMIT 1', [user.id, subjectId]);
  return rows.length > 0;
}

async function studentEnrolled(userId, classId) {
  const rows = await query('SELECT 1 FROM student_enrollments WHERE student_id=? AND class_id=? LIMIT 1', [userId, classId]);
  return rows.length > 0;
}

// Can this user see material for (classId, subjectId)? Students: enrolled in class. Teachers: assigned.
async function canAccessClassSubject(user, classId, subjectId) {
  if (user.role === 'admin') return true;
  if (user.role === 'student') {
    // The class must actually be taught for this subject.
    const taught = await query('SELECT 1 FROM teacher_assignments WHERE class_id=? AND subject_id=? LIMIT 1', [classId, subjectId]);
    return taught.length > 0 && (await studentEnrolled(user.id, classId));
  }
  return teacherTeaches(user, classId, subjectId);
}

module.exports = {
  authenticate,
  requireRole,
  teacherTeaches,
  teacherTeachesClass,
  teacherTeachesSubject,
  studentEnrolled,
  canAccessClassSubject,
  wrap,
};
