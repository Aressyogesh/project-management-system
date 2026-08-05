import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, AuditEntity, SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface LogAuditDto {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  entityTitle?: string;
  projectId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface AuditLogsQuery {
  userId?: string;
  action?: AuditAction;
  entity?: AuditEntity;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  log(dto: LogAuditDto): void {
    setImmediate(() => {
      this.prisma.auditLog
        .create({
          data: {
            userId: dto.userId,
            action: dto.action,
            entity: dto.entity,
            entityId: dto.entityId ?? null,
            entityTitle: dto.entityTitle ?? null,
            projectId: dto.projectId ?? null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: (dto.metadata as any) ?? undefined,
          },
        })
        .catch((err) => this.logger.warn(`Audit log write failed: ${err.message}`));
    });
  }

  async findAll(query: AuditLogsQuery, callerSystemRole: SystemRole, callerId: string) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const isAdmin =
      callerSystemRole === SystemRole.SUPER_USER || callerSystemRole === SystemRole.ADMIN;

    const where: Record<string, unknown> = {};

    // EMPLOYEE can only see their own logs
    where['userId'] = isAdmin ? (query.userId ?? undefined) : callerId;

    if (query.action) where['action'] = query.action;
    if (query.entity) where['entity'] = query.entity;
    if (query.projectId) where['projectId'] = query.projectId;

    if (query.startDate || query.endDate) {
      where['createdAt'] = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate + 'T23:59:59.999Z') } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, profilePhoto: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
