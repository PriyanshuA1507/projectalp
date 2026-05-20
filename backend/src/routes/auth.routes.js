import { Router } from 'express';
import {
	loginUser,
	logoutUser,
	changePassword,
	getProfile,
	verifyRole,
	registerUser,
	listUserIds,
	allowedRoles
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authLoginSchema, changePasswordSchema, verifyRoleSchema, allowedRolesSchema } from '../validators/apar-auth.validator.js';

const router = Router();

router.post('/login', validate(authLoginSchema), loginUser);
router.post('/allowed-roles', validate(allowedRolesSchema), allowedRoles);
router.post('/register', registerUser);
router.post('/logout', authenticate, logoutUser);
router.get('/profile', authenticate, getProfile);
router.post('/verify-role', authenticate, validate(verifyRoleSchema), verifyRole);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.get('/user-ids', authenticate, listUserIds);

export default router;
