import { prisma } from '../../prisma/client';
import { RealtimeNotificationDispatcher } from './realtime-dispatcher';

export class NotificationService {
  public static async createNotification(userId: string, title: string, message: string) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        isRead: false
      }
    });

    // Dispatch for real-time delivery
    RealtimeNotificationDispatcher.dispatch(userId, notification);

    return notification;
  }

  public static async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({
        where: { userId }
      })
    ]);

    return {
      list,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  public static async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    return { count };
  }

  public static async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      throw { status: 404, message: 'Notification not found' };
    }

    if (notification.userId !== userId) {
      throw { status: 403, message: 'Unauthorized' };
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  public static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: { isRead: true }
    });
  }
}
