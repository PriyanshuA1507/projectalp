import { Router } from 'express';
import { aparLogin, aparLogout, aparProfile, aparVerifyRole, aparChangePassword, aparAllowedRoles } from "../controllers/aparAuth.controller.js";
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { aparLoginSchema, changePasswordSchema, verifyRoleSchema, allowedRolesSchema } from '../validators/apar-auth.validator.js';

const router = Router();

router.post('/login', validate(aparLoginSchema), aparLogin);
router.post('/allowed-roles', validate(allowedRolesSchema), aparAllowedRoles);
router.post('/logout', authenticate, aparLogout);
router.get('/profile', authenticate, aparProfile);
router.post('/verify-role', authenticate, validate(verifyRoleSchema), aparVerifyRole);
router.post('/change-password', authenticate, validate(changePasswordSchema), aparChangePassword);

export default router;
