const { ZodError } = require('zod');
const { HttpError } = require('../utils');

// validate({ body: schema, query: schema, params: schema })
const validate = (schemas) => (req, res, next) => {
  try {
    for (const part of ['body', 'query', 'params']) {
      if (schemas[part]) req[part] = schemas[part].parse(req[part]);
    }
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const detail = err.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`).join('; ');
      return next(new HttpError(400, `Validation failed: ${detail}`, 'validation'));
    }
    next(err);
  }
};

module.exports = { validate };
