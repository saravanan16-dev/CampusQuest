const express = require('express');
const cors = require('cors');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  const api = express.Router();
  api.use('/auth', require('./modules/auth/auth.routes'));
  api.use('/', require('./modules/academic/academic.routes'));
  api.use('/resources', require('./modules/resources/resources.routes'));
  api.use('/', require('./modules/questions/questions.routes'));
  api.use('/', require('./modules/assessments/assessments.routes'));
  api.use('/', require('./modules/analytics/analytics.routes'));
  app.use('/api/v1', api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
