import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { authCookieName, signAccessToken } from '../utils/jwt.js';
import {
  createUser,
  clearFailedLogins,
  findUserByEmail,
  findUserById,
  findUserByUserId,
  recordFailedLogin,
  updateUserAttributes,
  updateUserPassword,
  updateUserSession,
  clearUserSession
} from '../data-access/users.data-access.js';
import { findById as findFacultyById, findByEmail as findFacultyByEmail } from '../data-access/faculty.data-access.js';
import { normalizeRoleValue, ROLES } from '../config/aparRoles.js';
import { validatePasswordPolicy } from '../utils/password-policy.js';

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 12); // 12 hours
const DEFAULT_INITIAL_PASSWORD = process.env.DEFAULT_INITIAL_PASSWORD || '';
const ALLOW_AUTO_PROVISION = process.env.ALLOW_AUTO_PROVISION === 'true';
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
const MAX_FAILED_LOGIN_ATTEMPTS = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5);
const LOGIN_LOCKOUT_MS = Number(process.env.LOGIN_LOCKOUT_MS || 15 * 60 * 1000);
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isProduction ? 'None' : 'Lax',
  secure: isProduction,
  path: '/'
};

const sanitizeUser = (user, additionalInfo = {}) => {
  if (!user) return null;
  return {
    id: user.id,
    userId: user.userId,
    email: user.email,
    name: additionalInfo.name || user.name,
    designation: additionalInfo.designation,
    department: additionalInfo.department || user.departmentId,
    role: user.role,
    aparRole: user.aparRole ?? null,
    departmentId: user.departmentId ?? null,
    mustChangePassword: Boolean(user.mustChangePassword)
  };
};

const getAllowedRolesFor = (role) => {
  const normalized = normalizeRoleValue(role) ?? role;
  switch (normalized) {
    case ROLES.REPORTING_OFFICER:
      return [ROLES.REPORTING_OFFICER];
    case ROLES.REVIEWING_OFFICER:
      return [ROLES.REVIEWING_OFFICER];
    case ROLES.OFFICER:
      return [ROLES.OFFICER];
    default:
      return normalized ? [normalized] : [];
  }
};

const canLoginAsRole = (userRecord, requestedRole) => {
  if (!userRecord || !requestedRole) return false;

  const normalizedRequested = normalizeRoleValue(requestedRole);
  if (!normalizedRequested) return false;

  // 1. Check if they have an explicit APAR role assigned
  if (userRecord.aparRole) {
    // If they have a high-level role, they MUST login as that role or its specific allowed sub-roles
    const allowed = getAllowedRolesFor(userRecord.aparRole);
    if (allowed.includes(normalizedRequested)) return true;

    // If they have an APAR role but requested something else (like Officer (Graded) when they are a Reporting Officer), 
    // we strictly deny based on user request.
    return false;
  }

  // 2. Check their system role for hierarchy (only for users with no explicit APAR role)
  const systemRole = userRecord.role;
  if (systemRole) {
    const lc = systemRole.toLowerCase();

    // HODs and IQAC heads can always login as Officers (Graded)
    if (normalizedRequested === ROLES.OFFICER) {
      if (lc.includes('iqac') || lc.includes('head') || lc.includes('hod')) return true;
    }

    // Faculty members can login as Officers (Graded) by default
    if (normalizedRequested === ROLES.OFFICER && lc.includes('faculty')) return true;
  }

  return false;
};

const assertAccountNotLocked = (userRecord) => {
  if (!userRecord?.lockedUntil) return;
  const lockedUntilTime = new Date(userRecord.lockedUntil).getTime();
  if (Number.isFinite(lockedUntilTime) && lockedUntilTime > Date.now()) {
    throw new ApiError(423, 'Account temporarily locked due to failed login attempts. Please try again later.');
  }
};

const recordInvalidLogin = async (userRecord) => {
  if (!userRecord?.id) return;
  await recordFailedLogin(userRecord.id, {
    maxAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
    lockMs: LOGIN_LOCKOUT_MS
  });
};

