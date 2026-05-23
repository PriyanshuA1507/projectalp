import { Router } from 'express';
import {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearMyNotifications
} from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', getMyNotifications);
router.patch('/:notificationId/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/clear', clearMyNotifications);
router.delete('/:notificationId', deleteNotification);

export default router;
