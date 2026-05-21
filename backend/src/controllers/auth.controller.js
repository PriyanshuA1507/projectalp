import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { authCookieName, signAccessToken } from '../utils/jwt.js';
import {
  createUser,
  clearFailedLogins,
  clearUserSession,
  findUserByEmail,
  findUserById,
  findUserByUserId,
  recordFailedLogin,
  updateUserPassword,
  updateUserAttributes,
  updateUserSession
} from '../data-access/users.data-access.js';
import { findById as findFacultyById, findByEmail as findFacultyByEmail, listFacultyIds } from '../data-access/faculty.data-access.js';
import { normalizeRoleValue, ROLES } from '../config/roles.js';
import { validatePasswordPolicy } from '../utils/password-policy.js';
import { isValidEmail } from '../utils/validation.js';

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
    designation: additionalInfo.designation || user.designation,
    role: normalizeRoleValue(user.role) ?? user.role,
    departmentId: additionalInfo.departmentId || user.departmentId || null
  };
};

const validateRole = (role) => {
  if (!role) {
    throw new ApiError(400, 'Role is required');
  }
  const normalizedRole = normalizeRoleValue(role);
  if (!normalizedRole) {
    throw new ApiError(400, 'Unsupported role provided');
  }
  return normalizedRole;
};

const getAllowedRolesFor = (role) => {
  const normalizedRole = normalizeRoleValue(role) ?? role;

  switch (normalizedRole) {
    case ROLES.IQAC_HEAD:
      return [ROLES.IQAC_HEAD];
    case ROLES.DEPARTMENT_HOD:
      return [ROLES.DEPARTMENT_HOD];
    case ROLES.FACULTY:
      return [];
    default:
      return [];
  }
};

const canLoginAsRole = (currentRole, requestedRole) => {
  if (!currentRole || !requestedRole) {
    return false;
  }

  const normalizedCurrentRole = normalizeRoleValue(currentRole) ?? currentRole;
  const normalizedRequestedRole = normalizeRoleValue(requestedRole) ?? requestedRole;

  const allowedRoles = getAllowedRolesFor(normalizedCurrentRole);
  return allowedRoles.includes(normalizedRequestedRole);
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

export const registerUser = asyncHandler(async (req, res) => {
  const {
    userId,
    email = null,
    password = DEFAULT_INITIAL_PASSWORD,
    role,
    departmentId = null
  } = req.body;
  const provisionToken = req.headers['x-provision-token'];
  const expectedToken = process.env.ADMIN_PROVISION_TOKEN;

  if (!expectedToken || provisionToken !== expectedToken) {
    throw new ApiError(403, 'User provisioning is not allowed');
  }

  if (!userId) {
    throw new ApiError(400, 'User ID is required');
  }

  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    throw new ApiError(400, 'User ID is required');
  }

  const facultyMember = await findFacultyById(normalizedUserId);
  if (!facultyMember) {
    throw new ApiError(404, 'User ID does not match any faculty record');
  }

  const passwordToApply = password || DEFAULT_INITIAL_PASSWORD;
  if (!passwordToApply) {
    throw new ApiError(400, 'Password is required');
  }
  validatePasswordPolicy(passwordToApply);

  const normalizedRole = validateRole(role);

  const existingByUser = await findUserByUserId(normalizedUserId);
  if (existingByUser) {
    throw new ApiError(409, 'User already has an account');
  }

  if (email) {
    if (!isValidEmail(email)) {
      throw new ApiError(400, 'Invalid email address');
    }
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new ApiError(409, 'Email is already registered');
    }
  }

  const passwordHash = await hashPassword(passwordToApply);
  const createdUser = await createUser({
    userId: normalizedUserId,
    email,
    passwordHash,
    role: normalizedRole,
    departmentId: departmentId ?? facultyMember.department_id ?? null
  });

  res.status(201).json(new ApiResponse(201, { user: sanitizeUser(createdUser) }, 'User created successfully'));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password, role: requestedRole } = req.body ?? {};

  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password || !requestedRole) {
    throw new ApiError(400, 'Email, password and role are required');
  }

  if (!isValidEmail(normalizedEmail)) {
    throw new ApiError(400, 'Invalid email address');
  }

  const normalizedRequestedRole = validateRole(requestedRole);

  let userRecord = await findUserByEmail(normalizedEmail);
  let facultyMember = null;

  if (userRecord?.userId) {
    facultyMember = await findFacultyById(userRecord.userId);
  }

  if (!facultyMember) {
    facultyMember = await findFacultyByEmail(normalizedEmail);
  }

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
      const derivedRoleInput = facultyMember.role ?? facultyMember.designation ?? ROLES.FACULTY;
      const derivedRole = normalizeRoleValue(derivedRoleInput) ?? ROLES.FACULTY;

      const passwordHash = await hashPassword(DEFAULT_INITIAL_PASSWORD);

      await createUser({
        userId: facultyMember.faculty_id,
        email: normalizedEmail,
        passwordHash,
        role: derivedRole,
        name: facultyMember.name,
        designation: facultyMember.designation,
        departmentId: facultyMember.department_id ?? null
      });

      userRecord = await findUserByUserId(facultyMember.faculty_id);
    }
  }

  if (!userRecord) {
    throw new ApiError(401, 'Invalid credentials');
  }

  assertAccountNotLocked(userRecord);

  if (!facultyMember && userRecord.userId) {
    facultyMember = await findFacultyById(userRecord.userId);
  }

  // NOTE: We no longer throw if facultyMember is missing.
  // Administrative roles (IQAC Head, etc.) might not have a faculty record.

  const isPasswordValid = await verifyPassword(password, userRecord.passwordHash);
  if (!isPasswordValid) {
    await recordInvalidLogin(userRecord);
    throw new ApiError(401, 'Invalid credentials');
  }

  const currentRole = normalizeRoleValue(userRecord.role) ?? userRecord.role;
  // USER REQUEST: Take role from 'users' table, do not overwrite from 'faculty' table.
  // We specificially prioritize currentRole. Only if currentRole is missing (rare/new user) do we look at faculty.
  const effectiveRoleForAccess = currentRole || (facultyMember ? normalizeRoleValue(facultyMember.role) : null) || ROLES.FACULTY;

  if (!canLoginAsRole(effectiveRoleForAccess, normalizedRequestedRole)) {
    await recordInvalidLogin(userRecord);
    throw new ApiError(403, `You are not allowed to sign in as ${normalizedRequestedRole}.`);
  }

  const facultyDepartmentId = facultyMember?.department_id ?? null;
  const facultyEmail = facultyMember?.email ? facultyMember.email.toLowerCase() : null;
  const currentEmail = userRecord.email ? userRecord.email.toLowerCase() : null;

  // We no longer automatically update the role based on faculty table
  const needsRoleUpdate = false;
  const needsDepartmentUpdate = facultyMember && (userRecord.departmentId ?? null) !== facultyDepartmentId;

  let needsEmailUpdate = false;
  let emailToPersist = currentEmail;

  const loginEmail = normalizedEmail;

  if (currentEmail !== loginEmail) {
    const existingByEmail = await findUserByEmail(loginEmail);
    if (!existingByEmail || existingByEmail.id === userRecord.id) {
      needsEmailUpdate = true;
      emailToPersist = loginEmail;
    }
  } else if (facultyEmail && facultyEmail !== currentEmail) {
    const existingByEmail = await findUserByEmail(facultyEmail);
    if (!existingByEmail || existingByEmail.id === userRecord.id) {
      needsEmailUpdate = true;
      emailToPersist = facultyEmail;
    }
  }

  if (needsRoleUpdate || needsDepartmentUpdate || needsEmailUpdate) {
    await updateUserAttributes({
      id: userRecord.id,
      email: emailToPersist,
      role: needsRoleUpdate ? facultyRole : currentRole,
      departmentId: needsDepartmentUpdate ? facultyDepartmentId : (userRecord.departmentId ?? null)
    });

    userRecord = await findUserById(userRecord.id);
  } else {
    userRecord = await findUserById(userRecord.id);
  }

  const tokenRole = normalizeRoleValue(userRecord.role) ?? userRecord.role;
  const payload = {
    sub: userRecord.id,
    userId: userRecord.userId, // Added readable ID
    role: tokenRole,
    departmentId: userRecord.departmentId ?? null
  };

  const accessToken = signAccessToken(payload);
  await updateUserSession(userRecord.id, accessToken, new Date(Date.now() + SESSION_TTL_MS));
  await clearFailedLogins(userRecord.id);

  res.cookie(authCookieName, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_TTL_MS
  });

  const allowedRoles = getAllowedRolesFor(tokenRole);

  res.status(200).json(
    new ApiResponse(200, {
      user: sanitizeUser(userRecord, {
        name: facultyMember?.name,
        designation: facultyMember?.designation,
        departmentId: facultyMember?.department_id
      }),
      activeRole: normalizedRequestedRole,
      allowedRoles
    }, 'Login successful')
  );
});

