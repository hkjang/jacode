import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/admin/chat')
@UseGuards(JwtAuthGuard)
export class ChatHistoryController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all chat sessions (admin)
   */
  @Get('sessions')
  async getAllSessions(
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};
    if (userId) where.userId = userId;
    if (projectId) where.projectId = projectId;

    const [sessions, total] = await Promise.all([
      this.prisma.chatSession.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.chatSession.count({ where }),
    ]);

    return {
      data: sessions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Get session with all messages (admin)
   */
  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    return this.prisma.chatSession.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Delete session (admin)
   */
  @Delete('sessions/:id')
  async deleteSession(@Param('id') id: string) {
    return this.prisma.chatSession.delete({
      where: { id },
    });
  }

  /**
   * Get chat statistics
   */
  @Get('stats')
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalSessions,
      totalMessages,
      todaySessions,
      todayMessages,
      topUsers,
    ] = await Promise.all([
      this.prisma.chatSession.count(),
      this.prisma.chatMessage.count(),
      this.prisma.chatSession.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.chatMessage.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.chatSession.groupBy({
        by: ['userId'],
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalSessions,
      totalMessages,
      todaySessions,
      todayMessages,
      topUsers,
    };
  }

  /**
   * Get messages with code applied
   */
  @Get('applied-code')
  async getAppliedCodeMessages(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { codeApplied: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              project: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.chatMessage.count({ where: { codeApplied: true } }),
    ]);

    return {
      data: messages,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    };
  }
}
