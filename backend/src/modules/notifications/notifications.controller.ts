import { Request, Response } from 'express';
import { notificationsService } from './notifications.service';

export const notificationsController = {
  async getNotifications(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationsService.getUserNotifications(
        userId,
        tenantId,
        { page, limit, unreadOnly }
      );

      res.json(result);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  },

  async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;

      const count = await notificationsService.getUnreadCount(userId, tenantId);

      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  },

  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;
      const id = parseInt(req.params.id);

      const result = await notificationsService.markAsRead(id, userId, tenantId);

      res.json(result);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      if (error.message === 'Notification not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to mark notification as read' });
      }
    }
  },

  async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;

      const result = await notificationsService.markAllAsRead(userId, tenantId);

      res.json(result);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  },

  async deleteNotification(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;
      const id = parseInt(req.params.id);

      const result = await notificationsService.deleteNotification(id, userId, tenantId);

      res.json(result);
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      if (error.message === 'Notification not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete notification' });
      }
    }
  },
};
