import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KnowledgeService, CreateKnowledgeEntryDto, UpdateKnowledgeEntryDto } from './knowledge.service';

@ApiTags('Knowledge Base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a knowledge entry' })
  async create(@Request() req: any, @Body() dto: CreateKnowledgeEntryDto) {
    return this.knowledgeService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all knowledge entries' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('tag') tag?: string,
    @Query('language') language?: string,
    @Query('search') search?: string,
  ) {
    return this.knowledgeService.findAll(req.user.id, { type, tag, language, search });
  }

  @Get('patterns')
  @ApiOperation({ summary: 'Get code patterns' })
  async getCodePatterns(@Request() req: any, @Query('language') language?: string) {
    return this.knowledgeService.getCodePatterns(req.user.id, language);
  }

  @Get('style-guides')
  @ApiOperation({ summary: 'Get style guides' })
  async getStyleGuides(@Request() req: any, @Query('language') language?: string) {
    return this.knowledgeService.getStyleGuides(req.user.id, language);
  }

  @Get('snippets')
  @ApiOperation({ summary: 'Get code snippets' })
  async getSnippets(
    @Request() req: any,
    @Query('language') language?: string,
    @Query('tag') tag?: string,
  ) {
    return this.knowledgeService.getSnippets(req.user.id, language, tag);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get prompt templates' })
  async getPromptTemplates(@Request() req: any) {
    return this.knowledgeService.getPromptTemplates(req.user.id);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all unique tags' })
  async getAllTags(@Request() req: any) {
    return this.knowledgeService.getAllTags(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a knowledge entry' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.knowledgeService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a knowledge entry' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeEntryDto,
  ) {
    return this.knowledgeService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a knowledge entry' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.knowledgeService.delete(id, req.user.id);
  }
}
