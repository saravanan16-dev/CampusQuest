const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { z } = require('zod');
const config = require('../../config');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { wrap, pageParams, HttpError } = require('../../utils');
const service = require('./resources.service');

fs.mkdirSync(path.resolve(config.uploadDir), { recursive: true });

const ALLOWED = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/png',
  'image/jpeg',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.resolve(config.uploadDir)),
    // Random name on disk; the original name is kept in the database for download.
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new HttpError(400, 'Unsupported file type. Use PDF, Word, PowerPoint, text or an image.', 'file_type')),
});

const id = z.coerce.number().int().positive();

router.get('/', authenticate, requireRole('student', 'teacher', 'admin'), validate({
  query: z.object({ classId: id, subjectId: id.optional(), topicId: id.optional(), q: z.string().trim().max(100).optional() }).passthrough(),
}), wrap(async (req, res) => {
  const { classId, subjectId, topicId, q } = req.query;
  res.json(await service.list(req.user, { classId, subjectId, topicId, q, ...pageParams(req) }));
}));

router.post('/', authenticate, requireRole('teacher', 'admin'), upload.single('file'), wrap(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'A file is required', 'validation');
  let body;
  try {
    body = z.object({
      class_id: id, subject_id: id, topic_id: id.optional().or(z.literal('').transform(() => undefined)),
      title: z.string().trim().min(2).max(200),
    }).parse(req.body);
  } catch (e) {
    fs.unlink(req.file.path, () => {});
    throw new HttpError(400, 'Validation failed: ' + e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '), 'validation');
  }
  res.status(201).json(await service.create(req.user, req.file, body));
}));

router.get('/:id/download', authenticate, validate({ params: z.object({ id }) }), wrap(async (req, res) => {
  const f = await service.getForDownload(req.user, req.params.id);
  res.download(f.full, f.name);
}));

router.delete('/:id', authenticate, requireRole('teacher', 'admin'), validate({ params: z.object({ id }) }), wrap(async (req, res) => {
  await service.remove(req.user, req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
