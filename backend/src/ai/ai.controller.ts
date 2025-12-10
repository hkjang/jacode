import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatDto } from './dto/chat.dto';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { ReviewCodeDto } from './dto/review-code.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get('info')
  @ApiOperation({ summary: 'Get current AI provider info' })
  getProviderInfo() {
    return this.aiService.getProviderInfo();
  }

  @Get('models')
  @ApiOperation({ summary: 'List available AI models' })
  async listModels() {
    return this.aiService.listModels();
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat completion' })
  async chat(@Body() dto: ChatDto) {
    return this.aiService.chat(dto.messages, dto.options);
  }

  @Post('chat/stream')
  @ApiOperation({ summary: 'Streaming chat completion' })
  async chatStream(@Body() dto: ChatDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.aiService.chatStream(dto.messages, dto.options)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        if (chunk.done) break;
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    }

    res.end();
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate code from prompt' })
  async generateCode(@Body() dto: GenerateCodeDto) {
    return this.aiService.generateCode(dto.prompt, dto.context, dto.language);
  }

  @Post('modify')
  @ApiOperation({ summary: 'Modify existing code' })
  async modifyCode(@Body() dto: { code: string; instructions: string; language?: string }) {
    return this.aiService.modifyCode(dto.code, dto.instructions, dto.language);
  }

  @Post('review')
  @ApiOperation({ summary: 'Review code' })
  async reviewCode(@Body() dto: ReviewCodeDto) {
    const review = await this.aiService.reviewCode(dto.code, dto.language);
    return { review };
  }

  @Post('tests')
  @ApiOperation({ summary: 'Generate tests for code' })
  async generateTests(@Body() dto: { code: string; language?: string; framework?: string }) {
    return this.aiService.generateTests(dto.code, dto.language, dto.framework);
  }

  @Post('plan')
  @ApiOperation({ summary: 'Create implementation plan' })
  async createPlan(@Body() dto: { requirements: string; context?: string }) {
    const plan = await this.aiService.createPlan(dto.requirements, dto.context);
    return { plan };
  }
}