export const aparLogin = asyncHandler(async (req, res) => {
  const { email, password, role: requestedRole, academic_year } = req.body ?? {};

  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password || !requestedRole) {
    throw new ApiError(400, 'Email, password and role are required');
  }

  const normalizedRequestedRole = normalizeRoleValue(requestedRole);
  if (!normalizedRequestedRole) {
    throw new ApiError(400, 'Unsupported APAR role provided');
  }

  let userRecord = await findUserByEmail(normalizedEmail);
  let facultyMember = null;

  if (userRecord?.userId) {
    facultyMember = await findFacultyById(userRecord.userId);
  }

  if (!facultyMember) {
    facultyMember = await findFacultyByEmail(normalizedEmail);
  }

  // If user doesn't exist in MongoDB 'users' but exists in 'faculty', create them
  if (!userRecord && facultyMember?.faculty_id) {
    if (!ALLOW_AUTO_PROVISION || isProduction) {
      throw new ApiError(401, 'Invalid credentials');
    }

    if (!DEFAULT_INITIAL_PASSWORD) {
      throw new ApiError(500, 'Default password is not configured');
    }

    validatePasswordPolicy(DEFAULT_INITIAL_PASSWORD, 'Default password');

    const existingByUser = await findUserByUserId(facultyMember.faculty_id);

    if (existingByUser) {
      userRecord = existingByUser;
    } else {
      // Derive roles for new MongoDB user
      const derivedSystemRole = facultyMember.role ?? 'Faculty Member';
      const passwordHash = await hashPassword(DEFAULT_INITIAL_PASSWORD);

      // Derive initial APAR role
      let derivedAparRole = ROLES.OFFICER;
      const sr = derivedSystemRole.toLowerCase();
      if (sr.includes('hod') || sr.includes('head')) derivedAparRole = ROLES.OFFICER; // Keep as officer but they have permissions

      await createUser({
        userId: facultyMember.faculty_id,
        email: normalizedEmail,
        passwordHash,
        role: derivedSystemRole,
        name: facultyMember.name,
        designation: facultyMember.designation,
        aparRole: derivedAparRole,
        departmentId: facultyMember.department_id ?? null
      });

      userRecord = await findUserByUserId(facultyMember.faculty_id);
    }
  }

  if (!userRecord) {
    throw new ApiError(401, 'Invalid credentials');
  }

  assertAccountNotLocked(userRecord);

  const isPasswordValid = await verifyPassword(password, userRecord.passwordHash);
  if (!isPasswordValid) {
    await recordInvalidLogin(userRecord);
    throw new ApiError(401, 'Invalid credentials');
  }

  // Verify access based on the new logic
  if (!canLoginAsRole(userRecord, normalizedRequestedRole)) {
    console.warn('APAR login role mismatch:', {
      userId: userRecord.id,
      userRole: userRecord.role,
      aparRole: userRecord.aparRole,
      requestedRole: normalizedRequestedRole
    });
    await recordInvalidLogin(userRecord);
    throw new ApiError(403, `You are not allowed to sign in as ${normalizedRequestedRole}.`);
  }

  // If they don't have an apar_role set but passed the check, assign them a default one
  if (!userRecord.aparRole) {
    await updateUserAttributes({
      id: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
      aparRole: ROLES.OFFICER,
      departmentId: userRecord.departmentId
    });
    userRecord = await findUserById(userRecord.id);
  }

  // Use the requested role for the token (Active Role)
  const tokenRole = normalizedRequestedRole;
  const payload = {
    sub: userRecord.id,
    role: tokenRole,
    academicYear: academic_year || null,
    departmentId: userRecord.departmentId ?? null
  };

  const accessToken = signAccessToken(payload);

  // persist session in MongoDB users collection
  try {
    await updateUserSession(userRecord.id, accessToken, new Date(Date.now() + SESSION_TTL_MS));
    await clearFailedLogins(userRecord.id);
  } catch (e) {
    console.warn('Failed to persist APAR session token', e?.message || e);
  }

  res.cookie(authCookieName, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_TTL_MS
  });

  const allowedRoles = getAllowedRolesFor(userRecord.aparRole || tokenRole);

  res.status(200).json(new ApiResponse(200, {
    user: sanitizeUser(userRecord, {
      name: facultyMember?.name ?? userRecord.name,
      designation: facultyMember?.designation ?? userRecord.designation,
      department: facultyMember?.department_id ?? userRecord.departmentId
    }),
    activeRole: normalizedRequestedRole,
    academicYear: academic_year || null,
    allowedRoles
  }, 'APAR login successful'));
});

