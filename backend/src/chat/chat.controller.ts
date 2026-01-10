import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/chat')
export class ChatController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all chat sessions for current user
   */
  @Get('sessions')
  @ApiOperation({ summary: '채팅 세션 목록 조회' })
  async getSessions(@Req() req: any, @Query('projectId') projectId?: string) {
    const userId = req.user.id;
    
    return this.prisma.chatSession.findMany({
      where: {
        userId,
        projectId: projectId || undefined,
        isArchived: false,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Create new chat session
   */
  @Post('sessions')
  @ApiOperation({ summary: '새 채팅 세션 생성' })
  async createSession(
    @Req() req: any,
    @Body() body: { projectId?: string; title?: string },
  ) {
    const userId = req.user.id;
    
    return this.prisma.chatSession.create({
      data: {
        userId,
        projectId: body.projectId,
        title: body.title || '새 대화',
      },
    });
  }

  /**
   * Get chat session with messages
   */
  @Get('sessions/:id')
  @ApiOperation({ summary: '채팅 세션 상세 조회' })
  async getSession(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    
    return this.prisma.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        project: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Add message to session
   */
  @Post('sessions/:id/messages')
  @ApiOperation({ summary: '메시지 추가' })
  async addMessage(
    @Req() req: any,
    @Param('id') sessionId: string,
    @Body() body: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      modelName?: string;
      modelProvider?: string;
      promptTokens?: number;
      completionTokens?: number;
      responseTimeMs?: number;
    },
  ) {
    // Create message
    const message = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: body.role,
        content: body.content,
        modelName: body.modelName,
        modelProvider: body.modelProvider,
        promptTokens: body.promptTokens || 0,
        completionTokens: body.completionTokens || 0,
        responseTimeMs: body.responseTimeMs || 0,
      },
    });

    // Update session's lastMessage
    const summary = body.content.substring(0, 100);
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { lastMessage: summary },
    });

    return message;
  }

  /**
   * Update session (title, archive)
   */
  @Patch('sessions/:id')
  @ApiOperation({ summary: '세션 수정' })
  async updateSession(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { title?: string; isArchived?: boolean },
  ) {
    const userId = req.user.id;
    
    return this.prisma.chatSession.updateMany({
      where: { id, userId },
      data: body,
    });
  }

  /**
   * Delete session
   */
  @Delete('sessions/:id')
  @ApiOperation({ summary: '세션 삭제' })
  async deleteSession(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    
    return this.prisma.chatSession.deleteMany({
      where: { id, userId },
    });
  }

  /**
   * Mark message as code applied
   */
  @Patch('messages/:id/applied')
  @ApiOperation({ summary: '코드 적용 표시' })
  async markCodeApplied(
    @Param('id') id: string,
    @Body() body: { filePath: string },
  ) {
    return this.prisma.chatMessage.update({
      where: { id },
      data: {
        codeApplied: true,
        appliedFilePath: body.filePath,
      },
    });
  }
}
