import { ApiError } from '../utils/api-error.js';

const allowedPaths = [
  '/api/v1/auth/logout',
  '/api/v1/auth/profile',
  '/api/v1/auth/change-password',
  '/api/v1/apar/auth/logout',
  '/api/v1/apar/auth/profile',
  '/api/v1/apar/auth/change-password'
];

export const requirePasswordChangeComplete = (req, res, next) => {
  if (!req.user?.mustChangePassword) {
    return next();
  }

  if (allowedPaths.includes(req.originalUrl?.split('?')[0])) {
    return next();
  }

  return next(new ApiError(403, 'Password change required before accessing this resource'));
};
