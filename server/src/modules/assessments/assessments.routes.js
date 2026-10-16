const router = require('express').Router();
const { z } = require('zod');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { wrap } = require('../../utils');
const service = require('./assessments.service');

const id = z.coerce.number().int().positive();
const teacher = [authenticate, requireRole('teacher', 'admin')];
const student = [authenticate, requireRole('student')];

const createSchema = z.object({
  class_id: id,
  subject_id: id,
  title: z.string().trim().min(3).max(200),
  opens_at: z.string().optional().nullable(),
  closes_at: z.string().optional().nullable(),
  duration_min: z.coerce.number().int().min(1).max(600).optional().nullable(),
  questions: z.array(z.object({ question_id: id, marks: z.coerce.number().int().min(1).max(100).default(1) })).min(1).max(100),
});

router.post('/assessments', ...teacher, validate({ body: createSchema }),
  wrap(async (req, res) => res.status(201).json(await service.create(req.user, req.body))));

router.get('/assessments', authenticate, validate({ query: z.object({ classId: id.optional() }).passthrough() }),
  wrap(async (req, res) => res.json(await service.list(req.user, { classId: req.query.classId }))));

router.get('/assessments/:id', ...teacher, validate({ params: z.object({ id }) }),
  wrap(async (req, res) => res.json(await service.detailForTeacher(req.user, req.params.id))));

router.post('/assessments/:id/publish', ...teacher, validate({ params: z.object({ id }) }),
  wrap(async (req, res) => { await service.setStatus(req.user, req.params.id, 'published'); res.json({ ok: true }); }));

router.post('/assessments/:id/close', ...teacher, validate({ params: z.object({ id }) }),
  wrap(async (req, res) => { await service.setStatus(req.user, req.params.id, 'closed'); res.json({ ok: true }); }));

router.delete('/assessments/:id', ...teacher, validate({ params: z.object({ id }) }),
  wrap(async (req, res) => { await service.removeDraft(req.user, req.params.id); res.json({ ok: true }); }));

router.get('/assessments/:id/submissions', ...teacher, validate({ params: z.object({ id }) }),
  wrap(async (req, res) => res.json(await service.submissionsForAssessment(req.user, req.params.id))));

// Student attempt
router.post('/assessments/:id/start', ...student, validate({ params: z.object({ id }) }),
  wrap(async (req, res) => res.json(await service.start(req.user, req.params.id))));

router.post('/assessments/:id/submit', ...student, validate({
  params: z.object({ id }),
  body: z.object({ answers: z.record(z.string().max(255)).default({}) }),
}), wrap(async (req, res) => res.json(await service.submit(req.user, req.params.id, req.body.answers))));

// Results
router.get('/submissions/me', ...student, wrap(async (req, res) => res.json(await service.myHistory(req.user))));
router.get('/submissions/:id', authenticate, validate({ params: z.object({ id }) }),
  wrap(async (req, res) => res.json(await service.getSubmission(req.user, req.params.id))));

module.exports = router;
