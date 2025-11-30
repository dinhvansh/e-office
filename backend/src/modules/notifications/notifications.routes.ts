import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authGuard } from '../auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authGuard);

// GET /api/v1/notifications - List user's notifications
router.get('/', notificationsController.getNotifications);

// GET /api/v1/notifications/unread-count - Get unread count
router.get('/unread-count', notificationsController.getUnreadCount);

// PATCH /api/v1/notifications/read-all - Mark all as read
router.patch('/read-all', notificationsController.markAllAsRead);

// PATCH /api/v1/notifications/:id/read - Mark single as read
router.patch('/:id/read', notificationsController.markAsRead);

// DELETE /api/v1/notifications/:id - Delete notification
router.delete('/:id', notificationsController.deleteNotification);

export default router;
