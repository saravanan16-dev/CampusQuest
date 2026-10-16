const router = require('express').Router();
const { z } = require('zod');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { wrap, pageParams } = require('../../utils');
const service = require('./questions.service');

const id = z.coerce.number().int().positive();
const questionBody = z.object({
  subject_id: id,
  topic_id: id,
  text: z.string().trim().min(5).max(2000),
  type: z.enum(['mcq', 'true_false']).default('mcq'),
  options: z.array(z.string().trim().min(1).max(255)).max(8).optional(),
  correct_answer: z.string().trim().min(1).max(255),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  explanation: z.string().trim().max(2000).optional(),
});

const teacher = [authenticate, requireRole('teacher', 'admin')];

router.get('/questions', ...teacher, validate({
  query: z.object({
    subjectId: id.optional(), topicId: id.optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(), q: z.string().trim().max(100).optional(),
  }).passthrough(),
}), wrap(async (req, res) => {
  const { subjectId, topicId, difficulty, q } = req.query;
  res.json(await service.listForTeacher(req.user, { subjectId, topicId, difficulty, q, ...pageParams(req) }));
}));

router.post('/questions', ...teacher, validate({ body: questionBody }),
  wrap(async (req, res) => res.status(201).json(await service.create(req.user, req.body))));

router.put('/questions/:id', ...teacher, validate({ params: z.object({ id }), body: questionBody }),
  wrap(async (req, res) => { await service.update(req.user, req.params.id, req.body); res.json({ ok: true }); }));

router.delete('/questions/:id', ...teacher, validate({ params: z.object({ id }) }),
  wrap(async (req, res) => { await service.archive(req.user, req.params.id); res.json({ ok: true }); }));

// Student practice
router.get('/practice/questions', authenticate, requireRole('student'), validate({
  query: z.object({
    topicId: id, difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    limit: z.coerce.number().int().min(1).max(20).default(5),
  }),
}), wrap(async (req, res) => res.json(await service.practiceQuestions(req.user.id, req.query))));

router.post('/practice/answer', authenticate, requireRole('student'), validate({
  body: z.object({ questionId: id, selected: z.string().trim().min(1).max(255) }),
}), wrap(async (req, res) => res.json(await service.checkPracticeAnswer(req.user.id, req.body))));

module.exports = router;
