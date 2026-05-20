import { authCookieName, verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/api-error.js';
import { findUserById } from '../data-access/users.data-access.js';
import { getAllowedRolesFor } from '../config/permissions.js';
import { normalizeRoleValue } from '../config/roles.js';

const extractToken = (req) => {
  const cookieToken = req.cookies?.[authCookieName];
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }

  return null;
};

export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    const decoded = verifyAccessToken(token);

    let user = await findUserById(decoded.sub);
    const roleFromToken = normalizeRoleValue(decoded.role) ?? decoded.role ?? null;

    if (user) {
      if (!user.sessionToken || user.sessionToken !== token) {
        throw new ApiError(401, 'Session is no longer valid');
      }

      if (!user.sessionExpiresAt || new Date(user.sessionExpiresAt).getTime() <= Date.now()) {
        throw new ApiError(401, 'Session has expired');
      }

      req.user = {
        id: user.id,
        sub: decoded.sub,
        userId: user.userId,
        email: user.email,
        role: roleFromToken || (normalizeRoleValue(user.role) ?? user.role),
        systemRole: normalizeRoleValue(user.role) ?? user.role,
        aparRole: user.aparRole ?? null,
        academicYear: decoded.academicYear ?? null,
        departmentId: user.departmentId ?? null
      };
      req.authTokenPayload = decoded;
      return next();
    }

    throw new ApiError(401, 'Session is no longer valid');
  } catch (error) {
    next(error);
  }
};

export const createRouteGuard = (basePath) => {
  return (req, res, next) => {
    const allowedRoles = getAllowedRolesFor(basePath, req.method.toUpperCase());

    if (!allowedRoles) {
      return next();
    }

    const userRole = normalizeRoleValue(req.user?.role) ?? req.user?.role;
    if (!userRole) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(userRole)) {
      // Fallback: Check if the user's underlying system role allows access
      // This handles cases where the user is logged in with a specialized role (e.g. APAR Officer)
      // but still needs access to general resources (e.g. Faculty endpoints)
      const systemRole = req.user?.systemRole;
      if (systemRole && allowedRoles.includes(systemRole)) {
        return next();
      }

      console.error(`[auth-error] Access Denied: Method=${req.method}, Path=${basePath}`);
      console.error(`[auth-error] User Role: '${req.user?.role}' (Normalized: '${userRole}')`);
      console.error(`[auth-error] System Role: '${systemRole}'`);
      console.error(`[auth-error] Allowed Roles: ${JSON.stringify(allowedRoles)}`);
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    return next();
  };
};
