const router = require('express').Router();
const { z } = require('zod');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { wrap } = require('../../utils');
const service = require('./academic.service');

const id = z.coerce.number().int().positive();
const admin = [authenticate, requireRole('admin')];

// Users
router.get('/users', ...admin, wrap(async (req, res) => {
  res.json(await service.listUsers({ role: req.query.role, q: req.query.q }));
}));
router.post('/users', ...admin, validate({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(190),
    password: z.string().min(8).max(100),
    role: z.enum(['student', 'teacher', 'admin']),
  }),
}), wrap(async (req, res) => res.status(201).json(await service.createUser(req.body))));

// Classes
router.get('/classes', authenticate, requireRole('admin', 'teacher'), wrap(async (req, res) => res.json(await service.listClasses())));
router.post('/classes', ...admin, validate({
  body: z.object({ name: z.string().trim().min(1).max(120), academic_year: z.string().trim().min(4).max(20), section: z.string().trim().max(20).optional() }),
}), wrap(async (req, res) => res.status(201).json(await service.createClass(req.body))));

// Subjects
router.get('/subjects', authenticate, wrap(async (req, res) => res.json(await service.listSubjects())));
router.post('/subjects', ...admin, validate({
  body: z.object({ code: z.string().trim().min(2).max(30), name: z.string().trim().min(2).max(150) }),
}), wrap(async (req, res) => res.status(201).json(await service.createSubject(req.body))));

// Topics (admin, or a teacher assigned to the subject)
router.get('/topics', authenticate, validate({ query: z.object({ subjectId: id.optional() }).passthrough() }),
  wrap(async (req, res) => res.json(await service.listTopics(req.query.subjectId))));
router.post('/topics', authenticate, requireRole('admin', 'teacher'), validate({
  body: z.object({ subject_id: id, name: z.string().trim().min(1).max(150) }),
}), wrap(async (req, res) => res.status(201).json(await service.createTopic(req.user, req.body))));

// Enrollments
router.get('/classes/:id/enrollments', ...admin, validate({ params: z.object({ id }) }),
  wrap(async (req, res) => res.json(await service.listEnrollments(req.params.id))));
router.post('/classes/:id/enrollments', ...admin, validate({ params: z.object({ id }), body: z.object({ studentId: id }) }),
  wrap(async (req, res) => { await service.enroll(req.params.id, req.body.studentId); res.status(201).json({ ok: true }); }));
router.delete('/classes/:id/enrollments/:studentId', ...admin, validate({ params: z.object({ id, studentId: id }) }),
  wrap(async (req, res) => { await service.unenroll(req.params.id, req.params.studentId); res.json({ ok: true }); }));

// Teacher assignments
router.get('/teacher-assignments', ...admin, wrap(async (req, res) => res.json(await service.listAssignments())));
router.post('/teacher-assignments', ...admin, validate({
  body: z.object({ teacher_id: id, class_id: id, subject_id: id }),
}), wrap(async (req, res) => res.status(201).json(await service.assign(req.body))));
router.delete('/teacher-assignments/:id', ...admin, validate({ params: z.object({ id }) }),
  wrap(async (req, res) => { await service.removeAssignment(req.params.id); res.json({ ok: true }); }));

// What the signed-in user can work with
router.get('/me/classes', authenticate, wrap(async (req, res) => res.json(await service.myClasses(req.user))));

module.exports = router;
