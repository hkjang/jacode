import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { FeatureToggleService } from '../services/feature-toggle.service';

@ApiTags('admin/features')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/features')
export class FeatureToggleController {
  constructor(private readonly service: FeatureToggleService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature toggles' })
  findAll() {
    return this.service.findAll();
  }

  @Get('enabled')
  @ApiOperation({ summary: 'Get enabled features' })
  getEnabled() {
    return this.service.getEnabledFeatures();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get feature by key' })
  findByKey(@Param('key') key: string) {
    return this.service.findByKey(key);
  }

  @Get(':key/status')
  @ApiOperation({ summary: 'Check if feature is enabled' })
  async isEnabled(@Param('key') key: string) {
    return { key, isEnabled: await this.service.isEnabled(key) };
  }

  @Patch(':key/toggle')
  @ApiOperation({ summary: 'Toggle feature' })
  toggle(@Param('key') key: string, @Body() data: { isEnabled: boolean }) {
    return this.service.toggle(key, data.isEnabled);
  }

  @Patch(':key/settings')
  @ApiOperation({ summary: 'Update feature settings' })
  updateSettings(@Param('key') key: string, @Body() settings: object) {
    return this.service.updateSettings(key, settings);
  }

  @Post()
  @ApiOperation({ summary: 'Create feature toggle' })
  create(@Body() data: {
    key: string;
    name: string;
    description?: string;
    isEnabled?: boolean;
    settings?: object;
  }) {
    return this.service.create(data);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Toggle multiple features' })
  toggleMultiple(@Body() data: { updates: { key: string; isEnabled: boolean }[] }) {
    return this.service.toggleMultiple(data.updates);
  }

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize default features' })
  initialize() {
    return this.service.initializeDefaults();
  }
}
