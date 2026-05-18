import { ApiError } from '../utils/api-error.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query
  });

  if (!result.success) {
    const message = result.error.issues?.[0]?.message || 'Invalid request payload';
    return next(new ApiError(400, message));
  }

  req.body = result.data.body ?? req.body;
  req.params = result.data.params ?? req.params;

  return next();
};
