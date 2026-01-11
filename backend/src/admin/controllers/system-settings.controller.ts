import {
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SystemSettingsService } from '../services/system-settings.service';

@ApiTags('admin/settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/settings')
export class SystemSettingsController {
  constructor(private readonly service: SystemSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  getAll(@Query('category') category?: string) {
    return this.service.getAll(category);
  }

  @Get('editor')
  @ApiOperation({ summary: 'Get editor policy' })
  getEditorPolicy() {
    return this.service.getEditorPolicy();
  }

  @Patch('editor')
  @ApiOperation({ summary: 'Update editor policy' })
  updateEditorPolicy(@Body() settings: Record<string, any>, @Request() req) {
    return this.service.updateEditorPolicy(settings, req.user);
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get queue settings' })
  getQueueSettings() {
    return this.service.getQueueSettings();
  }

  @Patch('queue')
  @ApiOperation({ summary: 'Update queue settings' })
  updateQueueSettings(@Body() settings: Record<string, any>, @Request() req) {
    return this.service.updateQueueSettings(settings, req.user);
  }

  @Get('model')
  @ApiOperation({ summary: 'Get model settings' })
  getModelSettings() {
    return this.service.getModelSettings();
  }

  @Patch('model')
  @ApiOperation({ summary: 'Update model settings' })
  updateModelSettings(@Body() settings: Record<string, any>, @Request() req) {
    return this.service.updateModelSettings(settings, req.user);
  }

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize default settings' })
  initialize() {
    return this.service.initializeDefaults();
  }
}
