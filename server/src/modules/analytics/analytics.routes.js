const router = require('express').Router();
const { z } = require('zod');
const config = require('../../config');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { wrap } = require('../../utils');
const service = require('./analytics.service');

const id = z.coerce.number().int().positive();
const student = [authenticate, requireRole('student')];
const teacher = [authenticate, requireRole('teacher', 'admin')];
const subjectQuery = z.object({ subjectId: id.optional() }).passthrough();

// The rules in force, so the UI can explain every flag.
router.get('/analytics/rules', authenticate, (req, res) => res.json(config.rules));

// Student
router.get('/analytics/me/topics', ...student, validate({ query: subjectQuery }),
  wrap(async (req, res) => res.json(await service.studentTopics(req.user.id, { subjectId: req.query.subjectId }))));
router.get('/analytics/me/trend', ...student, wrap(async (req, res) => res.json(await service.studentTrend(req.user.id))));
router.get('/recommendations/me', ...student, validate({ query: subjectQuery }),
  wrap(async (req, res) => res.json(await service.recommendations(req.user.id, { subjectId: req.query.subjectId }))));

// Teacher (assigned classes only; enforced in the service)
const classParams = z.object({ id });
router.get('/analytics/classes/:id/topics', ...teacher, validate({ params: classParams, query: subjectQuery }),
  wrap(async (req, res) => res.json(await service.classTopics(req.user, req.params.id, req.query.subjectId))));
router.get('/analytics/classes/:id/summary', ...teacher, validate({ params: classParams, query: subjectQuery }),
  wrap(async (req, res) => res.json(await service.classSummary(req.user, req.params.id, req.query.subjectId))));
router.get('/analytics/classes/:id/students', ...teacher, validate({ params: classParams, query: subjectQuery }),
  wrap(async (req, res) => res.json(await service.classStudents(req.user, req.params.id, req.query.subjectId))));
router.get('/analytics/classes/:id/students/:studentId/topics', ...teacher,
  validate({ params: z.object({ id, studentId: id }), query: subjectQuery }),
  wrap(async (req, res) => res.json(await service.studentTopicsForTeacher(req.user, req.params.id, req.params.studentId, req.query.subjectId))));

module.exports = router;
