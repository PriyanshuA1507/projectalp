import { ApiError } from '../utils/api-error.js';
import { normalizeRoleValue, ROLES } from '../config/roles.js';

const ALLOWED_IQAC_ROLES = new Set([ROLES.IQAC_HEAD, ROLES.DEAN, ROLES.DEPARTMENT_HOD]);

export const requireIqacRole = (req, res, next) => {
  const activeRole = normalizeRoleValue(req.user?.role) ?? req.user?.role;
  const systemRole = normalizeRoleValue(req.user?.systemRole) ?? req.user?.systemRole;

  if (ALLOWED_IQAC_ROLES.has(activeRole) || ALLOWED_IQAC_ROLES.has(systemRole)) {
    return next();
  }

  return next(new ApiError(403, 'Only IQAC Head, Dean, or Department HOD can access this section'));
};
