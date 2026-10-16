const multer = require('multer');

// 404 for unknown API routes
function notFound(req, res) {
  res.status(404).json({ code: 'not_found', message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler: consistent JSON, no internals leaked on 500s.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ code: 'upload', message: err.message });
  }
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ code: err.code || String(err.status), message: err.message });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ code: 'duplicate', message: 'That record already exists' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ code: 'bad_reference', message: 'A referenced record does not exist' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ code: 'in_use', message: 'This record is in use and cannot be removed' });
  }
  console.error(err);
  res.status(500).json({ code: 'server_error', message: 'Something went wrong on the server' });
}

module.exports = { notFound, errorHandler };
