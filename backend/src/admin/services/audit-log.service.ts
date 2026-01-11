import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogData {
  adminId: string;
  adminEmail: string;
  adminName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  resource: string;
  resourceId?: string;
  before?: any;
  after?: any;
  ipAddress?: string;
  userAgent?: string;
  status?: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(data: AuditLogData) {
    try {
      return await this.prisma.adminAuditLog.create({
        data: {
          ...data,
          status: data.status || 'SUCCESS',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error}`);
      // Don't throw - audit logging should not break the main operation
    }
  }

  async logCreate(admin: { id: string; email: string; name: string }, resource: string, resourceId: string, data: any, request?: any) {
    return this.log({
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      action: 'CREATE',
      resource,
      resourceId,
      after: data,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
    });
  }

  async logUpdate(admin: { id: string; email: string; name: string }, resource: string, resourceId: string, before: any, after: any, request?: any) {
    return this.log({
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      action: 'UPDATE',
      resource,
      resourceId,
      before,
      after,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
    });
  }

  async logDelete(admin: { id: string; email: string; name: string }, resource: string, resourceId: string, before: any, request?: any) {
    return this.log({
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      action: 'DELETE',
      resource,
      resourceId,
      before,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
    });
  }

  async getAuditLogs(filters: {
    adminId?: string;
    action?: string;
    resource?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { adminId, action, resource, search, startDate, endDate, page = 1, limit = 50 } = filters;

    const where: any = {};
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    
    if (search) {
      where.OR = [
        { adminName: { contains: search, mode: 'insensitive' } },
        { adminEmail: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { resourceId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getLogsByResource(resource: string, resourceId: string) {
    return this.prisma.adminAuditLog.findMany({
      where: { resource, resourceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminActivity(adminId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.adminAuditLog.groupBy({
      by: ['action', 'resource'],
      where: {
        adminId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    return logs;
  }
}
