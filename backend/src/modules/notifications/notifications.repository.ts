import { PrismaClient } from '@prisma/client';
import { CreateNotificationData, NotificationListOptions } from './notifications.types';

const prisma = new PrismaClient();

export const notificationsRepository = {
  async findByUser(
    userId: number,
    tenantId: number,
    options: NotificationListOptions = {}
  ) {
    const { page = 1, limit = 10, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const where = {
      user_id: userId,
      tenant_id: tenantId,
      ...(unreadOnly && { is_read: false }),
    };

    const [notifications, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notifications.count({ where }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async countUnread(userId: number, tenantId: number) {
    return prisma.notifications.count({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        is_read: false,
      },
    });
  },

  async create(data: CreateNotificationData) {
    return prisma.notifications.create({
      data: {
        tenant_id: data.tenantId,
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
      },
    });
  },

  async markAsRead(id: number, userId: number, tenantId: number) {
    return prisma.notifications.updateMany({
      where: {
        id,
        user_id: userId,
        tenant_id: tenantId,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  },

  async markAllAsRead(userId: number, tenantId: number) {
    return prisma.notifications.updateMany({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  },

  async delete(id: number, userId: number, tenantId: number) {
    return prisma.notifications.deleteMany({
      where: {
        id,
        user_id: userId,
        tenant_id: tenantId,
      },
    });
  },

  async findById(id: number, userId: number, tenantId: number) {
    return prisma.notifications.findFirst({
      where: {
        id,
        user_id: userId,
        tenant_id: tenantId,
      },
    });
  },
};