export const aparAllowedRoles = asyncHandler(async (req, res) => {
  const { email } = req.body ?? {};
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError(400, 'Email is required');
  }

  // basic format check (do not import heavy validators here)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new ApiError(400, 'Invalid email address');
  }

  let userRecord = await findUserByEmail(normalizedEmail);
  let facultyMember = null;

  if (userRecord?.userId) {
    facultyMember = await findFacultyById(userRecord.userId);
  }

  if (!facultyMember) {
    facultyMember = await findFacultyByEmail(normalizedEmail);
  }

  // Determine allowed APAR roles
  let baseAparRole = userRecord?.aparRole ?? null;
  if (!baseAparRole && facultyMember) {
    // derive from faculty/system role
    const derived = facultyMember.role ?? facultyMember.designation ?? null;
    if (derived) {
      // map to APAR default: Officer for most, Reporting/Reviewing for specific titles
      const lc = String(derived).toLowerCase();
      if (lc.includes('hod') || lc.includes('head')) baseAparRole = ROLES.OFFICER;
      else baseAparRole = ROLES.OFFICER;
    }
  }

  let allowed = [];
  if (baseAparRole) {
    allowed = getAllowedRolesFor(baseAparRole);
  }

  if (!allowed || allowed.length === 0) {
    allowed = [ROLES.OFFICER];
  }

  res.status(200).json(new ApiResponse(200, { allowedRoles: allowed }, 'Allowed APAR roles fetched'));
});

export const aparLogout = asyncHandler(async (req, res) => {
  try {
    if (req.user?.id) {
      await clearUserSession(req.user.id);
    }
  } catch (e) {
    console.warn('Failed to clear APAR session', e?.message || e);
  }

  res.clearCookie(authCookieName, {
    ...COOKIE_OPTIONS,
    maxAge: 0
  });

  res.status(200).json(new ApiResponse(200, {}, 'Logged out successfully'));
});

export const aparProfile = asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) {
    throw new ApiError(401, 'Session no longer valid');
  }

  // Restore the Active Role from the token if available
  // authenticate middleware extracts token payload into req.authTokenPayload
  const activeRole = req.authTokenPayload?.role || normalizeRoleValue(user.role) || user.role;

  let facultyMember = null;
  if (user.userId) {
    facultyMember = await findFacultyById(user.userId);
  }

  const sanitized = sanitizeUser(user, {
    name: facultyMember?.name ?? user.name,
    designation: facultyMember?.designation ?? user.designation,
    department: facultyMember?.department_id ?? user.departmentId
  });

  if (sanitized) {
    sanitized.role = activeRole;
    sanitized.academicYear = req.authTokenPayload?.academicYear || null;
  }

  res.status(200).json(new ApiResponse(200, { user: sanitized }, 'Profile fetched'));
});

export const aparVerifyRole = asyncHandler(async (req, res) => {
  const { role: clientRole } = req.body ?? {};

  if (!clientRole) {
    throw new ApiError(400, 'Client role is required');
  }

  const normalizedClientRole = normalizeRoleValue(clientRole);

  const currentRole = normalizeRoleValue(req.user.role);

  if (currentRole !== normalizedClientRole) {
    throw new ApiError(409, 'Role mismatch detected');
  }

  res.status(200).json(
    new ApiResponse(200, { role: currentRole }, 'Role verified')
  );
});

export const aparChangePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body ?? {};

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, 'Old password and new password are required');
  }

  validatePasswordPolicy(newPassword, 'New password');

  const user = await findUserById(req.user.id);
  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  const isPasswordValid = await verifyPassword(oldPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid old password');
  }

  const passwordHash = await hashPassword(newPassword);
  await updateUserPassword(user.id, passwordHash, { mustChangePassword: false, clearSession: true });

  res.clearCookie(authCookieName, {
    ...COOKIE_OPTIONS,
    maxAge: 0
  });

  res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully'));
});

