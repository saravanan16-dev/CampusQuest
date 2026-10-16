const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { wrap } = require('../../utils');
const service = require('./auth.service');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'rate_limited', message: 'Too many attempts, try again later' },
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  password: z.string().min(8, 'must be at least 8 characters').max(100),
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

router.post('/register', loginLimiter, validate({ body: registerSchema }), wrap(async (req, res) => {
  res.status(201).json(await service.register(req.body));
}));

router.post('/login', loginLimiter, validate({ body: loginSchema }), wrap(async (req, res) => {
  res.json(await service.login(req.body));
}));

// Tokens are stateless; logout is handled client-side by discarding the token.
router.post('/logout', authenticate, (req, res) => res.json({ ok: true }));

router.get('/me', authenticate, wrap(async (req, res) => {
  res.json(await service.me(req.user.id));
}));

module.exports = router;
