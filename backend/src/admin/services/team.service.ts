import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Team CRUD ====================

  async findAll() {
    return this.prisma.team.findMany({
      include: {
        members: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          select: { id: true, name: true, email: true, role: true, status: true },
        },
      },
    });
  }

  async create(data: {
    name: string;
    description?: string;
    usageLimit?: number;
  }) {
    return this.prisma.team.create({
      data,
    });
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    usageLimit?: number;
  }) {
    return this.prisma.team.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    // Remove team reference from users first
    await this.prisma.user.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });

    return this.prisma.team.delete({
      where: { id },
    });
  }

  // ==================== Member Management ====================

  async addMember(teamId: string, userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { teamId },
    });
  }

  async removeMember(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { teamId: null },
    });
  }

  async getMembers(teamId: string) {
    return this.prisma.user.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        _count: { select: { projects: true, agentTasks: true } },
      },
    });
  }

  // ==================== Usage Tracking ====================

  async updateUsage(teamId: string, tokensUsed: number) {
    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        currentUsage: { increment: tokensUsed },
      },
    });
  }

  async resetUsage(teamId: string) {
    return this.prisma.team.update({
      where: { id: teamId },
      data: { currentUsage: 0 },
    });
  }

  async resetAllUsage() {
    return this.prisma.team.updateMany({
      data: { currentUsage: 0 },
    });
  }

  async checkUsageLimit(teamId: string): Promise<{ allowed: boolean; remaining: number }> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return { allowed: true, remaining: Infinity };
    }

    const remaining = team.usageLimit - team.currentUsage;
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
    };
  }
}
