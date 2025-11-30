import { notificationsRepository } from './notifications.repository';
import { CreateNotificationData, NotificationListOptions } from './notifications.types';

export const notificationsService = {
  async getUserNotifications(
    userId: number,
    tenantId: number,
    options: NotificationListOptions = {}
  ) {
    return notificationsRepository.findByUser(userId, tenantId, options);
  },

  async getUnreadCount(userId: number, tenantId: number) {
    return notificationsRepository.countUnread(userId, tenantId);
  },

  async createNotification(data: CreateNotificationData) {
    return notificationsRepository.create(data);
  },

  async markAsRead(id: number, userId: number, tenantId: number) {
    const notification = await notificationsRepository.findById(id, userId, tenantId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    await notificationsRepository.markAsRead(id, userId, tenantId);
    return { success: true };
  },

  async markAllAsRead(userId: number, tenantId: number) {
    await notificationsRepository.markAllAsRead(userId, tenantId);
    return { success: true };
  },

  async deleteNotification(id: number, userId: number, tenantId: number) {
    const notification = await notificationsRepository.findById(id, userId, tenantId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    await notificationsRepository.delete(id, userId, tenantId);
    return { success: true };
  },
};