export const logoutUser = asyncHandler(async (req, res) => {
  if (req.user?.id) {
    await clearUserSession(req.user.id);
  }

  res.clearCookie(authCookieName, {
    ...COOKIE_OPTIONS,
    maxAge: 0
  });

  res.status(200).json(new ApiResponse(200, {}, 'Logged out successfully'));
});

export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body ?? {};

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

export const getProfile = asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) {
    throw new ApiError(401, 'Session no longer valid');
  }

  let facultyMember = null;
  if (user.userId) {
    facultyMember = await findFacultyById(user.userId);
  }

  res.status(200).json(new ApiResponse(200, {
    user: sanitizeUser(user, {
      name: facultyMember?.name,
      designation: facultyMember?.designation,
      departmentId: facultyMember?.department_id
    })
  }, 'Profile fetched'));
});

export const verifyRole = asyncHandler(async (req, res) => {
  const { role: clientRole } = req.body ?? {};

  if (!clientRole) {
    throw new ApiError(400, 'Client role is required');
  }

  const normalizedClientRole = validateRole(clientRole);

  const currentRole = validateRole(req.user.role);

  if (currentRole !== normalizedClientRole) {
    throw new ApiError(409, 'Role mismatch detected');
  }

  res.status(200).json(
    new ApiResponse(200, { role: currentRole }, 'Role verified')
  );
});

export const listUserIds = asyncHandler(async (req, res) => {
  const ids = await listFacultyIds();
  res.status(200).json(new ApiResponse(200, { userIds: ids }, 'User IDs fetched'));
});

export const allowedRoles = asyncHandler(async (req, res) => {
  const { email } = req.body ?? {};
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError(400, 'Email is required');
  }

  if (!isValidEmail(normalizedEmail)) {
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

  let baseRole = null;
  if (userRecord && userRecord.role) baseRole = normalizeRoleValue(userRecord.role) ?? userRecord.role;
  else if (facultyMember && (facultyMember.role || facultyMember.designation)) baseRole = normalizeRoleValue(facultyMember.role ?? facultyMember.designation) ?? (facultyMember.role ?? facultyMember.designation);

  let allowed = [];
  if (baseRole) {
    allowed = getAllowedRolesFor(baseRole);
  }

  if (!allowed || allowed.length === 0) {
    allowed = [];
  }

  res.status(200).json(new ApiResponse(200, { allowedRoles: allowed }, 'Allowed roles fetched'));
});
