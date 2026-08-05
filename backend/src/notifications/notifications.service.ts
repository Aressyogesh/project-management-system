import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  getForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  create(data: { userId: string; type: string; title: string; body: string; workItemId?: string }) {
    return this.prisma.notification.create({ data });
  }

  createMany(items: { userId: string; type: string; title: string; body: string; workItemId?: string }[]) {
    if (items.length === 0) return Promise.resolve();
    return this.prisma.notification.createMany({ data: items });
  }
}
